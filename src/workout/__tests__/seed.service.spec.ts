import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';
import { MuscleGroup } from '../entities/muscle-group.entity';
import { Exercise } from '../entities/exercise.entity';
import { SeedService } from '../seed/seed.service';
import { MUSCLE_GROUP_SEEDS } from '../seed/data/muscle-groups';
import { EXERCISE_SEEDS } from '../seed/data/exercises';

describe('SeedService', () => {
  let service: SeedService;
  let muscleRepo: {
    upsert: jest.Mock;
    find: jest.Mock;
  };
  let exerciseRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(async () => {
    muscleRepo = {
      upsert: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockResolvedValue(
        MUSCLE_GROUP_SEEDS.map((g, i) => ({ id: `mg-${i}`, ...g })),
      ),
    };
    exerciseRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation(async (x) => ({ id: 'ex-x', ...x })),
      create: jest.fn().mockImplementation((x) => x),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SeedService,
        { provide: getRepositoryToken(MuscleGroup), useValue: muscleRepo },
        { provide: getRepositoryToken(Exercise), useValue: exerciseRepo },
      ],
    }).compile();
    service = moduleRef.get(SeedService);
  });

  it('upserts every muscle group on empty DB', async () => {
    await service.seedMuscleGroups();
    expect(muscleRepo.upsert).toHaveBeenCalledTimes(MUSCLE_GROUP_SEEDS.length);
  });

  it('creates every default exercise on empty DB', async () => {
    await service.seedExercises();
    expect(exerciseRepo.save).toHaveBeenCalledTimes(EXERCISE_SEEDS.length);
  });

  it('updates instead of creating when slug already exists', async () => {
    const existing = {
      id: 'ex-1',
      slug: 'bench-press',
      name: '기존이름',
      muscleGroups: [],
      isDefault: true,
      createdBy: null,
    };
    exerciseRepo.findOne.mockImplementation(async ({ where }: any) =>
      where.slug === 'bench-press' ? existing : null,
    );
    await service.seedExercises();
    expect(existing.name).toBe('벤치프레스');
    expect(existing.isDefault).toBe(true);
    expect(exerciseRepo.create).toHaveBeenCalledTimes(EXERCISE_SEEDS.length - 1);
  });

  it('backfills slug only for rows where slug IS NULL', async () => {
    const row = { id: 'ex-null', slug: null };
    exerciseRepo.find.mockResolvedValue([row]);
    await service.backfillMissingSlugs();
    expect(exerciseRepo.find).toHaveBeenCalledWith({ where: { slug: IsNull() } });
    expect(row.slug).toMatch(/^custom-[a-f0-9]{8}$/);
    expect(exerciseRepo.save).toHaveBeenCalledWith(row);
  });

  it('skips backfill when no null slugs exist', async () => {
    exerciseRepo.find.mockResolvedValue([]);
    await service.backfillMissingSlugs();
    expect(exerciseRepo.save).not.toHaveBeenCalled();
  });
});
