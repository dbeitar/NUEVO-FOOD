import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NutritionPlanController } from './nutrition-plan.controller';
import { NutritionPlanService } from './nutrition-plan.service';
import { UserProfile } from './user-profile.entity';
import { User } from '../users/entities/user.entity';
import { UserNutritionGoal } from '../nutrition/entities/nutrition.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserProfile, User, UserNutritionGoal])],
  controllers: [NutritionPlanController],
  providers: [NutritionPlanService],
  exports: [NutritionPlanService],
})
export class NutritionPlanModule {}
