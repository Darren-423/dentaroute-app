# Concourse 디자인 핸드오프 스펙

> **목적**: 디자인 크리틱에서 발견된 문제들을 수정하기 위한 구체적인 구현 가이드
>
> **기술 스택**: React Native (Expo Web) + CSS-in-JS (react-native-web StyleSheet)
>
> **실행**: `localhost:8082`

---

## 수정 우선순위 요약

| 순서 | 작업 | 심각도 | 난이도 |
|------|------|--------|--------|
| 1 | 하단 탭 바 레이블 추가 | 🔴 심각 | 쉬움 |
| 2 | 색상 대비 및 가독성 개선 | 🔴 심각 | 보통 |
| 3 | max-width 컨테이너 적용 | 🔴 심각 | 쉬움 |
| 4 | 결제 금액 명확화 | 🔴 심각 | 쉬움 |
| 5 | 인풋 필드 글래스모피즘 제거 | 🟡 보통 | 쉬움 |
| 6 | CTA 버튼 스타일 통일 | 🟡 보통 | 보통 |
| 7 | 빈 상태(empty state) CTA 추가 | 🟡 보통 | 쉬움 |
| 8 | 온보딩 레이아웃 개선 | 🟡 보통 | 보통 |

---

## 1. 하단 탭 바 레이블 추가

### 문제
환자/의사 대시보드 하단 탭 바에 아이콘만 있고 텍스트 레이블 없음. 기능 파악 불가.

### 찾을 파일
`Tab.Navigator` 또는 `createBottomTabNavigator`를 사용하는 파일. `app/` 디렉토리 내 navigation 관련 파일.

### 구현

```jsx
// tabBarShowLabel을 true로 변경하고 각 탭에 레이블 추가
<Tab.Navigator
  screenOptions={{
    tabBarShowLabel: true,
    tabBarLabelStyle: {
      fontSize: 10,
      fontWeight: '500',
      marginTop: -2,
    },
    tabBarStyle: {
      height: 56,
      paddingBottom: 6,
      paddingTop: 4,
    },
  }}
>
```

환자 탭 레이블: Home, Messages, Schedule, Navigate, Profile
의사 탭 레이블: Home, Messages, Calendar, History, Profile

### 검증
- `/patient/dashboard`, `/doctor/dashboard`에서 5개 탭 모두 아이콘+텍스트 표시 확인

---

## 2. 색상 대비 및 가독성 개선

### 문제
보라색 그라데이션 배경 위의 흰색 텍스트, 특히 서브텍스트의 대비가 WCAG AA(4.5:1) 미달.

### 찾을 파일
온보딩, 역할 선택, 로그인 화면의 Text 컴포넌트 스타일. `opacity`, `rgba(255,255,255,0.` 검색.

### 수정 규칙

보라색 배경 위 텍스트:
- 제목/주요 텍스트: `color: '#FFFFFF'` (변경 없음)
- 서브텍스트/설명: `color: 'rgba(255,255,255,0.85)'` (최소 0.85)
- 절대로 0.5 이하 opacity 사용 금지

### 화면별 수정

온보딩 (`/`):
- "Receive premium dental..." → fontSize: 18, opacity 0.85 이상
- "Swipe to see pricing" → fontSize: 14, color: rgba(255,255,255,0.8)

역할 선택 (`/auth/role-select`):
- 카드 내 서브텍스트 → 카드 배경 opacity 0.3→0.5 이상으로 높이기
- "How would you like to continue?" → opacity 0.85 이상

로그인 (`/auth/patient-login`):
- "Sign in to continue..." → opacity 0.85 이상

---

## 3. max-width 컨테이너 적용

### 문제
모바일 퍼스트 앱이 데스크톱 전체 너비로 펼쳐져 레이아웃이 깨짐.

### 찾을 파일
앱 루트 레이아웃. `app/_layout.tsx` 또는 `App.tsx`.

### 구현

```jsx
import { View, Platform, StyleSheet } from 'react-native';

function AppContainer({ children }) {
  return (
    <View style={styles.outer}>
      <View style={styles.inner}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 20px rgba(0,0,0,0.1)' } : {}),
  },
});
```

### 검증
- 브라우저 1920px 이상에서 앱 콘텐츠가 480px 안에 들어오는지 확인

---

## 4. 결제 금액 명확화

### 문제
Visit Schedule의 "Confirm & Pay $420"에서 보증금인지 전체 금액인지 불분명.

### 찾을 파일
`visit-schedule`, `VisitSchedule`, `Confirm & Pay` 검색.

### 구현

버튼 위에 금액 요약 컴포넌트 추가:

```jsx
<View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, marginHorizontal: 16, marginBottom: 12 }}>
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
    <Text style={{ fontSize: 14, color: '#6B7280' }}>Total treatment cost</Text>
    <Text style={{ fontSize: 14, color: '#111827' }}>${totalPrice}</Text>
  </View>
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
    <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>Booking deposit (15%)</Text>
    <Text style={{ fontSize: 16, fontWeight: '700', color: '#7C3AED' }}>${amount}</Text>
  </View>
  <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
    Remaining balance due at the clinic after treatment
  </Text>
</View>
```

버튼 텍스트 변경: `"Confirm & Pay $420"` → `"Confirm & Pay $420 Deposit"`

---

## 5. 인풋 필드 글래스모피즘 제거

### 문제
로그인 화면 이메일/비밀번호 인풋이 반투명이라 입력 텍스트 가독성 낮음.

### 찾을 파일
`patient-login`, `PatientLogin`, 또는 공통 TextInput 컴포넌트.

### 수정

