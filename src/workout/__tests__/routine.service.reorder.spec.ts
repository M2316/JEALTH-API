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
