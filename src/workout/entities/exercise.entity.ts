import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { MuscleGroup } from './muscle-group.entity';

@Entity('exercises')
export class Exercise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  equipment: string;

  @Column({ nullable: true })
  imageUrl: string;

  @ManyToOne(() => User, { eager: false })
  createdBy: User;

  @ManyToMany(() => MuscleGroup)
  @JoinTable({ name: 'exercise_muscle_groups' })
  muscleGroups: MuscleGroup[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
