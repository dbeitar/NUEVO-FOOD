import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrainingPlan } from './entities/training-plan.entity';
import { WorkoutLog } from './entities/workout-log.entity';
import { ExerciseGallery } from './entities/exercise-gallery.entity';
import { User } from '../users/entities/user.entity';
import { TrainingService } from './training.service';
import { TrainingController } from './training.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TrainingPlan, WorkoutLog, ExerciseGallery, User])],
  controllers: [TrainingController],
  providers: [TrainingService],
  exports: [TrainingService],
})
export class TrainingModule {}
