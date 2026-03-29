# DentaRoute Inspiration Cloning Guide
# 전략 3: 타 사이트 영감 복제 (Inspiration Cloning) 실전 가이드

> **목적**: Awwwards, Dribbble, Zocdoc 등 프리미엄 앱/사이트에서 추출한 디자인 패턴을 DentaRoute에 적용
> **대상**: React Native + Expo Router 기반, Patient Purple `#4A0080` / Doctor Teal `#0F766E`
> **작성일**: 2026-03-28

---

## 1. 벤치마킹 대상 앱 분석 결과

### 1.1 Zocdoc (의료 예약 플랫폼 - 최고 참조)

**왜 참조해야 하는가**: DentaRoute와 가장 유사한 의사-환자 매칭 + 예약 플랫폼

| 요소 | Zocdoc 패턴 | DentaRoute 적용 |
|------|-------------|-----------------|
| **색상** | 밝고 cheerful한 팔레트, 카드 기반 | Purple 톤을 cheerful하게 — `#7B2FBE` 히어로 + 밝은 `#f0e6f6` 카드 |
| **레이아웃** | Google Material Design 영향, 카드 기반 | 카드 border-radius 16px, 은은한 shadow |
| **검색/필터** | 4개 기본 폼 필드 + 사진 스캔(보험) | 치료 유형 필터 + X-ray 업로드 |
| **의사 리스팅** | 평점 + 위치 + 예약 가능 시간 스와이프 | 견적 카드에 평점/위치/가격 + 시간 선택 |
| **의사 프로필** | 170+ 스크린, 30+ 재사용 컴포넌트 | 프로필 카드 컴포넌트 표준화 |
| **온보딩** | 분절형 — 탐색 먼저, 가입은 나중에 | 케이스 작성 플로우도 단계별 분절 유지 |

### 1.2 Headspace (웰니스 앱 - 모션/감성 참조)

| 요소 | Headspace 패턴 | DentaRoute 적용 |
|------|---------------|-----------------|
| **애니메이션** | Fluid 애니메이션, 부드러운 전환 | 카드 진입 시 staggered fade-in |
| **색상** | 소프트 파스텔, 안정감 | Patient: 연보라 그라데이션으로 안정감 전달 |
| **구조** | Structured pathways | 케이스 제출 → 견적 → 예약 → 치료 linear flow |

### 1.3 FollowMyHealth (환자 참여 앱 - 대시보드 참조)

| 요소 | 패턴 | DentaRoute 적용 |
|------|------|-----------------|
| **게이미피케이션** | 건강 목표 달성 보상 | 예약 진행률 프로그레스 바, 단계별 체크마크 |
| **데이터 시각화** | 건강 지표 차트 | 견적 비교 차트, 비용 절감률 시각화 |

---

## 2. 2025-2026 프리미엄 디자인 트렌드 → DentaRoute 적용

### 2.1 Liquid Glass / Glassmorphism (핵심 트렌드)

**정의**: 반투명 프로스티드 글래스 효과 + 깊이감 있는 레이어링

```typescript
// DentaRoute 적용: 히어로 섹션 오버레이 카드
const glassCard = {
  backgroundColor: 'rgba(255, 255, 255, 0.75)',
  backdropFilter: 'blur(12px)',     // 웹용 (RN에서는 expo-blur)
  borderRadius: 20,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.3)',
  // React Native 대안:
  // <BlurView intensity={40} tint="light"> (expo-blur 필요)
};

// 환자 테마 글래스 카드
const patientGlassCard = {
  backgroundColor: 'rgba(74, 0, 128, 0.06)',
  borderRadius: 20,
  borderWidth: 1,
  borderColor: 'rgba(74, 0, 128, 0.12)',
  shadowColor: '#4A0080',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
};

// 의사 테마 글래스 카드
const doctorGlassCard = {
  backgroundColor: 'rgba(15, 118, 110, 0.06)',
  borderRadius: 20,
  borderWidth: 1,
  borderColor: 'rgba(15, 118, 110, 0.12)',
  shadowColor: '#0F766E',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
};
```

