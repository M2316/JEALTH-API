import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Exercise } from '../../workout/entities/exercise.entity';
import { ExerciseRagService } from '../services/exercise-rag.service';

describe('ExerciseRagService', () => {
  let service: ExerciseRagService;
  let queryMock: jest.Mock;

  beforeEach(async () => {
    queryMock = jest.fn();
    const module = await Test.createTestingModule({
      providers: [
        ExerciseRagService,
        { provide: ConfigService, useValue: { get: () => 10 } },
        {
          provide: getRepositoryToken(Exercise),
          useValue: { manager: { query: queryMock } },
        },
      ],
    }).compile();
    service = module.get(ExerciseRagService);
  });

  it('returns top-K candidates ordered by trigram similarity', async () => {
    queryMock.mockResolvedValue([
      { id: 'a', name: '벤치프레스' },
      { id: 'b', name: '인클라인 벤치프레스' },
    ]);
    const result = await service.findCandidates('오늘 벤치 4세트');
    expect(queryMock).toHaveBeenCalled();
    const sql = queryMock.mock.calls[0][0] as string;
    expect(sql).toMatch(/similarity/);
    expect(sql).toMatch(/LIMIT/);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('a');
  });

  it('returns empty array when query is blank', async () => {
    const result = await service.findCandidates('   ');
    expect(result).toEqual([]);
    expect(queryMock).not.toHaveBeenCalled();
  });
});
