import { ExerciseCategory } from '../../enums/exercise-category.enum';
import { ExerciseDifficulty } from '../../enums/exercise-difficulty.enum';

export type ExerciseSeed = {
  slug: string;
  name: string;
  equipment: string;
  category: ExerciseCategory;
  difficulty: ExerciseDifficulty;
  description: string;
  muscleGroupSlugs: string[]; // muscle_groups.name 기준
};

export const EXERCISE_SEEDS: ExerciseSeed[] = [
  // ===== 가슴 (12) =====
  { slug: 'bench-press', name: '벤치프레스', equipment: '바벨', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Intermediate, description: '벤치에 누워 바벨을 가슴 중앙까지 내렸다가 밀어 올린다. 어깨뼈를 모으고 팔꿈치는 약 45도로 유지한다.', muscleGroupSlugs: ['chest'] },
  { slug: 'incline-bench-press', name: '인클라인 벤치프레스', equipment: '바벨', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Intermediate, description: '벤치 등받이를 30~45도로 세운 뒤 바벨을 쇄골 부근으로 내렸다가 밀어 올린다. 가슴 상부 자극.', muscleGroupSlugs: ['chest'] },
  { slug: 'decline-bench-press', name: '디클라인 벤치프레스', equipment: '바벨', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Intermediate, description: '벤치를 아래로 기울여 누운 뒤 바벨을 가슴 하부로 내렸다가 민다. 가슴 하부에 집중된다.', muscleGroupSlugs: ['chest'] },
  { slug: 'dumbbell-bench-press', name: '덤벨 벤치프레스', equipment: '덤벨', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Beginner, description: '양손 덤벨을 가슴 옆까지 내렸다가 밀어 올린다. 가동 범위가 넓고 좌우 대칭 교정에 유리하다.', muscleGroupSlugs: ['chest'] },
  { slug: 'incline-dumbbell-press', name: '인클라인 덤벨프레스', equipment: '덤벨', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Intermediate, description: '인클라인 벤치에서 덤벨을 쇄골 방향으로 내렸다가 밀어 올린다. 가슴 상부와 전면 삼각근을 자극한다.', muscleGroupSlugs: ['chest'] },
  { slug: 'dumbbell-fly', name: '덤벨 플라이', equipment: '덤벨', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Beginner, description: '벤치에 누워 팔을 살짝 굽힌 채 덤벨을 양옆으로 벌렸다가 가슴 위로 모은다. 가슴의 신장성 수축 강조.', muscleGroupSlugs: ['chest'] },
  { slug: 'cable-fly', name: '케이블 플라이', equipment: '케이블', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Beginner, description: '양쪽 케이블 손잡이를 잡고 가슴 앞에서 팔을 모은다. 수축 구간에서 1초 정지해 긴장도를 유지한다.', muscleGroupSlugs: ['chest'] },
  { slug: 'machine-fly', name: '머신 플라이(펙덱)', equipment: '머신', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Beginner, description: '팔꿈치를 패드에 대고 양팔을 가슴 앞으로 모은다. 고정된 궤적으로 초급자에게 안정적이다.', muscleGroupSlugs: ['chest'] },
  { slug: 'push-up', name: '푸쉬업', equipment: '맨몸', category: ExerciseCategory.Bodyweight, difficulty: ExerciseDifficulty.Beginner, description: '엎드려 양손을 어깨 너비보다 약간 넓게 짚고 몸을 일직선으로 유지하며 가슴을 바닥 가까이 내렸다 올린다.', muscleGroupSlugs: ['chest'] },
  { slug: 'chest-dip', name: '체스트 딥스', equipment: '맨몸', category: ExerciseCategory.Bodyweight, difficulty: ExerciseDifficulty.Intermediate, description: '평행바에서 상체를 앞으로 기울인 채 팔꿈치를 굽혀 몸을 내렸다 올린다. 가슴 하부 자극.', muscleGroupSlugs: ['chest'] },
  { slug: 'chest-press-machine', name: '체스트프레스 머신', equipment: '머신', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Beginner, description: '좌석에 앉아 손잡이를 앞으로 밀었다가 천천히 복귀한다. 팔꿈치 위치는 어깨보다 약간 아래로 유지.', muscleGroupSlugs: ['chest'] },
  { slug: 'cable-crossover', name: '케이블 크로스오버', equipment: '케이블', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Intermediate, description: '양쪽 상단 케이블을 잡고 한 걸음 앞으로 나와 팔을 곡선 궤적으로 교차시키며 모은다.', muscleGroupSlugs: ['chest'] },

  // ===== 등 (14) =====
  { slug: 'deadlift', name: '데드리프트', equipment: '바벨', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Advanced, description: '발 중앙에 놓인 바벨을 등을 편 채 힙힌지로 들어 올린다. 무릎과 고관절을 동시에 신전한다.', muscleGroupSlugs: ['back', 'legs', 'core'] },
  { slug: 'barbell-row', name: '바벨 로우', equipment: '바벨', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Intermediate, description: '상체를 45도 숙이고 바벨을 명치 방향으로 당겼다가 천천히 내린다. 등 중앙을 조이는 느낌.', muscleGroupSlugs: ['back'] },
  { slug: 'dumbbell-row', name: '덤벨 로우', equipment: '덤벨', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Beginner, description: '한 손은 벤치에 짚고 반대편 덤벨을 옆구리 방향으로 당겼다가 내린다. 광배근 수축을 집중한다.', muscleGroupSlugs: ['back'] },
  { slug: 'one-arm-dumbbell-row', name: '원암 덤벨로우', equipment: '덤벨', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Beginner, description: '한 무릎과 한 손을 벤치에 짚고 반대쪽 덤벨을 옆구리까지 끌어당긴다. 몸통 회전 최소화.', muscleGroupSlugs: ['back'] },
  { slug: 't-bar-row', name: 'T바 로우', equipment: '바벨', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Intermediate, description: '바벨 한 쪽 끝을 고정하고 V바 손잡이로 상체를 앞으로 숙인 채 명치까지 당긴다. 등 전반에 자극.', muscleGroupSlugs: ['back'] },
  { slug: 'seated-cable-row', name: '시티드 케이블로우', equipment: '케이블', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Beginner, description: '좌식 로우 머신에서 V바를 배꼽 방향으로 당겼다가 천천히 복귀한다. 상체는 과도하게 뒤로 젖히지 않는다.', muscleGroupSlugs: ['back'] },
  { slug: 'pull-up', name: '풀업', equipment: '맨몸', category: ExerciseCategory.Bodyweight, difficulty: ExerciseDifficulty.Advanced, description: '어깨 너비보다 넓은 오버그립으로 바를 잡고 턱이 바 위로 오도록 몸을 끌어올린다.', muscleGroupSlugs: ['back'] },
  { slug: 'chin-up', name: '친업', equipment: '맨몸', category: ExerciseCategory.Bodyweight, difficulty: ExerciseDifficulty.Intermediate, description: '어깨 너비 언더그립으로 바를 잡고 턱이 바 위로 오도록 당긴다. 이두근의 개입이 커져 풀업보다 수행이 쉽다.', muscleGroupSlugs: ['back', 'arms'] },
  { slug: 'lat-pulldown', name: '랫풀다운', equipment: '머신', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Beginner, description: '와이드바를 쇄골 방향으로 끌어내렸다가 천천히 복귀. 상체는 약간 뒤로 기울이되 반동 없이.', muscleGroupSlugs: ['back'] },
  { slug: 'face-pull', name: '페이스풀', equipment: '케이블', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Beginner, description: '눈높이 케이블 로프를 얼굴 앞까지 벌려 당긴다. 후면 삼각근과 승모근 중부 강화.', muscleGroupSlugs: ['back', 'shoulders'] },
  { slug: 'shrug', name: '바벨 슈러그', equipment: '바벨', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Beginner, description: '바벨을 앞에서 쥐고 어깨를 귀 방향으로 끌어 올렸다 천천히 내린다. 승모근 상부 집중.', muscleGroupSlugs: ['back'] },
  { slug: 'hyperextension', name: '하이퍼익스텐션', equipment: '맨몸', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Beginner, description: '로만 체어에 엎드려 상체를 아래로 내렸다가 중립 자세까지 올린다. 과신전하지 않는다.', muscleGroupSlugs: ['back', 'legs'] },
  { slug: 'pendlay-row', name: '펜들레이 로우', equipment: '바벨', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Advanced, description: '상체를 바닥과 평행하게 숙이고 바벨을 바닥에 놓았다가 폭발적으로 당겼다가 다시 바닥에 내린다.', muscleGroupSlugs: ['back'] },
  { slug: 'reverse-grip-lat-pulldown', name: '리버스그립 랫풀다운', equipment: '머신', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Beginner, description: '어깨 너비 언더그립으로 바를 쇄골까지 당긴다. 광배근 하부와 이두근 자극.', muscleGroupSlugs: ['back', 'arms'] },

  // ===== 어깨 (10) =====
  { slug: 'overhead-press', name: '오버헤드프레스', equipment: '바벨', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Intermediate, description: '서서 바벨을 쇄골 높이에서 머리 위로 밀어 올린다. 코어를 단단히 고정하고 허리 과신전 금지.', muscleGroupSlugs: ['shoulders'] },
  { slug: 'dumbbell-shoulder-press', name: '덤벨 숄더프레스', equipment: '덤벨', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Beginner, description: '앉거나 서서 양손 덤벨을 귀 옆에서 머리 위로 밀어 올린다. 좌우 개별 안정화로 가동 범위가 넓다.', muscleGroupSlugs: ['shoulders'] },
  { slug: 'arnold-press', name: '아놀드 프레스', equipment: '덤벨', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Intermediate, description: '손목을 안쪽으로 돌린 상태에서 시작해 밀어 올리며 오버그립으로 회전한다. 전면·측면 삼각근 동시 자극.', muscleGroupSlugs: ['shoulders'] },
  { slug: 'side-lateral-raise', name: '사이드 레터럴 레이즈', equipment: '덤벨', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Beginner, description: '덤벨을 양옆으로 어깨 높이까지 들어 올렸다가 천천히 내린다. 팔꿈치는 약간 굽혀 유지.', muscleGroupSlugs: ['shoulders'] },
  { slug: 'front-raise', name: '프론트 레이즈', equipment: '덤벨', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Beginner, description: '덤벨을 허벅지 앞에서 어깨 높이까지 앞으로 들어 올렸다가 내린다. 전면 삼각근 자극.', muscleGroupSlugs: ['shoulders'] },
  { slug: 'rear-delt-fly', name: '리어 델트 플라이', equipment: '덤벨', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Intermediate, description: '상체를 숙인 채 덤벨을 양옆으로 벌려 후면 삼각근을 수축한다. 승모근 상부 개입 최소화.', muscleGroupSlugs: ['shoulders'] },
  { slug: 'cable-lateral-raise', name: '케이블 레터럴 레이즈', equipment: '케이블', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Beginner, description: '바닥 케이블을 반대편 손으로 잡고 어깨 높이까지 측면으로 들어 올린다. 전 가동범위에서 장력이 유지된다.', muscleGroupSlugs: ['shoulders'] },
  { slug: 'upright-row', name: '업라이트 로우', equipment: '바벨', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Intermediate, description: '바벨을 몸 앞에서 턱 아래까지 수직으로 들어 올린다. 그립은 어깨 너비보다 약간 넓게.', muscleGroupSlugs: ['shoulders'] },
  { slug: 'machine-shoulder-press', name: '머신 숄더프레스', equipment: '머신', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Beginner, description: '좌식 프레스 머신에서 손잡이를 머리 위로 밀어 올린다. 궤적이 고정돼 초급자에게 안전하다.', muscleGroupSlugs: ['shoulders'] },
  { slug: 'reverse-pec-deck', name: '리버스 펙덱', equipment: '머신', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Beginner, description: '펙덱 머신을 반대 방향으로 앉아 팔을 뒤로 벌린다. 후면 삼각근을 안전하게 고립.', muscleGroupSlugs: ['shoulders'] },

  // ===== 팔 (14) =====
  { slug: 'barbell-curl', name: '바벨 컬', equipment: '바벨', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Beginner, description: '바벨을 언더그립으로 잡고 팔꿈치 고정한 채 어깨 높이까지 올렸다가 내린다. 반동 최소화.', muscleGroupSlugs: ['arms'] },
  { slug: 'dumbbell-curl', name: '덤벨 컬', equipment: '덤벨', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Beginner, description: '덤벨을 언더그립으로 번갈아 또는 동시에 어깨 방향으로 들어 올린다. 수축 구간에서 1초 유지.', muscleGroupSlugs: ['arms'] },
  { slug: 'hammer-curl', name: '해머 컬', equipment: '덤벨', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Beginner, description: '뉴트럴 그립으로 덤벨을 잡고 어깨 방향으로 올린다. 상완근과 전완에도 자극이 들어간다.', muscleGroupSlugs: ['arms'] },
  { slug: 'preacher-curl', name: '프리처 컬', equipment: '바벨', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Intermediate, description: '프리처 벤치에 팔을 올리고 바벨을 들어 올린다. 이두근 아래쪽 자극.', muscleGroupSlugs: ['arms'] },
  { slug: 'concentration-curl', name: '컨센트레이션 컬', equipment: '덤벨', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Beginner, description: '앉아서 팔꿈치를 허벅지 안쪽에 고정한 채 덤벨을 어깨 방향으로 올린다. 이두근 피크 자극.', muscleGroupSlugs: ['arms'] },
  { slug: 'cable-curl', name: '케이블 컬', equipment: '케이블', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Beginner, description: '바닥 케이블에 스트레이트바를 연결하고 팔꿈치 고정해 어깨 방향으로 들어 올린다. 전 가동 구간 장력 유지.', muscleGroupSlugs: ['arms'] },
  { slug: 'triceps-extension', name: '덤벨 트라이셉 익스텐션', equipment: '덤벨', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Beginner, description: '덤벨 하나를 양손으로 잡고 머리 위에서 팔꿈치만 굽혀 뒤로 내렸다가 편다. 팔꿈치 위치 고정.', muscleGroupSlugs: ['arms'] },
  { slug: 'triceps-pushdown', name: '트라이셉 푸쉬다운', equipment: '케이블', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Beginner, description: '상단 케이블 로프나 바를 잡고 팔꿈치를 옆구리에 붙인 채 아래로 편다.', muscleGroupSlugs: ['arms'] },
  { slug: 'triceps-kickback', name: '트라이셉 킥백', equipment: '덤벨', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Beginner, description: '상체를 숙이고 팔꿈치를 옆구리에 붙인 채 덤벨을 뒤로 편다. 삼두 장두 자극.', muscleGroupSlugs: ['arms'] },
  { slug: 'overhead-triceps-extension', name: '오버헤드 트라이셉 익스텐션', equipment: '덤벨', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Intermediate, description: '선 자세에서 덤벨 하나를 머리 뒤로 내렸다가 위로 편다. 팔꿈치는 수직으로 고정.', muscleGroupSlugs: ['arms'] },
  { slug: 'triceps-dip', name: '트라이셉 딥스', equipment: '맨몸', category: ExerciseCategory.Bodyweight, difficulty: ExerciseDifficulty.Intermediate, description: '평행바에서 상체를 수직으로 세운 채 팔꿈치를 굽혀 몸을 내렸다가 편다. 삼두 집중.', muscleGroupSlugs: ['arms'] },
  { slug: 'wrist-curl', name: '리스트 컬', equipment: '덤벨', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Beginner, description: '팔뚝을 벤치에 올리고 손목을 언더그립으로 굽혔다 폈다 한다. 전완 굴근 자극.', muscleGroupSlugs: ['arms'] },
  { slug: 'reverse-wrist-curl', name: '리버스 리스트 컬', equipment: '덤벨', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Beginner, description: '팔뚝을 벤치에 올리고 오버그립으로 손목을 젖혔다 내린다. 전완 신근 자극.', muscleGroupSlugs: ['arms'] },
  { slug: 'skull-crusher', name: '스컬크러셔', equipment: '바벨', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Intermediate, description: '벤치에 누워 바벨을 이마 바로 위까지 내렸다가 팔꿈치만 펴서 올린다. 팔꿈치는 수직 유지.', muscleGroupSlugs: ['arms'] },

  // ===== 하체 (18) =====
  { slug: 'back-squat', name: '백 스쿼트', equipment: '바벨', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Intermediate, description: '바벨을 승모근 상부에 올리고 엉덩이를 뒤로 빼며 허벅지가 바닥과 평행할 때까지 내렸다가 선다.', muscleGroupSlugs: ['legs', 'core'] },
  { slug: 'front-squat', name: '프론트 스쿼트', equipment: '바벨', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Advanced, description: '바벨을 쇄골 앞에 올리고 상체를 수직으로 유지한 채 스쿼트한다. 대퇴사두와 코어 자극 강조.', muscleGroupSlugs: ['legs', 'core'] },
  { slug: 'goblet-squat', name: '고블릿 스쿼트', equipment: '덤벨', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Beginner, description: '덤벨을 가슴 앞에서 세로로 잡고 스쿼트한다. 자세 교정 목적의 입문용 스쿼트.', muscleGroupSlugs: ['legs', 'core'] },
  { slug: 'romanian-deadlift', name: '루마니안 데드리프트', equipment: '바벨', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Intermediate, description: '무릎을 살짝 굽힌 상태로 고정하고 힙힌지로 바벨을 정강이까지 내렸다가 일어선다.', muscleGroupSlugs: ['legs', 'back'] },
  { slug: 'stiff-leg-deadlift', name: '스티프레그 데드리프트', equipment: '바벨', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Intermediate, description: '무릎을 거의 펴고 힙힌지로만 바벨을 내렸다가 올린다. 햄스트링 신장 강조.', muscleGroupSlugs: ['legs', 'back'] },
  { slug: 'leg-press', name: '레그프레스', equipment: '머신', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Beginner, description: '좌식 레그프레스에서 발을 어깨 너비로 두고 무릎이 90도 될 때까지 내렸다가 민다.', muscleGroupSlugs: ['legs'] },
  { slug: 'hack-squat', name: '핵 스쿼트', equipment: '머신', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Intermediate, description: '핵 스쿼트 머신에서 어깨 패드 아래 서서 스쿼트한다. 고정된 궤적으로 중량을 안전하게 쓸 수 있다.', muscleGroupSlugs: ['legs'] },
  { slug: 'lunge', name: '런지', equipment: '덤벨', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Beginner, description: '한 발 앞으로 내디뎌 양 무릎을 90도까지 굽혔다가 돌아온다. 좌우 교대 수행.', muscleGroupSlugs: ['legs', 'core'] },
  { slug: 'bulgarian-split-squat', name: '불가리안 스플릿 스쿼트', equipment: '덤벨', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Intermediate, description: '뒷발을 벤치 위에 올리고 앞다리로 스쿼트한다. 대퇴사두·둔근에 집중된다.', muscleGroupSlugs: ['legs', 'core'] },
  { slug: 'leg-extension', name: '레그익스텐션', equipment: '머신', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Beginner, description: '머신에 앉아 발목 패드를 발등에 걸고 무릎을 완전히 편다. 대퇴사두 고립.', muscleGroupSlugs: ['legs'] },
  { slug: 'leg-curl', name: '레그컬', equipment: '머신', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Beginner, description: '엎드리거나 앉은 자세로 발꿈치로 패드를 엉덩이 쪽으로 당긴다. 햄스트링 고립.', muscleGroupSlugs: ['legs'] },
  { slug: 'standing-calf-raise', name: '스탠딩 카프레이즈', equipment: '머신', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Beginner, description: '앞꿈치로 스텝 위에 올라서 뒤꿈치를 내렸다 끝까지 올린다. 종아리 비복근 자극.', muscleGroupSlugs: ['legs'] },
  { slug: 'seated-calf-raise', name: '시티드 카프레이즈', equipment: '머신', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Beginner, description: '앉아서 무릎을 90도로 굽힌 채 앞꿈치로 중량을 밀어 올린다. 가자미근 집중.', muscleGroupSlugs: ['legs'] },
  { slug: 'hip-thrust', name: '힙쓰러스트', equipment: '바벨', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Intermediate, description: '견갑을 벤치에 대고 골반 위에 바벨을 올려 엉덩이를 천장으로 밀어 올린다. 둔근 집중.', muscleGroupSlugs: ['legs'] },
  { slug: 'glute-bridge', name: '글루트 브릿지', equipment: '맨몸', category: ExerciseCategory.Bodyweight, difficulty: ExerciseDifficulty.Beginner, description: '바닥에 누워 무릎을 굽히고 엉덩이를 천장 방향으로 밀어 올렸다가 내린다. 힙쓰러스트 입문 버전.', muscleGroupSlugs: ['legs'] },
  { slug: 'step-up', name: '스텝업', equipment: '덤벨', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Beginner, description: '박스나 벤치 위로 한 발을 올려 밀어 올리고 천천히 내려온다. 좌우 교대.', muscleGroupSlugs: ['legs', 'core'] },
  { slug: 'sumo-squat', name: '스모 스쿼트', equipment: '바벨', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Intermediate, description: '어깨 너비보다 훨씬 넓게 서서 발끝을 바깥으로 벌린 채 스쿼트한다. 내전근·둔근 자극 강화.', muscleGroupSlugs: ['legs', 'core'] },
  { slug: 'walking-lunge', name: '워킹 런지', equipment: '덤벨', category: ExerciseCategory.Compound, difficulty: ExerciseDifficulty.Intermediate, description: '런지 자세로 발을 번갈아 앞으로 걸어 나간다. 균형 유지와 하체 지구력에 효과적.', muscleGroupSlugs: ['legs', 'core'] },

  // ===== 코어 (12) =====
  { slug: 'plank', name: '플랭크', equipment: '맨몸', category: ExerciseCategory.Bodyweight, difficulty: ExerciseDifficulty.Beginner, description: '팔뚝으로 버티며 몸을 머리부터 발끝까지 일직선으로 유지한다. 복부와 엉덩이에 힘을 준다.', muscleGroupSlugs: ['core'] },
  { slug: 'side-plank', name: '사이드 플랭크', equipment: '맨몸', category: ExerciseCategory.Bodyweight, difficulty: ExerciseDifficulty.Beginner, description: '한쪽 팔뚝을 바닥에 대고 몸을 옆으로 일직선 유지. 복사근 자극.', muscleGroupSlugs: ['core'] },
  { slug: 'crunch', name: '크런치', equipment: '맨몸', category: ExerciseCategory.Bodyweight, difficulty: ExerciseDifficulty.Beginner, description: '바닥에 누워 무릎을 굽힌 채 어깨만 들어 올려 복부를 짧게 수축한다. 허리는 바닥에 붙여 유지.', muscleGroupSlugs: ['core'] },
  { slug: 'leg-raise', name: '레그 레이즈', equipment: '맨몸', category: ExerciseCategory.Bodyweight, difficulty: ExerciseDifficulty.Beginner, description: '누워서 다리를 곧게 펴 수직까지 들어 올렸다가 내린다. 하복부 자극.', muscleGroupSlugs: ['core'] },
  { slug: 'hanging-leg-raise', name: '행잉 레그레이즈', equipment: '맨몸', category: ExerciseCategory.Bodyweight, difficulty: ExerciseDifficulty.Advanced, description: '풀업바에 매달려 다리를 수평 이상까지 들어 올린다. 반동 없이 천천히 수행.', muscleGroupSlugs: ['core'] },
  { slug: 'russian-twist', name: '러시안 트위스트', equipment: '맨몸', category: ExerciseCategory.Bodyweight, difficulty: ExerciseDifficulty.Beginner, description: '앉아 상체를 45도 뒤로 기울인 채 손을 좌우로 번갈아 이동시킨다. 복사근 자극.', muscleGroupSlugs: ['core'] },
  { slug: 'cable-crunch', name: '케이블 크런치', equipment: '케이블', category: ExerciseCategory.Isolation, difficulty: ExerciseDifficulty.Beginner, description: '상단 케이블 로프를 잡고 무릎 꿇은 자세에서 복부를 굴곡시켜 머리를 허벅지 방향으로 당긴다.', muscleGroupSlugs: ['core'] },
  { slug: 'bicycle-crunch', name: '바이시클 크런치', equipment: '맨몸', category: ExerciseCategory.Bodyweight, difficulty: ExerciseDifficulty.Beginner, description: '누운 채 팔꿈치와 반대쪽 무릎을 교차시켜 터치. 복직근과 복사근 동시 자극.', muscleGroupSlugs: ['core'] },
  { slug: 'mountain-climber', name: '마운틴 클라이머', equipment: '맨몸', category: ExerciseCategory.Bodyweight, difficulty: ExerciseDifficulty.Beginner, description: '푸쉬업 자세에서 무릎을 가슴 쪽으로 번갈아 빠르게 끌어당긴다. 심박수와 코어 동시 자극.', muscleGroupSlugs: ['core'] },
  { slug: 'v-up', name: 'V업', equipment: '맨몸', category: ExerciseCategory.Bodyweight, difficulty: ExerciseDifficulty.Intermediate, description: '누운 자세에서 다리와 상체를 동시에 들어 올려 V자를 만든다. 복부 전체 자극.', muscleGroupSlugs: ['core'] },
  { slug: 'dead-bug', name: '데드버그', equipment: '맨몸', category: ExerciseCategory.Bodyweight, difficulty: ExerciseDifficulty.Beginner, description: '누운 자세에서 반대쪽 팔과 다리를 천천히 뻗었다 복귀한다. 코어 안정성 강화.', muscleGroupSlugs: ['core'] },
  { slug: 'hollow-hold', name: '할로우 홀드', equipment: '맨몸', category: ExerciseCategory.Bodyweight, difficulty: ExerciseDifficulty.Intermediate, description: '누워 허리를 바닥에 붙인 채 어깨와 다리를 살짝 들어 바나나 모양으로 버틴다.', muscleGroupSlugs: ['core'] },
];
