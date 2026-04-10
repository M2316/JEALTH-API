import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsInt, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateWorkoutExerciseDto } from './create-workout-exercise.dto';

export class CreateRoutineDto {
  @ApiProperty({ example: '2026-04-04' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiProperty({ type: [CreateWorkoutExerciseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkoutExerciseDto)
  exercises: CreateWorkoutExerciseDto[];
}
