# DentaRoute - 프로젝트 분석 보고서

## 1. 프로젝트 개요

**DentaRoute**는 해외 환자와 한국 치과의사를 연결하는 **치과 관광(Dental Tourism) 모바일 플랫폼**이다. 환자가 치료 케이스를 제출하면, 여러 치과의사로부터 견적을 받고, 예약/치료/결제/리뷰까지 전체 여정을 하나의 앱에서 관리한다.

- **앱 이름**: Dentaroute
- **패키지명**: `com.darrenjskwon.Dentaroute`
- **역할**: 환자(Patient) + 치과의사(Doctor) 2-role 시스템
- **데이터**: AsyncStorage 기반 로컬 저장 (백엔드 없이 데모 가능)

---

## 2. 기술 스택

| 카테고리 | 기술 | 버전 |
|---------|------|------|
| 프레임워크 | Expo | ~54.0.33 |
| UI 라이브러리 | React | 19.1.0 |
| 네이티브 | React Native | 0.81.5 |
| 언어 | TypeScript | ~5.9.2 |
| 라우팅 | expo-router | ~6.0.23 |
| 네비게이션 | @react-navigation/native | ^7.1.8 |
| 탭 네비게이션 | @react-navigation/bottom-tabs | ^7.4.0 |
| 그라디언트 | expo-linear-gradient | ~15.0.8 |
| 이미지 | expo-image-picker | ~17.0.10 |
| 미디어 | expo-media-library | ~18.2.1 |
| 햅틱 | expo-haptics | ~15.0.8 |
| 지도 | react-native-maps | 1.20.1 |
| 저장소 | @react-native-async-storage/async-storage | 2.2.0 |
| 브라우저 | expo-web-browser | ~15.0.10 |
| 린팅 | eslint + eslint-config-expo | ^9.25.0 |

**특이사항:**
- New Architecture 활성화 (`newArchEnabled: true`)
- React Compiler 실험 기능 활성화
- EAS Build 설정 완료 (Preview: APK 배포)
- TypeScript strict 모드

---

## 3. 디렉토리 구조

```
C:\Dentaroute\
├── app/                          # Expo Router 파일 기반 라우팅
│   ├── _layout.tsx              # 루트 레이아웃 (Stack 네비게이터)
│   ├── index.tsx                # 스플래시/온보딩 화면 (288줄)
│   ├── modal.tsx                # 모달 템플릿
│   ├── dev-menu.tsx             # 개발자 테스트 대시보드
│   ├── notifications.tsx        # 통합 알림 센터 (222줄)
│   │
│   ├── auth/                    # 인증 플로우 (5개 화면)
│   │   ├── _layout.tsx
│   │   ├── role-select.tsx      # 환자/의사 역할 선택
│   │   ├── patient-login.tsx    # 환자 로그인 (309줄)
│   │   ├── patient-create-account.tsx  # 환자 회원가입 (914줄)
│   │   ├── doctor-login.tsx     # 의사 로그인 (241줄)
│   │   └── doctor-create-account.tsx   # 의사 회원가입 (803줄)
│   │
│   ├── patient/                 # 환자 화면 (28개 + 1 웹 변형)
│   │   ├── _layout.tsx
│   │   ├── dashboard.tsx        # 메인 대시보드
│   │   ├── basic-info.tsx       # 기본 정보 입력
│   │   ├── medical-history.tsx  # 의료 이력
│   │   ├── dental-history.tsx   # 치과 이력
│   │   ├── travel-dates.tsx     # 여행 날짜
│   │   ├── treatment-select.tsx # 치료 선택 (13종)
│   │   ├── upload.tsx           # X-ray/사진 업로드
│   │   ├── review.tsx           # 제출 전 검토
│   │   ├── quotes.tsx           # 견적 목록
│   │   ├── quote-detail.tsx     # 견적 상세
│   │   ├── visit-schedule.tsx   # 방문 일정 + 시간 선택
│   │   ├── arrival-info.tsx     # 항공편 정보
│   │   ├── hotel-arrived.tsx    # 호텔 도착 확인
│   │   ├── clinic-map.tsx       # 클리닉 지도
│   │   ├── clinic-map.web.tsx   # 클리닉 지도 (웹 플랫폼 변형)
│   │   ├── clinic-checkin.tsx   # 클리닉 체크인
│   │   ├── dentist-profile.tsx  # 의사 프로필
│   │   ├── dentist-reviews.tsx  # 의사 리뷰
│   │   ├── payment.tsx          # 보증금 결제
│   │   ├── final-payment.tsx    # 최종 결제
│   │   ├── treatment-complete.tsx # 치료 완료
│   │   ├── departure-pickup.tsx # 출발 픽업
│   │   ├── write-review.tsx     # 리뷰 작성
│   │   ├── cancel-booking.tsx   # 예약 취소 (환불 계산 포함)
│   │   ├── help-center.tsx      # 고객 지원 / Help Center
│   │   ├── stay-or-return.tsx   # 다회 방문: 체류 vs 귀국 선택
│   │   ├── profile.tsx          # 프로필 편집
│   │   ├── chat-list.tsx        # 채팅 목록
│   │   └── chat.tsx             # 채팅
│   │
│   └── doctor/                  # 의사 화면 (9개)
│       ├── _layout.tsx
│       ├── dashboard.tsx        # 케이스 관리 대시보드
│       ├── profile-setup.tsx    # 초기 프로필 설정
│       ├── profile.tsx          # 프로필 편집
│       ├── case-detail.tsx      # 케이스 상세
│       ├── patient-info.tsx     # 환자 정보
│       ├── final-invoice.tsx    # 최종 청구서
│       ├── earnings.tsx         # 수익 대시보드
│       ├── chat-list.tsx        # 채팅 목록
│       └── chat.tsx             # 채팅
│
├── components/                  # 재사용 UI 컴포넌트 (9개)
│   ├── external-link.tsx        # 외부 링크 (인앱 브라우저)
│   ├── haptic-tab.tsx           # 탭 바 버튼 (iOS 햅틱)
│   ├── hello-wave.tsx           # 애니메이션 인사 이모지
│   ├── parallax-scroll-view.tsx # 패럴렉스 스크롤
│   ├── themed-text.tsx          # 테마 인식 텍스트
│   ├── themed-view.tsx          # 테마 인식 뷰
│   └── ui/
│       ├── collapsible.tsx      # 아코디언 UI
│       ├── icon-symbol.tsx      # 아이콘 (Android/Web)
│       └── icon-symbol.ios.tsx  # 아이콘 (iOS SF Symbols)
│
├── hooks/                       # 커스텀 React 훅 (3개)
│   ├── use-color-scheme.ts      # 다크모드 감지 (네이티브)
│   ├── use-color-scheme.web.ts  # 다크모드 감지 (웹, SSR 대응)
│   └── use-theme-color.ts       # 테마 색상 리졸버
│
├── constants/                   # 상수 정의
│   ├── theme.ts                 # 테마 색상 + 폰트 (플랫폼별)
│   └── colors.ts                # 확장 컬러 팔레트 (시맨틱)
│
├── lib/                         # 유틸리티 라이브러리
│   └── store.ts                 # 전체 데이터 관리 (1,142줄)
│
├── assets/images/               # 앱 아이콘, 스플래시, 로고
├── docs/                        # 기능 설계 문서
│   ├── tiered-platform-fee-spec.md    # 티어별 수수료 스펙
│   ├── per-visit-discount-spec.md     # 방문별 할인 스펙
│   └── multi-visit-billing-spec.md    # 다회 방문 빌링 스펙
├── scripts/
│   └── reset-project.js         # 프로젝트 초기화 유틸
│
├── app.json                     # Expo 앱 설정
├── tsconfig.json                # TypeScript 설정
├── package.json                 # 의존성 및 스크립트
├── eas.json                     # EAS Build 설정
├── eslint.config.js             # ESLint 설정
├── metro.config.js              # Metro 번들러 설정
├── expo-env.d.ts                # Expo 타입 선언
└── .gitignore
```