**적용 포인트**:
- 견적 비교 화면의 카드 오버레이
- 대시보드 상단 요약 카드
- 바텀시트 배경

### 2.2 Motion Design (프리미엄 필수)

**원칙**: 모든 움직임은 의미가 있어야 한다 — 장식이 아닌 공간적 연속성

```typescript
// Staggered 카드 진입 애니메이션
// (react-native-reanimated 설치 후)
import Animated, { FadeInDown } from 'react-native-reanimated';

// 카드 리스트 — 순차적 등장
{cards.map((card, i) => (
  <Animated.View
    key={card.id}
    entering={FadeInDown.delay(i * 80).springify().damping(15)}
  >
    <CaseCard {...card} />
  </Animated.View>
))}

// 버튼 터치 피드백 — 눌림 효과
const buttonPress = {
  transform: [{ scale: 0.97 }],
  // Animated.spring으로 150ms bounce-back
};

// 상태 변경 시 — 숫자 카운터 롤링
// 견적 가격이 바뀔 때 숫자가 부드럽게 전환
```

### 2.3 Advanced Card Design (Zocdoc + Airbnb 하이브리드)

```typescript
// "Premium Floating Card" — 현재 Clean Floating 카드의 진화형
const premiumCard = {
  // 구조
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  overflow: 'hidden',

  // 상단 컬러 스트립 (현재 4px → 유지하되 그라데이션 적용)
  // <LinearGradient colors={['#7B2FBE', '#4A0080']} style={{ height: 4 }} />

  // 깊이감 — 다중 그림자 레이어
  shadowColor: '#1E293B',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.04,
  shadowRadius: 4,
  elevation: 2,
  // + 두 번째 그림자 레이어 (View 중첩으로 구현)
  // 외부: shadowOpacity 0.02, shadowRadius 16 (넓은 확산)
  // 내부: shadowOpacity 0.06, shadowRadius 4 (선명한 가장자리)

  // 내부 패딩
  padding: 16,

  // 호버 상태 (터치 시)
  // scale(0.98) + shadow 강화
};

// Pill 형 상태 뱃지 — 더 정교하게
const statusBadge = (color: string) => ({
  backgroundColor: `${color}12`,  // 7% opacity
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 100,
  borderWidth: 1,
  borderColor: `${color}25`,  // 15% opacity
});
```

### 2.4 Color Psychology for Healthcare

**연구 기반 팔레트 가이드**:

| 감정/목적 | 색상 | DentaRoute 현재 | 개선안 |
|-----------|------|-----------------|--------|
| **신뢰/전문성** | Blue 계열 | `#2563eb` (SharedColors.blue) | 의사 인증 뱃지에 사용 |
| **안정/치유** | Purple 계열 | `#4A0080` (PatientTheme) | 유지 — 이미 최적 |
| **건강/성공** | Green 계열 | `#16a34a` (SharedColors.green) | 완료 상태, 확인 버튼 |
| **따뜻함/친근** | Orange 계열 | `#f97316` (SharedColors.orange) | 신규 알림, 긴급 표시 |
| **경고/주의** | Red/Coral | `#e05a3a` (SharedColors.coral) | 취소, 에러 상태 |
| **중립/정보** | Slate 계열 | `#64748b` (SharedColors.slate) | 보조 텍스트 유지 |

**환자(Patient) 화면 감성 팔레트**:
```
히어로: #7B2FBE → #3A0068 → #1A002E (신비로운 프리미엄)
카드 배경: #FFFFFF (깨끗한 신뢰)
강조 배경: #f0e6f6 (부드러운 안정)
CTA: #4A0080 (확신/전문성)
성공: #16a34a (치유/완료)
가격: #1E293B bold (명확한 정보)
절감액: #16a34a (절약 = 긍정)
```

