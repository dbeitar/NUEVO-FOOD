import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';

export enum MealType {
  BREAKFAST = 'BREAKFAST',
  LUNCH = 'LUNCH',
  DINNER = 'DINNER',
  SNACK = 'SNACK',
  CUSTOM = 'CUSTOM',
}

@Entity('food_items')
export class FoodItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  category: string;

  @Column({ name: 'calories_per_100g', type: 'decimal', precision: 8, scale: 2 })
  caloriesPer100g: number;

  @Column({ name: 'protein_per_100g', type: 'decimal', precision: 8, scale: 2, default: 0 })
  proteinPer100g: number;

  @Column({ name: 'carbs_per_100g', type: 'decimal', precision: 8, scale: 2, default: 0 })
  carbsPer100g: number;

  @Column({ name: 'fat_per_100g', type: 'decimal', precision: 8, scale: 2, default: 0 })
  fatPer100g: number;

  @Column({ name: 'fiber_per_100g', type: 'decimal', precision: 8, scale: 2, default: 0, nullable: true })
  fiberPer100g: number;

  @Column({ default: 'g' })
  unit: string;

  @Column({ name: 'grams_per_unit', type: 'decimal', precision: 8, scale: 2, nullable: true })
  gramsPerUnit: number; // e.g. 1 egg = 50g → gramsPerUnit=50

  @Column({ name: 'is_custom', default: false })
  isCustom: boolean;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('food_logs')
export class FoodLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'food_item_id', nullable: true })
  foodItemId: string;

  @ManyToOne(() => FoodItem, { nullable: true })
  @JoinColumn({ name: 'food_item_id' })
  foodItem: FoodItem;

  @Column({ name: 'recipe_id', nullable: true })
  recipeId: string;

  @Column({ name: 'recipe_name', nullable: true })
  recipeName: string;

  @Column({ name: 'log_date', type: 'date' })
  logDate: string;

  @Column({ name: 'meal_type', type: 'enum', enum: MealType })
  mealType: MealType;

  @Column({ name: 'custom_meal_name', nullable: true })
  customMealName: string;

  @Column({ name: 'quantity_grams', type: 'decimal', precision: 8, scale: 2 })
  quantityGrams: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  calories: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  protein: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  carbs: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  fat: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('user_nutrition_goals')
export class UserNutritionGoal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', unique: true })
  userId: string;

  @Column({ name: 'daily_calories', type: 'decimal', precision: 8, scale: 2, default: 2000 })
  dailyCalories: number;

  @Column({ name: 'daily_protein_g', type: 'decimal', precision: 8, scale: 2, default: 150 })
  dailyProteinG: number;

  @Column({ name: 'daily_carbs_g', type: 'decimal', precision: 8, scale: 2, default: 250 })
  dailyCarbsG: number;

  @Column({ name: 'daily_fat_g', type: 'decimal', precision: 8, scale: 2, default: 65 })
  dailyFatG: number;

  @Column({ name: 'weight_kg', type: 'decimal', precision: 5, scale: 2, nullable: true })
  weightKg: number;

  @Column({ name: 'height_cm', type: 'decimal', precision: 5, scale: 2, nullable: true })
  heightCm: number;

  @Column({ name: 'goal_type', default: 'MAINTAIN' })
  goalType: string;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'NOW()' })
  updatedAt: Date;
}

@Entity('nutrition_traffic_light')
export class NutritionTrafficLight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'green_min_days', default: 5 })
  greenMinDays: number;

  @Column({ name: 'yellow_min_days', default: 3 })
  yellowMinDays: number;

  @Column({ name: 'red_max_days', default: 2 })
  redMaxDays: number;

  @Column({ name: 'compliance_threshold_pct', type: 'decimal', precision: 5, scale: 2, default: 80 })
  complianceThresholdPct: number;

  @Column({ name: 'evaluation_window_days', default: 7 })
  evaluationWindowDays: number;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'NOW()' })
  updatedAt: Date;
}

@Entity('food_equivalences')
export class FoodEquivalence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'original_food_id' })
  originalFoodId: string;

  @Column({ name: 'replacement_food_id' })
  replacementFoodId: string;

  @ManyToOne(() => FoodItem)
  @JoinColumn({ name: 'replacement_food_id' })
  replacementFood: FoodItem;

  @Column({ name: 'original_quantity_g', type: 'decimal', precision: 8, scale: 2, default: 100 })
  originalQuantityG: number;

  @Column({ name: 'replacement_quantity_g', type: 'decimal', precision: 8, scale: 2 })
  replacementQuantityG: number;

  @Column({ nullable: true })
  notes: string;
}