**총 화면 파일**: 51개 TSX (4개 _layout 포함, 47개 실제 화면)

---

## 4. 핵심 아키텍처 패턴

### 4.1 파일 기반 라우팅 (Expo Router)
- `app/` 디렉토리의 파일 구조가 곧 라우트
- `_layout.tsx`가 각 그룹의 네비게이션 래퍼
- Stack 네비게이터 사용, 슬라이드-라이트 애니메이션, 헤더 비활성화

### 4.2 듀얼 롤 시스템
- 동일 앱에서 환자/의사 역할 전환 가능
- `store.setCurrentUser(role, name)`으로 현재 역할 관리
- 역할에 따라 다른 화면 그룹 (`/patient/*`, `/doctor/*`)으로 라우팅

### 4.3 오프라인 퍼스트
- 모든 데이터가 AsyncStorage에 로컬 저장
- 백엔드 API 없이 완전한 데모 가능
- `seedDemoData()`로 샘플 데이터 즉시 생성

### 4.4 상태 기반 UI
- 케이스 상태(`pending` → `quotes_received` → `booked`)에 따라 UI 변경
- 예약 상태(10단계)에 따라 다음 액션 결정
- 뱃지, 아이콘, 버튼 텍스트가 상태에 반응

---

## 5. 데이터 레이어 (`lib/store.ts`) 상세 분석

### 5.1 스토리지 키 (16개)
```
PATIENT_PROFILE        환자 개인정보
PATIENT_MEDICAL        의료 이력 (건강 상태, 약물, 알레르기)
PATIENT_DENTAL         치과 이력 (문제점, 이전 치료)
PATIENT_FILES          파일 (X-ray, 치료계획, 사진 URI)
PATIENT_TREATMENTS     선택된 치료 항목
PATIENT_TRAVEL         여행 날짜 및 일정
DOCTOR_PROFILE         의사/클리닉 정보
CASES                  환자 케이스 목록
QUOTES                 의사 견적 목록
CURRENT_USER           현재 활성 사용자 (역할 + 이름)
CHATS                  채팅방 목록
MESSAGES               채팅 메시지 (방별 저장)
BOOKINGS               확정된 예약 목록
REVIEWS                리뷰 목록
NOTIFICATIONS          알림 목록
INQUIRIES              고객 지원 문의 목록
```

