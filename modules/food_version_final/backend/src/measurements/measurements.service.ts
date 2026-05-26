import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BodyMeasurement } from './measurement.entity';
import { MeasurementReminderConfig } from './measurement-reminder.entity';
import { User } from '../users/entities/user.entity';
import { MailService } from '../common/mail.service';

@Injectable()
export class MeasurementsService {
  constructor(
    @InjectRepository(BodyMeasurement) private repo: Repository<BodyMeasurement>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(MeasurementReminderConfig) private reminderConfigRepo: Repository<MeasurementReminderConfig>,
    private mailService: MailService,
  ) {}

  async save(userId: string, dto: Partial<BodyMeasurement>, photoUrl?: string, photoUrl2?: string, photoUrl3?: string, photoUrl4?: string) {
    const measurement = this.repo.create({ ...dto, userId, photoUrl, photoUrl2, photoUrl3, photoUrl4 });
    return this.repo.save(measurement);
  }

  async getHistory(userId: string, limit: any = 12) {
    const take = parseInt(limit) || 12;
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take,
    });
  }

  async getStudentHistory(trainerId: string, studentId: string, limit: any = 12) {
    const student = await this.userRepo.findOne({ where: { id: studentId, trainerId } });
    if (!student) throw new ForbiddenException('No tienes acceso a este asesorado');
    const take = parseInt(limit) || 12;
    return this.repo.find({
      where: { userId: studentId },
      order: { createdAt: 'DESC' },
      take,
    });
  }

  async sendWeeklyReminder(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    await this.mailService.sendMeasurementReminderEmail(user.email, user.firstName);
    return { message: 'Recordatorio enviado a ' + user.email };
  }

  async toggleWeeklyReminder(userId: string, enabled: boolean) {
    // Store in user profile - we'll use a simple approach
    await this.userRepo.update(userId, { measurementReminder: enabled } as any);
    return { enabled, message: enabled ? 'Recordatorio semanal activado' : 'Recordatorio semanal desactivado' };
  }


  async getReminderConfig(trainerId: string) {
    const config = await this.reminderConfigRepo.findOne({ where: { trainerId } });
    return config || {
      trainerId,
      frequencyDays: 7,
      sendEmail: true,
      sendNote: true,
      isActive: true,
      message: 'Hola {nombre}, es momento de registrar tus medidas corporales. ¡Hagamos seguimiento a tu progreso!',
    };
  }

  async saveReminderConfig(trainerId: string, dto: {
    frequencyDays: number;
    sendEmail: boolean;
    sendNote: boolean;
    isActive: boolean;
    message: string;
  }) {
    let config = await this.reminderConfigRepo.findOne({ where: { trainerId } });
    if (!config) {
      config = this.reminderConfigRepo.create({ trainerId, ...dto });
    } else {
      Object.assign(config, dto);
    }
    return this.reminderConfigRepo.save(config);
  }

  async sendReminderToStudents(trainerId: string) {
    const config = await this.reminderConfigRepo.findOne({ where: { trainerId, isActive: true } });
    if (!config) return { sent: 0, message: 'No hay configuración activa' };

    const students = await this.userRepo.find({ where: { trainerId } });
    let sent = 0;

    for (const student of students) {
      try {
        const message = config.message
          .replace('{nombre}', student.firstName)
          .replace('{entrenador}', 'tu entrenador');

        if (config.sendEmail) {
          await this.mailService.sendMeasurementReminderEmail(student.email, student.firstName)
            .catch(() => {});
        }
        sent++;
      } catch {}
    }
    return { sent, message: `${sent} recordatorios enviados` };
  }


  async getTrainerReminderConfigForUser(userId: string) {
    try {
      // Find the user's trainer
      const user = await this.repo.manager.query(
        `SELECT trainer_id FROM users WHERE id = $1`, [userId]
      );
      const trainerId = user[0]?.trainer_id;
      if (!trainerId) return null;

      const result = await this.repo.manager.query(
        `SELECT * FROM measurement_reminder_config WHERE trainer_id = $1 AND is_active = true LIMIT 1`,
        [trainerId]
      );
      return result[0] || null;
    } catch { return null; }
  }


  async deleteMeasurement(trainerId: string, measurementId: string) {
    // Verify the measurement belongs to a student of this trainer
    const measurement = await this.repo.manager.query(
      `SELECT bm.*, u.trainer_id FROM body_measurements bm
       JOIN users u ON u.id = bm.user_id
       WHERE bm.id = $1 AND u.trainer_id = $2`,
      [measurementId, trainerId]
    );
    if (!measurement[0]) throw new Error('Medición no encontrada o sin acceso');

    // Delete photo files
    const { unlink } = require('fs');
    const { join } = require('path');
    const m = measurement[0];
    [m.photo_url, m.photo_url_2, m.photo_url_3, m.photo_url_4].filter(Boolean).forEach((url: string) => {
      const filename = url.split('/').pop();
      const filePath = join('/app/uploads/measurements', filename);
      unlink(filePath, () => {});
    });

    await this.repo.delete(measurementId);
    return { message: 'Medición eliminada correctamente' };
  }


  async deleteOwnMeasurement(userId: string, id: string) {
    const m = await this.repo.findOne({ where: { id, userId } });
    if (!m) throw new Error('Medición no encontrada');
    // Delete associated photos
    const { unlink } = require('fs');
    const { join } = require('path');
    [m.photoUrl, m.photoUrl2, m.photoUrl3, m.photoUrl4].filter(Boolean).forEach((url: string) => {
      const filename = url.split('/').pop();
      unlink(join('/app/uploads/measurements', filename), () => {});
    });
    await this.repo.delete(id);
    return { message: 'Medición eliminada' };
  }

  async updateMeasurement(userId: string, id: string, dto: any) {
    const m = await this.repo.findOne({ where: { id, userId } });
    if (!m) throw new Error('Medición no encontrada');
    // Only update measurement fields, not photos
    const allowed = ['weight','chest','rightBicep','leftBicep','rightThigh','leftThigh','rightCalf','leftCalf','shoulders','abdomenAbove','abdomenNavel','abdomenBelow','glute','notes'];
    allowed.forEach(k => { if (dto[k] !== undefined && dto[k] !== '') m[k] = dto[k]; else if (dto[k] === '') m[k] = null; });
    return this.repo.save(m);
  }
}