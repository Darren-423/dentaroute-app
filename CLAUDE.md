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
│   ├── index.tsx                # 스플래시/온보딩 화면 (596줄)
│   ├── modal.tsx                # 모달 템플릿
│   ├── dev-menu.tsx             # 개발자 테스트 대시보드
│   ├── notifications.tsx        # 통합 알림 센터
│   │
│   ├── auth/                    # 인증 플로우 (5개 화면)
│   │   ├── _layout.tsx
│   │   ├── role-select.tsx      # 환자/의사 역할 선택
│   │   ├── patient-login.tsx    # 환자 로그인
│   │   ├── patient-create-account.tsx  # 환자 회원가입 (918줄)
│   │   ├── doctor-login.tsx     # 의사 로그인
│   │   └── doctor-create-account.tsx   # 의사 회원가입 (787줄)
│   │
│   ├── patient/                 # 환자 화면 (27개)
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
│   │   ├── visit-schedule.tsx   # 방문 일정
│   │   ├── pick-times.tsx       # 시간 선택
│   │   ├── arrival-info.tsx     # 항공편 정보
│   │   ├── hotel-arrived.tsx    # 호텔 도착 확인
│   │   ├── clinic-map.tsx       # 클리닉 지도
│   │   ├── clinic-checkin.tsx   # 클리닉 체크인
│   │   ├── dentist-profile.tsx  # 의사 프로필
│   │   ├── dentist-reviews.tsx  # 의사 리뷰
│   │   ├── payment.tsx          # 보증금 결제
│   │   ├── final-payment.tsx    # 최종 결제
│   │   ├── treatment-complete.tsx # 치료 완료
│   │   ├── departure-pickup.tsx # 출발 픽업
│   │   ├── write-review.tsx     # 리뷰 작성
│   │   ├── profile.tsx          # 프로필 편집
│   │   ├── chat-list.tsx        # 채팅 목록
│   │   └── chat.tsx             # 채팅
│   │
│   └── doctor/                  # 의사 화면 (10개)
│       ├── _layout.tsx
│       ├── dashboard.tsx        # 케이스 관리 대시보드
│       ├── profile-setup.tsx    # 초기 프로필 설정
│       ├── profile.tsx          # 프로필 편집
│       ├── case-detail.tsx      # 케이스 상세
│       ├── patient-info.tsx     # 환자 정보
│       ├── propose-times.tsx    # 방문 시간 제안
│       ├── final-invoice.tsx    # 최종 청구서
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
│   └── store.ts                 # 전체 데이터 관리 (876줄)
│
├── assets/images/               # 앱 아이콘, 스플래시, 로고
├── scripts/
│   └── reset-project.js         # 프로젝트 초기화 유틸
│
├── app.json                     # Expo 앱 설정
├── tsconfig.json                # TypeScript 설정
├── package.json                 # 의존성 및 스크립트
├── eas.json                     # EAS Build 설정
├── eslint.config.js             # ESLint 설정
└── .gitignore
```

**총 파일**: TypeScript/TSX 63개 + 설정/에셋 39개 = **102개 소스 파일**

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
- 예약 상태(9단계)에 따라 다음 액션 결정
- 뱃지, 아이콘, 버튼 텍스트가 상태에 반응

---

## 5. 데이터 레이어 (`lib/store.ts`) 상세 분석

### 5.1 스토리지 키 (15개)
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
  dentistName, clinicName, location, address: string;
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
}
```

#### Booking (예약) - 9단계 상태 머신
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
  status: BookingStatus;
  createdAt: string;
}
```

**예약 상태 흐름:**
```
pending_times → times_proposed → confirmed → flight_submitted
→ arrived_korea → checked_in_clinic → treatment_done
→ payment_complete → departure_set
```

#### VisitDate (방문 일정)
```typescript
{
  visit: number;           // 방문 순서 (1, 2, 3, ...)
  description: string;
  date: string;
  timeSlots?: string[];    // 의사 제안 시간 ("9:00 AM", "10:30 AM")
  confirmedTime?: string;  // 환자 확정 시간
  gapMonths?, gapDays?: number;
  paymentAmount?, paymentPercent?: number;
  paid?: boolean;
}
```

#### ChatRoom + ChatMessage
```typescript
// ChatRoom
{ id, caseId, patientName, dentistName, clinicName,
  lastMessage, lastMessageAt,
  unreadPatient: number, unreadDoctor: number }

// ChatMessage
{ id, chatRoomId, sender: "patient"|"doctor", text, timestamp }
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
  type: "new_quote"|"quote_accepted"|"times_proposed"|"times_confirmed"|
        "new_message"|"new_case"|"new_review"|"payment_received"|"reminder",
  title, body, icon, read: boolean, route?: string, createdAt }
```

#### FinalInvoice (최종 청구서)
```typescript
{ items: {treatment, qty, price}[], totalAmount, appDiscount (5%),
  discountedTotal, depositPaid, balanceDue, notes?, createdAt }