### 5.2 핵심 데이터 모델

#### PatientCase (환자 케이스)
```typescript
{
  id: string;                    // 자동 생성 (1001, 1002, ...)
  patientName: string;
  country: string;
  date: string;                  // 생성 ISO 날짜
  treatments: { name, qty }[];   // 선택한 치료들
  medicalNotes: string;
  dentalIssues: string[];
  filesCount: { xrays, treatmentPlans, photos };
  status: "pending" | "quotes_received" | "booked";
  visitDate?: string;            // "Within 10 days", "1 month"
  birthDate?: string;
}
```

#### DentistQuote (의사 견적)
```typescript
{
  id: string;                    // "q" + 타임스탬프
  caseId: string;                // PatientCase 연결
  dentistName, clinicName, location: string;
  address?: string;
  latitude?, longitude?: number; // 지도 표시용
  rating: number;                // 5점 만점
  reviewCount: number;
  totalPrice: number;            // USD 총액
  treatments: { name, qty, price }[];  // 항목별 가격
  treatmentDetails: string;
  duration: string;              // "6 Days"
  visits?: [{                    // 다회 방문 스케줄
    visit: number;
    description: string;
    gapMonths?, gapDays?: number;      // 방문 간 간격
    paymentAmount?, paymentPercent?: number;  // 분할 결제
  }];
  message: string;               // 의사 메시지
  createdAt: string;
  clinicPhotos?: string[];       // 클리닉 사진 URI
  yearsExperience?: number;      // 경력 연수
  specialties?: string[];        // 전문분야
}
```

#### Booking (예약) - 10단계 상태 머신
```typescript
{
  id: string;                    // "bk_" + 타임스탬프
  caseId, quoteId: string;
  dentistName, clinicName: string;
  depositPaid, totalPrice: number;
  treatments?: { name, qty, price }[];
  visitDates: VisitDate[];       // 방문 일정 배열
  arrivalInfo?: ArrivalInfo;     // 항공편 정보
  finalInvoice?: FinalInvoice;   // 최종 청구서
  departurePickup?: DeparturePickup;  // 출발 픽업
  currentVisit?: number;         // 1-based, 현재 활성 방문
  status: BookingStatus;
  cancelledAt?: string;          // 취소 시각
  cancelledBy?: "patient" | "doctor";  // 취소 주체
  cancelReason?: string;         // 취소 사유
  refundAmount?: number;         // 환불 금액
  platformFeeRate?: number;      // 티어별: 0.15 (Gold) | 0.18 (Silver) | 0.20 (Standard)
  savedCard?: { last4: string; brand: string; name: string; expiry: string };
  createdAt: string;
}
```

**예약 상태 흐름:**
```
confirmed → flight_submitted → arrived_korea → checked_in_clinic
→ treatment_done → between_visits → returning_home
→ payment_complete → departure_set
                                    ↕
                              cancelled (어느 단계에서든 가능)
```

#### VisitDate (방문 일정)
```typescript
{
  visit: number;           // 방문 순서 (1, 2, 3, ...)
  description: string;
  date: string;
  confirmedTime?: string;  // 환자 확정 시간
  gapMonths?, gapDays?: number;
  paymentAmount?, paymentPercent?: number;
  paid?: boolean;
}
```

#### VisitInvoice (방문별 인보이스)
```typescript
{
  visit: number;              // VisitDate.visit과 매칭
  description: string;
  items: { treatment, qty, price }[];
  visitTotal: number;         // 이번 방문 항목 합계
  prevCarryForward: number;   // 이전 방문 이월금 (Visit 1은 0)
  billingPercent: number;     // (visitTotal + prevCarry)의 청구 비율
  billedAmount: number;       // 실제 청구 금액
  deferredAmount: number;     // 이연 금액
  carryForward: number;       // 다음 방문으로 이월
  preDiscountPayment: number; // 할인 전 금액 (의사에게 보이는 금액)
  appDiscount: number;        // 5% 앱 할인 (의사에게 숨김)
  afterDiscount: number;      // 할인 후 금액
  paymentPercent: number;     // 레거시 호환
  paymentAmount: number;      // 환자 실제 결제액
  depositDeducted?: number;   // 보증금 차감 (Visit 1만)
  paid: boolean;
  paidAt?: string;
}
```

#### ChatRoom + ChatMessage
```typescript
// ChatRoom
{ id, caseId, patientName, dentistName, clinicName,
  lastMessage, lastMessageAt,
  unreadPatient: number, unreadDoctor: number }

// ChatMessage
{ id, chatRoomId, sender: "patient"|"doctor", text,
  translatedText?: string | null,   // 번역 결과
  originalLang?: "en" | "ko",       // 원본 언어
  timestamp }
```

#### Review (리뷰)
```typescript
{ id, caseId, bookingId, dentistName, clinicName, patientName,
  rating, treatmentRating, clinicRating, communicationRating,
  title, comment, treatments: string[], createdAt }
```

