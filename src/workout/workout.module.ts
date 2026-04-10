import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MuscleGroup } from './entities/muscle-group.entity';
import { Exercise } from './entities/exercise.entity';
import { WorkoutRoutine } from './entities/workout-routine.entity';
import { WorkoutExercise } from './entities/workout-exercise.entity';
import { WorkoutSet } from './entities/workout-set.entity';
import { ExerciseService } from './exercise.service';
import { RoutineService } from './routine.service';
import { StatsService } from './stats.service';
import { ExerciseController } from './exercise.controller';
import { RoutineController } from './routine.controller';
import { StatsController } from './stats.controller';
import { SeedService } from './seed-muscle-groups';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MuscleGroup,
      Exercise,
      WorkoutRoutine,
      WorkoutExercise,
      WorkoutSet,
    ]),
  ],
  controllers: [ExerciseController, RoutineController, StatsController],
  providers: [ExerciseService, RoutineService, StatsService, SeedService],
})
export class WorkoutModule {}
