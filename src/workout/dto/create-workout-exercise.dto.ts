import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsInt, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateWorkoutSetDto } from './create-workout-set.dto';

export class CreateWorkoutExerciseDto {
  @ApiProperty({ example: 'exercise-uuid' })
  @IsUUID()
  exerciseId: string;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiProperty({ type: [CreateWorkoutSetDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkoutSetDto)
  sets: CreateWorkoutSetDto[];
}
