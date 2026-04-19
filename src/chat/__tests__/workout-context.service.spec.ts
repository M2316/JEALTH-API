import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WorkoutRoutine } from '../../workout/entities/workout-routine.entity';
import { WorkoutContextService } from '../services/workout-context.service';

describe('WorkoutContextService', () => {
  let service: WorkoutContextService;
  let repo: { findOne: jest.Mock };

  beforeEach(async () => {
    repo = { findOne: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        WorkoutContextService,
        { provide: getRepositoryToken(WorkoutRoutine), useValue: repo },
      ],
    }).compile();
    service = module.get(WorkoutContextService);
  });

  it('returns last exercise name (by order) of routine for date', async () => {
    repo.findOne.mockResolvedValueOnce({
      id: 'r1',
      exercises: [
        { order: 0, exercise: { name: '벤치프레스' } },
        { order: 1, exercise: { name: '스쿼트' } },
      ],
    });
    const name = await service.getLastApprovedExerciseName('u-1', '2026-04-19');
    expect(name).toBe('스쿼트');
    expect(repo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user: { id: 'u-1' }, date: '2026-04-19' },
      }),
    );
  });

  it('returns null when no routine for date', async () => {
    repo.findOne.mockResolvedValueOnce(null);
    const name = await service.getLastApprovedExerciseName('u-1', '2026-04-19');
    expect(name).toBeNull();
  });

  it('returns null when routine has no exercises', async () => {
    repo.findOne.mockResolvedValueOnce({ id: 'r1', exercises: [] });
    const name = await service.getLastApprovedExerciseName('u-1', '2026-04-19');
    expect(name).toBeNull();
  });

  it('picks by highest order when unordered', async () => {
    repo.findOne.mockResolvedValueOnce({
      id: 'r1',
      exercises: [
        { order: 2, exercise: { name: '데드리프트' } },
        { order: 0, exercise: { name: '벤치프레스' } },
        { order: 1, exercise: { name: '스쿼트' } },
      ],
    });
    const name = await service.getLastApprovedExerciseName('u-1', '2026-04-19');
    expect(name).toBe('데드리프트');
  });
});