**의사(Doctor) 화면 감성 팔레트**:
```
히어로: #0F766E → #0d3d38 (전문적 차분)
카드 배경: #FFFFFF
강조 배경: #f0fdfa (신선한 임상 느낌)
CTA: #0F766E
수익: #16a34a (매출/성장)
긴급: #f97316 (새 케이스 어텐션)
```

### 2.5 Typography Hierarchy (Zocdoc/Headspace 기반)

```typescript
// DentaRoute 타이포그래피 시스템
const Typography = {
  // 페이지 제목 — 시선을 잡는다
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    lineHeight: 34,
    color: '#1E293B',
  },

  // 섹션 제목
  h2: {
    fontSize: 22,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
    lineHeight: 28,
    color: '#1E293B',
  },

  // 카드 제목
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    lineHeight: 24,
    color: '#1E293B',
  },

  // 본문
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    color: '#334155',
  },

  // 보조 텍스트
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
    color: '#64748b',
  },

  // 뱃지/라벨
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
    color: '#64748b',
  },

  // 가격 (큰 숫자)
  price: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    color: '#1E293B',
  },

  // 버튼 텍스트
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
};
```

### 2.6 Spacing System (8px Grid)

```typescript
// 모든 간격은 8의 배수로 통일
const Spacing = {
  xs: 4,    // 아이콘-텍스트 사이
  sm: 8,    // 카드 내부 요소 사이
  md: 12,   // 라벨-값 사이
  base: 16, // 기본 패딩, 카드 간격
  lg: 20,   // 화면 좌우 패딩
  xl: 24,   // 섹션 사이 간격
  xxl: 32,  // 주요 섹션 구분
  xxxl: 48, // 히어로-컨텐츠 간격
};

// 화면 패딩 표준
const screenPadding = { paddingHorizontal: 20 };

// 카드 내부 패딩
const cardPadding = { padding: 16 };

// 카드 간격
const cardGap = { marginBottom: 12 };
```

---

## 3. 컴포넌트별 영감 클로닝 가이드

### 3.1 의사/견적 카드 (Zocdoc Doctor Card 영감)

**Zocdoc 패턴**: 의사 사진 + 이름/전문분야 + 평점 + 가능한 시간 가로 스크롤

```typescript
// DentaRoute 견적 카드 — Zocdoc 영감 적용
const QuoteCard = {
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    // 다중 그림자
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // 상단: 의사 정보 행
  doctorRow: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },

  // 의사 아바타 — 원형 + 브랜드 테두리
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#f0e6f6', // PatientTheme.primaryLight
  },

  // 이름 + 클리닉 + 평점 (세로 스택)
  info: {
    marginLeft: 12,
    flex: 1,
  },

  // 평점 — 별 + 숫자 + 리뷰 수
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingStar: { color: '#f59e0b', fontSize: 14 },
  ratingText: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginLeft: 4 },
  reviewCount: { fontSize: 13, color: '#64748b', marginLeft: 4 },

  // 가격 행 — 크게 강조
  priceRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  priceLabel: { fontSize: 13, color: '#64748b' },
  priceValue: { fontSize: 22, fontWeight: '700', color: '#1E293B' },

  // 하단: 치료 태그 가로 스크롤
  treatmentTags: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#f0e6f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  tagText: { fontSize: 12, color: '#4A0080', fontWeight: '500' },
};
```

### 3.2 예약 상태 타임라인 (FollowMyHealth + Uber 영감)

```typescript
// 수직 타임라인 — 예약 진행 상황
const Timeline = {
  // 각 스텝
  step: {
    flexDirection: 'row',
    minHeight: 64,
  },

  // 왼쪽: 원 + 연결선
  indicator: {
    width: 40,
    alignItems: 'center',
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActive: {
    backgroundColor: '#4A0080',
    borderColor: '#4A0080',
  },
  circleCompleted: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
    // 내부에 체크마크 아이콘
  },
  circlePending: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#e2e8f0', // 완료 시 #16a34a
    marginVertical: 4,
  },

  // 오른쪽: 텍스트
  content: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 24,
  },
  stepTitle: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  stepDesc: { fontSize: 13, color: '#64748b', marginTop: 2 },
  stepTime: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
};
```

