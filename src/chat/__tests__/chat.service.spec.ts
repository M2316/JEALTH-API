import { Test } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { ChatService } from '../chat.service';
import { ExerciseRagService } from '../services/exercise-rag.service';
import { GeminiService } from '../services/gemini.service';

describe('ChatService', () => {
  let service: ChatService;
  let rag: { findCandidates: jest.Mock };
  let gemini: { generateJson: jest.Mock };

  beforeEach(async () => {
    rag = { findCandidates: jest.fn() };
    gemini = { generateJson: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: ExerciseRagService, useValue: rag },
        { provide: GeminiService, useValue: gemini },
      ],
    }).compile();
    service = module.get(ChatService);
  });

  it('returns parsed draft on first success', async () => {
    rag.findCandidates.mockResolvedValue([{ id: 'id-a', name: '벤치프레스' }]);
    gemini.generateJson.mockResolvedValue(
      JSON.stringify({
        reply: '벤치프레스 1세트 맞나요?',
        confidence: 'high',
        draft: {
          exercises: [
            {
              exerciseId: 'id-a',
              name: '벤치프레스',
              sets: [{ round: 1, reps: 10, weight: 20, weightUnit: 'kg' }],
            },
          ],
        },
      }),
    );
    const result = await service.processMessage({
      date: '2026-04-18',
      messages: [{ role: 'user', content: '벤치 1세트 10개 20kg' }],
    });
    expect(result.confidence).toBe('high');
    expect(result.draft.exercises[0].exerciseId).toBe('id-a');
    expect(result.candidates).toBeUndefined();
    expect(gemini.generateJson).toHaveBeenCalledTimes(1);
  });

  it('retries once on Zod failure with corrective system note', async () => {
    rag.findCandidates.mockResolvedValue([{ id: 'id-a', name: 'x' }]);
    gemini.generateJson.mockResolvedValueOnce('not json').mockResolvedValueOnce(
      JSON.stringify({
        reply: 'ok',
        confidence: 'low',
        draft: {
          exercises: [
            {
              exerciseId: 'id-a',
              name: 'x',
              sets: [{ round: 1, reps: 1, weight: 1, weightUnit: 'kg' }],
            },
          ],
        },
      }),
    );
    const result = await service.processMessage({
      date: '2026-04-18',
      messages: [{ role: 'user', content: 'hello' }],
    });
    expect(gemini.generateJson).toHaveBeenCalledTimes(2);
    expect(result.confidence).toBe('low');
    expect(result.candidates).toEqual([{ id: 'id-a', name: 'x' }]);
  });

  it('throws ServiceUnavailable after second failure', async () => {
    rag.findCandidates.mockResolvedValue([{ id: 'id-a', name: 'x' }]);
    gemini.generateJson
      .mockResolvedValueOnce('garbage')
      .mockResolvedValueOnce('still garbage');
    await expect(
      service.processMessage({
        date: '2026-04-18',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('filters __none__ sentinel exercises and forces confidence low', async () => {
    rag.findCandidates.mockResolvedValue([]);
    gemini.generateJson.mockResolvedValue(
      JSON.stringify({
        reply: '운동 종목을 못 찾았어요',
        confidence: 'high',
        draft: {
          exercises: [
            {
              exerciseId: '__none__',
              name: 'unknown',
              sets: [{ round: 1, reps: 1, weight: 1, weightUnit: 'kg' }],
            },
          ],
        },
      }),
    );
    const result = await service.processMessage({
      date: '2026-04-18',
      messages: [{ role: 'user', content: '뭐 했지' }],
    });
    expect(result.draft.exercises).toEqual([]);
    expect(result.confidence).toBe('low');
  });

  it('injects lastError into systemInstruction on retry', async () => {
    rag.findCandidates.mockResolvedValue([{ id: 'id-a', name: 'x' }]);
    gemini.generateJson.mockResolvedValueOnce('garbage').mockResolvedValueOnce(
      JSON.stringify({
        reply: 'ok',
        confidence: 'high',
        draft: {
          exercises: [
            {
              exerciseId: 'id-a',
              name: 'x',
              sets: [{ round: 1, reps: 1, weight: 1, weightUnit: 'kg' }],
            },
          ],
        },
      }),
    );
    await service.processMessage({
      date: '2026-04-18',
      messages: [{ role: 'user', content: 'hi' }],
    });
    const firstCallSys = gemini.generateJson.mock.calls[0][0]
      .systemInstruction as string;
    const secondCallSys = gemini.generateJson.mock.calls[1][0]
      .systemInstruction as string;
    expect(firstCallSys).not.toMatch(/이전 응답이 다음 이유로 실패했다/);
    expect(secondCallSys).toMatch(/이전 응답이 다음 이유로 실패했다/);
  });

  it('maps assistant→model role when building contents for Gemini', async () => {
    rag.findCandidates.mockResolvedValue([{ id: 'id-a', name: 'x' }]);
    gemini.generateJson.mockResolvedValue(
      JSON.stringify({
        reply: 'ok',
        confidence: 'high',
        draft: {
          exercises: [
            {
              exerciseId: 'id-a',
              name: 'x',
              sets: [{ round: 1, reps: 1, weight: 1, weightUnit: 'kg' }],
            },
          ],
        },
      }),
    );
    await service.processMessage({
      date: '2026-04-18',
      messages: [
        { role: 'user', content: 'q1' },
        { role: 'assistant', content: 'a1' },
        { role: 'user', content: 'q2' },
      ],
    });
    const contents = gemini.generateJson.mock.calls[0][0].contents;
    expect(contents.map((c: any) => c.role)).toEqual(['user', 'model', 'user']);
  });
});
