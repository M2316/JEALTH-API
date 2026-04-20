export interface EvalCase {
  id: string;
  category:
    | 'single-set'
    | 'n-sets'
    | 'typo'
    | 'new-exercise'
    | 'multi-exercise'
    | 'low-confidence'
    | 'edge';
  text: string;
  // 옵션. "정답" 근육군 집합 (신규 운동 케이스에서 Flash/Pro 정확도 비교용)
  expectedMuscleGroups?: string[];
}

export const CASES: EvalCase[] = [
  // 정형 단일 세트
  { id: 's1', category: 'single-set', text: '데드리프트 100키로 10개' },
  { id: 's2', category: 'single-set', text: '스쿼트 80kg 5회' },
  { id: 's3', category: 'single-set', text: '벤치프레스 60 8' },
  { id: 's4', category: 'single-set', text: '덤벨컬 15 12' },
  { id: 's5', category: 'single-set', text: '바벨로우 70kg 10회' },
  { id: 's6', category: 'single-set', text: '랫풀다운 50 10개' },
  { id: 's7', category: 'single-set', text: '레그프레스 120 15' },
  { id: 's8', category: 'single-set', text: '오버헤드프레스 40키로 8개' },
  { id: 's9', category: 'single-set', text: '핵스쿼트 100 10' },
  { id: 's10', category: 'single-set', text: '레그컬 35kg 12' },

  // 정형 N세트
  { id: 'n1', category: 'n-sets', text: '벤치프레스 80키로 8개 5세트' },
  { id: 'n2', category: 'n-sets', text: '스쿼트 100kg 5회 3세트' },
  { id: 'n3', category: 'n-sets', text: '데드리프트 140 5 3세트' },
  { id: 'n4', category: 'n-sets', text: '풀업 0 10개 4세트' },
  { id: 'n5', category: 'n-sets', text: '덤벨컬 15kg 12 5세트' },

  // 오타/변형
  { id: 't1', category: 'typo', text: '덷리프트 100키로 10개' },
  { id: 't2', category: 'typo', text: '덤젤프레스 20 10' },
  { id: 't3', category: 'typo', text: '스쿼드 80 5' },
  { id: 't4', category: 'typo', text: '밴치프레스 60키로 8개' },
  { id: 't5', category: 'typo', text: '렛풀다운 50 10' },
  { id: 't6', category: 'typo', text: '오버헤드프래스 40 8' },
  { id: 't7', category: 'typo', text: '데드리프드 100 10' },
  { id: 't8', category: 'typo', text: '풀엎 0 15' },

  // 신규 운동 후보
  {
    id: 'x1',
    category: 'new-exercise',
    text: '힙쓰러스트 80 10',
    expectedMuscleGroups: ['하체', '엉덩이', '둔근'],
  },
  {
    id: 'x2',
    category: 'new-exercise',
    text: '케이블 크로스오버 15 12',
    expectedMuscleGroups: ['가슴'],
  },
  {
    id: 'x3',
    category: 'new-exercise',
    text: '페이스풀 20 12',
    expectedMuscleGroups: ['어깨', '후면삼각근'],
  },
  {
    id: 'x4',
    category: 'new-exercise',
    text: '시티드 로우 60 10',
    expectedMuscleGroups: ['등'],
  },
  {
    id: 'x5',
    category: 'new-exercise',
    text: '불가리안 스플릿 스쿼트 20 10',
    expectedMuscleGroups: ['하체'],
  },

  // 여러 운동 섞임
  { id: 'm1', category: 'multi-exercise', text: '스쿼트 100 10, 벤치프레스 80 8' },
  { id: 'm2', category: 'multi-exercise', text: '데드리프트 120 5 풀업 0 10' },
  { id: 'm3', category: 'multi-exercise', text: '벤치 60 8 덤벨컬 15 12' },

  // 저신뢰 / 운동 외
  { id: 'l1', category: 'low-confidence', text: '오늘 뭐할까' },
  { id: 'l2', category: 'low-confidence', text: '안녕' },
  { id: 'l3', category: 'low-confidence', text: '' },

  // 경계
  { id: 'e1', category: 'edge', text: '데드리프트 0키로 0개' },
  { id: 'e2', category: 'edge', text: '스쿼트 100.5키로 5개' },
  { id: 'e3', category: 'edge', text: '벤치프레스 80파운드 8개' },
  { id: 'e4', category: 'edge', text: '벤치프레스 80lbs 8' },
  {
    id: 'e5',
    category: 'edge',
    text:
      '데드리프트 100 10 아 오늘 진짜 힘들었다 아까 커피도 마셨는데 ' +
      '왜이렇게 피곤하지 그래도 할건 해야지',
  },
  { id: 'e6', category: 'edge', text: '   스쿼트    80   5   ' },
];
