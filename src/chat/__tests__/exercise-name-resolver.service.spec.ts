import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Exercise } from '../../workout/entities/exercise.entity';
import { ExerciseNameResolverService } from '../services/exercise-name-resolver.service';

describe('ExerciseNameResolverService', () => {
  let service: ExerciseNameResolverService;
  let queryMock: jest.Mock;

  beforeEach(async () => {
    queryMock = jest.fn();
    const module = await Test.createTestingModule({
      providers: [
        ExerciseNameResolverService,
        {
          provide: getRepositoryToken(Exercise),
          useValue: { manager: { query: queryMock } },
        },
      ],
    }).compile();
    service = module.get(ExerciseNameResolverService);
  });

  it('returns existing id on exact case-insensitive match', async () => {
    queryMock.mockResolvedValueOnce([{ id: 'id-a', name: '스쿼트' }]);
    const r = await service.resolveName('스쿼트');
    expect(r).toEqual({ kind: 'existing', id: 'id-a', name: '스쿼트' });
    expect(queryMock.mock.calls[0][0]).toMatch(/LOWER\(name\)\s*=\s*LOWER/i);
  });

  it('falls back to trgm similarity >= 0.4 when exact miss', async () => {
    queryMock
      .mockResolvedValueOnce([]) // exact miss
      .mockResolvedValueOnce([{ id: 'id-b', name: '덤벨프레스' }]); // trgm hit
    const r = await service.resolveName('덜벨프레스');
    expect(r).toEqual({ kind: 'existing', id: 'id-b', name: '덤벨프레스' });
    const secondSql = queryMock.mock.calls[1][0] as string;
    expect(secondSql).toMatch(/similarity/);
    expect(queryMock.mock.calls[1][1]).toContain(0.4);
  });

  it('returns new kind when both lookups miss', async () => {
    queryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const r = await service.resolveName('전혀없는운동');
    expect(r).toEqual({ kind: 'new', name: '전혀없는운동' });
  });

  it('trims and normalizes whitespace for lookup', async () => {
    queryMock.mockResolvedValueOnce([{ id: 'id-a', name: '벤치 프레스' }]);
    await service.resolveName('  벤치   프레스  ');
    expect(queryMock.mock.calls[0][1][0]).toBe('벤치 프레스');
  });
});
