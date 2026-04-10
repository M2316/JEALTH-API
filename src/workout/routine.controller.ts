import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoutineService } from './routine.service';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';

@ApiTags('Routines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('routines')
export class RoutineController {
  constructor(private readonly routineService: RoutineService) {}

  @Get()
  findByDate(@Query('date') date: string, @Req() req: any) {
    return this.routineService.findByDate(req.user.id, date);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.routineService.findOne(id, req.user.id);
  }

  @Post()
  create(@Body() dto: CreateRoutineDto, @Req() req: any) {
    return this.routineService.create(dto, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoutineDto,
    @Req() req: any,
  ) {
    return this.routineService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.routineService.remove(id, req.user.id);
  }

  @Post(':id/copy')
  copyRoutine(
    @Param('id') id: string,
    @Body() body: { date: string },
    @Req() req: any,
  ) {
    return this.routineService.copyRoutine(id, body.date, req.user.id);
  }
}
