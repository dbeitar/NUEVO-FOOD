import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToOne, JoinColumn,
} from 'typeorm';
import { User } from '../users/entities/user.entity';

export enum GoalType {
  MAINTAIN = 'MAINTAIN',
  LOSE = 'LOSE',
  GAIN = 'GAIN',
}

export enum GenderType {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', unique: true })
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'weight_kg', type: 'decimal', precision: 5, scale: 2, nullable: true })
  weightKg: number;

  @Column({ name: 'height_cm', type: 'decimal', precision: 5, scale: 2, nullable: true })
  heightCm: number;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: string;

  @Column({ type: 'enum', enum: GenderType, nullable: true })
  gender: GenderType;

  @Column({ name: 'goal_type', type: 'enum', enum: GoalType, default: GoalType.MAINTAIN })
  goalType: GoalType;

  @Column({ name: 'activity_level', nullable: true, default: 'MODERATE' })
  activityLevel: string;

  @Column({ name: 'has_dietary_restrictions', default: false })
  hasDietaryRestrictions: boolean;

  @Column({ name: 'dietary_restrictions_detail', nullable: true })
  dietaryRestrictionsDetail: string;

  @Column({ name: 'accepted_privacy_policy', default: false })
  acceptedPrivacyPolicy: boolean;

  @Column({ name: 'accepted_terms', default: false })
  acceptedTerms: boolean;

  // Calculated nutrition plan (can be overridden by trainer)
  @Column({ name: 'daily_calories', type: 'decimal', precision: 8, scale: 2, nullable: true })
  dailyCalories: number;

  @Column({ name: 'daily_protein_g', type: 'decimal', precision: 8, scale: 2, nullable: true })
  dailyProteinG: number;

  @Column({ name: 'daily_carbs_g', type: 'decimal', precision: 8, scale: 2, nullable: true })
  dailyCarbsG: number;

  @Column({ name: 'daily_fat_g', type: 'decimal', precision: 8, scale: 2, nullable: true })
  dailyFatG: number;

  @Column({ name: 'trainer_override', default: false })
  trainerOverride: boolean;

  @Column({ name: 'daily_water_glasses', type: 'int', default: 8, nullable: true })
  dailyWaterGlasses: number;

  @Column({ name: 'daily_steps', type: 'int', default: 8000, nullable: true })
  dailySteps: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