#### AppNotification (알림)
```typescript
{ id, role: "patient"|"doctor",
  type: "new_quote"|"quote_accepted"|"new_message"|"new_case"|
        "new_review"|"payment_received"|"reminder"|
        "system"|"booking_cancelled"|"case_updated",
  title, body, icon, read: boolean, route?: string, createdAt }
```

#### FinalInvoice (최종 청구서)
```typescript
{ items: {treatment, qty, price}[], totalAmount, appDiscount (5%),
  discountedTotal, depositPaid, balanceDue, notes?, createdAt,
  visitInvoices?: VisitInvoice[] }  // 방문별 상세 (다회 방문 시)
```

#### SupportInquiry (고객 문의)
```typescript
{ id, category: "booking"|"payment"|"treatment"|"travel"|"technical"|"other",
  subject, message, email,
  status: "submitted"|"in_review"|"resolved",
  createdAt, response?, respondedAt? }
```

### 5.3 Store 내보내기 (Exports)

**상수 & 타입:**
- `TIER_CONFIG` — 티어별 수수료 설정 (Gold 15%, Silver 18%, Standard 20%)
- `DoctorTier` — 티어 키 타입 (`"gold" | "silver" | "standard"`)
- `getRefundInfo(booking)` — 환불 금액/비율 계산 (7일+ 전액, 3-6일 50%, 3일미만 불가)

### 5.4 Store API 메서드 전체 목록

**사용자 관리:**
- `setCurrentUser(role, name)` / `getCurrentUser()` / `clearCurrentUser()`

**환자 프로필:**
- `savePatientProfile()` / `getPatientProfile()`
- `savePatientMedical()` / `getPatientMedical()`
- `savePatientDental()` / `getPatientDental()`
- `savePatientFiles()` / `getPatientFiles()`
- `savePatientTreatments()` / `getPatientTreatments()`
- `savePatientTravel()` / `getPatientTravel()`

**의사 프로필:**
- `saveDoctorProfile()` / `getDoctorProfile()`

**케이스 관리:**
- `createCase(data)` - 자동 ID 생성, 의사에게 `new_case` 알림 전송
- `getCases()` / `getCase(id)` / `updateCaseStatus(id, status)`
- `updateCase(id, updates)` - 부분 업데이트 (머지)
- `updateCasesForProfile()` - 프로필 변경 시 pending/quotes_received 케이스 일괄 업데이트 + 의사 `case_updated` 알림

**견적 관리:**
- `createQuote(data)` - 케이스 상태를 `quotes_received`로 업데이트, 환자에게 `new_quote` 알림
- `getQuotesForCase(caseId)` / `getQuotes()`

**채팅:**
- `getOrCreateChatRoom(caseId, patient, dentist, clinic)` - 중복 방지
- `getChatRooms()` / `getChatRoomsForUser(role, name)`
- `sendMessage(roomId, sender, text)` - 읽지 않음 카운터 자동 증가, originalLang 자동 설정
- `getMessages(roomId)` / `markAsRead(roomId, role)`
- `translateMessages(chatRoomId, messageIds)` - 일괄 번역 (병렬 처리 후 단일 저장)

**예약:**
- `createBooking(data)` / `getBookings()` / `getBooking(id)`
- `getBookingForCase(caseId)` - 취소되지 않은 예약 우선 반환
- `updateBooking(id, updates)` - 부분 업데이트 (머지)
- `cancelBooking(bookingId, reason?)` - 취소 워크플로우 (환불 계산 + 양방향 알림)

**리뷰:**
- `createReview(data)` / `getReviews()` / `getReviewsForDentist(name)` / `getReviewForBooking(id)`

**알림:**
- `addNotification(data)` - 최신순 prepend
- `getNotifications(role?)` / `getUnreadCount(role)`
- `markNotificationRead(id)` / `markAllNotificationsRead(role)`

**고객 지원:**
- `submitInquiry(data)` - 문의 제출 + 시스템 알림 자동 생성
- `getInquiries()` - 문의 목록 조회

**유틸리티:**
- `resetAll()` - 전체 초기화
- `debugAll()` - 콘솔 디버깅
- `seedDemoData()` - 데모 데이터 시드

### 5.5 데이터 관리 패턴
- **ID 생성**: 케이스는 순차(1001, 1002), 나머지는 타임스탬프 기반
- **저장 방식**: JSON 배열을 단일 키에 저장, 전체 fetch → 수정 → 다시 저장
- **양방향 업데이트**: 견적 생성 시 케이스 상태 자동 변경, 메시지 전송 시 채팅방 정보 자동 갱신
- **알림 자동 트리거**: 관련 엔티티 생성 시 알림 자동 생성 (딥링크 포함)

---

## 6. 네비게이션 플로우