### 3.3 가격 비교 시각화 (Kayak/Skyscanner 영감)

```typescript
// 가격 비교 바 차트 — 견적 비교 화면
const PriceComparison = {
  // 가로 바 차트
  barContainer: {
    marginBottom: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  barLabel: {
    width: 100,
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
  },
  bar: {
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    paddingHorizontal: 8,
    // width는 가격 비율로 계산
  },
  barBest: {
    backgroundColor: '#4A0080',  // 최저가 강조
  },
  barNormal: {
    backgroundColor: '#f0e6f6',  // 일반
  },
  barPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',    // 최저가
    // color: '#4A0080' // 일반
  },

  // 절감액 하이라이트
  savingsBox: {
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  savingsText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#16a34a',
    marginLeft: 8,
  },
};
```

### 3.4 대시보드 히어로 (Revolut/N26 핀테크 영감)

```typescript
// 상단 히어로 영역 — 그라데이션 + 핵심 수치
const DashboardHero = {
  hero: {
    // LinearGradient: PatientTheme.authGradient
    paddingTop: 60,     // SafeArea
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  // 인사 텍스트
  greeting: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 2,
  },

  // 핵심 수치 카드 (글래스모피즘)
  statCards: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
};
```

---

## 4. 마이크로 인터랙션 패턴 (프리미엄 앱 필수)

### 4.1 터치 피드백 (모든 탭 가능 요소에 적용)

```typescript
// Pressable 래퍼 — 터치 시 0.97 스케일 + opacity
<Pressable
  onPress={onPress}
  style={({ pressed }) => [
    styles.card,
    pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }
  ]}
>
```

### 4.2 Pull-to-Refresh (브랜드 컬러)

```typescript
<ScrollView
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#4A0080"       // iOS 스피너 색상
      colors={['#4A0080']}      // Android 스피너 색상
    />
  }
>
```

### 4.3 숫자 카운터 애니메이션 (가격 표시)

```typescript
// 가격이 변할 때 부드럽게 롤링
// useSharedValue + withTiming으로 구현
// 예: $3,600 → $4,150 (숫자가 빠르게 카운트업)
```

### 4.4 Skeleton Loading (콘텐츠 로딩 시)

```typescript
// 카드 로딩 상태 — 그레이 펄스 애니메이션
const SkeletonCard = {
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  // Animated opacity 0.3 ↔ 0.7 (1s loop)
  line: {
    height: 14,
    borderRadius: 7,
    backgroundColor: '#e2e8f0',
    marginBottom: 8,
  },
  lineLong: { width: '80%' },
  lineShort: { width: '40%' },
  circle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e2e8f0',
  },
};
```

---

## 5. 실전 프롬프트 템플릿

### 5.1 Zocdoc 스타일 견적 카드 리디자인

```
"patient/quotes.tsx의 견적 카드를 Zocdoc 스타일로 리디자인해줘:

구조:
- 카드: 흰 배경, border-radius 16px, shadow-opacity 0.05, shadow-radius 8
- 상단 4px 그라데이션 스트립: #7B2FBE → #4A0080
- 의사 행: 56px 원형 아바타(2px #f0e6f6 테두리) + 이름/클리닉/평점 세로 스택
- 평점: 노란 별 + 숫자(600 weight) + 리뷰 수(slate 색)
- 가격: 22px bold, 오른쪽 정렬
- 치료 태그: #f0e6f6 배경 pill, #4A0080 텍스트, 가로 wrap
- 터치 시: scale(0.97) + opacity(0.9) 피드백

PatientTheme 사용, 8px 그리드 준수."
```

### 5.2 프리미엄 대시보드 히어로 적용

