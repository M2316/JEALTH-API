import { Injectable } from '@nestjs/common';

@Injectable()
export class MuscleGroupInferenceService {
  async inferMuscleGroups(_exerciseName: string): Promise<string[]> {
    return [];
  }
}
