import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ScheduleModule } from '@nestjs/schedule';
import { TrainerController } from './trainer.controller';
import { TrainerService } from './trainer.service';
import { NotificationService } from './notification.service';
import { TrainerNote } from './trainer-note.entity';
import { NotificationTemplate } from './notification-template.entity';
import { User } from '../users/entities/user.entity';
import { Gym } from '../gyms/entities/gym.entity';
import { NutritionModule } from '../nutrition/nutrition.module';
import { MailService } from '../common/mail.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TrainerNote, NotificationTemplate, User, Gym]),
    NutritionModule,
    MulterModule.register({ dest: '/app/uploads/cv' }),
    ScheduleModule.forRoot(),
  ],
  controllers: [TrainerController],
  providers: [TrainerService, NotificationService, MailService],
})
export class TrainerModule {}
