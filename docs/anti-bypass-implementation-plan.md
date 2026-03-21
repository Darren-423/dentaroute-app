# DentaRoute Anti-Bypass 구현 기획서

**작성일**: 2026-03-14
**버전**: v1.0
**기반 문서**: `anti-bypass-strategy.md`, `improvement-plan.md`

---

## 목차

1. [문제 정의](#1-문제-정의)
2. [현재 구현 현황](#2-현재-구현-현황)
3. [Phase 1: 채팅 메시지 필터링](#3-phase-1-채팅-메시지-필터링)
4. [Phase 2: 치료 보증 프로그램](#4-phase-2-치료-보증-프로그램)
5. [Phase 3: 리뷰 시스템 강화](#5-phase-3-리뷰-시스템-강화)
6. [Phase 4: 의사 대시보드 가치 강화](#6-phase-4-의사-대시보드-가치-강화)
7. [Phase 5: 파트너 계약 시스템](#7-phase-5-파트너-계약-시스템)
8. [전체 로드맵](#8-전체-로드맵)
9. [효과 측정 지표](#9-효과-측정-지표)

---

## 1. 문제 정의

### 1.1 핵심 문제
환자와 의사가 앱 채팅에서 연락처를 교환한 뒤, 플랫폼 수수료(15~20%)를 우회하여 직접 거래하는 것.

### 1.2 바이패스 시나리오
```
의사: "앱 수수료 20% 빼고 직접 하면 15% 싸게 해줄게"
환자: (5% 더 저렴) → 수락
결과: 플랫폼 매출 100% 손실
```

### 1.3 방지 전략 3원칙
```
당근 (Carrot)  → 앱 안에서 거래하면 더 이득
벽 (Wall)      → 앱 밖으로 나가기 어렵게
채찍 (Stick)   → 앱 밖 거래 시 불이익
```

---

## 2. 현재 구현 현황

| # | 장치 | 유형 | 대상 | 효과 | 상태 |
|---|------|------|------|------|------|
| 1 | 5% 앱 결제 할인 | 당근 | 환자 | ⭐⭐ | ✅ 구현 완료 |
| 2 | 10% 보증금 선결제 | 벽 | 환자 | ⭐⭐ | ✅ 구현 완료 |
| 3 | 티어 수수료 (15~20%) | 당근 | 의사 | ⭐⭐⭐ | ✅ 구현 완료 |
| 4 | 취소 환불 정책 | 벽 | 환자 | ⭐ | ✅ 구현 완료 |
| 5 | 채팅 메시지 필터링 | 벽 | 양쪽 | ⭐⭐⭐⭐ | ❌ 미구현 |
| 6 | 파트너 계약 조항 | 채찍 | 의사 | ⭐⭐⭐⭐⭐ | ❌ 미구현 |
| 7 | 치료 보증 (앱 전용) | 당근 | 환자 | ⭐⭐⭐⭐ | ❌ 미구현 |
| 8 | 리뷰 시스템 연동 | 당근 | 의사 | ⭐⭐⭐ | 🔶 부분 구현 |
| 9 | 분할 결제 편의성 | 당근 | 환자 | ⭐⭐ | ✅ 구현 완료 |
| 10 | 의사 대시보드 가치 | 당근 | 의사 | ⭐⭐ | 🔶 부분 구현 |

**구현 완료**: 4개 / **미구현**: 3개 / **부분 구현**: 2개

---

## 3. Phase 1: 채팅 메시지 필터링 (최우선)

> **우선순위**: 최상 | **유형**: 벽(Wall) | **효과**: ⭐⭐⭐⭐

### 3.1 개요
Airbnb 모델 참고. 예약 확정 전까지 채팅에서 연락처 공유를 차단하고, 예약 확정(confirmed) 후 필터를 해제한다.

### 3.2 감지 패턴

#### 3.2.1 전화번호 패턴
```typescript
const PHONE_PATTERNS = [
  /\b\d{3}[-.\s]?\d{3,4}[-.\s]?\d{4}\b/,         // 010-1234-5678, 010 1234 5678
  /\b\d{10,11}\b/,                                  // 01012345678
  /\+\d{1,3}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/, // +82 10-1234-5678, +1 (555) 123-4567
  /\b0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}\b/,       // 02-123-4567 (한국 지역번호)
];
```

#### 3.2.2 이메일 패턴
```typescript
const EMAIL_PATTERNS = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,  // 표준 이메일
  /[a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+/,           // 공백 회피 시도 (test @ gmail)
  /[a-zA-Z0-9._%+-]+\s*\[at\]\s*[a-zA-Z0-9.-]+/i,     // [at] 우회 시도
  /[a-zA-Z0-9._%+-]+\s*\(at\)\s*[a-zA-Z0-9.-]+/i,     // (at) 우회 시도
];
```

#### 3.2.3 메신저/SNS 키워드
```typescript
const MESSENGER_KEYWORDS = [
  // 한국어
  '카카오', '카톡', '카카오톡', '라인', '위챗',
  // 영어
  'kakao', 'kakaotalk', 'line', 'whatsapp', 'wechat',
  'telegram', 'viber', 'signal', 'instagram', 'facebook',
  // 앱 ID 유도
  'add me', 'my id', 'contact me', 'reach me',
  '아이디', 'id는', 'id 는',
];
```

#### 3.2.4 URL 패턴
```typescript
const URL_PATTERNS = [
  /https?:\/\/[^\s]+/,                    // http:// 또는 https://
  /www\.[^\s]+/,                           // www.
  /[a-zA-Z0-9-]+\.(com|net|org|kr|co\.kr|io)\b/,  // 도메인 직접 입력
];
```

#### 3.2.5 우회 시도 방지
```typescript
const EVASION_PATTERNS = [
  // 숫자 사이 특수문자 삽입: 0.1.0.-.1.2.3.4
  /(\d\s*[.\-_/\\|,]\s*){7,}/,
  // 한글/영문 숫자 표기: 공일공, zero-one-zero
  /공\s*일\s*공|영\s*일\s*영/,
  /zero[\s-]*one[\s-]*zero/i,
  // "at" 변형: (a)(t), a.t, @t
  /\b[aA]\s*[tT]\b/,
];
```

### 3.3 필터링 동작 방식

#### 3.3.1 메시지 전송 흐름
```
환자/의사가 메시지 입력 → 전송 버튼 탭
    ↓
[1단계: 예약 상태 확인]
    ├── 예약 confirmed 이후 → 필터 OFF → 메시지 전송
    └── 예약 전 / 예약 없음 → 필터 ON → 2단계로
    ↓
[2단계: 패턴 검사]
    ├── 패턴 미감지 → 메시지 정상 전송
    └── 패턴 감지 → 3단계로
    ↓
[3단계: 마스킹 + 경고]
    ├── 메시지 내 감지된 부분을 [contact info hidden] 으로 치환
    ├── 발신자에게 경고 Toast 표시
    ├── 마스킹된 메시지를 상대방에게 전송
    └── 위반 로그 기록 (서버)
```

#### 3.3.2 경고 메시지 (Toast/Modal)
```
첫 번째 위반:
  "For your protection, personal contact information cannot be shared
   before booking confirmation. All communication should stay within
   DentaRoute to ensure your safety and payment protection."

두 번째 위반:
  "Contact sharing is restricted to protect both parties.
   Once your booking is confirmed, you'll be able to share
   contact details directly."

세 번째+ 위반:
  "Repeated attempts to share contact information have been detected.
   This activity is logged. Please use DentaRoute's secure messaging
   for all pre-booking communications."
```

#### 3.3.3 위반 레벨 시스템
```
Level 1 (1~2회): 경고 Toast + 마스킹
Level 2 (3~5회): 경고 Modal (닫기 필수) + 마스킹 + 서버 로그
Level 3 (6회+):  채팅 일시 제한 (10분) + 관리자 알림 + 서버 로그
```

### 3.4 대상 파일 및 구현 상세

#### 3.4.1 신규 파일
```
lib/chat-filter.ts          — 필터링 엔진 (패턴 감지 + 마스킹 + 레벨 관리)
```

#### 3.4.2 수정 파일
```
app/patient/chat.tsx        — sendMessage 호출 전 필터 적용
app/doctor/chat.tsx         — sendMessage 호출 전 필터 적용
lib/store.ts                — sendMessage()에 필터링 로직 통합 (선택적)
```

#### 3.4.3 `lib/chat-filter.ts` 핵심 API
```typescript
interface FilterResult {
  isBlocked: boolean;           // 연락처 감지 여부
  originalText: string;         // 원본 텍스트
  filteredText: string;         // 마스킹된 텍스트 ([contact info hidden])
  detectedPatterns: string[];   // 감지된 패턴 유형 ("phone", "email", "messenger", "url")
  warningLevel: 1 | 2 | 3;     // 누적 위반에 따른 경고 레벨
  warningMessage: string;       // 표시할 경고 문구
}

// 메인 함수
function filterChatMessage(
  text: string,
  bookingStatus: BookingStatus | null,
  violationCount: number
): FilterResult;

// 예약 상태에 따라 필터 활성/비활성 판단
function shouldFilter(bookingStatus: BookingStatus | null): boolean;
// → confirmed, flight_submitted, arrived_korea, ... 이후는 false
// → null, pending, quotes_received 등은 true
```

#### 3.4.4 채팅 UI 변경사항
```
채팅 화면 상단 배너 (필터 활성 시):
┌─────────────────────────────────────────────┐
│ 🔒 Contact sharing is restricted until      │
│    booking confirmation. Learn why →         │
└─────────────────────────────────────────────┘

마스킹된 메시지 표시:
┌─────────────────────────────────────────────┐
│ Dr. Kim: You can reach me at                │
│ [contact info hidden] for more details.     │
│                                             │
│ ⓘ Contact info was hidden for security     │
└─────────────────────────────────────────────┘
```

### 3.5 예외 처리

#### 3.5.1 허용되는 숫자
```
- 치료 가격: "$4,150", "₩5,000,000"
- 날짜: "March 15", "3/15", "2026-03-15"
- 치아 번호: "#14", "#36"
- 수량: "2 implants", "4 veneers"
- 기간: "6 days", "3 months"

→ 금액($, ₩, €), 날짜 패턴, # 접두사, 단위 동반 숫자는 필터링 제외
```

#### 3.5.2 허용 URL
```
- DentaRoute 내부 링크
- 치과 관련 교육 자료 (판단 어려우므로 초기엔 모든 URL 차단)
```

---

## ~~4. Phase 2: 치료 보증 프로그램 (Treatment Warranty) — REMOVED~~

> **이 Phase는 제거되었습니다.** Warranty 기능은 더 이상 구현하지 않습니다.

> **우선순위**: 상 | **유형**: 당근(Carrot) | **효과**: ⭐⭐⭐⭐

### 4.1 개요
앱으로 결제한 치료에 대해서만 치료 보증을 적용한다. 치과 치료는 고가이고 실패 리스크가 있으므로, 보증은 환자에게 매우 강력한 앱 잔류 동기를 부여한다.

### 4.2 보증 정책

| 치료 유형 | 보증 기간 | 보증 범위 |
|-----------|-----------|-----------|
| Dental Implant | 5년 | 임플란트 탈락, 보철물 파손 |
| Crown | 3년 | 크라운 파손, 탈락, 변색 |
| Bridge | 3년 | 브릿지 파손, 탈락 |
| Veneer | 2년 | 파손, 탈락 (변색 제외) |
| Root Canal | 2년 | 재치료 필요 시 |
| Teeth Whitening | 없음 | (일시적 시술) |
| Cleaning | 없음 | (정기 시술) |
| Filling | 1년 | 탈락, 파손 |
| Extraction | 없음 | (비가역적) |
| Denture | 2년 | 파손, 핏 불량 |
| Orthodontics | 1년 | 유지장치 파손 (완료 후) |
| Gum Treatment | 1년 | 재발 시 |
| Jaw Surgery | 2년 | 합병증 발생 시 |

### 4.3 보증 조건
```
필수 조건 (모두 충족해야 함):
✅ DentaRoute 앱을 통해 전액 결제 완료
✅ 치료 완료 확인 (treatment_complete 상태)
✅ 의사의 사후 관리 지침 준수 (자가 신고)
✅ 보증 기간 내 클레임 접수

제외 조건:
❌ 환자 과실 (외상, 관리 부주의)
❌ 다른 치과에서의 추가 시술로 인한 문제
❌ 자연적 마모
❌ 앱 외 직접 결제한 치료
```

### 4.4 클레임 프로세스
```
1. 환자가 앱에서 보증 클레임 접수
   → 증상 설명 + 사진 업로드

2. DentaRoute 검토 (1~3 영업일)
   → 보증 범위 해당 여부 판단

3-A. 승인 시:
   → 원래 의사에게 무상 재치료 요청
   → 환자 재방문 항공편 보조 (케이스별 판단)
   → 또는 환자 현지 치과 비용 일부 보상

3-B. 거부 시:
   → 거부 사유 + 항소 절차 안내

4. 재치료 완료 → 보증 재시작 (잔여 기간)
```

### 4.5 대상 파일 및 구현 상세

#### 4.5.1 데이터 모델 추가 (`lib/store.ts`)
```typescript
interface TreatmentWarranty {
  id: string;                    // "tw_" + timestamp
  bookingId: string;
  treatmentName: string;
  treatmentDate: string;         // 치료 완료일
  warrantyMonths: number;        // 보증 기간 (개월)
  expiresAt: string;             // 보증 만료일
  status: 'active' | 'claimed' | 'expired' | 'voided';
  claims: WarrantyClaim[];
}

interface WarrantyClaim {
  id: string;
  warrantyId: string;
  description: string;
  photos: string[];              // 증거 사진 URI
  status: 'submitted' | 'reviewing' | 'approved' | 'denied';
  submittedAt: string;
  resolvedAt?: string;
  resolution?: string;
}
```

#### 4.5.2 신규 파일
```
app/patient/warranty.tsx             — 내 보증 목록 화면
app/patient/warranty-claim.tsx       — 보증 클레임 접수 화면
app/patient/warranty-detail.tsx      — 보증 상세/클레임 진행 현황
constants/warranty.ts                — 치료별 보증 기간 설정
```

#### 4.5.3 수정 파일
```
app/patient/dashboard.tsx            — 보증 탭 또는 바로가기 추가
app/patient/treatment-complete.tsx   — 치료 완료 시 보증 자동 생성 안내
app/patient/final-payment.tsx        — "Includes X-year warranty" 배지
app/patient/quote-detail.tsx         — 견적에 보증 정보 표시
lib/store.ts                         — 보증 CRUD 함수 추가
```

#### 4.5.4 UI 표시 위치

**견적 상세 화면 (`quote-detail.tsx`)**:
```
┌─────────────────────────────────────────────┐
│  ✅ Treatment Warranty Included             │
│  ─────────────────────────────────          │
│  • Dental Implant × 2: 5-year warranty     │
│  • Crown × 3: 3-year warranty              │
│  • Veneers × 4: 2-year warranty            │
│                                             │
│  ⓘ Warranty valid only for DentaRoute      │
│    in-app payments                          │
└─────────────────────────────────────────────┘
```

**최종 결제 화면 (`final-payment.tsx`)**:
```
┌─────────────────────────────────────────────┐
│  🛡️ Your treatments are protected           │
│                                             │
│  By paying through DentaRoute, you get:     │
│  • Up to 5-year treatment warranty          │
│  • 5% app payment discount                 │
│  • Secure escrow payment                   │
│  • Dispute resolution support              │
│                                             │
│  Direct payment = No warranty, no support   │
└─────────────────────────────────────────────┘
```

**환자 대시보드 (`dashboard.tsx`)**:
```
[Warranty] 탭 또는 섹션:
┌─────────────────────────────────────────────┐
│  Active Warranties                    See All│
│  ─────────────────────────────────          │
│  🦷 Implant (×2)   Expires: Mar 2031  🟢   │
│  👑 Crown (×3)     Expires: Mar 2029  🟢   │
│  ✨ Veneer (×4)    Expires: Mar 2028  🟢   │
└─────────────────────────────────────────────┘
```

---

## 5. Phase 3: 리뷰 시스템 강화

> **우선순위**: 중-상 | **유형**: 당근(Carrot) | **효과**: ⭐⭐⭐

### 5.1 현재 상태
- 리뷰 작성 가능 (write-review.tsx)
- 리뷰 조회 가능 (dentist-reviews.tsx)
- **문제**: 앱 결제 여부와 리뷰 작성 권한이 연결되어 있지 않음

### 5.2 개선 방안

#### 5.2.1 리뷰 작성 자격 제한
```
리뷰 작성 가능 조건:
✅ 앱을 통해 결제 완료 (payment_complete 상태)
✅ 치료 완료 확인 (treatment_complete 상태)

직접 거래 시:
❌ 리뷰 작성 불가
❌ 의사는 리뷰를 받을 수 없음 → 신규 환자 유입 감소
```

#### 5.2.2 Verified Patient 배지
```
앱 결제 완료 환자의 리뷰에:
┌─────────────────────────────────────────────┐
│  ⭐⭐⭐⭐⭐  "Amazing experience!"          │
│  Sarah J. ✅ Verified Patient               │
│  Implant + Crown • Mar 2026                │
│  ─────────────────────────────────          │
│  "Dr. Kim was incredibly skilled..."        │
└─────────────────────────────────────────────┘

→ "Verified Patient" 배지가 리뷰 신뢰도 향상
→ 의사 입장에서 Verified 리뷰 = 더 가치 있음
```

#### 5.2.3 의사 프로필 리뷰 통계
```
의사 프로필에 표시:
┌─────────────────────────────────────────────┐
│  Dr. Kim Minjun                             │
│  ⭐ 4.9 (127 verified reviews)              │
│  ─────────────────────────────────          │
│  📊 Review Breakdown                       │
│  Treatment Quality  ⭐⭐⭐⭐⭐  4.9         │
│  Clinic Facility    ⭐⭐⭐⭐⭐  4.8         │
│  Communication      ⭐⭐⭐⭐⭐  4.9         │
│  ─────────────────────────────────          │
│  🏅 Top-Rated in Implant (Gangnam area)     │
└─────────────────────────────────────────────┘
```

### 5.3 대상 파일
```
수정 파일:
app/patient/write-review.tsx     — 리뷰 작성 전 결제 완료 확인 로직 추가
app/patient/dentist-reviews.tsx  — Verified Patient 배지 표시
app/patient/dentist-profile.tsx  — 리뷰 통계 섹션 강화
lib/store.ts                     — createReview()에 결제 확인 검증 추가
```

---

## 6. Phase 4: 의사 대시보드 가치 강화

> **우선순위**: 중 | **유형**: 당근(Carrot) | **효과**: ⭐⭐

### 6.1 목표
앱이 단순 중개가 아니라 "의사의 비즈니스 관리 도구"가 되어, 의사가 앱을 떠나기 싫게 만든다.

### 6.2 추가 기능

#### 6.2.1 수익 분석 강화 (`doctor/earnings.tsx` 확장)
```
현재: 기본 수익 목록
추가:
- 월간/분기별/연간 수익 차트
- 치료 유형별 수익 분석
- 환자 국가별 통계
- 수수료 티어 진행 상황 ("Gold까지 $X,XXX 더 필요")
- 예상 월간 수익 (트렌드 기반)
```

#### 6.2.2 환자 관리 CRM
```
신규 파일:
app/doctor/patient-history.tsx    — 이전 환자 치료 이력

기능:
- 이전 환자 목록 + 치료 이력
- 재방문 환자 알림
- 환자별 메모 기능
- 후속 관리 리마인더 설정
```

#### 6.2.3 자동 번역 채팅 강화
```
현재: Mock 번역
추가:
- 실시간 번역 (DeepL/Papago API)
- 의료 용어 사전 통합
- 번역 정확도 피드백 기능
- 음성 메시지 번역 (향후)
```

#### 6.2.4 스케줄 관리
```
신규 파일:
app/doctor/schedule.tsx           — 예약 일정 캘린더

기능:
- 캘린더 뷰로 전체 예약 확인
- 빈 시간대 자동 추천
- 환자별 방문 일정 한눈에 보기
- 일정 충돌 경고
```

### 6.3 Anti-Bypass 효과
```
의사가 앱에서 얻는 가치:
1. 환자 연결 (핵심)
2. 자동 번역 채팅 → 직접 거래 시 통역 비용 발생
3. 수익 분석 → 다른 곳에서 얻기 어려운 인사이트
4. 환자 관리 CRM → 장기적 관계 관리 도구
5. 인보이스/결제 자동화 → 직접 거래 시 수동 처리 필요

→ "앱을 떠나면 이 모든 편의를 잃는다"는 인식 형성
```

---

## 7. Phase 5: 파트너 계약 시스템 (앱 내 표시)

> **우선순위**: 중 | **유형**: 채찍(Stick) | **효과**: ⭐⭐⭐⭐⭐

### 7.1 개요
법적 구속력이 있는 파트너 계약을 앱 내에서 관리. 코드 구현보다는 계약서 조항이 핵심이지만, 앱에서 계약 내용을 확인하고 동의할 수 있도록 한다.

### 7.2 계약 핵심 조항

#### 7.2.1 3단계 제재
```
DentaRoute를 통해 연결된 환자와 플랫폼 외 직접 거래 확인 시:

① 위약금 부과
   - 해당 거래 치료비의 플랫폼 수수료 2배
   - 예: 치료비 $8,000 × Standard 20% = $1,600 → 위약금 $3,200
   - 산정 근거가 명확하여 법적 분쟁 시에도 합리적

② DentaRoute 파트너십 영구 해지 (Permanent Ban)
   - 플랫폼 영구 퇴출, 재가입 불가
   - 플랫폼 성장 시 밴의 무게가 기하급수적으로 증가

③ 기존 리뷰 및 프로필 비공개 처리
   - 쌓은 리뷰, 평점, 프로필 전체 비공개
   - 의사가 오랫동안 쌓은 신뢰 자산이 즉시 상실
```

#### 7.2.2 기간 제한 조항
```
"최초 연결 후 24개월간 해당 환자와의 거래는 DentaRoute 경유 필수"
→ 업계 표준 (Uber, DoorDash, Upwork 동일 방식)
```

### 7.3 앱 내 구현

#### 7.3.1 의사 가입 시 계약 동의
```
수정 파일:
app/auth/doctor-create-account.tsx  — 약관 동의에 파트너 계약 추가

UI:
┌─────────────────────────────────────────────┐
│  ☐ I agree to the Terms of Service          │
│  ☐ I agree to the Privacy Policy            │
│  ☐ I agree to the DentaRoute Partner        │
│    Agreement (view full terms →)            │
│                                             │
│  ⓘ The Partner Agreement includes terms     │
│    regarding platform-exclusive patient     │
│    relationships for 24 months.             │
└─────────────────────────────────────────────┘
```

#### 7.3.2 파트너 계약 조회
```
신규 파일:
app/doctor/partner-agreement.tsx    — 파트너 계약서 전문 표시

접근 경로:
의사 프로필 → Settings → Partner Agreement
```

#### 7.3.3 계약 위반 감지 연동
```
채팅 필터링 Level 3 (6회+ 위반) 시:
→ 관리자에게 알림: "Dr. Kim: 연락처 공유 6회 시도"
→ 관리자가 수동 검토 후 조치 결정
→ 자동 제재는 하지 않음 (오탐 방지)
```

### 7.4 톤 가이드
```
계약서: 법적으로 명확하게 작성
파트너 대화: "우리가 환자 연결 + 번역 + 결제 + 보증 다 해주니까 서로 윈윈하자"
→ NYU 동문 네트워크 기반이므로 신뢰 관계가 위약금보다 강한 억제력
→ 계약은 최후의 수단, 일상적 관계는 협력적으로
```

---

## 8. 전체 로드맵

```
Phase 1: 채팅 필터링                    [Week 1-2]
├── 1.1 필터링 엔진 구현               [Week 1]
│    └── lib/chat-filter.ts 작성
│    └── 패턴 감지 + 마스킹 + 예외 처리
├── 1.2 채팅 UI 통합                   [Week 1-2]
│    └── patient/chat.tsx, doctor/chat.tsx 수정
│    └── 경고 Toast/Modal 구현
│    └── 필터 상태 배너 표시
└── 1.3 테스트                         [Week 2]
     └── 패턴별 감지/비감지 케이스 테스트
     └── 허용 숫자(가격, 날짜) 오탐 확인
     └── 예약 상태별 필터 ON/OFF 확인

Phase 2: (REMOVED — Warranty 제거됨)

Phase 3: 리뷰 시스템 강화               [Week 3-4]
├── 3.1 리뷰 자격 검증                  [Week 4]
│    └── write-review.tsx 결제 확인 로직
│    └── store.ts createReview() 검증
├── 3.2 Verified 배지                   [Week 5]
│    └── dentist-reviews.tsx 배지 UI
│    └── dentist-profile.tsx 통계 강화
└── 3.3 리뷰 통계                       [Week 5]
     └── 카테고리별 평점 분석

Phase 4: 의사 대시보드 강화              [Week 5-7]
├── 4.1 수익 분석 차트                  [Week 5-6]
├── 4.2 환자 관리 CRM                  [Week 6]
├── 4.3 스케줄 관리                     [Week 6-7]
└── 4.4 번역 API 연동                  [Week 7]

Phase 5: 파트너 계약 시스템              [Week 7-8]
├── 5.1 의사 가입 시 동의 UI           [Week 7]
├── 5.2 계약서 조회 화면               [Week 7]
└── 5.3 위반 감지 연동                  [Week 8]

총 예상 기간: 약 8주 (2개월)
```

---

## 9. 효과 측정 지표

### 9.1 핵심 KPI

| 지표 | 측정 방법 | 목표 |
|------|-----------|------|
| **바이패스 시도율** | 채팅 필터 감지 횟수 / 전체 채팅 메시지 수 | < 2% |
| **예약 전환율** | 견적 수신 → 앱 내 예약 완료 비율 | > 40% |
| **앱 내 결제 완료율** | 예약 → 최종 결제 완료 비율 | > 90% |
| **의사 리텐션** | 월간 활성 의사 유지율 | > 85% |
| **리뷰 작성율** | 치료 완료 → 리뷰 작성 비율 | > 50% |
| **보증 클레임율** | 보증 건수 대비 클레임 비율 | < 5% |

### 9.2 모니터링 항목

```
일간 모니터링:
- 채팅 필터 감지 횟수 (패턴별)
- Level 2+ 경고 발생 건수
- Level 3 (채팅 제한) 발생 건수

주간 모니터링:
- 예약 취소율 추이
- 의사별 필터 감지 횟수 랭킹
- 신규 예약 vs 완료 예약 비율

월간 모니터링:
- 바이패스 의심 건수 (관리자 판단)
- 의사 이탈율
- 보증 클레임 건수 및 승인율
- 플랫폼 수수료 수익 추이
```

### 9.3 A/B 테스트 계획

```
테스트 1: 보증 표시 효과
- A그룹: 견적에 보증 정보 미표시
- B그룹: 견적에 보증 정보 표시
- 측정: 예약 전환율 차이

테스트 2: 채팅 경고 메시지 톤
- A그룹: 딱딱한 경고 ("This is not allowed")
- B그룹: 부드러운 안내 ("For your protection...")
- 측정: 재시도율 차이

테스트 3: 할인율 효과
- A그룹: 5% 앱 할인
- B그룹: 7% 앱 할인
- 측정: 앱 내 결제 완료율 차이 vs 마진 영향
```

---

## 부록: 신규/수정 파일 요약

### 신규 파일 (8개)
```
lib/chat-filter.ts                    — 채팅 필터링 엔진
app/doctor/partner-agreement.tsx      — 파트너 계약서 조회
app/doctor/patient-history.tsx        — 환자 치료 이력 CRM
app/doctor/schedule.tsx              — 스케줄 관리
```

### 수정 파일 (8개)
```
app/patient/chat.tsx                  — 필터링 통합
app/doctor/chat.tsx                   — 필터링 통합
app/patient/write-review.tsx          — 결제 확인 검증
app/patient/dentist-reviews.tsx       — Verified 배지
app/patient/dentist-profile.tsx       — 리뷰 통계 강화
app/auth/doctor-create-account.tsx    — 파트너 계약 동의
lib/store.ts                          — 리뷰 검증 + 필터 연동
```

---

**이 기획서에 대한 피드백이나 수정 사항이 있으면 말씀해주세요.**
