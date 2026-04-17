import { Injectable, OnModuleInit } from '@nestjs/common';
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
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Exercise) private readonly repo: Repository<Exercise>,
  ) {}

  // 마이그레이션 인프라가 없는 환경 대비 멱등 부트스트랩
  async onModuleInit(): Promise<void> {
    await this.repo.manager.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    await this.repo.manager.query(
      `CREATE INDEX IF NOT EXISTS idx_exercise_name_trgm
       ON exercises USING gin (name gin_trgm_ops)`,
    );
  }

  async findCandidates(message: string): Promise<ExerciseCandidate[]> {
    const trimmed = message.trim();
    if (!trimmed) return [];
    const topK = Number(this.config.get('EXERCISE_RAG_TOP_K') ?? 10);
    const rows: Array<{ id: string; name: string }> =
      await this.repo.manager.query(
        `SELECT id, name
         FROM exercises
         WHERE similarity(name, $1) > 0.1
         ORDER BY similarity(name, $1) DESC
         LIMIT $2`,
        [trimmed, topK],
      );
    return rows.map((r) => ({ id: r.id, name: r.name }));
  }
}
