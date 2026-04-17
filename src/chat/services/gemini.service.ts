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

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
    this.client = new GoogleGenAI({ apiKey });
    this.model = this.config.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash';
    this.maxTokens = Number(this.config.get('GEMINI_MAX_OUTPUT_TOKENS') ?? 512);
  }

  async generateJson(params: GeminiCallParams): Promise<string> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: params.contents,
      config: {
        systemInstruction: params.systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: params.responseSchema,
        temperature: params.temperature ?? 0.2,
        maxOutputTokens: this.maxTokens,
      },
    });
    return response.text ?? '';
  }
}
