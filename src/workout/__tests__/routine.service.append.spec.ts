import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { WorkoutRoutine } from '../entities/workout-routine.entity';
import { WorkoutExercise } from '../entities/workout-exercise.entity';
import { WorkoutSet } from '../entities/workout-set.entity';
import { Exercise } from '../entities/exercise.entity';
import { RoutineService } from '../routine.service';

describe('RoutineService.appendExerciseWithSetsTx', () => {
  let service: RoutineService;
  let manager: Partial<EntityManager>;
  let created: any[];

  beforeEach(async () => {
    created = [];
    const createMock = jest.fn((entity: any, payload: any) => {
      const obj = { __entity: entity.name, ...payload };
      return obj;
    });
    const saveMock = jest.fn(async (obj: any) => {
      const saved = { id: `id-${created.length + 1}`, ...obj };
      created.push(saved);
      return saved;
    });
    const findOneMock = jest.fn().mockResolvedValue(null);
    manager = {
      create: createMock as any,
      save: saveMock as any,
      findOne: findOneMock as any,
      getRepository: jest.fn(() => ({
        findOne: findOneMock,
      })) as any,
    };
    const module = await Test.createTestingModule({
      providers: [
        RoutineService,
        { provide: getRepositoryToken(WorkoutRoutine), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(Exercise), useValue: {} },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();
    service = module.get(RoutineService);
  });

  it('creates routine when none for date, then appends exercise and sets', async () => {
    const findOne = manager.findOne as jest.Mock;
    findOne.mockResolvedValue(null);
    const result = await service.appendExerciseWithSetsTx(
      manager as EntityManager,
      {
        userId: 'u-1',
        date: '2026-04-19',
        exerciseId: 'ex-1',
        sets: [
          { round: 1, reps: 10, weight: 100, weightUnit: 'kg' },
          { round: 2, reps: 8, weight: 105, weightUnit: 'kg' },
        ],
      },
    );
    const routinesCreated = created.filter((o) => o.__entity === 'WorkoutRoutine');
    const wesCreated = created.filter((o) => o.__entity === 'WorkoutExercise');
    const setsCreated = created.filter((o) => o.__entity === 'WorkoutSet');
    expect(routinesCreated).toHaveLength(1);
    expect(wesCreated).toHaveLength(1);
    expect(wesCreated[0].order).toBe(0);
    expect(setsCreated).toHaveLength(2);
    expect(setsCreated.map((s) => s.round)).toEqual([1, 2]);
    expect(result).toBeDefined();
  });

  it('appends exercise with order = existingCount when routine exists', async () => {
    const findOne = manager.findOne as jest.Mock;
    findOne.mockResolvedValueOnce({
      id: 'r-1',
      exercises: [
        { id: 'we-a', order: 0 },
        { id: 'we-b', order: 1 },
      ],
    });
    await service.appendExerciseWithSetsTx(manager as EntityManager, {
      userId: 'u-1',
      date: '2026-04-19',
      exerciseId: 'ex-new',
      sets: [{ round: 1, reps: 5, weight: 120, weightUnit: 'kg' }],
    });
    const wesCreated = created.filter((o) => o.__entity === 'WorkoutExercise');
    expect(wesCreated).toHaveLength(1);
    expect(wesCreated[0].order).toBe(2);
  });
});
