import { Injectable } from '@nestjs/common';
import { ExerciseNameResolverService } from './exercise-name-resolver.service';

export interface ParsedWorkoutSet {
  round: number;
  reps: number;
  weight: number;
  weightUnit: 'kg' | 'lbs';
}

export interface ParsedWorkout {
  exerciseId: string;
  exerciseName: string;
  sets: ParsedWorkoutSet[];
  reply: string;
}

// {name} {weight}(kg|키로|킬로|lbs|파운드)? {reps}(개|회|rep|reps)?
const SINGLE_SET_RE =
  /^(?<name>.+?)\s+(?<weight>\d+(?:\.\d+)?)\s*(?<wunit>kg|키로|킬로|lbs|파운드)?\s+(?<reps>\d+)\s*(?:개|회|rep|reps)?$/;

const LBS_SET = new Set(['lbs', '파운드']);

@Injectable()
export class WorkoutParserService {
  constructor(private readonly resolver: ExerciseNameResolverService) {}

  async tryParse(
    userText: string,
    _lastApprovedName: string | null,
  ): Promise<ParsedWorkout | null> {
    const trimmed = userText.trim().replace(/\s+/g, ' ');
    if (!trimmed) return null;

    const m = SINGLE_SET_RE.exec(trimmed);
    if (!m?.groups) return null;

    const name = m.groups.name.trim();
    const weight = Number(m.groups.weight);
    const reps = Number(m.groups.reps);
    const weightUnit = LBS_SET.has(m.groups.wunit ?? '') ? 'lbs' : 'kg';

    const resolved = await this.resolver.resolveName(name);
    if (resolved.kind !== 'existing') return null;

    const sets: ParsedWorkoutSet[] = [
      { round: 1, reps, weight, weightUnit },
    ];

    return {
      exerciseId: resolved.id,
      exerciseName: resolved.name,
      sets,
      reply: `${resolved.name} 1세트 맞나요?`,
    };
  }
}
