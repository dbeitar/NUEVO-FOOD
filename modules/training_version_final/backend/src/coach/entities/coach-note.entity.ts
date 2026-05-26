import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('coach_notes')
export class CoachNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'coach_id' })
  coachId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'coach_id' })
  coach: User;

  @Column({ name: 'athlete_id' })
  athleteId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'athlete_id' })
  athlete: User;

  @Column()
  texto: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