```

### 5.3 Store API 메서드 전체 목록

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

**견적 관리:**
- `createQuote(data)` - 케이스 상태를 `quotes_received`로 업데이트, 환자에게 `new_quote` 알림
- `getQuotesForCase(caseId)` / `getQuotes()`

**채팅:**
- `getOrCreateChatRoom(caseId, patient, dentist, clinic)` - 중복 방지
- `getChatRooms()` / `getChatRoomsForUser(role, name)`
- `sendMessage(roomId, sender, text)` - 읽지 않음 카운터 자동 증가
- `getMessages(roomId)` / `markAsRead(roomId, role)`

**예약:**
- `createBooking(data)` / `getBookings()` / `getBooking(id)` / `getBookingForCase(caseId)`
- `updateBooking(id, updates)` - 부분 업데이트 (머지)

**리뷰:**
- `createReview(data)` / `getReviews()` / `getReviewsForDentist(name)` / `getReviewForBooking(id)`

**알림:**
- `addNotification(data)` - 최신순 prepend
- `getNotifications(role?)` / `getUnreadCount(role)`
- `markNotificationRead(id)` / `markAllNotificationsRead(role)`

**유틸리티:**
- `resetAll()` - 전체 초기화
- `debugAll()` - 콘솔 디버깅
- `seedDemoData()` - 데모 데이터 시드

### 5.4 데이터 관리 패턴
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
│   │           │       └── /patient/pick-times?bookingId=B
│   │           │
│   │           ├── 예약 진행 →
│   │           │   /patient/arrival-info → hotel-arrived
│   │           │   → clinic-checkin → clinic-map
│   │           │   → final-payment → treatment-complete
│   │           │   → departure-pickup → write-review
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
│               ├── 시간 제안 → /doctor/propose-times?bookingId=B
│               ├── 청구서 → /doctor/final-invoice?bookingId=B
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

### 7.1 스플래시/온보딩 (`app/index.tsx`, 596줄)
- 커스텀 FadeIn 애니메이션 컴포넌트 (opacity + translateY)
- 로고 펄스 효과 + 확장 링 애니메이션
- **가격 비교 카드**: 미국 vs 한국 치료비 수평 스크롤
- CTA 버튼 글로우 애니메이션
- → `/auth/role-select`로 이동

### 7.2 환자 회원가입 (`auth/patient-create-account.tsx`, 918줄)
- 이름 (여권 일치 경고), 이메일 + 6자리 OTP 인증, 국가코드 + 전화번호 인증
- 비밀번호 강도 표시, 약관 체크박스
- 인증코드 스마트 붙여넣기 (6자리 한번에)
- 국가코드 모달 (20+ 국가)
- Dev 모드: 검증 스킵, 바로 `/patient/basic-info`

### 7.3 의사 회원가입 (`auth/doctor-create-account.tsx`, 787줄)
- 환자 회원가입과 동일한 기본 구조 + **미국 치과 면허 업로드**
- 카메라/갤러리 선택 모달, 최대 3장, 미리보기 + 삭제
- Dev 모드: `/doctor/profile-setup`

### 7.4 환자 대시보드 (`patient/dashboard.tsx`)
- 케이스 목록 + 상태 뱃지
- 읽지 않은 메시지 수, 견적 수 표시
- 예약된 케이스의 현재 단계 표시

### 7.5 의사 대시보드 (`doctor/dashboard.tsx`)
- 치료 유형별 필터 탭
- 상태별 다음 액션 뱃지:
  - 🆕 New → Send Quote
  - ✅ Quoted
  - 📅 Booked
  - ⏰ Set Visit Times (pending_times)
  - 🕐 Waiting on Patient (times_proposed)
  - ✅ Confirmed
  - 🏥 At Clinic → Send Invoice
  - 💳 Invoice Sent
  - ✅ Paid

### 7.6 치료 선택 (`patient/treatment-select.tsx`)
- 13종 치과 치료 선택 가능
- 수량 조절, 커스텀 메모 추가

### 7.7 알림 센터 (`notifications.tsx`, 209줄)
- 환자/의사 역할별 다크 테마 전환
- 날짜별 그룹 (Today, Yesterday 등)
- 읽지 않음 뱃지 + 전체 읽음 버튼
- 알림 탭 시 관련 화면으로 딥링크 네비게이션
- 시간 포맷터 (Just now, 5m ago, 2h ago)

### 7.8 개발자 메뉴 (`dev-menu.tsx`)
- 데모 데이터 시드/리셋/디버그
- 22개 환자 화면 + 8개 의사 화면 바로가기
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
| `HelloWave` | 인사 애니메이션 이모지 (👋) |

### 8.3 플랫폼별 구현
- `icon-symbol.ios.tsx`: iOS SF Symbols 네이티브 사용
- `icon-symbol.tsx`: Android/Web Material Icons 폴백
- `use-color-scheme.web.ts`: 웹 SSR 하이드레이션 대응
- `use-color-scheme.ts`: 네이티브 다크모드 감지

---

## 9. 디자인 시스템

### 9.1 색상 팔레트 (`constants/colors.ts`)
```
Primary:
  teal      #0d7a6e    주요 액션, 환자 UI 강조
  tealMid   #1a9e8f    중간 톤
  tealLight #e6f4f2    배경, 카드

