import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Gym } from '../gyms/entities/gym.entity';
import { TrainerNote, NoteAuthor } from './trainer-note.entity';
import { NutritionService } from '../nutrition/nutrition.service';
import { MailService } from '../common/mail.service';
import { generateTrainerCode } from '../common/bootstrap.service';

@Injectable()
export class TrainerService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Gym) private gymRepo: Repository<Gym>,
    @InjectRepository(TrainerNote) private noteRepo: Repository<TrainerNote>,
    private nutritionService: NutritionService,
    private mailService: MailService,
  ) {}

  async getStudents(trainerId: string, filters: { search?: string; trafficLight?: string }) {
    let query = this.userRepo.createQueryBuilder('u')
      .where('u.trainer_id = :trainerId', { trainerId })
      .andWhere('u.deleted_at IS NULL')
      .select(['u.id', 'u.firstName', 'u.lastName', 'u.email', 'u.phone', 'u.idNumber', 'u.createdAt']);

    if (filters.search) {
      query = query.andWhere(
        '(LOWER(u.first_name) LIKE :s OR LOWER(u.last_name) LIKE :s OR LOWER(u.email) LIKE :s OR u.id_number LIKE :s)',
        { s: `%${filters.search.toLowerCase()}%` }
      );
    }

    const students = await query.getMany();
    const withTL = await Promise.all(students.map(async (s) => {
      try {
        const tl = await this.nutritionService.getTrafficLight(s.id);
        // Get student's plan features
        const sub = await this.userRepo.manager.query(
          `SELECT p.features FROM subscriptions sub
           JOIN plans p ON p.id = sub.plan_id
           WHERE sub.user_id = $1 AND sub.status = 'ACTIVE'
           ORDER BY sub.created_at DESC LIMIT 1`,
          [s.id]
        );
        const features: string[] = sub[0]?.features || [];
        return { ...s, trafficLight: tl.status, features };
      } catch {
        return { ...s, trafficLight: 'UNKNOWN', features: [] };
      }
    }));

    if (filters.trafficLight) {
      return withTL.filter(s => s.trafficLight === filters.trafficLight);
    }
    return withTL;
  }

  async getStudentLogs(trainerId: string, studentId: string, date?: string) {
    const student = await this.userRepo.findOne({ where: { id: studentId, trainerId } });
    if (!student) throw new ForbiddenException('No tienes acceso a este asesorado');
    return this.nutritionService.getDayLogs(studentId, date);
  }

  async removeStudent(trainerId: string, studentId: string) {
    const student = await this.userRepo.findOne({ where: { id: studentId, trainerId } });
    if (!student) throw new NotFoundException('Asesorado no encontrado');
    student.trainerId = null;
    await this.userRepo.save(student);
    return { message: 'Asesorado desvinculado correctamente' };
  }

  async sendReminder(trainerId: string, studentId: string, message: string, _extra: any) {
    const trainer = await this.userRepo.findOne({ where: { id: trainerId } });
    const student = await this.userRepo.findOne({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Asesorado no encontrado');
    await this.mailService.sendReminderEmail(
      student.email, student.firstName,
      `${trainer.firstName} ${trainer.lastName}`, message
    );
    return { message: 'Recordatorio enviado' };
  }

  async sendMeetInvite(trainerId: string, studentId: string) {
    const trainer = await this.userRepo.findOne({ where: { id: trainerId } });
    const student = await this.userRepo.findOne({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Asesorado no encontrado');
    const roomCode = `foodplan-${Math.random().toString(36).slice(2, 10)}`;
    const meetUrl = `https://meet.jit.si/${roomCode}`;
    // Send to student
    await this.mailService.sendMeetInviteEmail(
      student.email, student.firstName,
      `${trainer.firstName} ${trainer.lastName}`, meetUrl
    );
    // Send to trainer too
    await this.mailService.sendMeetInviteEmail(
      trainer.email, trainer.firstName,
      `${student.firstName} ${student.lastName}`, meetUrl
    ).catch(() => {});
    return { meetUrl, message: 'Invitación enviada por correo' };
  }

  async linkToTrainerByCode(userId: string, trainerCode: string) {
    const trainer = await this.userRepo.findOne({
      where: { trainerCode: trainerCode.toUpperCase(), role: UserRole.TRAINER, isActive: true },
    });
    if (!trainer) throw new NotFoundException('Código de entrenador no válido');
    const user = await this.userRepo.findOne({ where: { id: userId } });
    user.trainerId = trainer.id;
    await this.userRepo.save(user);
    return {
      message: `Te has vinculado con el entrenador ${trainer.firstName} ${trainer.lastName}`,
      trainer: { firstName: trainer.firstName, lastName: trainer.lastName, email: trainer.email, cvUrl: trainer.cvUrl },
    };
  }

  async unlinkFromTrainer(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    user.trainerId = null;
    await this.userRepo.save(user);
    return { message: 'Te has desvinculado del entrenador' };
  }

  async joinGymByCode(trainerId: string, gymCode: string) {
    const gym = await this.gymRepo.findOne({
      where: { uniqueCode: gymCode.toUpperCase(), isActive: true },
    });
    if (!gym) throw new NotFoundException('Código de gimnasio no válido');
    const trainer = await this.userRepo.findOne({ where: { id: trainerId } });
    trainer.gymId = gym.id;
    await this.userRepo.save(trainer);
    return { message: `Te has asociado al gimnasio ${gym.name}` };
  }

  async leaveGym(trainerId: string) {
    const trainer = await this.userRepo.findOne({ where: { id: trainerId } });
    trainer.gymId = null;
    await this.userRepo.save(trainer);
    return { message: 'Te has desvinculado del gimnasio' };
  }

  async getMyTrainerCode(trainerId: string) {
    const trainer = await this.userRepo.findOne({ where: { id: trainerId } });
    if (!trainer.trainerCode) {
      let code = generateTrainerCode();
      while (await this.userRepo.findOne({ where: { trainerCode: code } })) {
        code = generateTrainerCode();
      }
      trainer.trainerCode = code;
      await this.userRepo.save(trainer);
    }
    const studentsCount = await this.userRepo.count({ where: { trainerId } });
    return { trainerCode: trainer.trainerCode, studentsCount };
  }

  async getMyGym(trainerId: string) {
    const trainer = await this.userRepo.findOne({
      where: { id: trainerId },
      relations: ['gym'],
    });
    return { gym: trainer.gym || null };
  }

  // ── Trainer notes ──────────────────────────────────────────

  async sendNote(trainerId: string, studentId: string, message: string) {
    const student = await this.userRepo.findOne({ where: { id: studentId, trainerId } });
    if (!student) throw new NotFoundException('Asesorado no encontrado');
    const note = this.noteRepo.create({ trainerId, userId: studentId, message, author: NoteAuthor.TRAINER });
    await this.noteRepo.save(note);
    return { message: 'Nota enviada correctamente' };
  }

  async getMyNotes(userId: string) {
    return this.noteRepo.find({
      where: { userId },
      relations: ['trainer'],
      order: { createdAt: 'DESC' },
    });
  }

  async markNotesRead(userId: string) {
    await this.noteRepo
      .createQueryBuilder()
      .update()
      .set({ isRead: true })
      .where('user_id = :userId AND is_read = false', { userId })
      .execute();
    return { message: 'Notas marcadas como leídas' };
  }

  async getUnreadCount(userId: string) {
    const count = await this.noteRepo
      .createQueryBuilder('n')
      .where('n.user_id = :userId AND n.is_read = false', { userId })
      .getCount();
    return { unread: count };
  }

  // ── Student activity & progress ──────────────────────────────

  async getStudentActivity(trainerId: string, studentId: string) {
    const student = await this.userRepo.findOne({ where: { id: studentId, trainerId } });
    if (!student) throw new ForbiddenException('No tienes acceso a este asesorado');

    const lastLog = await this.nutritionService.getLastLogDate(studentId);

    let daysInactive = 0;
    if (lastLog) {
      const last = new Date(lastLog);
      const today = new Date();
      daysInactive = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    }

    const adherence = await this.nutritionService.getAdherence(studentId, 30);
    return { lastLog, daysInactive, adherence };
  }

  async getStudentNoteHistory(trainerId: string, studentId: string) {
    const student = await this.userRepo.findOne({ where: { id: studentId, trainerId } });
    if (!student) throw new ForbiddenException('No tienes acceso a este asesorado');
    return this.noteRepo.find({
      where: { userId: studentId, trainerId },
      order: { createdAt: 'DESC' },
    });
  }

  async getStudentWeightProgress(trainerId: string, studentId: string) {
    const student = await this.userRepo.findOne({ where: { id: studentId, trainerId } });
    if (!student) throw new ForbiddenException('No tienes acceso a este asesorado');
    return this.nutritionService.getWeightHistory(studentId);
  }

  // ── Note replies ──────────────────────────────────────────

  async replyToNote(userId: string, noteId: string, message: string) {
    const note = await this.noteRepo.findOne({ where: { id: noteId, userId } });
    if (!note) throw new NotFoundException('Nota no encontrada');
    const reply = this.noteRepo.create({
      trainerId: note.trainerId,
      userId,
      message,
      author: NoteAuthor.USER,
      parentId: note.parentId || noteId,
    });
    return this.noteRepo.save(reply);
  }

  async getNoteThread(userId: string, noteId: string) {
    const rootId = noteId;
    const thread = await this.noteRepo.find({
      where: [
        { id: rootId },
        { parentId: rootId },
      ],
      order: { createdAt: 'ASC' },
    });
    return thread;
  }

  async getTrainerReplies(trainerId: string, studentId: string) {
    return this.noteRepo.find({
      where: { trainerId, userId: studentId, author: NoteAuthor.USER },
      order: { createdAt: 'DESC' },
    });
  }
}
