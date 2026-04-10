import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsEnum } from 'class-validator';

export class CreateWorkoutSetDto {
  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  round?: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  reps: number;

  @ApiProperty({ example: 60.0 })
  @IsNumber()
  weight: number;

  @ApiProperty({ example: 'kg', enum: ['kg', 'lbs'], required: false })
  @IsOptional()
  @IsEnum(['kg', 'lbs'])
  weightUnit?: 'kg' | 'lbs' = 'kg';
}