```
"patient/dashboard.tsx 상단을 핀테크 앱 스타일 히어로로 리디자인:

- 그라데이션 배경: PatientTheme.authGradient (#7B2FBE → #3A0068 → #1A002E)
- 하단 모서리: border-bottom-radius 24px
- 인사: 16px white 0.7 opacity + 이름 24px bold white
- 글래스 수치 카드 2~3개: rgba(255,255,255,0.12) 배경, 1px rgba(255,255,255,0.15) 테두리
  - 활성 케이스 수 / 새 견적 수 / 다음 예약일
  - 숫자: 22px bold white, 라벨: 12px white 0.6 opacity
- 아래 콘텐츠 영역: #f8fafc 배경에 케이스 카드 리스트

기존 헤더 아이콘(settings/bell/dots) 레이아웃은 유지."
```

### 5.3 예약 진행 타임라인

```
"예약 상세 화면에 수직 타임라인 추가:
- 10단계 상태 (confirmed → ... → departure_set)
- 완료: green 원 + 체크마크 + green 연결선
- 현재: purple 원 + 펄스 애니메이션 + gray 연결선
- 미래: gray 빈 원 + gray 점선
- 각 스텝: 제목(15px 600 weight) + 설명(13px slate) + 시간(12px slateLight)
- PatientTheme 컬러 기반"
```

---

## 6. 설치 필요 패키지 (프리미엄 적용 시)

| 패키지 | 용도 | 우선순위 |
|--------|------|----------|
| `react-native-reanimated` | 고성능 애니메이션, staggered 진입 | **높음** |
| `expo-blur` | 글래스모피즘 카드 배경 | 중간 |
| `lottie-react-native` | 완료 체크마크, 로딩 스피너 | 중간 |
| `expo-image` | 고성능 이미지 + placeholder blur | 낮음 |
| `react-native-gesture-handler` | 스와이프 제스처 | 낮음 |

> 현재 Animated API만으로도 기본 fade/scale은 가능. reanimated는 staggered 리스트, spring 물리, shared transitions에 필요.

---

## 7. 체크리스트: 프리미엄 앱 vs 일반 앱

| 항목 | 일반 | 프리미엄 (목표) |
|------|------|-----------------|
| 카드 그림자 | 단일, 강함 | 다중 레이어, 은은함 |
| 색상 사용 | 원색 직접 사용 | 투명도 레이어, 서브틀 |
| 터치 피드백 | 없거나 opacity만 | scale + opacity + spring |
| 로딩 상태 | ActivityIndicator | Skeleton + 브랜드 컬러 |
| 간격 | 불규칙 | 8px 그리드 엄격 준수 |
| 타이포그래피 | 2-3 크기 | 6단계 계층 (h1~label) |
| 빈 상태 | 텍스트만 | 일러스트 + CTA |
| 상태 뱃지 | 단순 배경색 | pill + 미세 테두리 + 아이콘 |
| 화면 전환 | 기본 슬라이드 | staggered fade-in |
| 숫자 표시 | 즉시 변경 | 카운터 애니메이션 |

---

## 8. 참고 리소스 URL

### 벤치마킹 사이트
- **Mobbin**: mobbin.com — 실제 앱 스크린샷 아카이브 (의료/예약 카테고리)
- **Dribbble**: dribbble.com/search/dental-app — 치과 앱 UI 컨셉
- **Awwwards**: awwwards.com/websites/mobile/ — 수상작 모바일 디자인

### 경쟁/참조 앱
- **Zocdoc**: 의사-환자 매칭 + 예약 (가장 유사한 모델)
- **Doctolib**: 유럽 최대 의료 예약 플랫폼
- **Practo**: 인도 최대 의료 마켓플레이스

### 디자인 시스템 참조
- **Apple HIG**: developer.apple.com/design/human-interface-guidelines
- **Material Design 3**: m3.material.io
- **Figma Community**: figma.com — "dental app" 검색

### 트렌드 아티클
- MindInventory: 2025-2026 모바일 UI/UX 트렌드 (Liquid Glass, Agentic UX)
- SpdLoad: Healthcare App Design Guide (색상 심리학)
- Technology Rivers: 15 Best Healthcare App Designs
