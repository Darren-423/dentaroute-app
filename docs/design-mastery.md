# Concourse 앱 디자인 마스터리: Claude Code 7단계 전략 가이드

> **대상**: React Native + Expo Router 기반 Concourse 앱 (의료관광 플랫폼)
> **목적**: Claude Code를 활용하여 "AI가 만든 티"가 나지 않는 프로급 모바일 앱 UI를 구현하기 위한 실전 로드맵
> **브랜드 컬러**: 듀얼 테마 — Patient Purple `#4A0080` → `#1A002E` / Doctor Teal `#0F766E` → `#0d3d38`

---

## 핵심 개념: 왜 AI 결과물이 '저품질(AI Slop)'로 보이는가

문제의 본질은 AI의 능력 부족이 아니라, 사용자가 머릿속의 시각적 의도를 텍스트로 전달할 때 발생하는 **"손실적 번역(Lossy Translation)"** 에 있다. 디자인은 시각적 매체인데, 텍스트 프롬프트만으로는 필연적으로 **"바이브 격차(Vibe Gap)"** 가 생긴다.

**해결 원칙**: Claude Code는 뛰어난 '컴파일러'이지만, 디자인 방향을 결정하는 '아키텍트'는 사용자 자신이다. 사용자가 디자인 어휘와 시각적 참조를 더 정확히 제공할수록, 결과물은 AI Slop에서 독창적 결과물로 진화한다.

---

## [사전 준비] Claude Code 환경 설정

### 1. 기본 도구 설치
- VS Code 설치 → 확장 프로그램에서 **Claude Code** 설치
- Anthropic 유료 구독(Pro 또는 Max) 계정 필요
- Concourse 프로젝트 폴더를 VS Code에서 열기

### 2. CLAUDE.md — 이미 프로젝트 루트에 구축 완료

프로젝트 루트의 `CLAUDE.md`에 프로젝트 개요, 디자인 원칙, 코딩 규칙, 워크플로우 규칙이 모두 정의되어 있다. 새로 만들 필요 없이 기존 파일을 유지·업데이트한다.

### 3. 브랜드 컬러 & 테마 — `constants/` 디렉토리

별도 `brand_assets/` 폴더 대신, 코드에서 직접 import하는 파일들이 **Single Source of Truth**다:

| 파일 | 내용 |
|------|------|
| `constants/theme.ts` | `PatientTheme`, `DoctorTheme`, `SharedColors`, `Fonts` export |
| `constants/colors.ts` | 레거시 컬러 팔레트 (`C` / `T` export) |

```typescript
// 실제 사용 예시 — 화면에서 import
import { PatientTheme, DoctorTheme, SharedColors } from '@/constants/theme';

// Patient 화면
<LinearGradient colors={PatientTheme.gradient} />

// Doctor 화면
<LinearGradient colors={DoctorTheme.gradient} />
```

> 참고 스크린샷이나 로고 등 시각 자산은 `assets/images/`에 저장한다.

---

## [Level 1] 기초 프롬프팅: 디자인 어휘 습득

가장 낮은 단계. 모호한 요청("세련된 화면 만들어줘")은 AI가 평균적인 데이터로 공백을 메워서 특징 없는 결과물을 만들어낸다.

### 필수 스킬 3가지

**① 설명적 프롬프트 작성 — 구체적 시각 요소를 명시한다**

```
❌ 나쁜 예시:
"예약 화면 예쁘게 만들어줘"

✅ 좋은 예시:
"예약 확인 화면을 만들어줘.
- 상단: 치과 클리닉 사진이 들어갈 200px 높이의 이미지 영역, 하단에 브랜드 컬러→dark 그라데이션 오버레이
- 클리닉명은 20px bold white, 바로 아래 위치/평점 표시
- 예약 정보 카드: 흰색 배경, border-radius 16px, 그림자는 은은하게(shadow-opacity 0.08)
- 하단 고정 CTA 버튼: 역할별 브랜드 컬러 배경, 높이 56px, border-radius 28px, '예약 확정' 텍스트"
```

