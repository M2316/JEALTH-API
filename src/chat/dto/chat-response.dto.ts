export type ChatDraftKind = 'existing' | 'new_exercise';

export interface ChatResponseDto {
  reply: string;
  confidence: 'high' | 'low';
  parseSuccess: boolean;
  kind: ChatDraftKind;
  draft: {
    exercises: Array<{
      exerciseId: string;
      name: string;
      sets: Array<{
        round: number;
        reps: number;
        weight: number;
        weightUnit: 'kg' | 'lbs';
      }>;
    }>;
  };
  suggestedMuscleGroupIds?: string[];
  suggestedEquipment?: string;
  muscleGroups?: Array<{ id: string; name: string; color?: string }>;
  originalName?: string;
  candidates?: Array<{ id: string; name: string }>; // 하위호환 유지 (사용 중단 예정)
}