### 6.1 전체 라우팅 구조
```
/ (index.tsx - 스플래시/온보딩)
│
├── /auth/role-select (환자 or 의사 선택)
│   │
│   ├── 환자 플로우 ─────────────────────────────
│   │   ├── /auth/patient-login
│   │   │   └── /auth/patient-create-account
│   │   │
│   │   └── (로그인 후) /patient/basic-info
│   │       → /patient/medical-history
│   │       → /patient/dental-history
│   │       → /patient/travel-dates
│   │       → /patient/treatment-select
│   │       → /patient/upload
│   │       → /patient/review (케이스 생성)
│   │       → /patient/dashboard
│   │           │
│   │           ├── 케이스 탭 → /patient/quotes?caseId=X
│   │           │   ├── /patient/quote-detail?quoteId=Q
│   │           │   │   └── /patient/dentist-profile?dentistName=X
│   │           │   │       └── /patient/dentist-reviews
│   │           │   └── /patient/visit-schedule?quoteId=Q
│   │           │
│   │           ├── 예약 진행 →
│   │           │   /patient/arrival-info → hotel-arrived
│   │           │   → clinic-checkin → clinic-map
│   │           │   → final-payment → treatment-complete
│   │           │   → stay-or-return (다회 방문 시)
│   │           │   → departure-pickup → write-review
│   │           │
│   │           ├── 예약 관리 →
│   │           │   /patient/cancel-booking?bookingId=B
│   │           │   /patient/help-center
│   │           │
│   │           ├── 채팅 → /patient/chat-list → /patient/chat?chatRoomId=C
│   │           └── 프로필 → /patient/profile
│   │
│   └── 의사 플로우 ─────────────────────────────
│       ├── /auth/doctor-login
│       │   └── /auth/doctor-create-account
│       │
│       └── (로그인 후) /doctor/profile-setup
│           → /doctor/dashboard
│               │
│               ├── 케이스 관리 →
│               │   /doctor/case-detail?caseId=X
│               │   └── /doctor/patient-info
│               │
│               ├── 청구서 → /doctor/final-invoice?bookingId=B
│               ├── 수익 → /doctor/earnings
│               ├── 채팅 → /doctor/chat-list → /doctor/chat
│               └── 프로필 → /doctor/profile
│
└── /notifications (공통 알림 센터)
└── /dev-menu (개발자 메뉴)
```

### 6.2 루트 레이아웃 (`app/_layout.tsx`)
- SafeAreaProvider + StatusBar 래핑
- Stack 네비게이터, 헤더 없음, 슬라이드-라이트 애니메이션
- 모든 자식 라우트의 베이스

---

## 7. 주요 화면 상세 분석

### 7.1 스플래시/온보딩 (`app/index.tsx`, 288줄)
- 커스텀 FadeIn 애니메이션 컴포넌트 (opacity + translateY)
- 로고 펄스 효과 + 확장 링 애니메이션
- **가격 비교 카드**: 미국 vs 한국 치료비 수평 스크롤
- CTA 버튼 글로우 애니메이션
- → `/auth/role-select`로 이동

### 7.2 환자 회원가입 (`auth/patient-create-account.tsx`, 914줄)
- 이름 (여권 일치 경고), 이메일 + 6자리 OTP 인증, 국가코드 + 전화번호 인증
- 비밀번호 강도 표시, 약관 체크박스
- 인증코드 스마트 붙여넣기 (6자리 한번에)
- 국가코드 모달 (20+ 국가)
- Dev 모드: 검증 스킵, 바로 `/patient/basic-info`

### 7.3 의사 회원가입 (`auth/doctor-create-account.tsx`, 803줄)
- 환자 회원가입과 동일한 기본 구조 + **미국 치과 면허 업로드**
- 카메라/갤러리 선택 모달, 최대 3장, 미리보기 + 삭제
- Dev 모드: `/doctor/profile-setup`

### 7.4 환자 대시보드 (`patient/dashboard.tsx`)
- 케이스 목록 + 상태 뱃지
- 읽지 않은 메시지 수, 견적 수 표시
- 예약된 케이스의 현재 단계 표시
- 다회 방문 진행 상황 표시

### 7.5 의사 대시보드 (`doctor/dashboard.tsx`)
- 치료 유형별 필터 탭
- 상태별 다음 액션 뱃지:
  - 🆕 New → Send Quote
  - ✅ Quoted
  - 📅 Booked
  - ✅ Confirmed
  - 🏥 At Clinic → Send Invoice
  - 💳 Invoice Sent
  - ✅ Paid
  - 🔄 Between Visits
  - 🏠 Returning Home
  - ❌ Cancelled

### 7.6 치료 선택 (`patient/treatment-select.tsx`)
- 13종 치과 치료 선택 가능
- 수량 조절, 커스텀 메모 추가

### 7.7 알림 센터 (`notifications.tsx`, 222줄)
- 환자/의사 역할별 다크 테마 전환
- 날짜별 그룹 (Today, Yesterday 등)
- 읽지 않음 뱃지 + 전체 읽음 버튼
- 알림 탭 시 관련 화면으로 딥링크 네비게이션
- 시간 포맷터 (Just now, 5m ago, 2h ago)

### 7.8 개발자 메뉴 (`dev-menu.tsx`)
- 데모 데이터 시드/리셋/디버그
- 환자/의사 화면 바로가기
- 예약 상태 강제 변경 (테스트용)
- 환자/의사 알림 뷰 전환

---

## 8. 컴포넌트 시스템

### 8.1 테마 컴포넌트
| 컴포넌트 | 용도 |
|---------|------|
| `ThemedText` | 테마 인식 텍스트 (5가지 타입: default, title, defaultSemiBold, subtitle, link) |
| `ThemedView` | 테마 인식 뷰 (light/dark 배경색 자동 적용) |

