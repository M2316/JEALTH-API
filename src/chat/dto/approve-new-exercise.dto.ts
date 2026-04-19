import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class ApproveNewExerciseSetDto {
  @IsInt() @Min(1) round!: number;
  @IsInt() @Min(0) reps!: number;
  @IsNumber() @Min(0) weight!: number;
  @IsIn(['kg', 'lbs']) weightUnit!: 'kg' | 'lbs';
}

export class ApproveNewExerciseDto {
  @IsISO8601({ strict: true }) date!: string;

  @IsString() @IsNotEmpty() name!: string;

  @IsArray() @IsUUID('4', { each: true }) @ArrayMinSize(1)
  muscleGroupIds!: string[];

  @IsOptional() @IsString() equipment?: string;

  @IsArray() @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ApproveNewExerciseSetDto)
  sets!: ApproveNewExerciseSetDto[];
}
