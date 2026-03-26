# Codex 작업 기획서 — UX 플로우 개선 (devnewflow 브랜치)

> Branch: `devnewflow`
> 이 문서는 Codex가 독립적으로 실행할 수 있는 작업만 포함합니다.
> Claude가 별도로 처리하는 작업: 현장 체크리스트 통합 (#5), AI Screening (#6)

---

## 작업 1: Treatment Intent 신규 화면 생성

### 파일: `app/patient/treatment-intent.tsx` (신규)

2갈래 선택 화면을 만든다. 기존 `app/patient/treatment-select.tsx`와 `app/patient/upload.tsx`의 스타일을 참고.

**임포트:**
```ts
import { PatientTheme, SharedColors } from "../../constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
```

**화면 구조:**
1. 상단: LinearGradient 헤더 (`PatientTheme.gradient`)
   - 뒤로가기 버튼 (← 아이콘)
   - 타이틀: "What brings you in?"
   - 서브타이틀: "Tell us so dentists can help"

2. 본문: 2개 카드 (TouchableOpacity)
   - **카드 A**: 🎯 "I know what I need"
     - 설명: "Select specific treatments you'd like to get done"
     - onPress: `router.push("/patient/treatment-select?mode=specific")`
   - **카드 B**: 🔍 "Help me figure it out"
     - 설명: "Dentists will review your photos and suggest a plan"
     - onPress: `router.push("/patient/upload?mode=proposal")`

3. 하단 면책 배너:
   - 배경: `#FEF3C7`, 텍스트: `#92400E`
   - "ℹ️ Either way, the final treatment plan is confirmed after your in-person exam at the clinic."

**카드 스타일:**
- 배경: `SharedColors.white`
- 보더: `1px solid PatientTheme.primaryBorder`
- borderRadius: 16
- padding: 20
- marginBottom: 16
- 이모지 폰트 사이즈: 32
- 타이틀 폰트: 18 bold, color: `SharedColors.navy`
- 설명 폰트: 14, color: `SharedColors.slate`

**Accessibility:**
- 각 카드: `accessibilityRole="button"`, `accessibilityLabel` 포함

---

## 작업 2: Patient Info 통합 폼 생성

### 파일: `app/patient/patient-info.tsx` (신규)

기존 3개 화면의 콘텐츠를 하나로 합친다:
- `app/patient/basic-info.tsx` → 섹션 1
- `app/patient/medical-history.tsx` → 섹션 2
- `app/patient/dental-history.tsx` → 섹션 3

**중요: 기존 3개 파일은 삭제하지 않는다.** (하위 호환)

**임포트:**
```ts
import { PatientTheme, SharedColors } from "../../constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { store } from "../../lib/store";
```

**화면 구조:**
1. 상단: LinearGradient 헤더
   - 뒤로가기 버튼
   - 타이틀: "About You"
   - 서브타이틀: "Step 1 of 3: Your Info"

2. ScrollView 본문에 3개 섹션 (아코디언):
   각 섹션은 헤더를 탭하면 접기/펼치기. 기본: 섹션 1만 펼침.

   **섹션 1: Basic Information**
   - 아이콘: 👤
   - 필드: Full Name (readonly, 가입 시 입력됨), Date of Birth (드롭다운 3개: Year/Month/Day), Country (드롭다운)
   - Country 목록: `basic-info.tsx`의 COUNTRIES 배열 재사용

   **섹션 2: Medical History**
   - 아이콘: 🏥
   - 필드: Health conditions (체크리스트), Medications (텍스트), Allergies (텍스트)
   - 체크리스트 항목은 `medical-history.tsx`에서 가져옴

   **섹션 3: Dental History**
   - 아이콘: 🦷
   - 필드: Current dental issues (체크리스트), Previous treatments (체크리스트), Last dental visit (선택)
   - 체크리스트 항목은 `dental-history.tsx`에서 가져옴

3. 하단 버튼: "Continue to Treatment →"
   - onPress: `router.push("/patient/treatment-intent")`
   - 필수 필드 미입력 시 비활성

**아코디언 스타일:**
- 헤더: 배경 `PatientTheme.primaryLight`, 보더 `PatientTheme.primaryBorder`
- 열린 상태: 체브론 ▼, 닫힌 상태: ▶
- 완료된 섹션 헤더에 ✅ 표시

**데이터 저장:**
- 각 섹션 데이터를 기존 store API로 저장:
  - `store.savePatientProfile(data)` — 섹션 1
  - `store.savePatientMedical(data)` — 섹션 2
  - `store.savePatientDental(data)` — 섹션 3
- 화면 진입 시 기존 데이터 로드 (`store.getPatientProfile()` 등)

---

## 작업 3: Travel Dates 위치 이동 (네비게이션 변경)

### 수정 파일: `app/patient/quote-detail.tsx`

현재 quote-detail에서 "Schedule Visits" 버튼을 누르면 `visit-schedule`로 이동.
→ 중간에 `travel-dates`를 끼워넣는다.

**변경:**
"Schedule Visits" 버튼의 onPress를 찾아서:
```ts
// 변경 전
router.push(`/patient/visit-schedule?quoteId=${quoteId}`)

// 변경 후
router.push(`/patient/travel-dates?quoteId=${quoteId}&fromQuote=true`)
```

### 수정 파일: `app/patient/travel-dates.tsx`

**변경 1:** `useLocalSearchParams`에서 `quoteId`와 `fromQuote` 파라미터 수신

**변경 2:** "Continue" 버튼의 onPress:
```ts
// fromQuote가 true이면 visit-schedule로 이동
if (fromQuote === "true" && quoteId) {
  router.push(`/patient/visit-schedule?quoteId=${quoteId}`);
} else {
  // 기존 동작 유지
  router.push("/patient/upload");
}
```

### 수정 파일: `app/patient/review.tsx`

케이스 생성 플로우에서 travel-dates를 건너뛰도록 변경.
현재 review.tsx의 "이전" 버튼이 travel-dates로 가면 → upload로 가도록 변경.

review.tsx에서 travel-dates로의 네비게이션 참조를 찾아서 upload로 변경.

---

## 작업 4: 면책 문구 통일

### 수정 파일 4개

**4-1. `app/patient/treatment-intent.tsx`** (작업 1에서 이미 포함)
- 하단에 amber 배너 이미 있음 — 확인만

**4-2. `app/patient/quotes.tsx`**
현재 disclaimer 텍스트를 찾아서 교체:
```
// 변경 전
"Quotes are estimates only. Actual treatment costs may change after in-person examination. Concourse does not guarantee treatment outcomes."

// 변경 후
"These are preliminary suggestions based on your photos. Actual treatment and costs are finalized after in-person examination. Concourse does not guarantee treatment outcomes."
```
스타일도 변경:
- 배경: `#FEF3C7` (현재 `#f1f5f9`)
- 텍스트 색상: `#92400E` (현재 `SharedColors.slate`)
- 보더: `1px solid #FCD34D`

**4-3. `app/patient/visit-schedule.tsx`**
ScrollView 최상단에 amber 배너 추가:
```jsx
<View style={{ backgroundColor: "#FEF3C7", borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: "#FCD34D" }}>
  <Text style={{ fontSize: 11, color: "#92400E", lineHeight: 16 }}>
    ℹ️ You're booking a consultation. The treatment plan may be adjusted after your in-person exam.
  </Text>
</View>
```

**4-4. `app/patient/payment.tsx`** (서비스 티어 결제 화면)
ScrollView 최상단에 amber 배너 추가:
```jsx
<View style={{ backgroundColor: "#FEF3C7", borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: "#FCD34D" }}>
  <Text style={{ fontSize: 11, color: "#92400E", lineHeight: 16 }}>
    ℹ️ You're booking a consultation. The treatment plan may be adjusted after your in-person exam.
  </Text>
</View>
```

---

## 작업 5: 가입 후 라우팅 변경 (바로 Dashboard)

### 수정 파일: `app/auth/patient-create-account.tsx`

현재 가입 완료 후 `/patient/basic-info`로 이동하는 부분을 찾아서:
```ts
// 변경 전
router.replace("/patient/basic-info");

// 변경 후
router.replace("/patient/dashboard");
```

### 수정 파일: `app/auth/patient-login.tsx`

로그인 완료 후 라우팅도 동일하게 확인:
```ts
// 만약 /patient/basic-info로 가고 있다면 → /patient/dashboard로 변경
router.replace("/patient/dashboard");
```

### 수정 파일: `app/patient/dashboard.tsx`

"+ New Case" 버튼의 onPress를 찾아서:
```ts
// 변경 전 (treatment-select 또는 basic-info 등)
router.push("/patient/basic-info");

// 변경 후
router.push("/patient/patient-info");
```

---

## 실행 순서

1. 작업 1 → `treatment-intent.tsx` 신규 생성
2. 작업 2 → `patient-info.tsx` 신규 생성
3. 작업 3 → `quote-detail.tsx`, `travel-dates.tsx`, `review.tsx` 수정
4. 작업 4 → `quotes.tsx`, `visit-schedule.tsx`, `payment.tsx` 면책 배너
5. 작업 5 → `patient-create-account.tsx`, `patient-login.tsx`, `dashboard.tsx` 라우팅

## 검증

모든 작업 완료 후:
```bash
npx tsc --noEmit
```
TypeScript 에러 0개 확인.

---

## 하지 말 것 (Claude가 처리)
- ❌ 현장 체크리스트 Dashboard 통합 (개선 4) — 복잡한 상태 머신 변경
- ❌ AI Screening 결과 화면 (개선 6) — 서버 연동 필요
- ❌ 기존 `basic-info.tsx`, `medical-history.tsx`, `dental-history.tsx` 삭제
- ❌ store.ts 수정
- ❌ _layout.tsx 수정
