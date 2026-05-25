import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('payment_notifications')
export class PaymentNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'coach_id', nullable: true })
  coachId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'coach_id' })
  coach: User | null;

  @Column({ name: 'athlete_id' })
  athleteId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'athlete_id' })
  athlete: User;

  @Column({ default: 'pago_pendiente' })
  tipo: string;

  @Column()
  mensaje: string;

  @Column({ type: 'jsonb', nullable: true })
  meta: Record<string, unknown> | null;

  @Column({ default: false })
  leida: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
