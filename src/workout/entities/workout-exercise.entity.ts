import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { WorkoutRoutine } from './workout-routine.entity';
import { Exercise } from './exercise.entity';
import { WorkoutSet } from './workout-set.entity';

@Entity('workout_exercises')
export class WorkoutExercise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WorkoutRoutine, (r) => r.exercises, { onDelete: 'CASCADE' })
  routine: WorkoutRoutine;

  @ManyToOne(() => Exercise, { eager: true })
  exercise: Exercise;

  @Column()
  order: number;

  @OneToMany(() => WorkoutSet, (s) => s.workoutExercise, {
    cascade: true,
    eager: true,
  })
  sets: WorkoutSet[];
}
