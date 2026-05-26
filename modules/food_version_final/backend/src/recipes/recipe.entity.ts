import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../users/entities/user.entity';

@Entity('recipes')
export class Recipe {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  category: string; // 'Desayuno', 'Almuerzo', 'Cena', 'Snack', 'Postre'

  @Column({ nullable: true })
  objective: string; // 'LOSE', 'GAIN', 'MAINTAIN'

  @Column({ nullable: true, name: 'image_url' })
  imageUrl: string;

  @Column({ type: 'text' })
  ingredients: string; // JSON string: [{ name, quantity, unit }]

  @Column({ type: 'text' })
  steps: string; // JSON string: ['paso 1', 'paso 2']

  @Column({ name: 'prep_time_min', nullable: true })
  prepTimeMin: number;

  @Column({ name: 'servings', default: 1 })
  servings: number;

  // Macros por porción
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  calories: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  protein: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  carbs: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  fat: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
