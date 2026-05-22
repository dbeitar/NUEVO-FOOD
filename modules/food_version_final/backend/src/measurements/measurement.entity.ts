import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../users/entities/user.entity';

@Entity('body_measurements')
export class BodyMeasurement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true }) chest: number;
  @Column({ name: 'right_bicep', type: 'decimal', precision: 5, scale: 1, nullable: true }) rightBicep: number;
  @Column({ name: 'left_bicep', type: 'decimal', precision: 5, scale: 1, nullable: true }) leftBicep: number;
  @Column({ name: 'right_thigh', type: 'decimal', precision: 5, scale: 1, nullable: true }) rightThigh: number;
  @Column({ name: 'left_thigh', type: 'decimal', precision: 5, scale: 1, nullable: true }) leftThigh: number;
  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true }) shoulders: number;
  @Column({ name: 'abdomen_above', type: 'decimal', precision: 5, scale: 1, nullable: true }) abdomenAbove: number;
  @Column({ name: 'abdomen_navel', type: 'decimal', precision: 5, scale: 1, nullable: true }) abdomenNavel: number;
  @Column({ name: 'abdomen_below', type: 'decimal', precision: 5, scale: 1, nullable: true }) abdomenBelow: number;
  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true }) glute: number;
  @Column({ name: 'right_calf', type: 'decimal', precision: 5, scale: 1, nullable: true }) rightCalf: number;
  @Column({ name: 'left_calf', type: 'decimal', precision: 5, scale: 1, nullable: true }) leftCalf: number;
  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true }) weight: number;

  @Column({ name: 'photo_url', nullable: true }) photoUrl: string;
  @Column({ name: 'photo_url_2', nullable: true }) photoUrl2: string;
  @Column({ name: 'photo_url_3', nullable: true }) photoUrl3: string;
  @Column({ name: 'photo_url_4', nullable: true }) photoUrl4: string;
  @Column({ nullable: true }) notes: string;

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
