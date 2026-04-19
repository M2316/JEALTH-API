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
import { ExerciseCategory } from '../enums/exercise-category.enum';
import { ExerciseDifficulty } from '../enums/exercise-difficulty.enum';

@Entity('exercises')
export class Exercise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  slug: string | null;

  @Column()
  name: string;

  @Column({ nullable: true })
  equipment: string;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: ExerciseCategory,
    nullable: true,
  })
  category: ExerciseCategory | null;

  @Column({
    type: 'enum',
    enum: ExerciseDifficulty,
    nullable: true,
  })
  difficulty: ExerciseDifficulty | null;

  @Column({ default: false })
  isDefault: boolean;

  @ManyToOne(() => User, { eager: false, nullable: true })
  createdBy: User | null;

  @ManyToMany(() => MuscleGroup)
  @JoinTable({ name: 'exercise_muscle_groups' })
  muscleGroups: MuscleGroup[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
