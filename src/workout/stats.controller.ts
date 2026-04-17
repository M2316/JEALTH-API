import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StatsService } from './stats.service';

@ApiTags('Stats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('volume')
  getVolume(
    @Query('start') start: string,
    @Query('end') end: string,
    @Req() req: any,
  ) {
    return this.statsService.getVolumeByPeriod(req.user.id, start, end);
  }

  @Get('records')
  getRecords(@Query('exerciseId') exerciseId: string, @Req() req: any) {
    return this.statsService.getPersonalRecords(req.user.id, exerciseId);
  }

  @Get('muscle-breakdown')
  getMuscleBreakdown(
    @Query('start') start: string,
    @Query('end') end: string,
    @Req() req: any,
  ) {
    return this.statsService.getMuscleGroupBreakdown(req.user.id, start, end);
  }
}
