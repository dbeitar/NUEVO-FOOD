import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, DeleteDateColumn, ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Gym } from '../../gyms/entities/gym.entity';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  TRAINER = 'TRAINER',
  USER = 'USER',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  @Exclude()
  passwordHash: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ name: 'id_number', nullable: true, unique: true })
  idNumber: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_protected', default: false })
  isProtected: boolean;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @Column({ name: 'cv_url', nullable: true })
  cvUrl: string;

  @Column({ name: 'trainer_code', nullable: true, unique: true })
  trainerCode: string;

  @Column({ name: 'measurement_reminder', default: false })
  measurementReminder: boolean;

  @Column({ name: 'shell_user_id', type: 'int', nullable: true })
  shellUserId: number | null;

  @Column({ name: 'shell_branding', type: 'jsonb', nullable: true })
  shellBranding: Record<string, unknown> | null;

  @Column({ name: 'gym_id', nullable: true })
  gymId: string;

  @ManyToOne(() => Gym, { nullable: true, eager: false })
  @JoinColumn({ name: 'gym_id' })
  gym: Gym;

  @Column({ name: 'trainer_id', nullable: true })
  trainerId: string;

  @ManyToOne(() => User, (u) => u.students, { nullable: true })
  @JoinColumn({ name: 'trainer_id' })
  trainer: User;

  @OneToMany(() => User, (u) => u.trainer)
  students: User[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
