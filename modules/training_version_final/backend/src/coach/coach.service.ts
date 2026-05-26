import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { CoachNote } from './entities/coach-note.entity';
import { WorkoutLog } from '../training/entities/workout-log.entity';
import { TrainingPlan } from '../training/entities/training-plan.entity';

@Injectable()
export class CoachService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(CoachNote) private noteRepo: Repository<CoachNote>,
    @InjectRepository(WorkoutLog) private logRepo: Repository<WorkoutLog>,
    @InjectRepository(TrainingPlan) private planRepo: Repository<TrainingPlan>,
  ) {}

  async listAthletes(coach: User) {
    const qb = this.userRepo.createQueryBuilder('u')
      .where('u.role = :role', { role: UserRole.ATHLETE })
      .andWhere('u.is_active = true');
    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(coach.role)) {
      qb.andWhere('(u.trainer_id = :tid OR u.shell_trainer_id = :shellTid)', {
        tid: coach.id,
        shellTid: coach.shellUserId ?? -1,
      });
    }
    const athletes = await qb.orderBy('u.first_name', 'ASC').getMany();
    return athletes.map((a) => ({
      id: a.id,
      email: a.email,
      firstName: a.firstName,
      lastName: a.lastName,
      shellUserId: a.shellUserId,
    }));
  }

  async overview(coach: User) {
    const athletes = await this.listAthletes(coach);
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const sinceStr = since.toISOString().slice(0, 10);
    const ids = athletes.map((a) => a.id);
    const logs = ids.length
      ? await this.logRepo
        .createQueryBuilder('l')
        .where('l.user_id IN (:...ids)', { ids })
        .andWhere('l.log_date >= :since', { since: sinceStr })
        .getMany()
      : [];
    const completed = logs.filter((l) => l.completado).length;
    return {
      athletes_total: athletes.length,
      workouts_last_7d: logs.length,
      completed_last_7d: completed,
      athletes,
    };
  }

  async listNotes(coach: User, athleteId: string) {
    await this.assertAccess(coach, athleteId);
    return this.noteRepo.find({
      where: { coachId: coach.id, athleteId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async addNote(coach: User, athleteId: string, texto: string) {
    await this.assertAccess(coach, athleteId);
    const note = this.noteRepo.create({ coachId: coach.id, athleteId, texto });
    return this.noteRepo.save(note);
  }

  async athleteProgress(coach: User, athleteId: string) {
    await this.assertAccess(coach, athleteId);
    const plan = await this.planRepo.findOne({
      where: { userId: athleteId, isActive: true },
      order: { createdAt: 'DESC' },
    });
    const logs = await this.logRepo.find({
      where: { userId: athleteId },
      order: { logDate: 'DESC' },
      take: 30,
    });
    return { plan, logs };
  }

  private async assertAccess(coach: User, athleteId: string) {
    const athlete = await this.userRepo.findOne({ where: { id: athleteId, isActive: true } });
    if (!athlete) throw new NotFoundException('Atleta no encontrado');
    if ([UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(coach.role)) return;
    if (athlete.trainerId !== coach.id && athlete.shellTrainerId !== coach.shellUserId) {
      throw new ForbiddenException('Sin acceso a este atleta');
    }
  }
}
