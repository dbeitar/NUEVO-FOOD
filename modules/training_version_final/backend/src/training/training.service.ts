import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrainingPlan } from './entities/training-plan.entity';
import { WorkoutLog } from './entities/workout-log.entity';
import { ExerciseGallery } from './entities/exercise-gallery.entity';
import { User, UserRole } from '../users/entities/user.entity';

@Injectable()
export class TrainingService {
  constructor(
    @InjectRepository(TrainingPlan) private planRepo: Repository<TrainingPlan>,
    @InjectRepository(WorkoutLog) private logRepo: Repository<WorkoutLog>,
    @InjectRepository(ExerciseGallery) private galleryRepo: Repository<ExerciseGallery>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async ensureDefaultPlan(user: User, coachId?: string | null) {
    let plan = await this.planRepo.findOne({
      where: { userId: user.id, isActive: true },
      order: { createdAt: 'DESC' },
    });
    if (plan) return plan;
    plan = this.planRepo.create({
      userId: user.id,
      coachId: coachId || user.trainerId || null,
      level: 'principiante',
      method: 'D28D',
      splitType: 'full_body',
      days: [],
    });
    return this.planRepo.save(plan);
  }

  async getMyPlan(user: User) {
    const plan = await this.planRepo.findOne({
      where: { userId: user.id, isActive: true },
      order: { createdAt: 'DESC' },
    });
    if (!plan) return this.ensureDefaultPlan(user);
    return plan;
  }

  async updateMyPlan(user: User, body: Partial<TrainingPlan>) {
    const plan = await this.getMyPlan(user);
    if (body.days !== undefined) plan.days = body.days;
    if (body.level) plan.level = body.level;
    if (body.method) plan.method = body.method;
    if (body.splitType) plan.splitType = body.splitType;
    return this.planRepo.save(plan);
  }

  async getPlanForAthlete(coach: User, athleteId: string) {
    await this.assertCoachOwnsAthlete(coach, athleteId);
    const athlete = await this.userRepo.findOne({ where: { id: athleteId } });
    if (!athlete) throw new NotFoundException('Atleta no encontrado');
    return this.getMyPlan(athlete);
  }

  async updatePlanForAthlete(coach: User, athleteId: string, body: Partial<TrainingPlan>) {
    await this.assertCoachOwnsAthlete(coach, athleteId);
    const athlete = await this.userRepo.findOne({ where: { id: athleteId } });
    if (!athlete) throw new NotFoundException('Atleta no encontrado');
    const plan = await this.getMyPlan(athlete);
    if (body.days !== undefined) plan.days = body.days;
    if (body.level) plan.level = body.level;
    if (body.method) plan.method = body.method;
    if (body.splitType) plan.splitType = body.splitType;
    plan.coachId = coach.id;
    return this.planRepo.save(plan);
  }

  async listMyLogs(user: User) {
    return this.logRepo.find({
      where: { userId: user.id },
      order: { logDate: 'DESC', createdAt: 'DESC' },
      take: 60,
    });
  }

  async createLog(user: User, body: Partial<WorkoutLog>) {
    const plan = await this.getMyPlan(user);
    const log = this.logRepo.create({
      userId: user.id,
      planId: plan.id,
      day: body.day ?? 1,
      logDate: body.logDate || new Date().toISOString().slice(0, 10),
      exercises: body.exercises || [],
      completado: Boolean(body.completado),
      durationMinutes: body.durationMinutes ?? 0,
      trainerNotes: body.trainerNotes || '',
      wellness: body.wellness || null,
    });
    return this.logRepo.save(log);
  }

  async listGallery(coach: User) {
    return this.galleryRepo.find({ where: { coachId: coach.id }, order: { name: 'ASC' } });
  }

  async addGalleryItem(coach: User, body: Partial<ExerciseGallery>) {
    const item = this.galleryRepo.create({
      coachId: coach.id,
      name: body.name || 'Ejercicio',
      muscleGroup: body.muscleGroup || '',
      videoUrl: body.videoUrl || '',
      notes: body.notes || '',
    });
    return this.galleryRepo.save(item);
  }

  async deleteGalleryItem(coach: User, id: number) {
    const item = await this.galleryRepo.findOne({ where: { id, coachId: coach.id } });
    if (!item) throw new NotFoundException();
    await this.galleryRepo.remove(item);
    return { ok: true };
  }

  private async assertCoachOwnsAthlete(coach: User, athleteId: string) {
    const athlete = await this.userRepo.findOne({ where: { id: athleteId, isActive: true } });
    if (!athlete) throw new NotFoundException('Atleta no encontrado');
    if ([UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(coach.role)) return;
    if (athlete.trainerId !== coach.id && athlete.shellTrainerId !== coach.shellUserId) {
      throw new ForbiddenException('Atleta no asignado a este coach');
    }
  }
}
