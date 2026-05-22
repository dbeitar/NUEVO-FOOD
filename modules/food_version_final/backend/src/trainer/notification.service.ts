import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { User } from '../users/entities/user.entity';
import { TrainerNote, NoteAuthor } from './trainer-note.entity';
import { NotificationTemplate, TrafficLightLevel } from './notification-template.entity';
import { NutritionService } from '../nutrition/nutrition.service';
import { MailService } from '../common/mail.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(TrainerNote) private noteRepo: Repository<TrainerNote>,
    @InjectRepository(NotificationTemplate) private templateRepo: Repository<NotificationTemplate>,
    private nutritionService: NutritionService,
    private mailService: MailService,
  ) {}

  // Runs every day at 8am
  @Cron('0 8 * * *')
  async sendAutomaticNotifications() {
    this.logger.log('🔔 Running automatic notifications...');
    try {
      // Get all trainers that have active templates
      const templates = await this.templateRepo.find({ where: { isActive: true } });
      const trainerIds = [...new Set(templates.map(t => t.trainerId))];

      for (const trainerId of trainerIds) {
        const students = await this.userRepo.find({ where: { trainerId } });
        const trainerTemplates = templates.filter(t => t.trainerId === trainerId);
        const trainer = await this.userRepo.findOne({ where: { id: trainerId } });

        for (const student of students) {
          try {
            const tl = await this.nutritionService.getTrafficLight(student.id);
            const level = tl.status as TrafficLightLevel;
            const template = trainerTemplates.find(t => t.level === level);
            if (!template) continue;

            // Check frequency based on level
            const shouldSend = await this.shouldSendNotification(student.id, trainerId, level);
            if (!shouldSend) continue;

            // Personalize message
            const message = template.message
              .replace('{nombre}', student.firstName)
              .replace('{entrenador}', `${trainer.firstName} ${trainer.lastName}`)
              .replace('{semaforo}', level === 'RED' ? '🔴 Rojo' : level === 'YELLOW' ? '🟡 Amarillo' : '🟢 Verde');

            // Send email
            if (template.sendEmail) {
              await this.mailService.sendNotificationEmail(
                student.email,
                student.firstName,
                template.subject,
                message,
                `${trainer.firstName} ${trainer.lastName}`,
              ).catch(e => this.logger.warn(`Email error: ${e.message}`));
            }

            // Send note
            if (template.sendNote) {
              await this.noteRepo.save(this.noteRepo.create({
                trainerId,
                userId: student.id,
                message,
                author: NoteAuthor.TRAINER,
              }));
            }

            await this.logNotification(student.id, trainerId, level);
            this.logger.log(`✅ Notified ${student.firstName} (${level})`);
          } catch (e) {
            this.logger.warn(`Error processing student ${student.id}: ${e.message}`);
          }
        }
      }
    } catch (e) {
      this.logger.error(`Notification cron error: ${e.message}`);
    }
  }

  private async shouldSendNotification(userId: string, trainerId: string, level: TrafficLightLevel): Promise<boolean> {
    // RED: daily, YELLOW: every 3 days, GREEN: weekly
    const daysMap = { RED: 1, YELLOW: 3, GREEN: 7 };
    const days = daysMap[level];

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Check in notification_log table (more reliable than notes)
    try {
      const result = await this.noteRepo.manager.query(
        `SELECT created_at FROM notification_log 
         WHERE user_id = $1 AND trainer_id = $2 AND level = $3
         ORDER BY created_at DESC LIMIT 1`,
        [userId, trainerId, level]
      );
      if (!result[0]) return true;
      return new Date(result[0].created_at) < since;
    } catch {
      // Fallback to notes if notification_log doesn't exist
      const lastNote = await this.noteRepo.findOne({
        where: { userId, trainerId, author: NoteAuthor.TRAINER },
        order: { createdAt: 'DESC' },
      });
      if (!lastNote) return true;
      return new Date(lastNote.createdAt) < since;
    }
  }

  private async logNotification(userId: string, trainerId: string, level: string): Promise<void> {
    try {
      await this.noteRepo.manager.query(
        `INSERT INTO notification_log (user_id, trainer_id, level, created_at) VALUES ($1, $2, $3, NOW())`,
        [userId, trainerId, level]
      );
    } catch {}
  }

  // Template CRUD
  async getTemplates(trainerId: string) {
    return this.templateRepo.find({ where: { trainerId }, order: { level: 'ASC' } });
  }

  async saveTemplate(trainerId: string, dto: {
    level: TrafficLightLevel;
    subject: string;
    message: string;
    sendEmail: boolean;
    sendNote: boolean;
    isActive: boolean;
  }) {
    let template = await this.templateRepo.findOne({ where: { trainerId, level: dto.level } });
    if (!template) {
      template = this.templateRepo.create({ trainerId, ...dto });
    } else {
      Object.assign(template, dto);
    }
    return this.templateRepo.save(template);
  }

  async deleteTemplate(trainerId: string, level: TrafficLightLevel) {
    await this.templateRepo.delete({ trainerId, level });
    return { message: 'Plantilla eliminada' };
  }

  // Manual trigger
  async triggerForTrainer(trainerId: string) {
    const templates = await this.templateRepo.find({ where: { trainerId, isActive: true } });
    if (!templates.length) return { sent: 0, message: 'No hay plantillas activas' };

    const students = await this.userRepo.find({ where: { trainerId } });
    const trainer = await this.userRepo.findOne({ where: { id: trainerId } });
    let sent = 0;

    for (const student of students) {
      try {
        const tl = await this.nutritionService.getTrafficLight(student.id);
        const level = tl.status as TrafficLightLevel;
        const template = templates.find(t => t.level === level);
        if (!template) continue;

        const message = template.message
          .replace('{nombre}', student.firstName)
          .replace('{entrenador}', `${trainer.firstName} ${trainer.lastName}`)
          .replace('{semaforo}', level === 'RED' ? '🔴 Rojo' : level === 'YELLOW' ? '🟡 Amarillo' : '🟢 Verde');

        if (template.sendEmail) {
          await this.mailService.sendNotificationEmail(
            student.email, student.firstName,
            template.subject, message,
            `${trainer.firstName} ${trainer.lastName}`,
          ).catch(() => {});
        }

        if (template.sendNote) {
          await this.noteRepo.save(this.noteRepo.create({
            trainerId, userId: student.id, message, author: NoteAuthor.TRAINER,
          }));
        }
        sent++;
      } catch {}
    }
    return { sent, message: `${sent} notificaciones enviadas` };
  }


  // Runs every day at 9am — notify users 2 days before plan expires
  @Cron('0 9 * * *')
  async notifyExpiringPlans() {
    this.logger.log('🔔 Checking expiring plans...');
    try {
      // Find users whose plan expires in exactly 2 days
      const result = await this.userRepo.manager.query(`
        SELECT u.id, u.first_name as "firstName", u.email, s.end_date as "endDate", p.display_name as "planName"
        FROM subscriptions s
        JOIN users u ON u.id = s.user_id
        JOIN plans p ON p.id = s.plan_id
        WHERE s.status = 'ACTIVE'
          AND s.end_date::date = (CURRENT_DATE + INTERVAL '2 days')::date
      `);

      for (const user of result) {
        try {
          // Send email
          await this.mailService.sendPlanExpiryWarning(
            user.email,
            user.firstName,
            user.planName,
            2
          ).catch(e => this.logger.warn(`Email error: ${e.message}`));

          this.logger.log(`✅ Expiry warning sent to ${user.firstName}`);
        } catch (e) {
          this.logger.warn(`Error notifying ${user.id}: ${e.message}`);
        }
      }

      // Also notify on same day (0 days left)
      const expiredToday = await this.userRepo.manager.query(`
        SELECT u.id, u.first_name as "firstName", u.email, p.display_name as "planName"
        FROM subscriptions s
        JOIN users u ON u.id = s.user_id
        JOIN plans p ON p.id = s.plan_id
        WHERE s.status = 'ACTIVE'
          AND s.end_date::date = CURRENT_DATE
      `);

      for (const user of expiredToday) {
        try {
          await this.mailService.sendPlanExpiryWarning(
            user.email,
            user.firstName,
            user.planName,
            0
          ).catch(e => this.logger.warn(`Email error: ${e.message}`));
        } catch {}
      }

    } catch (e) {
      this.logger.error(`Expiry check error: ${e.message}`);
    }
  }


  // Runs every day at 7am — send measurement reminders based on trainer config
  @Cron('0 7 * * *')
  async sendMeasurementReminders() {
    this.logger.log('📏 Checking measurement reminders...');
    try {
      // Get all active trainer reminder configs
      const configs = await this.userRepo.manager.query(`
        SELECT mrc.*, u.id as trainer_id
        FROM measurement_reminder_config mrc
        JOIN users u ON u.id = mrc.trainer_id
        WHERE mrc.is_active = true
      `);

      for (const config of configs) {
        try {
          const frequencyDays = config.frequency_days || 7;

          // Get students of this trainer whose last measurement was >= frequencyDays ago
          // OR who have never taken measurements
          const students = await this.userRepo.manager.query(`
            SELECT u.id, u.first_name as "firstName", u.email
            FROM users u
            WHERE u.trainer_id = $1
              AND u.is_active = true
              AND u.deleted_at IS NULL
              AND (
                -- Never taken measurements
                NOT EXISTS (
                  SELECT 1 FROM body_measurements bm WHERE bm.user_id = u.id
                )
                OR
                -- Last measurement was frequencyDays ago or more
                (
                  SELECT MAX(bm.created_at) FROM body_measurements bm WHERE bm.user_id = u.id
                ) <= NOW() - INTERVAL '1 day' * $2
              )
          `, [config.trainer_id, frequencyDays]);

          for (const student of students) {
            try {
              await this.mailService.sendMeasurementReminderEmail(student.email, student.firstName)
                .catch(() => {});
              this.logger.log(`📏 Measurement reminder sent to ${student.firstName}`);
            } catch {}
          }
        } catch (e) {
          this.logger.warn(`Error processing config ${config.id}: ${e.message}`);
        }
      }
    } catch (e) {
      this.logger.error(`Measurement reminder error: ${e.message}`);
    }
  }
}