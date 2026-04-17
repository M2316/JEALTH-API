import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exercise } from '../workout/entities/exercise.entity';
import { ChatController } from './chat.controller';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Exercise])],
  controllers: [ChatController],
  providers: [],
})
export class ChatModule {}
