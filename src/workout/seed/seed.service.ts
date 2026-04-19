import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { MuscleGroup } from '../entities/muscle-group.entity';
import { Exercise } from '../entities/exercise.entity';
import { MUSCLE_GROUP_SEEDS } from './data/muscle-groups';
import { EXERCISE_SEEDS, ExerciseSeed } from './data/exercises';
import { customSlug } from './slug.util';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(MuscleGroup)
    private readonly muscleGroupRepo: Repository<MuscleGroup>,
    @InjectRepository(Exercise)
    private readonly exerciseRepo: Repository<Exercise>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedMuscleGroups();
    await this.backfillMissingSlugs();
    await this.seedExercises();
  }

  async seedMuscleGroups(): Promise<void> {
    for (const group of MUSCLE_GROUP_SEEDS) {
      await this.muscleGroupRepo.upsert(group, ['name']);
    }
    this.logger.log(`Seeded ${MUSCLE_GROUP_SEEDS.length} muscle groups`);
  }

  async backfillMissingSlugs(): Promise<void> {
    const rows = await this.exerciseRepo.find({ where: { slug: IsNull() } });
    if (rows.length === 0) return;
    for (const row of rows) {
      row.slug = customSlug();
      await this.exerciseRepo.save(row);
    }
    this.logger.log(`Backfilled slug for ${rows.length} existing exercise(s)`);
  }

  async seedExercises(): Promise<void> {
    const allGroups = await this.muscleGroupRepo.find();
    const groupByName = new Map(allGroups.map((g) => [g.name, g]));
    for (const seed of EXERCISE_SEEDS) {
      await this.upsertExerciseSeed(seed, groupByName);
    }
    this.logger.log(`Seeded ${EXERCISE_SEEDS.length} default exercises`);
  }

  private async upsertExerciseSeed(
    seed: ExerciseSeed,
    groupByName: Map<string, MuscleGroup>,
  ): Promise<void> {
    const muscleGroups = seed.muscleGroupSlugs
      .map((name) => groupByName.get(name))
      .filter((g): g is MuscleGroup => Boolean(g));

    const existing = await this.exerciseRepo.findOne({
      where: { slug: seed.slug },
      relations: ['muscleGroups'],
    });

    if (existing) {
      existing.name = seed.name;
      existing.equipment = seed.equipment;
      existing.description = seed.description;
      existing.category = seed.category;
      existing.difficulty = seed.difficulty;
      existing.isDefault = true;
      existing.createdBy = null;
      existing.muscleGroups = muscleGroups;
      await this.exerciseRepo.save(existing);
      return;
    }

    const created = this.exerciseRepo.create({
      slug: seed.slug,
      name: seed.name,
      equipment: seed.equipment,
      description: seed.description,
      category: seed.category,
      difficulty: seed.difficulty,
      isDefault: true,
      createdBy: null,
      muscleGroups,
    });
    await this.exerciseRepo.save(created);
  }
}
