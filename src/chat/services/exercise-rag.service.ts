import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exercise } from '../../workout/entities/exercise.entity';

export interface ExerciseCandidate {
  id: string;
  name: string;
}

@Injectable()
export class ExerciseRagService implements OnModuleInit {
  private readonly logger = new Logger(ExerciseRagService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Exercise) private readonly repo: Repository<Exercise>,
  ) {}

  // 마이그레이션 인프라가 없는 환경 대비 멱등 부트스트랩
  async onModuleInit(): Promise<void> {
    try {
      await this.repo.manager.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
      await this.repo.manager.query(
        `CREATE INDEX IF NOT EXISTS idx_exercise_name_trgm
         ON exercises USING gin (name gin_trgm_ops)`,
      );
    } catch (e) {
      this.logger.warn(
        `pg_trgm bootstrap skipped: ${(e as Error).message}. ` +
          `Ensure DB has pg_trgm extension and idx_exercise_name_trgm installed.`,
      );
    }
  }

  async findCandidates(message: string): Promise<ExerciseCandidate[]> {
    const trimmed = message.trim();
    if (!trimmed) return [];

    const rawTopK = Number(this.config.get('EXERCISE_RAG_TOP_K') ?? 10);
    const topK = Number.isFinite(rawTopK) && rawTopK > 0 ? rawTopK : 10;

    const rawMinSim = Number(
      this.config.get('EXERCISE_RAG_MIN_SIMILARITY') ?? 0.1,
    );
    const minSimilarity =
      Number.isFinite(rawMinSim) && rawMinSim >= 0 && rawMinSim <= 1
        ? rawMinSim
        : 0.1;

    const rows: Array<{ id: string; name: string }> =
      await this.repo.manager.query(
        `SELECT id, name
         FROM exercises
         WHERE similarity(name, $1) >= $3
         ORDER BY name <-> $1
         LIMIT $2`,
        [trimmed, topK, minSimilarity],
      );
    return rows.map((r) => ({ id: r.id, name: r.name }));
  }
}