```jsx
// ❌ 현재 (반투명)
{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }

// ✅ 수정 (불투명 흰색)
{
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#E5E7EB',
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontSize: 16,
  color: '#111827',
}

// 포커스 상태
{ borderColor: '#7C3AED', borderWidth: 2 }

// placeholder 색상
{ placeholderTextColor: '#9CA3AF' }
```

---

## 6. CTA 버튼 스타일 통일

### 문제
화면마다 CTA 버튼 색상/스타일이 다름 (흰색, 보라색, 연보라색 등).

### 찾을 파일
각 화면의 하단 CTA 버튼, 또는 공통 Button 컴포넌트.

### 통일 스타일

Primary CTA (활성):
```jsx
{ backgroundColor: '#7C3AED', paddingVertical: 16, borderRadius: 14, alignItems: 'center' }
// 텍스트: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' }
```

Primary CTA (비활성):
```jsx
{ backgroundColor: '#C4B5FD', opacity: 0.7 }
// 텍스트: { color: 'rgba(255,255,255,0.7)' }
```

### 화면별 적용

| 화면 | 버튼 | 현재 | 수정 |
|------|------|------|------|
| 온보딩 | "Get Started" | 흰색 배경 + 보라 텍스트 | → primary (보라 배경 + 흰 텍스트) |
| 로그인 | "Sign in" | 연보라 반투명 | → primary |
| Treatment Select | "Review & Submit (0)" | 연보라 | → primaryDisabled (0개 선택 시) |
| Visit Schedule | "Confirm & Pay" | 연보라 | → primary |

---

## 7. 빈 상태(Empty State) CTA 추가

### 문제
Chat List 빈 상태에 텍스트 안내만 있고 액션 버튼 없음.

### 찾을 파일
`chat-list`, `ChatList`, `No messages yet` 검색.

### 구현
"No messages yet" 텍스트 아래에 CTA 버튼 추가:

```jsx
<TouchableOpacity
  style={{ marginTop: 24, backgroundColor: '#7C3AED', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 }}
  onPress={() => navigation.navigate('Dashboard')}
>
  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>Browse My Cases</Text>
</TouchableOpacity>
```

---

## 8. 온보딩 레이아웃 개선

### 문제
온보딩, 역할 선택 화면에서 상단 절반이 비어 있고 콘텐츠가 하단에 치우침.

### 찾을 파일
랜딩 페이지, `/auth/role-select` 관련 컴포넌트.

### 수정
- 콘텐츠 컨테이너: `justifyContent: 'flex-end'` → `justifyContent: 'center'`
- 역할 선택 카드 배경: `rgba(255,255,255,0.1)` → `rgba(255,255,255,0.2)` 이상

---

## 공통 디자인 토큰

### 색상
| 토큰 | 값 | 용도 |
|------|-----|------|
| primary | `#7C3AED` | CTA 버튼, 활성 탭, 링크, 포커스 |
| primary-light | `#C4B5FD` | 비활성 버튼, 보조 배지 |
| primary-dark | `#5B21B6` | 헤더 배경 |
| text-primary | `#111827` | 제목, 주요 텍스트 |
| text-secondary | `#6B7280` | 설명, 부가 텍스트 |
| text-tertiary | `#9CA3AF` | placeholder, 힌트 |
| text-on-dark | `#FFFFFF` | 보라 배경 위 텍스트 |
| text-on-dark-sub | `rgba(255,255,255,0.85)` | 보라 배경 위 서브텍스트 |
| bg-primary | `#FFFFFF` | 카드, 인풋 배경 |
| bg-secondary | `#F9FAFB` | 섹션 배경 |
| border-default | `#E5E7EB` | 인풋, 카드 테두리 |
| success | `#10B981` | 의사 측 primary |
| error | `#EF4444` | 에러, 삭제 |

### 간격
| 토큰 | 값 | 용도 |
|------|-----|------|
| xs | 4px | 인접 요소 |
| sm | 8px | 카드 내부 |
| md | 16px | 섹션 내, 인풋 패딩 |
| lg | 24px | 섹션 간 |
| xl | 32px | 큰 섹션 간 |

### 타이포그래피
| 토큰 | 크기 | 굵기 | 용도 |
|------|------|------|------|
| heading-xl | 28px | 700 | 화면 타이틀 |
| heading-lg | 22px | 700 | 섹션 타이틀 |
| heading-md | 18px | 600 | 카드 타이틀 |
| body-lg | 16px | 400 | 본문, 인풋 |
| body-md | 14px | 400 | 설명, 서브텍스트 |
| body-sm | 12px | 400 | 캡션, 뱃지 |
| label | 12px | 600 | 인풋 라벨 |

### 라운드
| 토큰 | 값 | 용도 |
|------|-----|------|
| sm | 8px | 뱃지, 작은 요소 |
| md | 12px | 인풋, 작은 카드 |
| lg | 16px | 카드, 모달 |
| xl | 24px | 버튼(pill) |
| full | 9999px | 아바타 |

---

## 파일 탐색 키워드

| 찾으려는 것 | 검색 키워드 |
|-------------|-------------|
| 탭 네비게이터 | `Tab.Navigator`, `createBottomTabNavigator`, `tabBarShowLabel` |
| 로그인 | `patient-login`, `PatientLogin`, `Welcome back` |
| 대시보드 | `Dashboard`, `My Cases` |
| Visit Schedule | `VisitSchedule`, `Confirm & Pay` |
| Chat List | `ChatList`, `No messages yet` |
| 온보딩 | `Get Started`, `onboarding`, `landing` |
| 역할 선택 | `role-select`, `RoleSelect`, `I'm a Patient` |
| 버튼 공통 | `Button`, `PrimaryButton` |
| 색상 정의 | `colors`, `theme`, `palette` |