### 8.2 UI 컴포넌트
| 컴포넌트 | 용도 |
|---------|------|
| `Collapsible` | 아코디언 토글 (쉐브론 아이콘 90도 회전) |
| `IconSymbol` | 크로스 플랫폼 아이콘 (iOS: SF Symbols, Android/Web: Material Icons) |
| `ParallaxScrollView` | 250px 헤더 패럴렉스 스크롤 (줌/번역 효과) |
| `ExternalLink` | 인앱 브라우저 링크 (네이티브) / 표준 링크 (웹) |
| `HapticTab` | iOS 전용 햅틱 피드백 탭 버튼 |
| `HelloWave` | 인사 애니메이션 이모지 |

### 8.3 플랫폼별 구현
- `icon-symbol.ios.tsx`: iOS SF Symbols 네이티브 사용
- `icon-symbol.tsx`: Android/Web Material Icons 폴백
- `use-color-scheme.web.ts`: 웹 SSR 하이드레이션 대응
- `use-color-scheme.ts`: 네이티브 다크모드 감지

---

## 9. 디자인 시스템

### 9.1 색상 팔레트 (`constants/colors.ts`)
```
Primary (Purple theme):
  purple      #4A0080    주요 액션, UI 강조
  purpleMid   #5C10A0    중간 톤
  purpleLight #f0e6f6    배경, 카드

White/Gold (현재 white로 통일):
  gold        #ffffff
  goldLight   #ffffff
  goldDim     rgba(255,255,255,0.35)
  white       #ffffff

Neutral:
  slate       #64748b    보조 텍스트
  slateLight  #94a3b8    비활성 텍스트
  border      #e2e8f0    구분선
  bg          #f8fafc    전체 배경

Accent:
  coral       #e05a3a    경고, 주의
  coralLight  #fef2ee    경고 배경
  green       #16a34a    성공, 완료
  greenLight  #dcfce7    성공 배경
```

### 9.2 테마 시스템 (`constants/theme.ts`)
- 라이트/다크 모드 전체 지원
- 플랫폼별 폰트 패밀리 (iOS: system-ui, Android: normal, Web: 웹 폰트 스택)
- `useThemeColor` 훅으로 props 오버라이드 가능

### 9.3 UI 디자인 패턴
- LinearGradient 배경 (Expo)
- 글래스모피즘 카드 (rgba 배경 + 보더)
- 둥근 모서리 (12-20px), 그림자/elevation
- 폼 검증: 필드별 빨간 에러 텍스트
- 로딩: ActivityIndicator
- 모달 오버레이 (국가코드 선택, 파일 업로드 옵션)

---

## 10. 전체 사용자 여정

### 10.1 환자 여정 (Patient Journey)

```
1. 온보딩 (가격 비교 카드)
   ↓
2. 역할 선택 → 환자
   ↓
3. 로그인 / 회원가입 (이메일+전화 인증, OTP)
   ↓
4. 프로필 수집 단계:
   a. 기본 정보 (이름, 생년월일, 국적 - 195개국)
   b. 의료 이력 (건강 상태, 약물, 알레르기)
   c. 치과 이력 (문제점, 이전 치료)
   d. 여행 날짜 (고정 or 유연)
   e. 치료 선택 (13종, 수량, 메모)
   f. 파일 업로드 (X-ray, 치료계획, 사진)
   g. 제출 전 검토
   ↓
5. 케이스 제출 → 의사들에게 알림 전송
   ↓
6. 견적 수신 → 여러 의사 비교
   ↓
7. 견적 수락 → 예약 생성 (보증금 결제)
   ↓
8. 방문 시간 확정 (의사 제안 → 환자 선택)
   ↓
9. 항공편 정보 제출 (편명, 도착 시간, 픽업 요청)
   ↓
10. 한국 도착 → 호텔 체크인 확인
    ↓
11. 클리닉 체크인 → 지도로 위치 확인
    ↓
12. 치료 진행 → 완료 확인
    ↓
13. 다회 방문 시 → 체류 vs 귀국 선택 (stay-or-return)
    ↓
14. 최종 결제 (방문별 인보이스, 잔액 = 총액 - 앱할인5% - 보증금)
    ↓
15. 출발 픽업 예약
    ↓
16. 리뷰 작성 (치료, 시설, 소통, 종합 평점)
```

### 10.2 의사 여정 (Doctor Journey)

```
1. 역할 선택 → 의사
   ↓
2. 로그인 / 회원가입 (면허 업로드 포함)
   ↓
3. 프로필 설정 (클리닉 정보, 전문분야, 경력)
   ↓
4. 대시보드 → 새 케이스 알림 수신
   ↓
5. 케이스 상세 확인 (환자 의료/치과 이력, 파일)
   ↓
6. 견적 작성 (항목별 가격, 방문 일정, 메시지)
   ↓
7. 환자와 채팅 상담 (실시간 번역 지원)
   ↓
8. 환자 체크인 시 → 방문별 인보이스 발행
   ↓
9. 결제 확인 + 수익 대시보드 확인
```

