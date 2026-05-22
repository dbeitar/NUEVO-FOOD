import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum TrafficLightLevel { RED = 'RED', YELLOW = 'YELLOW', GREEN = 'GREEN' }

@Entity('notification_templates')
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'trainer_id' })
  trainerId: string;

  @Column({ type: 'enum', enum: TrafficLightLevel })
  level: TrafficLightLevel;

  @Column({ name: 'subject', default: 'Recordatorio de tu plan nutricional' })
  subject: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'send_email', default: true })
  sendEmail: boolean;

  @Column({ name: 'send_note', default: true })
  sendNote: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
