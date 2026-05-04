import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exercise } from '../workout/entities/exercise.entity';
import { MuscleGroup } from '../workout/entities/muscle-group.entity';
import { WorkoutRoutine } from '../workout/entities/workout-routine.entity';
import { WorkoutModule } from '../workout/workout.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ExerciseRagService } from './services/exercise-rag.service';
import { GeminiService } from './services/gemini.service';
import { ExerciseNameResolverService } from './services/exercise-name-resolver.service';
import { WorkoutContextService } from './services/workout-context.service';
import { WorkoutParserService } from './services/workout-parser.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Exercise, MuscleGroup, WorkoutRoutine]),
    WorkoutModule,
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    ExerciseRagService,
    GeminiService,
    ExerciseNameResolverService,
    WorkoutContextService,
    WorkoutParserService,
  ],
  exports: [
    ChatService,
    ExerciseRagService,
    GeminiService,
    ExerciseNameResolverService,
    WorkoutContextService,
    WorkoutParserService,
  ],
})
export class ChatModule {}
