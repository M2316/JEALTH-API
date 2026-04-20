import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkoutRoutine } from '../entities/workout-routine.entity';
import { WorkoutExercise } from '../entities/workout-exercise.entity';
import { WorkoutSet } from '../entities/workout-set.entity';
import { Exercise } from '../entities/exercise.entity';
import { RoutineService } from '../routine.service';

describe('RoutineService.reorderExercises', () => {
  let service: RoutineService;
  let routineRepo: any;
  let dataSource: any;
  let manager: any;

  const routineId = 'r-1';
  const userId = 'u-1';

  beforeEach(async () => {
    const saved: Record<string, any> = {};
    manager = {
      findOne: jest.fn(),
      save: jest.fn(async (entity: any, payload?: any) => {
        const obj = payload ?? entity;
        saved[obj.id] = { ...saved[obj.id], ...obj };
        return saved[obj.id];
      }),
    };
    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(manager)),
    };
    routineRepo = {
      findOne: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [
        RoutineService,
        { provide: getRepositoryToken(WorkoutRoutine), useValue: routineRepo },
        { provide: getRepositoryToken(Exercise), useValue: {} },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = module.get(RoutineService);
  });

  it('reassigns order by array index in a transaction', async () => {
    const routine = {
      id: routineId,
      user: { id: userId },
      exercises: [
        { id: 'e-1', order: 0 },
        { id: 'e-2', order: 1 },
        { id: 'e-3', order: 2 },
      ],
    };
    routineRepo.findOne.mockResolvedValueOnce(routine);
    routineRepo.findOne.mockResolvedValueOnce({ ...routine, exercises: [] });

    await service.reorderExercises(routineId, userId, ['e-3', 'e-1', 'e-2']);

    expect(dataSource.transaction).toHaveBeenCalled();
    const saveCalls = (manager.save as jest.Mock).mock.calls;
    const byId = Object.fromEntries(
      saveCalls.map(([, payload]) => [payload.id, payload.order]),
    );
    expect(byId).toEqual({ 'e-3': 0, 'e-1': 1, 'e-2': 2 });
  });

  it('throws NotFoundException when routine belongs to another user', async () => {
    routineRepo.findOne.mockResolvedValue(null);
    await expect(
      service.reorderExercises(routineId, userId, ['e-1']),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequestException when orderedIds set mismatches', async () => {
    routineRepo.findOne.mockResolvedValue({
      id: routineId,
      user: { id: userId },
      exercises: [
        { id: 'e-1', order: 0 },
        { id: 'e-2', order: 1 },
      ],
    });
    await expect(
      service.reorderExercises(routineId, userId, ['e-1', 'e-99']),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException on duplicate ids', async () => {
    routineRepo.findOne.mockResolvedValue({
      id: routineId,
      user: { id: userId },
      exercises: [{ id: 'e-1', order: 0 }],
    });
    await expect(
      service.reorderExercises(routineId, userId, ['e-1', 'e-1']),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('RoutineService.reorderSets', () => {
  let service: RoutineService;
  let routineRepo: any;
  let dataSource: any;
  let manager: any;

  const routineId = 'r-1';
  const exerciseId = 'e-1';
  const userId = 'u-1';

  beforeEach(async () => {
    manager = {
      save: jest.fn(async (_entity: any, payload: any) => payload),
    };
    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(manager)),
    };
    routineRepo = { findOne: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        RoutineService,
        { provide: getRepositoryToken(WorkoutRoutine), useValue: routineRepo },
        { provide: getRepositoryToken(Exercise), useValue: {} },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = module.get(RoutineService);
  });

  it('reassigns round by array index (1-based) in a transaction', async () => {
    const routine = {
      id: routineId,
      user: { id: userId },
      exercises: [
        {
          id: exerciseId,
          sets: [
            { id: 's-1', round: 1 },
            { id: 's-2', round: 2 },
            { id: 's-3', round: 3 },
          ],
        },
      ],
    };
    routineRepo.findOne.mockResolvedValueOnce(routine);
    routineRepo.findOne.mockResolvedValueOnce({ ...routine, exercises: [] });

    await service.reorderSets(routineId, exerciseId, userId, [
      's-3',
      's-1',
      's-2',
    ]);

    const saveCalls = (manager.save as jest.Mock).mock.calls;
    const byId = Object.fromEntries(
      saveCalls.map(([, payload]) => [payload.id, payload.round]),
    );
    expect(byId).toEqual({ 's-3': 1, 's-1': 2, 's-2': 3 });
  });

  it('throws NotFoundException when exercise is not part of the routine', async () => {
    routineRepo.findOne.mockResolvedValue({
      id: routineId,
      user: { id: userId },
      exercises: [{ id: 'other', sets: [] }],
    });
    await expect(
      service.reorderSets(routineId, exerciseId, userId, ['s-1']),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequestException on set id set mismatch', async () => {
    routineRepo.findOne.mockResolvedValue({
      id: routineId,
      user: { id: userId },
      exercises: [
        {
          id: exerciseId,
          sets: [
            { id: 's-1', round: 1 },
            { id: 's-2', round: 2 },
          ],
        },
      ],
    });
    await expect(
      service.reorderSets(routineId, exerciseId, userId, ['s-1', 's-99']),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
