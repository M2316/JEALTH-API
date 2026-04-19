import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { Exercise } from '../entities/exercise.entity';
import { MuscleGroup } from '../entities/muscle-group.entity';
import { ExerciseService } from '../exercise.service';
import { ExerciseCategory } from '../enums/exercise-category.enum';
import { ExerciseDifficulty } from '../enums/exercise-difficulty.enum';

describe('ExerciseService', () => {
  let service: ExerciseService;
  let exerciseRepo: any;
  let muscleRepo: any;
  let savedRows: any[];

  beforeEach(async () => {
    savedRows = [];
    exerciseRepo = {
      create: jest.fn((x) => ({ ...x })),
      save: jest.fn(async (x) => {
        const saved = { id: x.id ?? `ex-${savedRows.length + 1}`, ...x };
        savedRows.push(saved);
        return saved;
      }),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      remove: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
    };
    muscleRepo = {
      findBy: jest.fn().mockResolvedValue([{ id: 'mg-1', name: 'chest' }]),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ExerciseService,
        { provide: getRepositoryToken(Exercise), useValue: exerciseRepo },
        { provide: getRepositoryToken(MuscleGroup), useValue: muscleRepo },
      ],
    }).compile();
    service = moduleRef.get(ExerciseService);
  });

  describe('create', () => {
    it('forces isDefault=false even if body says true', async () => {
      await service.create(
        {
          name: '내 커스텀',
          muscleGroupIds: ['mg-1'],
          isDefault: true as any,
        } as any,
        'user-1',
      );
      expect(savedRows[0].isDefault).toBe(false);
    });

    it('sets createdBy to acting user', async () => {
      await service.create(
        { name: '내 커스텀', muscleGroupIds: ['mg-1'] } as any,
        'user-1',
      );
      expect(savedRows[0].createdBy).toEqual({ id: 'user-1' });
    });

    it('generates custom-<hex8> slug', async () => {
      await service.create(
        { name: '내 커스텀', muscleGroupIds: ['mg-1'] } as any,
        'user-1',
      );
      expect(savedRows[0].slug).toMatch(/^custom-[a-f0-9]{8}$/);
    });

    it('persists description/category/difficulty when provided', async () => {
      await service.create(
        {
          name: '내 커스텀',
          muscleGroupIds: ['mg-1'],
          description: '동작 설명',
          category: ExerciseCategory.Isolation,
          difficulty: ExerciseDifficulty.Beginner,
        } as any,
        'user-1',
      );
      expect(savedRows[0].description).toBe('동작 설명');
      expect(savedRows[0].category).toBe(ExerciseCategory.Isolation);
      expect(savedRows[0].difficulty).toBe(ExerciseDifficulty.Beginner);
    });
  });
});