**② 기술 프레임워크 이해**

React Native 환경에서 알아야 할 핵심 차이점:
- 웹의 `div` → React Native의 `View`
- 웹의 CSS → `StyleSheet.create()`
- 웹의 `hover` 효과 → 모바일에서는 `Pressable` + `onPressIn/onPressOut` 터치 피드백
- 웹의 `position: fixed` → React Native에서는 `position: 'absolute'` + `bottom: 0`
- 웹의 CSS 애니메이션 → `react-native-reanimated` 또는 `Animated` API

모른다면 Claude Code Plan Mode에서 물어보면 된다:
```
"React Native에서 하단 고정 버튼을 만드는 가장 좋은 방법이 뭐야?
SafeAreaView 고려해서 iOS/Android 둘 다 잘 작동하게."
```

**③ 디자인 어휘 사전 — 이 용어들을 사용하면 AI와의 소통 정확도가 올라간다**

| 모호한 표현 | 전문 용어 | 설명 |
|---|---|---|
| "깨끗한 느낌" | 미니멀리즘 | 불필요한 장식 제거, 여백 활용 |
| "유리 같은" | 글래스모피즘(Glassmorphism) | 반투명 배경 + 블러 + 미세 테두리 |
| "살짝 거친 느낌" | 노이즈 텍스처(Noise Texture) | 배경에 미세한 입자감 추가 |
| "깔끔한 카드" | 뉴모피즘(Neumorphism) | 부드러운 양각/음각 그림자 효과 |
| "글자 크기 체계" | 타이포그래피 계층(Type Hierarchy) | 제목/부제/본문/캡션의 크기·굵기 체계 |
| "색이 조화롭게" | 색채 대비(Color Contrast) | WCAG 기준 명암비 준수 |
| "자연스러운 움직임" | 이징 커브(Easing Curve) | ease-in-out, spring 등 애니메이션 가속/감속 |
| "화면 전환" | 트랜지션(Transition) | 화면 간 페이드, 슬라이드 등 전환 효과 |

### Plan Mode 활용법

Claude Code에서 복잡한 화면을 만들기 전, Plan Mode를 먼저 실행한다:

```
"Plan Mode로 시작해줘.
예약 상세 화면을 새로 만들 건데, 기존 앱의 스타일과 일관되게 하고 싶어.
필요한 컴포넌트, 네비게이션 구조, 데이터 흐름을 먼저 정리해줘.
디자인 관련 질문이 있으면 먼저 해줘."
```

---

## [Level 2] 디자인 스킬 주입: AI에게 디자인 지능 장착

AI에게 디자인 전문 지식을 주입하여 기본 결과물의 품질을 크게 끌어올리는 단계.

### 프런트엔드 디자인 스킬(Skill)이란?

단순한 도구가 아니라, AI가 저품질 디자인 습관(과도한 그림자, 부조화한 색상, 비균일한 간격)을 **회피하고 산업 표준을 따르도록 강제하는 체크리스트**다.

### 모바일 앱에 맞는 스킬 설치 및 활용

Claude Code에는 `frontend-design` 스킬이 내장되어 있다. 별도 설치 없이 자연어로 호출하면 된다:

```
"프런트엔드 디자인 스킬을 사용해서 patient/dashboard.tsx 화면을 리뷰해줘.
React Native 환경에서 아래 항목을 점검해줘:
- 색채 대비가 WCAG AA 기준을 충족하는지
- 터치 타겟이 최소 44x44pt인지
- 타이포그래피 계층이 일관적인지
- 간격(spacing)이 8px 그리드를 따르는지
PatientTheme 컬러 기준으로 체크해줘."
```

> 추가 스킬이 필요하면 Claude Code 설정(`~/.claude/settings.json`)의 `customInstructions`에 디자인 원칙을 추가하거나, 프로젝트 `CLAUDE.md`에 직접 기술한다.

