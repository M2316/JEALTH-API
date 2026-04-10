import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { WorkoutExercise } from './workout-exercise.entity';

@Entity('workout_routines')
export class WorkoutRoutine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @Column({ type: 'date' })
  date: string;

  @Column({ default: 0 })
  order: number;

  @OneToMany(() => WorkoutExercise, (we) => we.routine, {
    cascade: true,
    eager: true,
  })
  exercises: WorkoutExercise[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
