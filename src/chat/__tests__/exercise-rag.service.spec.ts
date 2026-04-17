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
    const configMock = {
      get: jest.fn((key: string) =>
        key === 'EXERCISE_RAG_MIN_SIMILARITY' ? 0.1 : 10,
      ),
    };
    const module = await Test.createTestingModule({
      providers: [
        ExerciseRagService,
        { provide: ConfigService, useValue: configMock },
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
    expect(sql).toMatch(/<->/);
    expect(sql).toMatch(/LIMIT/);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('a');
  });

  it('returns empty array when query is blank', async () => {
    const result = await service.findCandidates('   ');
    expect(result).toEqual([]);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('passes topK and minSimilarity to query bindings', async () => {
    queryMock.mockResolvedValue([]);
    await service.findCandidates('벤치');
    const bindings = queryMock.mock.calls[0][1];
    expect(bindings[0]).toBe('벤치'); // $1 message
    expect(bindings[1]).toBe(10); // $2 topK
    expect(bindings[2]).toBe(0.1); // $3 minSimilarity
  });
});
