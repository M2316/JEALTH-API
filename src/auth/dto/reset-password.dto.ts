import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'newpassword123' })
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
