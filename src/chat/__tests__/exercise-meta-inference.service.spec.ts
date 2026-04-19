import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { MuscleGroup } from '../../workout/entities/muscle-group.entity';
import { ExerciseMetaInferenceService } from '../services/exercise-meta-inference.service';
import { GeminiService } from '../services/gemini.service';

describe('ExerciseMetaInferenceService', () => {
  let service: ExerciseMetaInferenceService;
  let gemini: { generateJson: jest.Mock };
  let mgRepo: { find: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(async () => {
    gemini = { generateJson: jest.fn() };
    mgRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 'mg-leg', name: '하체' },
        { id: 'mg-quad', name: '대퇴사두' },
        { id: 'mg-chest', name: '가슴' },
      ]),
    };
    config = {
      get: jest.fn((k: string) =>
        k === 'GEMINI_INFER_MODEL' ? 'gemini-3-pro-preview' : undefined,
      ),
    };
    const module = await Test.createTestingModule({
      providers: [
        ExerciseMetaInferenceService,
        { provide: GeminiService, useValue: gemini },
        { provide: getRepositoryToken(MuscleGroup), useValue: mgRepo },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = module.get(ExerciseMetaInferenceService);
  });

  it('returns {muscleGroupIds, equipment} from Pro model', async () => {
    gemini.generateJson.mockResolvedValueOnce(
      JSON.stringify({ muscleGroupIds: ['mg-leg'], equipment: '바벨' }),
    );
    const result = await service.inferNewExerciseMeta('스쿼트');
    expect(result).toEqual({ muscleGroupIds: ['mg-leg'], equipment: '바벨' });
  });

  it('returns undefined equipment when Pro omits it', async () => {
    gemini.generateJson.mockResolvedValueOnce(
      JSON.stringify({ muscleGroupIds: ['mg-leg'] }),
    );
    const result = await service.inferNewExerciseMeta('스쿼트');
    expect(result).toEqual({ muscleGroupIds: ['mg-leg'] });
    expect(result.equipment).toBeUndefined();
  });

  it('drops equipment if not in enum options', async () => {
    gemini.generateJson.mockResolvedValueOnce(
      JSON.stringify({ muscleGroupIds: ['mg-leg'], equipment: '해머' }),
    );
    const result = await service.inferNewExerciseMeta('스쿼트');
    expect(result.equipment).toBeUndefined();
  });

  it('returns {muscleGroupIds:[]} on Gemini error', async () => {
    gemini.generateJson.mockRejectedValueOnce(new Error('timeout'));
    const result = await service.inferNewExerciseMeta('스쿼트');
    expect(result).toEqual({ muscleGroupIds: [] });
  });

  it('returns {muscleGroupIds:[]} on parse error', async () => {
    gemini.generateJson.mockResolvedValueOnce('not json');
    const result = await service.inferNewExerciseMeta('스쿼트');
    expect(result).toEqual({ muscleGroupIds: [] });
  });

  it('passes GEMINI_INFER_MODEL as model override', async () => {
    gemini.generateJson.mockResolvedValueOnce(
      JSON.stringify({ muscleGroupIds: ['mg-leg'] }),
    );
    await service.inferNewExerciseMeta('스쿼트');
    expect(gemini.generateJson).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-3-pro-preview' }),
    );
  });

  it('enum is restricted to existing muscle group ids', async () => {
    gemini.generateJson.mockResolvedValueOnce(
      JSON.stringify({ muscleGroupIds: ['mg-leg'] }),
    );
    await service.inferNewExerciseMeta('스쿼트');
    const call = gemini.generateJson.mock.calls[0][0];
    const enumVals =
      call.responseSchema.properties.muscleGroupIds.items.enum;
    expect(enumVals).toEqual(['mg-leg', 'mg-quad', 'mg-chest']);
  });
});
