import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsArray, IsUUID } from 'class-validator';

export class CreateExerciseDto {
  @ApiProperty({ example: '벤치프레스' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: '바벨', required: false })
  @IsOptional()
  @IsString()
  equipment?: string;

  @ApiProperty({ example: ['uuid1', 'uuid2'], type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  muscleGroupIds: string[];
}
