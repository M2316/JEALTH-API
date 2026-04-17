import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

export interface GeminiCallParams {
  systemInstruction: string;
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  responseSchema: object;
  temperature?: number;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly client: GoogleGenAI;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
    this.client = new GoogleGenAI({ apiKey });
    this.model = this.config.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash';
    const rawMax = Number(this.config.get('GEMINI_MAX_OUTPUT_TOKENS') ?? 512);
    this.maxTokens = Number.isFinite(rawMax) && rawMax > 0 ? rawMax : 512;
    const rawTimeout = Number(this.config.get('GEMINI_TIMEOUT_MS') ?? 15000);
    this.timeoutMs =
      Number.isFinite(rawTimeout) && rawTimeout > 0 ? rawTimeout : 15000;
  }

  async generateJson(params: GeminiCallParams): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort(
        new Error(`Gemini call timeout after ${this.timeoutMs}ms`),
      );
    }, this.timeoutMs);
    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: params.contents,
        config: {
          systemInstruction: params.systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: params.responseSchema,
          temperature: params.temperature ?? 0.2,
          maxOutputTokens: this.maxTokens,
          abortSignal: controller.signal,
        },
      });
      return response.text ?? '';
    } finally {
      clearTimeout(timer);
    }
  }
}
