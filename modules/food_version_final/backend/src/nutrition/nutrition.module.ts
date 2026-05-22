import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NutritionController } from './nutrition.controller';
import { NutritionService } from './nutrition.service';
import { ChatbotService } from './chatbot.service';
import {
  FoodItem, FoodLog, UserNutritionGoal,
  NutritionTrafficLight, FoodEquivalence,
} from './entities/nutrition.entity';
import { WaterLog } from './entities/water.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FoodItem, FoodLog, UserNutritionGoal, NutritionTrafficLight, FoodEquivalence, WaterLog])],
  controllers: [NutritionController],
  providers: [NutritionService, ChatbotService],
  exports: [NutritionService],
})
export class NutritionModule {}