---

## 11. 시드 데모 데이터

`seedDemoData()` 함수가 제공하는 샘플:

| 항목 | 내용 |
|------|------|
| 환자 | Sarah Johnson, 미국, 1990-05-15 |
| 의사 | Dr. Kim Minjun, Seoul Bright Dental, 강남 |
| 의사 경력 | 12년, 4.9★, 127개 리뷰, Standard 티어 (20%) |
| 클리닉 좌표 | 37.5012°N, 127.0396°E |
| 케이스 1 | Implant + Crown + Veneers (booked) |
| 케이스 2 | Veneers (pending) |
| 견적 3개 | Dr. Kim $4,150 / Dr. Park $4,500 / Dr. Lee $3,600 |
| 채팅 | 1개 채팅방, 5개 메시지 (번역 포함) |
| 예약 | confirmed 상태, 4회 방문, $4,450, 보증금 $445, 저장카드 Visa *4242 |
| 리뷰 | 3개 (이전 환자) |
| 알림 | 8개 (환자+의사 혼합) |
| 초기 사용자 | 환자 역할 (Sarah Johnson) |

---

## 12. 빌드 & 개발 환경

### 12.1 NPM 스크립트
```json
{
  "start": "expo start",           // Expo 개발 서버
  "android": "expo start --android", // Android 에뮬레이터
  "ios": "expo start --ios",        // iOS 시뮬레이터
  "web": "expo start --web",        // 웹 버전
  "lint": "expo lint",              // ESLint 실행
  "reset-project": "node ./scripts/reset-project.js"  // 프로젝트 초기화
}
```

### 12.2 EAS Build
```json
{
  "preview": { "distribution": "internal", "android": { "buildType": "apk" } },
  "production": {}
}
```

### 12.3 VS Code 설정
- 추천 확장: `expo.vscode-expo-tools`
- EditorConfig: 에디터 포매팅 규칙

### 12.4 TypeScript 설정
- Expo 베이스 설정 확장
- strict 모드
- 경로 별칭: `@/*` → 루트 디렉토리
- Expo Router 타입 포함

---

## 13. 의존성 트리 (컴포넌트 → 훅 → 상수)

```
constants/
├── theme.ts ─────→ useThemeColor → ThemedText, ThemedView
│                                 → ParallaxScrollView
│                                 → Collapsible
└── colors.ts ────→ Collapsible (직접 참조)

hooks/
├── use-color-scheme.ts ──→ useThemeColor
├── use-color-scheme.web.ts (웹 전용 대체)
└── use-theme-color.ts ───→ ThemedText, ThemedView, ParallaxScrollView

components/
├── themed-text.tsx ──→ Collapsible
├── themed-view.tsx ──→ Collapsible, ParallaxScrollView
├── ui/icon-symbol.tsx (Android/Web) ──→ Collapsible
├── ui/icon-symbol.ios.tsx (iOS)
├── parallax-scroll-view.tsx
├── external-link.tsx
├── haptic-tab.tsx
└── hello-wave.tsx

lib/
└── store.ts ─────→ 모든 app/ 화면에서 사용
```

---

## 14. 현재 상태 & 특이사항

### 14.1 데모/프로토타입 특성
- 백엔드 API 미구현 (AsyncStorage만 사용)
- 로그인 검증 미구현 (Dev 모드에서 즉시 로그인)
- 결제 실제 연동 없음 (UI만 존재)
- 이미지 업로드는 로컬 URI 저장만
- 번역은 mock 함수 (TODO: DeepL/Google API로 교체)

### 14.2 구현 완료된 고급 기능
- **다회 방문 빌링**: VisitInvoice 기반 방문별 인보이스, 이월금 체계
- **할인 숨김**: 5% 앱 할인이 의사에게 보이지 않는 구조
- **예약 취소/환불**: 3단계 환불 정책 (7일+ 전액, 3-6일 50%, 3일미만 불가)
- **티어 시스템**: Gold/Silver/Standard 플랫폼 수수료
- **채팅 번역**: 환자(EN)↔의사(KO) 자동 번역 (mock)
- **Help Center**: 카테고리별 고객 문의 시스템

### 14.3 확장 가능 포인트
- `lib/store.ts`를 실제 API 클라이언트로 교체 가능 (인터페이스 동일)
- 푸시 알림 연동 가능 (로컬 알림 구조 이미 존재)
- 결제 게이트웨이 연동 (Stripe 등)
- 실시간 채팅 (WebSocket/Firebase)
- 다국어 지원 (현재 영어만)

---

## 15. 요약

DentaRoute는 **치과 관광 양면 마켓플레이스 모바일 앱**으로, 환자의 케이스 제출부터 견적 비교, 예약, 치료 진행, 결제, 리뷰까지 전체 여정을 다룬다. Expo/React Native 기반으로 iOS/Android/Web을 동시 지원하며, 파일 기반 라우팅과 AsyncStorage 로컬 저장소로 깔끔한 아키텍처를 갖추고 있다. 현재는 데모/프로토타입 단계이며, 다회 방문 빌링, 티어 수수료, 예약 취소/환불, 채팅 번역 등 고급 기능까지 UI 레벨에서 구현 완료. 백엔드 API와 결제 연동을 추가하면 프로덕션 배포가 가능한 수준의 완성도를 보인다.