### 스킬 적용 후 달라지는 것들

- 버튼의 미세한 그림자 깊이 최적화
- 섹션 간 여백이 8pt 그리드에 정렬
- 텍스트 색상이 배경 대비 4.5:1 이상 유지
- 터치 피드백(press state)이 자연스러운 opacity/scale 변화로 구현
- 아이콘과 텍스트 사이의 간격이 균일하게 정리

---

## [Level 3] 비주얼 디렉터: 시각적 참조로 지시하기

텍스트만으로는 전달할 수 없는 "느낌"을 **스크린샷과 URL로 직접 보여주는** 단계. 바이브 격차를 해소하는 핵심 전략.

### 모바일 앱 전용 레퍼런스 소스

| 소스 | 특징 | 활용법 |
|---|---|---|
| **Mobbin** | 실제 앱 스크린샷 아카이브 (의료/예약 앱 다수) | "이 예약 플로우처럼 만들어줘" |
| **Dribbble** (Mobile 카테고리) | UI 컴포넌트 중심의 세련된 시안 | 카드, 버튼, 바텀시트 등 개별 요소 참고 |
| **Apple HIG / Material Design 3** | 플랫폼별 공식 디자인 가이드 | 네비게이션 패턴, 간격, 터치 영역 기준 |
| **App Store / Google Play** | 실제 출시된 경쟁 앱 | 의료관광, 치과, 예약 앱 벤치마킹 |
| **Awwwards (Mobile 섹션)** | 수상작 중심의 혁신적 모바일 UI | 창의적 레이아웃, 애니메이션 아이디어 |

### 실전 워크플로우: 시각적 파편을 하나의 비전으로 통합

```
"아래 참조 이미지들을 조합해서 Concourse 예약 화면을 만들어줘:
- [스크린샷 A]: 이 앱의 상단 히어로 이미지 + 오버레이 스타일
- [스크린샷 B]: 이 앱의 카드 레이아웃과 둥근 모서리 느낌
- [스크린샷 C]: 이 앱의 하단 CTA 버튼 디자인

브랜드 컬러는 constants/theme.ts의 역할별 테마를 따르고,
폰트와 간격은 기존 Concourse 앱 스타일을 유지해줘."
```

### Figma MCP 연동 — 디자인 직접 추출

프로젝트에 Figma MCP 서버가 연결되어 있다면, 스크린샷 캡처 없이 **Figma 파일에서 직접 디자인 토큰과 레이아웃을 추출**할 수 있다. 이것이 가장 정확한 시각적 참조 방법이다.

```
"Figma에서 Concourse 예약 확인 화면의 디자인 컨텍스트를 가져와줘.
컬러, 간격, 폰트 크기, border-radius 값을 추출해서
PatientTheme 기준으로 StyleSheet에 반영해줘."
```

**활용 가능한 Figma MCP 도구:**

| 도구 | 용도 |
|------|------|
| `get_design_context` | 특정 프레임/컴포넌트의 디자인 토큰 추출 |
| `get_screenshot` | Figma 프레임을 이미지로 캡처 |
| `get_variable_defs` | 디자인 시스템 변수(컬러, 간격 등) 일괄 추출 |
| `search_design_system` | 디자인 시스템에서 컴포넌트 검색 |
| `get_code_connect_suggestions` | 디자인↔코드 매핑 제안 |

> Figma가 없더라도 스크린샷 방식으로 동일한 워크플로우를 수행할 수 있다.

### 스크린샷 활용 팁

1. **경쟁 앱 캡처**: 해외 치과 예약 앱, 의료관광 앱의 핵심 화면을 캡처
2. **부분 캡처**: 전체 화면보다 마음에 드는 **특정 컴포넌트**만 잘라서 제공하는 게 더 정확
3. **Before/After 비교**: 현재 Concourse 화면 스크린샷 + 원하는 방향의 참조 이미지를 함께 제공
4. **assets/images/ 폴더에 저장**: 자주 참조하�� 이미지는 `assets/images/`에 넣어두고 경로로 지시

