// config.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigController } from './config.controller';
import { NutritionTrafficLight } from '../nutrition/entities/nutrition.entity';
import { NutritionService } from '../nutrition/nutrition.service';
import {
  FoodItem, FoodLog, UserNutritionGoal, FoodEquivalence,
} from '../nutrition/entities/nutrition.entity';
import { WaterLog } from '../nutrition/entities/water.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NutritionTrafficLight, FoodItem, FoodLog, UserNutritionGoal, FoodEquivalence, WaterLog])],
  controllers: [ConfigController],
  providers: [NutritionService],
})
export class ConfigAppModule {}
