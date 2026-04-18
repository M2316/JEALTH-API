import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkoutContextService {
  async getLastApprovedExerciseName(
    _userId: string,
    _date: string,
  ): Promise<string | null> {
    return null;
  }
}
