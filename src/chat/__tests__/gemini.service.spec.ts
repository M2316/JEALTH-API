import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GeminiService } from '../services/gemini.service';

const generateContentMock = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: generateContentMock },
  })),
  Type: {
    OBJECT: 'OBJECT',
    STRING: 'STRING',
    ARRAY: 'ARRAY',
    INTEGER: 'INTEGER',
    NUMBER: 'NUMBER',
  },
}));

describe('GeminiService', () => {
  let service: GeminiService;

  beforeEach(async () => {
    generateContentMock.mockReset();
    const module = await Test.createTestingModule({
      providers: [
        GeminiService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              (
                ({
                  GEMINI_API_KEY: 'k',
                  GEMINI_MODEL: 'gemini-2.5-flash',
                  GEMINI_MAX_OUTPUT_TOKENS: 512,
                  GEMINI_TIMEOUT_MS: 15000,
                }) as Record<string, string | number>
              )[key],
          },
        },
      ],
    }).compile();
    service = module.get(GeminiService);
  });

  it('returns parsed text from generateContent response', async () => {
    generateContentMock.mockResolvedValue({ text: '{"ok":true}' });
    const text = await service.generateJson({
      systemInstruction: 'sys',
      contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
      responseSchema: { type: 'OBJECT' } as never,
    });
    expect(text).toBe('{"ok":true}');
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });

  it('propagates errors', async () => {
    generateContentMock.mockRejectedValue(new Error('boom'));
    await expect(
      service.generateJson({
        systemInstruction: 'sys',
        contents: [],
        responseSchema: {} as never,
      }),
    ).rejects.toThrow('boom');
  });

  it('throws at construction when GEMINI_API_KEY is missing', async () => {
    const moduleRef = Test.createTestingModule({
      providers: [
        GeminiService,
        {
          provide: ConfigService,
          useValue: { get: () => undefined },
        },
      ],
    });
    await expect(moduleRef.compile()).rejects.toThrow(/GEMINI_API_KEY/);
  });

  it('uses default temperature 0.2 when caller omits it', async () => {
    generateContentMock.mockResolvedValue({ text: '{}' });
    await service.generateJson({
      systemInstruction: 's',
      contents: [],
      responseSchema: {} as never,
    });
    const callArg = generateContentMock.mock.calls[0][0];
    expect(callArg.config.temperature).toBe(0.2);
  });
});
