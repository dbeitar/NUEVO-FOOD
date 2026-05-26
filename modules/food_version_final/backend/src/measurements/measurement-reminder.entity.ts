import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('measurement_reminder_config')
export class MeasurementReminderConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'trainer_id', unique: true })
  trainerId: string;

  @Column({ name: 'frequency_days', default: 7 })
  frequencyDays: number;

  @Column({ name: 'send_email', default: true })
  sendEmail: boolean;

  @Column({ name: 'send_note', default: true })
  sendNote: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'text', default: 'Hola {nombre}, es momento de registrar tus medidas corporales. ¡Hagamos seguimiento a tu progreso!' })
  message: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
