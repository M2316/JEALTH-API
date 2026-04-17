import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exercise } from '../workout/entities/exercise.entity';
import { ChatController } from './chat.controller';
import { ExerciseRagService } from './services/exercise-rag.service';
import { GeminiService } from './services/gemini.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Exercise])],
  controllers: [ChatController],
  providers: [ExerciseRagService, GeminiService],
  exports: [ExerciseRagService, GeminiService],
})
export class ChatModule {}