---

## [Level 4] 클로너: 실제 앱 코드 분석 및 학습

표면적 스타일 모방을 넘어, **실제 프로덕션 앱의 구현 방식을 분석하여 내재화**하는 단계.

### 모바일 앱 환경에서의 코드 분석 방법

웹과 달리 모바일 앱은 소스 코드를 직접 볼 수 없다. 대신 이런 방법을 사용한다:

**① 오픈소스 React Native 앱 분석**
```
"GitHub에서 React Native로 만든 의료/예약 관련 오픈소스 앱을 찾아줘.
특히 예약 플로우, 카드 리스트, 프로필 화면의 구현 방식을 분석해줘.
- 어떤 네비게이션 패턴을 사용하는지
- 카드 컴포넌트의 그림자와 border-radius 값
- 리스트 항목 간 간격 규칙
- 로딩 상태 처리 방식"
```

**② 웹 버전이 있는 앱의 CSS 분석 (Site Teardown)**

벤치마킹할 서비스에 웹 버전이 있다면:
1. `Ctrl + U`로 HTML 소스 확인
2. 하단의 CSS/JS 파일 경로 확인
3. Claude Code에 전체 코드를 제공

```
"이 CSS 코드를 분석해서 React Native StyleSheet로 변환해줘:
- 색상 체계와 변수를 추출해서 우리 theme 파일에 매핑
- 카드의 그림자 값을 React Native shadowOffset/shadowOpacity로 변환
- 간격 체계(spacing system)를 정리해줘
- 이 사이트의 시각적 깊이감은 어떤 속성으로 구현된 건지 설명해줘"
```

> ⚠️ **요약의 함정(Summarization Trap)**: Claude Code의 기본 web fetch는 내용을 요약하므로 세부 스타일 속성이 유실될 수 있다. 전체 CSS를 복사해서 직접 붙여넣는 것이 더 정확하다.

**③ Expo Snack / 커뮤니티 코드 분석**
```
"Expo Snack에서 이 컴포넌트의 구현 코드를 분석해줘.
특히 react-native-reanimated를 사용한 애니메이션 부분을
우리 앱에 어떻게 적용할 수 있는지 설명해줘."
```

---

## [Level 5] 컴포넌트 마스터: 독창적 자산 결합

검증된 컴포넌트 라이브러리와 AI 생성 자산을 결합하여 **독창성을 확보**하는 단계.

### React Native 컴포넌트 라이브러리 활용

| 라이브러리 | 용도 | Concourse 적용 예시 | 상태 |
|---|---|---|---|
| `expo-linear-gradient` | 그라데이션 | 역할별 브랜드 그라데이션 배경/오버레이 | ✅ 설치됨 |
| `react-native-maps` | 지도 | 클리닉 위치 (clinic-map.tsx) | ✅ 설치됨 |
| `expo-haptics` | 햅틱 피드백 | 버튼 터치, 예약 완료 피드백 | ✅ 설치됨 |
| `expo-image-picker` | 이미지 선택 | X-ray/사진 업로드 (upload.tsx) | ✅ 설치됨 |
| `react-native-reanimated` | 고성능 애니메이션 | 카드 플립, 스크롤 애니메이션 | ⬜ 미설치 |
| `react-native-gesture-handler` | 제스처 인터랙션 | 스와이프 삭제, 풀 투 리프레시 | ⬜ 미설치 |
| `expo-blur` | 블러 효과 | 글래스모피즘 카드, 바텀시트 배경 | ⬜ 미설치 |
| `lottie-react-native` | Lottie 애니메이션 | 로딩 스피너, 성공/에러 피드백 | ⬜ 미설치 |
| `expo-image` | 고성능 이미지 로딩 | 클리닉/의사 프로필 사진 캐싱 | ⬜ 미설치 |

