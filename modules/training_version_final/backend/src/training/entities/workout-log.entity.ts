import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TrainingPlan } from './training-plan.entity';

@Entity('workout_logs')
export class WorkoutLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'plan_id', nullable: true })
  planId: string | null;

  @ManyToOne(() => TrainingPlan, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'plan_id' })
  plan: TrainingPlan | null;

  @Column({ default: 1 })
  day: number;

  @Column({ name: 'log_date', type: 'date', default: () => 'CURRENT_DATE' })
  logDate: string;

  @Column({ type: 'jsonb', default: [] })
  exercises: unknown[];

  @Column({ default: false })
  completado: boolean;

  @Column({ name: 'duration_minutes', default: 0 })
  durationMinutes: number;

  @Column({ name: 'trainer_notes', default: '' })
  trainerNotes: string;

  @Column({ type: 'jsonb', nullable: true })
  wellness: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
