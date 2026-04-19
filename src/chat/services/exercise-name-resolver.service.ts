import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exercise } from '../../workout/entities/exercise.entity';

export type ResolvedExercise =
  | { kind: 'existing'; id: string; name: string }
  | { kind: 'new'; name: string };

@Injectable()
export class ExerciseNameResolverService {
  private static readonly TRGM_THRESHOLD = 0.6;

  constructor(
    @InjectRepository(Exercise) private readonly repo: Repository<Exercise>,
  ) {}

  async resolveName(rawName: string): Promise<ResolvedExercise> {
    const normalized = rawName.trim().replace(/\s+/g, ' ');
    if (!normalized) return { kind: 'new', name: rawName };

    const exact: Array<{ id: string; name: string }> =
      await this.repo.manager.query(
        `SELECT id, name FROM exercises WHERE LOWER(name) = LOWER($1) LIMIT 1`,
        [normalized],
      );
    if (exact.length > 0) {
      return { kind: 'existing', id: exact[0].id, name: exact[0].name };
    }

    const fuzzy: Array<{ id: string; name: string }> =
      await this.repo.manager.query(
        `SELECT id, name FROM exercises
         WHERE similarity(name, $1) >= $2
         ORDER BY name <-> $1
         LIMIT 1`,
        [normalized, ExerciseNameResolverService.TRGM_THRESHOLD],
      );
    if (fuzzy.length > 0) {
      return { kind: 'existing', id: fuzzy[0].id, name: fuzzy[0].name };
    }

    return { kind: 'new', name: normalized };
  }
}
