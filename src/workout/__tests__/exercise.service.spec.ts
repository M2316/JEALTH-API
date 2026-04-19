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
    const qb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    exerciseRepo.createQueryBuilder = jest.fn(() => qb);
    (exerciseRepo as any).__qb = qb;
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

  describe('update/remove guards', () => {
    it('update rejects default exercise with 403', async () => {
      exerciseRepo.findOne.mockResolvedValue({
        id: 'ex-1',
        isDefault: true,
        createdBy: null,
        muscleGroups: [],
      });
      await expect(
        service.update('ex-1', { name: '변경시도' } as any, 'user-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('update rejects exercise owned by another user with 403', async () => {
      exerciseRepo.findOne.mockResolvedValue({
        id: 'ex-2',
        isDefault: false,
        createdBy: { id: 'user-X' },
        muscleGroups: [],
      });
      await expect(
        service.update('ex-2', { name: '해킹' } as any, 'user-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('remove rejects default exercise with 403', async () => {
      exerciseRepo.findOne.mockResolvedValue({
        id: 'ex-1',
        isDefault: true,
        createdBy: null,
        muscleGroups: [],
      });
      await expect(service.remove('ex-1', 'user-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('remove rejects exercise owned by another user with 403', async () => {
      exerciseRepo.findOne.mockResolvedValue({
        id: 'ex-2',
        isDefault: false,
        createdBy: { id: 'user-X' },
        muscleGroups: [],
      });
      await expect(service.remove('ex-2', 'user-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('update succeeds for own custom exercise', async () => {
      const row = {
        id: 'ex-3',
        isDefault: false,
        createdBy: { id: 'user-1' },
        muscleGroups: [],
        name: '이전',
        equipment: null,
      };
      exerciseRepo.findOne.mockResolvedValue(row);
      await service.update('ex-3', { name: '이후' } as any, 'user-1');
      expect(row.name).toBe('이후');
    });
  });

  describe('updateImageUrl guards', () => {
    it('rejects default exercise', async () => {
      exerciseRepo.findOne.mockResolvedValue({
        id: 'ex-1',
        isDefault: true,
        createdBy: null,
        muscleGroups: [],
      });
      await expect(
        service.updateImageUrl('ex-1', '/img.jpg', 'user-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects exercise owned by another user', async () => {
      exerciseRepo.findOne.mockResolvedValue({
        id: 'ex-2',
        isDefault: false,
        createdBy: { id: 'user-X' },
        muscleGroups: [],
      });
      await expect(
        service.updateImageUrl('ex-2', '/img.jpg', 'user-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('findAll filters', () => {
    it('filters by scope=default → isDefault=true', async () => {
      await service.findAll({ scope: 'default' } as any, 'user-1');
      const qb = (exerciseRepo as any).__qb;
      expect(qb.andWhere).toHaveBeenCalledWith(
        'exercise.isDefault = :isDefault',
        { isDefault: true },
      );
    });

    it('filters by scope=mine → createdBy = user', async () => {
      await service.findAll({ scope: 'mine' } as any, 'user-1');
      const qb = (exerciseRepo as any).__qb;
      expect(qb.andWhere).toHaveBeenCalledWith(
        'exercise.createdById = :userId',
        { userId: 'user-1' },
      );
    });

    it('filters by category', async () => {
      await service.findAll({ category: 'compound' } as any, 'user-1');
      const qb = (exerciseRepo as any).__qb;
      expect(qb.andWhere).toHaveBeenCalledWith(
        'exercise.category = :category',
        { category: 'compound' },
      );
    });

    it('filters by muscleGroup id', async () => {
      await service.findAll(
        { muscleGroup: 'mg-1' } as any,
        'user-1',
      );
      const qb = (exerciseRepo as any).__qb;
      expect(qb.andWhere).toHaveBeenCalledWith(
        'mg.id = :muscleGroupId',
        { muscleGroupId: 'mg-1' },
      );
    });

    it('search (ILIKE) filter still works', async () => {
      await service.findAll({ search: '벤치' } as any, 'user-1');
      const qb = (exerciseRepo as any).__qb;
      expect(qb.andWhere).toHaveBeenCalledWith(
        'exercise.name ILIKE :search',
        { search: '%벤치%' },
      );
    });
  });
});
