import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { WorkoutExercise } from './workout-exercise.entity';

@Entity('workout_sets')
export class WorkoutSet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WorkoutExercise, (we) => we.sets, { onDelete: 'CASCADE' })
  workoutExercise: WorkoutExercise;

  @Column()
  round: number;

  @Column()
  reps: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 1,
    transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) },
  })
  weight: number;

  @Column({ type: 'enum', enum: ['kg', 'lbs'], default: 'kg' })
  weightUnit: 'kg' | 'lbs';
}
