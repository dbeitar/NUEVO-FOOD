import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../users/entities/user.entity';

export enum ScaleValue {
  MUY_MALO = 'MUY_MALO',
  MALO = 'MALO',
  NORMAL = 'NORMAL',
  BUENO = 'BUENO',
  MUY_BUENO = 'MUY_BUENO',
}

export enum LevelValue {
  MUY_BAJO = 'MUY_BAJO',
  BAJO = 'BAJO',
  NORMAL = 'NORMAL',
  ALTO = 'ALTO',
  MUY_ALTO = 'MUY_ALTO',
}

export enum SleepQuality {
  MUY_MALA = 'MUY_MALA',
  MALA = 'MALA',
  NORMAL = 'NORMAL',
  BUENA = 'BUENA',
  MUY_BUENA = 'MUY_BUENA',
}

@Entity('daily_reports')
@Index(['userId', 'reportDate'], { unique: true })
export class DailyReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'report_date', type: 'date' })
  reportDate: string;

  @Column({ name: 'weight_kg', type: 'decimal', precision: 5, scale: 2, nullable: true })
  weightKg: number;

  // ── Performance factors ──
  @Column({ type: 'varchar', nullable: true })
  performance: ScaleValue;

  @Column({ type: 'varchar', nullable: true })
  motivation: ScaleValue;

  @Column({ type: 'varchar', nullable: true })
  hunger: LevelValue;

  @Column({ type: 'varchar', nullable: true })
  fatigue: LevelValue;

  @Column({ type: 'varchar', nullable: true })
  stress: LevelValue;

  // ── Sleep ──
  @Column({ name: 'sleep_hours', type: 'decimal', precision: 4, scale: 1, nullable: true })
  sleepHours: number;

  @Column({ name: 'sleep_quality', type: 'varchar', nullable: true })
  sleepQuality: SleepQuality;

  // ── Female-specific (optional) ──
  @Column({ nullable: true })
  period: string; // 'NO', 'SI', 'INICIO', 'MEDIO', 'FIN'

  @Column({ name: 'mood', type: 'varchar', nullable: true })
  mood: ScaleValue;

  @Column({ type: 'simple-array', nullable: true })
  symptoms: string[];

  @Column({ name: 'other_notes', type: 'text', nullable: true })
  otherNotes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
