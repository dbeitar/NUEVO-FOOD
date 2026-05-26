import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { CoachNote } from './entities/coach-note.entity';
import { WorkoutLog } from '../training/entities/workout-log.entity';
import { TrainingPlan } from '../training/entities/training-plan.entity';
import { CoachService } from './coach.service';
import { CoachController } from './coach.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, CoachNote, WorkoutLog, TrainingPlan])],
  controllers: [CoachController],
  providers: [CoachService],
})
export class CoachModule {}