---

## 변경 이력 (최신순)

### 2026-03-18 - 회의 피드백 반영: 이모지 통일 + 카드 디자인 + 색상 통일
- **수정 파일**: `app/patient/my-trips.tsx`, `app/patient/arrival-info.tsx`, `app/patient/reservation.tsx`, `app/patient/dashboard.tsx`
- **변경 내용**:
  - 입국/출국 이모지 🛬/🛫 전체 통일 (my-trips, arrival-info, reservation)
  - Trip 삭제 확인 메시지 "Are you sure you want to delete this trip information?"으로 변경
  - Trip 카드 디자인 개선 (보라색 그라디언트 헤더, 배지 스타일 라벨, 호텔 배경색, 그림자 강화)
  - Quotes 배지 색상 파란색 → 노란색(#fef9c3 + #a16207) Quotes Ready와 통일
- **영향 범위**: My Trips, Trip Info, My Reservations, Dashboard
- **작업자**: Darren

### 2026-03-18 - Trip/Reservation/Dashboard 대규모 업데이트
- **수정 파일**: `lib/store.ts`, `app/patient/my-trips.tsx`, `app/patient/arrival-info.tsx`, `app/patient/reservation.tsx`, `app/patient/dashboard.tsx`
- **변경 내용**:
  - **[store.ts]** SavedTrip에 출국편 필드 5개 추가, ArrivalInfo에 출국편+호텔 필드 10개 추가, 시드 데모에 출국편 데이터 추가
  - **[my-trips.tsx]** 출국편 입력 폼 추가, Arrival/Departure 좌우 2열 카드 배치, Departure 없으면 "Not set" 표시
  - **[arrival-info.tsx]** "Arrival Details" → "Trip Info" 확장, Departure Flight + Hotel 섹션 추가, Submit시 My Trips 자동 저장, Load from My Trips 전체 데이터 로드
  - **[reservation.tsx]** Booking 기반 달력 전환 (SavedTrip 제거), arrivalInfo에서 departure dot + hotel stay bar 매핑, 날짜별 카드 분리 표시 (입국편/예약/출국편/호텔 별도 카드)
  - **[dashboard.tsx]** Case 카드 상단 상태 배너 추가, 진행 단계 높은 순 정렬, TDZ 에러 수정
- **영향 범위**: My Trips, Trip Info, My Reservations, Dashboard 전체
- **작업자**: Darren

### 2026-03-16 - My Reservations 통합 달력 업그레이드
- **수정 파일**: `app/patient/reservation.tsx`
- **변경 내용**:
  - My Trips 데이터(항공권/호텔)를 달력에 시각적으로 통합 (도착=하늘색 점, 출발=오렌지 점, 숙박=하늘색 바)
  - 멀티 도트 시스템: 한 날짜에 치료(보라)+도착(하늘)+출발(오렌지) 동시 표시
  - 호텔 체류 기간 연속 바 렌더링 (주 경계 넘어도 정상 표시)
  - 범례(Legend) 추가: Treatment, Arrival, Departure, Stay
  - Trip 카드에 ⋯ 메뉴 → Edit Trip 딥링크 (해당 trip ID로 my-trips 이동 후 수정 모달 자동 오픈)
  - 선택 날짜 상세에서 Booking 카드가 Trip 카드보다 우선(위에) 표시
  - 달력 크기 확대: 셀 높이 48→56, 날짜 폰트 15→17, 점 크기 6→7, 월 제목 18→20
- **영향 범위**: My Reservations 화면 전체, My Trips 화면 (딥링크 수신)
- **작업자**: Darren

### 2026-03-16 - My Trips 딥링크 수정 모달 자동 오픈
- **수정 파일**: `app/patient/my-trips.tsx`
- **변경 내용**:
  - `useLocalSearchParams`로 `editTripId` query param 수신
  - 해당 trip ID의 수정 모달을 화면 진입 시 자동 오픈
- **영향 범위**: My Trips 화면 (reservation에서 Edit Trip 시 연동)
- **작업자**: Darren

### 2026-03-16 - 시드 데모 데이터에 여행 정보 추가
- **수정 파일**: `lib/store.ts`
- **변경 내용**:
  - `seedDemoData()`에 SavedTrip 2건 추가
  - Trip 1: Korean Air KE082, 3/15 도착, Lotte Hotel Seoul (3/15~3/22)
  - Trip 2: Asiana Airlines OZ201, 6/20 도착, Grand Hyatt Seoul (6/20~6/25)
- **영향 범위**: 시드 데이터 로드 시 달력에 trip 정보 시각화
- **작업자**: Darren

### 2026-03-16 - 팀 워크플로우 가이드 문서 추가
- **수정 파일**: `docs/team-workflow-guide.md`, `docs/development-plan.md`
- **변경 내용**: 팀 개발 규칙 문서화 (브랜치 전략, AI 행동 규칙, 커밋 규칙)
- **영향 범위**: 문서만 (코드 변경 없음)
- **작업자**: Darren
