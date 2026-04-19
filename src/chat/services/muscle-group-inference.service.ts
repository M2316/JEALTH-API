import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Type } from '@google/genai';
import { MuscleGroup } from '../../workout/entities/muscle-group.entity';
import { GeminiService } from './gemini.service';

@Injectable()
export class MuscleGroupInferenceService {
  private readonly logger = new Logger(MuscleGroupInferenceService.name);

  constructor(
    private readonly gemini: GeminiService,
    private readonly config: ConfigService,
    @InjectRepository(MuscleGroup)
    private readonly repo: Repository<MuscleGroup>,
  ) {}

  async inferMuscleGroups(exerciseName: string): Promise<string[]> {
    const allGroups = await this.repo.find();
    if (allGroups.length === 0) return [];

    const model =
      this.config.get<string>('GEMINI_INFER_MODEL') ?? 'gemini-3-pro-preview';

    const systemInstruction =
      '운동 이름이 주어진다. 아래 근육 그룹 목록에서 이 운동이 주로 사용하는 그룹의 id 를 muscleGroupIds 배열로 반환하라. 최소 1개.\n' +
      allGroups.map((g) => `- ${g.id}: ${g.name}`).join('\n');

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        muscleGroupIds: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
            enum: allGroups.map((g) => g.id),
          },
          minItems: '1',
        },
      },
      required: ['muscleGroupIds'],
    } as const;

    try {
      const text = await this.gemini.generateJson({
        systemInstruction,
        contents: [{ role: 'user', parts: [{ text: exerciseName }] }],
        responseSchema,
        model,
      });
      const parsed = JSON.parse(text) as { muscleGroupIds?: string[] };
      return Array.isArray(parsed.muscleGroupIds) ? parsed.muscleGroupIds : [];
    } catch (e) {
      this.logger.warn(
        `Pro 근육 그룹 추론 실패 (${exerciseName}): ${(e as Error).message}`,
      );
      return [];
    }
  }
}
