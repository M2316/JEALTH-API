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

const KG_UNITS = ['kg', '키로', '킬로'] as const;
const LBS_UNITS = ['lbs', '파운드'] as const;
const WUNIT_ALT = [...KG_UNITS, ...LBS_UNITS].join('|');

// name is optional (for lastApprovedName fallback). It must start with a
// non-digit so "80 5" (no name) can't have the lazy capture eat the first
// digit. \d+ numeric anchors force weight/reps to remain numeric.
const FULL_RE = new RegExp(
  `^(?<name>\\D.*?)?\\s*(?<weight>\\d+(?:\\.\\d+)?)\\s*(?<wunit>${WUNIT_ALT})?\\s+(?<reps>\\d+)\\s*(?:개|회|rep|reps)?(?:\\s+(?<rounds>\\d+)\\s*세트)?$`,
);

const LBS_SET: Set<string> = new Set(LBS_UNITS);

const MAX_ROUNDS = 20;

@Injectable()
export class WorkoutParserService {
  constructor(private readonly resolver: ExerciseNameResolverService) {}

  async tryParse(
    userText: string,
    lastApprovedName: string | null,
  ): Promise<ParsedWorkout | null> {
    const trimmed = userText.trim().replace(/\s+/g, ' ');
    if (!trimmed) return null;

    const m = FULL_RE.exec(trimmed);
    if (!m?.groups) return null;

    const rawName = m.groups.name?.trim();
    const weight = Number(m.groups.weight);
    const reps = Number(m.groups.reps);
    const weightUnit = LBS_SET.has(m.groups.wunit ?? '') ? 'lbs' : 'kg';
    const rawRounds = m.groups.rounds ? Number(m.groups.rounds) : 1;
    if (rawRounds < 1 || rawRounds > MAX_ROUNDS) return null;
    const rounds = rawRounds;

    const nameForResolve =
      rawName && rawName.length > 0 ? rawName : lastApprovedName;
    if (!nameForResolve) return null;

    const resolved = await this.resolver.resolveName(nameForResolve);
    if (resolved.kind !== 'existing') return null;

    const sets: ParsedWorkoutSet[] = Array.from(
      { length: rounds },
      (_, i) => ({ round: i + 1, reps, weight, weightUnit }),
    );

    return {
      exerciseId: resolved.id,
      exerciseName: resolved.name,
      sets,
      reply: `${resolved.name} ${rounds}세트 맞나요?`,
    };
  }
}
