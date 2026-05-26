import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../users/entities/user.entity';

export enum NoteAuthor { TRAINER = 'TRAINER', USER = 'USER' }

@Entity('trainer_notes')
export class TrainerNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'trainer_id' })
  trainerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'trainer_id' })
  trainer: User;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ type: 'enum', enum: NoteAuthor, default: NoteAuthor.TRAINER })
  author: NoteAuthor;

  @Column({ name: 'parent_id', nullable: true })
  parentId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
