export type MuscleGroupSeed = {
  name: string;    // 영문 unique key
  nameKo: string;  // 사용자 노출 라벨
};

export const MUSCLE_GROUP_SEEDS: MuscleGroupSeed[] = [
  { name: 'chest', nameKo: '가슴' },
  { name: 'back', nameKo: '등' },
  { name: 'shoulders', nameKo: '어깨' },
  { name: 'arms', nameKo: '팔' },
  { name: 'legs', nameKo: '하체' },
  { name: 'core', nameKo: '코어' },
];