Dark:
  navy      #0f172a    의사 UI 배경, 헤더
  navyMid   #1e293b    의사 중간 배경
  navyLight #334155    의사 밝은 배경

Neutral:
  slate     #64748b    보조 텍스트
  slateLight #94a3b8   비활성 텍스트
  border    #e2e8f0    구분선
  bg        #f8fafc    전체 배경
  white     #ffffff

Accent:
  coral     #e05a3a    경고, 주의
  coralLight #fef2ee   경고 배경
  gold      #f59e0b    별점, 하이라이트
  goldLight #fffbeb    금색 배경
  green     #16a34a    성공, 완료
  greenLight #dcfce7   성공 배경
```

### 9.2 테마 시스템 (`constants/theme.ts`)
- 라이트/다크 모드 전체 지원
- 플랫폼별 폰트 패밀리 (iOS: system-ui, Android: normal, Web: 웹 폰트 스택)
- `useThemeColor` 훅으로 props 오버라이드 가능

### 9.3 UI 디자인 패턴
- LinearGradient 배경 (Expo)
- 글래스모피즘 카드 (rgba 배경 + 보더)
- 둥근 모서리 (12-20px), 그림자/elevation
- 이모지 아이콘 사용 (🙋 환자, 👨‍⚕️ 의사, 📅 캘린더)
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
13. 최종 결제 (잔액 = 총액 - 앱할인5% - 보증금)
    ↓
14. 출발 픽업 예약
    ↓
15. 리뷰 작성 (치료, 시설, 소통, 종합 평점)
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
7. 환자와 채팅 상담
   ↓
8. 방문 시간 제안 (각 방문별 가능 시간대)
   ↓
9. 환자 체크인 시 → 최종 청구서 발행
   ↓
10. 결제 확인
```

---

## 11. 시드 데모 데이터

`seedDemoData()` 함수가 제공하는 샘플:

| 항목 | 내용 |
|------|------|
| 환자 | Sarah Johnson, 미국, 1990-05-15 |
| 의사 | Dr. Kim Minjun, Seoul Bright Dental, 강남 |
| 의사 경력 | 12년, 4.9★, 127개 리뷰 |
| 클리닉 좌표 | 37.5012°N, 127.0396°E |
| 케이스 1 | Implant + Crown + Veneers (quotes_received) |
| 케이스 2 | Veneers (pending) |
| 견적 3개 | Dr. Kim $4,150 / Dr. Park $4,500 / Dr. Lee $3,600 |
| 채팅 | 1개 채팅방, 5개 메시지 |
| 예약 | times_proposed 상태, 4회 방문, $4,450, 보증금 $668 |
| 리뷰 | 3개 (이전 환자) |
| 알림 | 9개 (환자+의사 혼합) |
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

### 14.1 Git 상태
- 브랜치: `master` (main 브랜치 별도 존재)
- 초기 커밋 준비 상태 (74개 파일 staged)
- `app/(tabs)/` 디렉토리 삭제됨 (기존 탭 구조에서 역할별 구조로 변경)

### 14.2 데모/프로토타입 특성
- 백엔드 API 미구현 (AsyncStorage만 사용)
- 로그인 검증 미구현 (Dev 모드에서 즉시 로그인)
- 결제 실제 연동 없음 (UI만 존재)
- 이미지 업로드는 로컬 URI 저장만
- 프로덕션 API 코드 주석처리 상태 (`API_URL` 참조)

### 14.3 확장 가능 포인트
- `lib/store.ts`를 실제 API 클라이언트로 교체 가능 (인터페이스 동일)
- 푸시 알림 연동 가능 (로컬 알림 구조 이미 존재)
- 결제 게이트웨이 연동 (Stripe 등)
- 실시간 채팅 (WebSocket/Firebase)
- 다국어 지원 (현재 영어만)

---

## 15. 요약

DentaRoute는 **치과 관광 양면 마켓플레이스 모바일 앱**으로, 환자의 케이스 제출부터 견적 비교, 예약, 치료 진행, 결제, 리뷰까지 전체 여정을 다룬다. Expo/React Native 기반으로 iOS/Android/Web을 동시 지원하며, 파일 기반 라우팅과 AsyncStorage 로컬 저장소로 깔끔한 아키텍처를 갖추고 있다. 현재는 데모/프로토타입 단계이며, 백엔드 API와 결제 연동을 추가하면 프로덕션 배포가 가능한 수준의 완성도를 보인다.