> ⬜ 표시된 라이브러리는 사용 전 `npx expo install [패키지명]`으로 설치가 필요하다.

### AI 자산 워크플로우 (모바일 앱 버전)

**① 이미지 자산 생성**
- Midjourney / DALL-E: 클리닉 분위기 컨셉 이미지, 온보딩 일러스트
- 예시 프롬프트: `"Clean minimal illustration of a dental clinic interior, soft purple and teal color palette, warm lighting, professional atmosphere, flat design style"`

**② Lottie 애니메이션 활용**
- LottieFiles에서 검색: 로딩 스피너, 체크마크, 비행기, 치아 아이콘 등
- 앱 크기 최적화에 유리 (비디오 대비 훨씬 가벼움)

**③ 앱 아이콘 및 스플래시 스크린**
```
"Concourse 로고를 기반으로 앱 아이콘을 만들 건데,
expo-splash-screen 설정도 함께 해줘.
- 배경: 역할별 브랜드 그라데이션 (Patient: #4A0080→#1A002E / Doctor: #0F766E→#0d3d38)
- 로고: 흰색 Concourse 심볼
- iOS와 Android 각각의 사이즈 규격에 맞춰줘"
```

### 성능 최적화 전략 (모바일 필수)

```
"이 화면의 이미지 로딩을 최적화해줘:
- expo-image의 placeholder blur hash 적용
- 리스트에서는 썸네일(300px)을 로드하고, 상세 화면에서만 고해상도 로드
- FlatList에 windowSize, maxToRenderPerBatch 설정
- 오프라인 상태에서는 캐시된 이미지를 표시하도록"
```

---

## [Level 6] 팅커러: 세밀한 조정과 반복 개선

전체 구조가 잡힌 후, **세부 디테일을 반복적으로 다듬어서 프로 수준의 완성도**를 끌어올리는 단계.

### 스크린샷 루프 (모바일 앱 버전)

웹에서는 Puppeteer로 자동 스크린샷이 가능하지만, **모바일 앱은 수동 루프**로 동일한 효과를 낸다:

**워크플로우:**
```
① npx expo start → Expo Go 또는 Dev Build로 실기기 실행
② 해당 화면으로 이동 → 스크린샷 촬영
   - iOS: 전원+볼륨↑ → 사진 앱에 저장
   - Android: 전원+볼륨↓
③ Claude Code 채팅에 이미지 드래그&드롭 또는 붙여넣기
④ 구체적 피드백과 함께 수정 요청
⑤ 수정 완료 → Expo Fast Refresh로 즉시 반영 → ②로 돌아가기
```

> **핵심**: Expo의 Fast Refresh 덕분에 코드 수정 → 실기기 반영이 즉시 이루어진다. 저장만 하면 앱이 자동 리로드되므로 웹의 Puppeteer 루프만큼 빠르게 반복할 수 있다.

**피드백 프롬프트 예시:**
```
"[스크린샷 첨부]
현재 patient/dashboard.tsx 화면인데, 수정해야 할 점:
1. 케이스 카드 사이 간격이 너무 좁아 → 16px로 통일
2. 제목 텍스트가 2줄일 때 카드 높이가 들쑥날쑥 → min-height 설정
3. 하단 버튼이 iPhone SE에서 잘림 → SafeAreaView 패딩 확인
4. 전반적으로 여백이 부족 → 좌우 패딩 16→20px
PatientTheme.primaryBorder 색상으로 카드 테두리 통일해줘."
```

### 전문가 수준 완성도 3요소

**① 로딩 & 트랜지션**
```
"화면 진입 시 콘텐츠가 바로 뜨지 않고,
위에서 아래로 순차적으로 fade-in 되는 staggered 애니메이션을 넣어줘.
react-native-reanimated의 FadeInDown을 사용하되,
각 요소 간 50ms 딜레이를 줘서 자연스럽게."
```

