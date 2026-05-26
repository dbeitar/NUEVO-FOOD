import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { MeasurementsController } from './measurements.controller';
import { MeasurementsService } from './measurements.service';
import { BodyMeasurement } from './measurement.entity';
import { MeasurementReminderConfig } from './measurement-reminder.entity';
import { User } from '../users/entities/user.entity';
import { MailService } from '../common/mail.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BodyMeasurement, MeasurementReminderConfig, User]),
    MulterModule.register({ dest: '/app/uploads/measurements' }),
  ],
  controllers: [MeasurementsController],
  providers: [MeasurementsService, MailService],
  exports: [MeasurementsService],
})
export class MeasurementsModule {}
