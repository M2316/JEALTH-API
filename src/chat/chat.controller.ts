import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import { ApproveNewExerciseDto } from './dto/approve-new-exercise.dto';
import { ChatService } from './chat.service';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('health')
  health() {
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Post('workout')
  async chatWorkout(
    @Body() dto: ChatRequestDto,
    @Req() req: any,
  ): Promise<ChatResponseDto> {
    return this.chatService.processMessage(dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Post('workout/approve-new-exercise')
  approveNewExercise(@Body() dto: ApproveNewExerciseDto, @Req() req: any) {
    return this.chatService.approveNewExercise(dto, req.user.id);
  }
}