**② 타이포그래피 마스터리**
```
"앱 전체의 폰트 체계를 정리해줘:
- 대제목(H1): 28px, Bold, letter-spacing: -0.5
- 소제목(H2): 22px, SemiBold, letter-spacing: -0.3
- 본문: 16px, Regular, line-height: 24
- 캡션: 13px, Regular, color: #6B7280
- 버튼 텍스트: 16px, SemiBold, letter-spacing: 0.3
이걸 theme/typography.ts 파일로 중앙 관리해줘."
```

**③ 마이크로 인터랙션**
```
"아래 마이크로 인터랙션을 추가해줘:
- 버튼 터치 시: scale 0.97로 살짝 줄었다 복귀 (spring 이징, 150ms)
- 예약 완료 시: Lottie 체크마크 애니메이션 + 햅틱 피드백(expo-haptics)
- 리스트 당겨서 새로고침: 커스텀 로딩 인디케이터 (역할별 브랜드 컬러)
- 탭 전환 시: 부드러운 crossfade (200ms)"
```

### 디바이스별 점검 체크리스트

Claude Code에 아래를 지시하여 반응형을 확보한다:

```
"이 화면을 다음 기기 크기에서 모두 정상 작동하도록 확인해줘:
- iPhone SE (375x667) — 최소 크기
- iPhone 15 Pro (393x852) — 기준 크기
- iPhone 15 Pro Max (430x932) — 대형
- Android 일반 (360x800)
- Android 태블릿 (768x1024) — 선택사항

특히 텍스트 잘림, 버튼 간격, 이미지 비율을 체크해줘."
```

---

## [Level 7] 아키텍트: 프리미엄 UX 설계

단순한 화면 제작을 넘어, **앱 전체의 경험을 설계**하는 단계.

### Concourse 앱에 적용할 프리미엄 UX 패턴

**① 온보딩 플로우**
```
"3단계 온보딩을 만들어줘:
1. '해외에서 더 저렴한 치과 치료' — 비용 비교 일러스트
2. '검증된 한국 치과와 직접 연결' — 클리닉 카드 미리보기
3. 'Your companion to quality dental care beyond borders' — CTA

Swipeable 페이지 + 하단 dot indicator + Skip 버튼
마지막 페이지에서 'Get Started' 버튼"
```

**② 스마트 네비게이션 구조**
```
"Expo Router의 탭 네비게이션을 설정해줘:
- 홈 / 검색 / 내 예약 / 채팅 / 프로필
- 아이콘: 1.5px stroke 라인 아이콘 (assets/images 참조)
- 활성 탭: 역할별 primary (Patient #4A0080 / Doctor #0F766E), 비활성: #9CA3AF
- iOS: 블러 배경의 탭바 / Android: 그림자 있는 흰색 탭바"
```

**③ 화면 전환 애니메이션**
```
"화면 전환 커스터마이징:
- 리스트 → 상세: shared element transition (클리닉 이미지가 확대되면서 전환)
- 모달: 하단에서 올라오는 바텀시트 스타일
- 뒤로가기: iOS는 swipe back 제스처, Android는 시스템 기본"
```

### 현실적 한계 인식

2026년 현재, AI가 복잡한 커스텀 애니메이션이나 3D 요소를 완벽히 구현하는 데는 한계가 있다. 하지만:
- 프리미엄 앱들을 관찰하는 것만으로도 디자인 안목이 향상된다
- 기본적인 모션, 간격, 색상 체계만 잘 잡아도 상위 20% 앱 품질에 도달한다
- 복잡한 애니메이션은 Lottie로 대체하면 개발 난이도를 크게 낮출 수 있다

---

## 실전 워크플로우 요약

```
관찰 (Mobbin/Dribbble/경쟁앱)
  ↓
해체 (오픈소스 분석 / CSS→RN 변환)
  ↓
적용 (컴포넌트 라이브러리 통합)
  ↓
커스터마이징 (AI 자산 + 브랜드 적용)
  ↓
반복 개선 (스크린샷 → 피드백 → 수정 루프)
```

