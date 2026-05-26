import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';

export enum UserRole {
  ATHLETE = 'ATHLETE',
  COACH = 'COACH',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name', default: '' })
  lastName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.ATHLETE })
  role: UserRole;

  @Column({ name: 'shell_user_id', type: 'int', nullable: true, unique: true })
  shellUserId: number | null;

  @Column({ name: 'shell_trainer_id', type: 'int', nullable: true })
  shellTrainerId: number | null;

  @Column({ name: 'trainer_id', type: 'uuid', nullable: true })
  trainerId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'trainer_id' })
  trainer: User | null;

  @Column({ name: 'trainer_code', nullable: true, unique: true })
  trainerCode: string | null;

  @Column({ name: 'shell_branding', type: 'jsonb', nullable: true })
  shellBranding: Record<string, unknown> | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
