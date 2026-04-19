import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { ExerciseCategory } from '../enums/exercise-category.enum';
import { ExerciseDifficulty } from '../enums/exercise-difficulty.enum';

export class CreateExerciseDto {
  @ApiProperty({ example: '벤치프레스' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: '바벨', required: false })
  @IsOptional()
  @IsString()
  equipment?: string;

  @ApiProperty({ example: '벤치에 누워 바벨을 가슴까지 내렸다가 밀어 올린다.', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: ExerciseCategory,
    example: ExerciseCategory.Compound,
    required: false,
  })
  @IsOptional()
  @IsEnum(ExerciseCategory)
  category?: ExerciseCategory;

  @ApiProperty({
    enum: ExerciseDifficulty,
    example: ExerciseDifficulty.Intermediate,
    required: false,
  })
  @IsOptional()
  @IsEnum(ExerciseDifficulty)
  difficulty?: ExerciseDifficulty;

  @ApiProperty({ example: ['uuid1', 'uuid2'], type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  muscleGroupIds: string[];
}