### Claude Code 프롬프트 템플릿 모음 (Concourse 실제 예시)

**새 화면 생성:**
```
"patient/clinic-detail.tsx 화면을 새로 만들어줘.
참조: [Mobbin 스크린샷 첨부] 이 병원 상세 화면의 레이아웃
기존 스타일: patient/quote-detail.tsx와 일관성 유지
테마: PatientTheme 사용 (constants/theme.ts)
기기: iPhone 15 Pro 기준, SE에서도 깨지지 않게
store.ts의 DentistQuote 타입에서 데이터를 가져와줘."
```

**기존 화면 개선:**
```
"[스크린샷 첨부]
현재 patient/dashboard.tsx 화면인데, 아래를 개선해줘:
1. 케이스 카드의 상태 뱃지가 너무 작아 가독성 떨어짐
2. 빈 상태(케이스 0개)일 때 일러스트+CTA 없이 텍스트만 있음
3. 카드 간 간격이 불균일
참조 이미지: [벤치마킹 스크린샷]
PatientTheme 기준으로 수정하고, 추가 개선점도 제안해줘."
```

**컴포넌트 추출:**
```
"patient/dashboard.tsx에서 케이스 카드를 재사용 가능한 컴포넌트로 분리해줘.
Props: case (PatientCase 타입), onPress, 뱃지 색상
위치: components/CaseCard.tsx
TypeScript 타입도 함께 정의하고, doctor/dashboard.tsx에서도 쓸 수 있게 해줘."
```

**디자인 리뷰 요청:**
```
"patient/ 폴더의 주요 화면들(dashboard, quotes, quote-detail)을
프런트엔드 디자인 스킬로 리뷰해줘.
- 터치 타겟 44pt 준수 여부
- PatientTheme 컬러 일관성
- 8px 그리드 정렬
- 카드 그림자/border-radius 통일
개선이 필요한 부분을 우선순위로 정리해줘."
```

---

## 배포 전략: EAS Build + 내부 테스트

웹 프로젝트는 Vercel로 자동 배포하지만, 모바일 앱은 **EAS Build**를 통해 배포한다.

```bash
# 내부 테스트용 APK 빌드 (Android)
eas build --profile preview --platform android

# TestFlight용 빌드 (iOS)
eas build --profile preview --platform ios
```

**안전한 배포 워크플로우:**
1. `npx expo start`로 로컬에서 충분히 테스트
2. 실기기에서 스크린샷 루프로 디자인 검증 완료
3. `git push` → EAS Build 트리거 (또는 수동 빌드)
4. 내부 배포(APK/TestFlight)로 팀 리뷰
5. 프로덕션 배포

> 현재 `eas.json`에 `preview` 프로필(APK)과 `production` 프로필이 설정되어 있다.

---

## 핵심 원칙 (항상 기억할 것)

1. **AI에게 모든 것을 맡기지 않는다** — 디자인 방향은 사용자가 결정한다
2. **말보다 보여준다** — 스크린샷 하나가 프롬프트 100줄보다 정확하다
3. **한 번에 완벽을 기대하지 않는다** — 생성 → 확인 → 피드백 → 수정의 루프를 반복한다
4. **브랜드 일관성을 지킨다** — `constants/theme.ts`의 `PatientTheme`/`DoctorTheme`으로 중앙 관리한다
5. **성능을 잊지 않는다** — 모바일은 배터리, 네트워크, 메모리 제약이 있다
6. **플랫폼 가이드를 존중한다** — iOS HIG, Material Design 3의 기본 원칙을 따른다
7. **듀얼 테마를 항상 고려한다** — 환자/의사 화면이 각각의 테마를 사용하므로, 공통 컴포넌트는 테마를 props로 받도록 설계한다
