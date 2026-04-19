import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkoutRoutine } from '../../workout/entities/workout-routine.entity';

@Injectable()
export class WorkoutContextService {
  constructor(
    @InjectRepository(WorkoutRoutine)
    private readonly routineRepo: Repository<WorkoutRoutine>,
  ) {}

  async getLastApprovedExerciseName(
    userId: string,
    date: string,
  ): Promise<string | null> {
    // 동일 date 에 복수 routine 이 존재할 수 있으므로 가장 최근 업데이트 1건
    const routine = await this.routineRepo.findOne({
      where: { user: { id: userId }, date },
      relations: ['exercises', 'exercises.exercise'],
      order: { updatedAt: 'DESC' },
    });
    if (!routine || !routine.exercises || routine.exercises.length === 0) {
      return null;
    }
    const sorted = [...routine.exercises].sort((a, b) => a.order - b.order);
    const last = sorted[sorted.length - 1];
    return last?.exercise?.name ?? null;
  }
}
