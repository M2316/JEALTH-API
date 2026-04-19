import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Type } from '@google/genai';
import { MuscleGroup } from '../../workout/entities/muscle-group.entity';
import { GeminiService } from './gemini.service';

export interface InferredExerciseMeta {
  muscleGroupIds: string[];
  equipment?: string; // '바벨' | '덤벨' | '머신' | '맨몸' 중 하나 혹은 undefined
}

const EQUIPMENT_OPTIONS = ['바벨', '덤벨', '머신', '맨몸'] as const;

@Injectable()
export class ExerciseMetaInferenceService {
  private readonly logger = new Logger(ExerciseMetaInferenceService.name);

  constructor(
    private readonly gemini: GeminiService,
    private readonly config: ConfigService,
    @InjectRepository(MuscleGroup)
    private readonly repo: Repository<MuscleGroup>,
  ) {}

  async inferNewExerciseMeta(
    exerciseName: string,
  ): Promise<InferredExerciseMeta> {
    const allGroups = await this.repo.find();
    if (allGroups.length === 0) return { muscleGroupIds: [] };

    const model =
      this.config.get<string>('GEMINI_INFER_MODEL') ?? 'gemini-3-pro-preview';

    const systemInstruction =
      '운동 이름이 주어진다. 다음 두 가지를 추론해 반환하라.\n' +
      '1) muscleGroupIds: 아래 근육 그룹 목록에서 이 운동이 주로 사용하는 그룹의 id (최소 1개).\n' +
      '2) equipment: 주로 사용하는 장비 1개 (바벨·덤벨·머신·맨몸 중). 판단하기 어려우면 생략.\n\n' +
      '근육 그룹:\n' +
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
        equipment: {
          type: Type.STRING,
          enum: [...EQUIPMENT_OPTIONS],
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
      const parsed = JSON.parse(text) as {
        muscleGroupIds?: string[];
        equipment?: string;
      };
      const ids = Array.isArray(parsed.muscleGroupIds)
        ? parsed.muscleGroupIds
        : [];
      const eq =
        typeof parsed.equipment === 'string' &&
        (EQUIPMENT_OPTIONS as readonly string[]).includes(parsed.equipment)
          ? parsed.equipment
          : undefined;
      return { muscleGroupIds: ids, equipment: eq };
    } catch (e) {
      this.logger.warn(
        `Pro 추론 실패 (${exerciseName}): ${(e as Error).message}`,
      );
      return { muscleGroupIds: [] };
    }
  }
}
