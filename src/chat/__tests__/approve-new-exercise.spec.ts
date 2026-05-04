import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DataSource, EntityManager, ILike } from 'typeorm';
import { ChatService } from '../chat.service';
import { ExerciseRagService } from '../services/exercise-rag.service';
import { GeminiService } from '../services/gemini.service';
import { ExerciseNameResolverService } from '../services/exercise-name-resolver.service';
import { ExerciseMetaInferenceService } from '../services/exercise-meta-inference.service';
import { WorkoutContextService } from '../services/workout-context.service';
import { WorkoutParserService } from '../services/workout-parser.service';
import { ExerciseService } from '../../workout/exercise.service';
import { RoutineService } from '../../workout/routine.service';

describe('ChatService.approveNewExercise', () => {
  let service: ChatService;
  let dataSource: { transaction: jest.Mock };
  let routineService: { appendExerciseWithSetsTx: jest.Mock };
  let managerRepoExercise: {
    findOne: jest.Mock; save: jest.Mock;
  };
  let managerRepoMuscle: { findBy: jest.Mock };
  let managerCreateSpy: jest.Mock;

  const mkManager = (): EntityManager => ({
    create: managerCreateSpy,
    getRepository: jest.fn((entity: any) => {
      if (entity.name === 'Exercise') return managerRepoExercise;
      if (entity.name === 'MuscleGroup') return managerRepoMuscle;
      throw new Error('unexpected entity: ' + entity.name);
    }),
  }) as any;

  beforeEach(async () => {
    managerCreateSpy = jest.fn((_e: any, p: any) => p);
    managerRepoExercise = {
      findOne: jest.fn(),
      save: jest.fn(async (p: any) => ({ id: 'ex-new', ...p })),
    };
    managerRepoMuscle = { findBy: jest.fn() };
    routineService = {
      appendExerciseWithSetsTx: jest.fn(async () => ({ id: 'r-1' })),
    };
    dataSource = {
      transaction: jest.fn(async (fn: any) => fn(mkManager())),
    };
    const module = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: ExerciseRagService, useValue: { findCandidateNames: jest.fn() } },
        { provide: GeminiService, useValue: { generateJson: jest.fn() } },
        { provide: ExerciseNameResolverService, useValue: { resolveName: jest.fn() } },
        { provide: ExerciseMetaInferenceService, useValue: { inferNewExerciseMeta: jest.fn() } },
        { provide: WorkoutContextService, useValue: { getLastApprovedExerciseName: jest.fn() } },
        { provide: WorkoutParserService, useValue: { tryParse: jest.fn() } },
        { provide: ExerciseService, useValue: { findAllMuscleGroups: jest.fn() } },
        { provide: RoutineService, useValue: routineService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = module.get(ChatService);
  });

  const baseDto = () => ({
    date: '2026-04-19',
    name: '  스쿼트  ',
    muscleGroupIds: ['mg-a', 'mg-b'],
    sets: [{ round: 1, reps: 10, weight: 100, weightUnit: 'kg' as const }],
  });

  it('creates exercise when none exists (race-clear), then appends routine', async () => {
    managerRepoExercise.findOne.mockResolvedValueOnce(null);
    managerRepoMuscle.findBy.mockResolvedValueOnce([
      { id: 'mg-a' }, { id: 'mg-b' },
    ]);
    const result: any = await service.approveNewExercise(baseDto(), 'u-1');
    expect(managerCreateSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: '스쿼트', // trimmed
        muscleGroups: [{ id: 'mg-a' }, { id: 'mg-b' }],
      }),
    );
    expect(routineService.appendExerciseWithSetsTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 'u-1',
        date: '2026-04-19',
        exerciseId: 'ex-new',
        sets: baseDto().sets,
      }),
    );
    expect(result.exercise.id).toBe('ex-new');
    expect(result.routine.id).toBe('r-1');
  });

  it('reuses existing exercise on race (case-insensitive match)', async () => {
    managerRepoExercise.findOne.mockResolvedValueOnce({
      id: 'ex-existing',
      name: '스쿼트',
      muscleGroups: [{ id: 'mg-x' }],
    });
    const result: any = await service.approveNewExercise(baseDto(), 'u-1');
    expect(managerCreateSpy).not.toHaveBeenCalled();
    expect(managerRepoExercise.save).not.toHaveBeenCalled();
    expect(result.exercise.id).toBe('ex-existing');
    expect(routineService.appendExerciseWithSetsTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ exerciseId: 'ex-existing' }),
    );
  });

  it('throws BadRequest when any muscleGroupId is invalid', async () => {
    managerRepoExercise.findOne.mockResolvedValueOnce(null);
    managerRepoMuscle.findBy.mockResolvedValueOnce([{ id: 'mg-a' }]); // only 1 of 2
    await expect(
      service.approveNewExercise(baseDto(), 'u-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('queries exercise by case-insensitive ILike', async () => {
    managerRepoExercise.findOne.mockResolvedValueOnce({ id: 'ex-1' });
    await service.approveNewExercise(baseDto(), 'u-1');
    const where = managerRepoExercise.findOne.mock.calls[0][0].where;
    expect(where.name).toEqual(ILike('스쿼트'));
  });
});
