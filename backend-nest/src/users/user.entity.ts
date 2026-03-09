import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

export enum Gender {
  Masculino = 'Masculino',
  Femenino = 'Femenino',
  Otro = 'Otro'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ type: 'varchar', length: 120 })
  name!: string

  @Column({ type: 'varchar', length: 160, unique: true })
  email!: string

  @Column({ type: 'enum', enum: Gender, default: Gender.Otro })
  gender!: Gender

  @Column({ type: 'boolean', default: false })
  hasRestrictions!: boolean

  @Column({ type: 'text', nullable: true })
  restrictionDetails!: string | null
}
