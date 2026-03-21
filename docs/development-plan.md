# DentaRoute 개발 기획서

## 프로젝트 개요

**DentaRoute**는 해외(주로 미국) 환자를 한국 치과와 연결하는 **치과 관광 모바일 플랫폼**입니다.
환자의 케이스 등록부터 견적 비교, 예약, 치료, 결제, 리뷰까지 전체 여정을 관리합니다.

---

## 1. 현재 상태 분석

### 1.1 기술 스택

| 구분 | 기술 | 비고 |
|------|------|------|
| **프론트엔드** | React Native (Expo SDK 54) + TypeScript | Expo Router 파일 기반 라우팅 |
| **백엔드** | Express.js + Prisma + PostgreSQL | 일부만 구현됨 |
| **인증** | JWT (Access + Refresh Token) | 구현 완료 |
| **유효성 검증** | Zod | 서버측 구현 완료 |
| **데이터 저장** | AsyncStorage (로컬) → PostgreSQL (서버) | 마이그레이션 진행 중 |

### 1.2 화면 구성 (총 59개 TSX 파일)

| 영역 | 화면 수 | 주요 화면 |
|------|---------|-----------|
| **인증** | 5개 | 역할 선택, 환자/의사 로그인 및 회원가입 |
| **환자** | 29개 | 대시보드, 케이스 등록(7단계), 견적 비교, 예약, 치료, 결제, 리뷰 |
| **의사** | 10개 | 대시보드, 케이스 상세, 인보이스, 수익, 채팅 |
| **공통** | 4개 | 스플래시, 알림, 개발 메뉴, 모달 |

### 1.3 구현 완료 항목

#### 프론트엔드 (UI/UX 완성)
- [x] 환자 케이스 등록 플로우 (기본 정보 → 의료 이력 → 치과 이력 → 여행 일정 → 치료 선택 → 업로드 → 검토)
- [x] 견적 수신/비교/상세 보기
- [x] 10단계 예약 상태 머신 (confirmed → departure_set)
- [x] 다회 방문(Multi-Visit) 인보이스 계산 로직
- [x] 채팅 UI + 연락처 필터링 (anti-bypass)
- [x] 5% 앱 할인 시스템 (환자에게만 노출)
- [x] 의사 Tier 시스템 (Gold 15% / Silver 18% / Standard 20%)
- [x] 워런티 시스템 (치료별 보증 기간)
- [x] 환불 정책 (7일전 100% / 3일전 50% / 3일 미만 0%)
- [x] 리뷰 시스템 (4가지 평점)
- [x] 다크모드 지원
- [x] 시드 데모 데이터

#### 백엔드 (일부 완성)
- [x] Auth 슬라이스 (10개 엔드포인트)
- [x] Cases + Quotes 슬라이스 (CRUD)
- [x] Prisma 스키마 정의
- [x] JWT 미들웨어 + Role Guard
- [x] CORS 설정
- [x] 통합 테스트

---

## 2. 미구현 항목 (개발 필요)

### 2.1 백엔드 API 슬라이스

| 슬라이스 | 우선순위 | 상태 | 설명 |
|----------|----------|------|------|
| **Bookings** | P0 | 미구현 | 예약 CRUD, 상태 전이, 환불 계산 |
| **Chat + WebSocket** | P0 | 미구현 | 실시간 채팅, 메시지 저장, 읽음 처리 |
| **Payments (Stripe)** | P0 | 미구현 | 보증금, 최종 결제, 환불, 웹훅 |
| **File Upload (S3)** | P1 | 미구현 | X-ray, 치료 계획서, 사진 업로드 |
| **Reviews** | P1 | 미구현 | 리뷰 CRUD |
| **Translation (DeepL)** | P2 | 미구현 | 채팅 메시지 자동 번역 |
| **Push Notifications** | P2 | 미구현 | Expo Push Notification 연동 |
| **Admin API** | P2 | 미구현 | 의사 라이센스 검증, Tier 재계산, 관리 |

### 2.2 프론트엔드 ↔ 백엔드 연동

현재 프론트엔드는 `lib/store.ts`의 AsyncStorage 기반 로컬 데이터를 사용 중.
`lib/api.ts`에 API 클라이언트가 정의되어 있으나, 실제 화면에서는 store를 직접 호출합니다.

**필요 작업:**
- 각 화면에서 `store.*` 호출을 `api.*` 호출로 교체
- 로딩/에러 상태 처리 추가
- 오프라인 폴백 로직 (선택)

---

## 3. 개발 로드맵

### Phase 4: 백엔드 코어 완성 (Bookings + Payments)

**목표:** 예약과 결제 흐름의 서버 사이드 구현

#### 3.1 Bookings 슬라이스

**Prisma 모델 추가:**
```
Booking {
  id, caseId, quoteId, patientId, doctorId
  status (10단계 enum)
  depositPaid, totalPrice
  currentVisit, platformFeeRate
  arrivalInfo (JSON), departurePickup (JSON)
  savedCard (JSON, 암호화)
  visitDates (relation → VisitDate[])
  finalInvoice (relation → FinalInvoice)
  createdAt, updatedAt
}

VisitDate {
  id, bookingId, visit, description
  date, confirmedTime
  gapMonths, gapDays
  paymentAmount, paymentPercent, paid
}
```

**API 엔드포인트:**
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/bookings` | 예약 생성 (보증금 결제 후) |
| GET | `/api/bookings` | 내 예약 목록 |
| GET | `/api/bookings/:id` | 예약 상세 |
| PATCH | `/api/bookings/:id/status` | 상태 전이 |
| PATCH | `/api/bookings/:id/arrival` | 도착 정보 입력 |
| PATCH | `/api/bookings/:id/departure` | 출발 픽업 정보 |
| POST | `/api/bookings/:id/cancel` | 예약 취소 + 환불 |
| POST | `/api/bookings/:id/invoice` | 최종 인보이스 생성 |

**상태 전이 규칙 (서버 사이드 검증):**
```
confirmed → flight_submitted     (환자: 항공편 정보 제출)
flight_submitted → arrived_korea (환자: 한국 도착 확인)
arrived_korea → checked_in_clinic (환자: 클리닉 체크인)
checked_in_clinic → treatment_done (의사: 치료 완료)
treatment_done → between_visits   (다회 방문 시)
between_visits → returning_home   (환자: 귀국)
returning_home → checked_in_clinic (환자: 재방문 체크인)
treatment_done → payment_complete  (최종 결제 완료)
payment_complete → departure_set   (출발 픽업 설정)
ANY → cancelled                    (취소 가능, 환불 계산)
```

#### 3.2 Payments (Stripe) 슬라이스

**구현 항목:**
- Stripe Customer 생성 (환자 회원가입 시)
- Payment Intent 생성 (보증금 10%)
- 최종 결제 처리 (잔액)
- Stripe Webhook 처리 (payment_succeeded, payment_failed)
- 환불 처리 (7일/3일 규칙)
- 다회 방문별 분할 결제

**API 엔드포인트:**
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/payments/deposit` | 보증금 Payment Intent 생성 |
| POST | `/api/payments/final` | 최종 결제 |
| POST | `/api/payments/refund` | 환불 처리 |
| POST | `/api/payments/webhook` | Stripe 웹훅 수신 |
| GET | `/api/payments/history` | 결제 내역 |

---

### Phase 5: 실시간 통신 (Chat + Notifications)

#### 5.1 Chat (WebSocket)

**기술 선택:** Socket.IO (Express 호환)

**구현 항목:**
- ChatRoom, ChatMessage Prisma 모델
- WebSocket 연결/인증 (JWT)
- 실시간 메시지 송수신
- 읽음 확인 (readAt 업데이트)
- 타이핑 표시
- **서버 사이드 연락처 필터링** (chat-filter 로직 이전)

**API 엔드포인트 (REST):**
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/chats` | 내 채팅방 목록 |
| GET | `/api/chats/:id/messages` | 메시지 조회 (페이지네이션) |
| POST | `/api/chats/:id/messages` | 메시지 전송 (WebSocket 폴백) |
| PATCH | `/api/chats/:id/read` | 읽음 처리 |

**WebSocket 이벤트:**
| 이벤트 | 방향 | 설명 |
|--------|------|------|
| `message:send` | Client → Server | 메시지 전송 |
| `message:new` | Server → Client | 새 메시지 수신 |
| `message:read` | Server → Client | 읽음 확인 |
| `typing:start` | Client → Server | 타이핑 시작 |
| `typing:stop` | Client → Server | 타이핑 종료 |
| `typing:update` | Server → Client | 상대방 타이핑 상태 |

#### 5.2 Push Notifications (Expo)

**구현 항목:**
- Expo Push Token 등록/관리
- 알림 발송 서비스 (Expo Push API)
- 알림 유형별 라우팅 (딥링크)
- 알림 저장 (Notification 모델)

**트리거 이벤트:**
| 이벤트 | 수신자 | 알림 내용 |
|--------|--------|-----------|
| 새 케이스 등록 | 모든 의사 | "새로운 치료 요청이 도착했습니다" |
| 새 견적 수신 | 환자 | "Dr. Kim이 견적을 보냈습니다" |
| 견적 수락 | 의사 | "환자가 견적을 수락했습니다" |
| 새 메시지 | 상대방 | "새 메시지가 도착했습니다" |
| 예약 상태 변경 | 양측 | "예약 상태가 변경되었습니다" |
| 결제 완료 | 의사 | "결제가 완료되었습니다" |
| 리뷰 등록 | 의사 | "새 리뷰가 등록되었습니다" |

---

### Phase 6: 파일 관리 + 리뷰 + 워런티

#### 6.1 File Upload (AWS S3)

**구현 항목:**
- S3 버킷 설정 (pre-signed URL 방식)
- 파일 유형별 분류 (X-ray, 치료계획서, 사진, 라이센스)
- 이미지 리사이징 (thumbnail 생성)
- 파일 메타데이터 저장 (Prisma)

**API 엔드포인트:**
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/files/presign` | Pre-signed Upload URL 발급 |
| POST | `/api/files/confirm` | 업로드 완료 확인 |
| GET | `/api/files/:id` | 파일 다운로드 URL |
| DELETE | `/api/files/:id` | 파일 삭제 |

#### 6.2 Reviews 슬라이스

**API 엔드포인트:**
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/reviews` | 리뷰 작성 (booking 완료 후만) |
| GET | `/api/reviews/dentist/:id` | 의사별 리뷰 조회 |
| GET | `/api/reviews/my` | 내가 작성한 리뷰 |

**검증 규칙:**
- `bookingId` 기반 치료 완료 여부 확인
- 중복 리뷰 방지 (1 booking = 1 review)
- 치료 목록은 실제 booking 데이터에서 추출 (위변조 방지)

---

### Phase 7: 부가 기능

#### 7.1 Translation (DeepL API)

- 채팅 메시지 자동 번역 (한↔영)
- 번역 결과 캐싱 (DB 저장)
- 원문/번역문 동시 표시

#### 7.2 Admin API

- 의사 라이센스 검증 워크플로우
- Tier 월별 재계산 (Cron Job)
- 사용자 관리 (차단, 삭제)
- 플랫폼 통계 대시보드

#### 7.3 의사 Tier 자동 계산

```
매월 1일 실행:
1. 최근 6개월 의사별 매출 집계
2. 전체 의사 수 >= 20 확인
3. 상위 5% → Gold, 5-20% → Silver, 나머지 → Standard
4. 신규 의사 (3개월 미만) → Standard 유지
5. Tier 변경 알림 발송
```

---

## 4. 프론트엔드 수정 계획

### 4.1 API 연동 마이그레이션

**작업 순서:** 각 화면에서 `store.*` → `api.*` 전환

| 단계 | 화면 그룹 | 파일 수 | 설명 |
|------|-----------|---------|------|
| 1 | 인증 | 4개 | 로그인/회원가입 → JWT 기반 전환 |
| 2 | 케이스 등록 | 7개 | 케이스 생성 → 서버 API |
| 3 | 견적 | 4개 | 견적 조회/비교 → 서버 API |
| 4 | 예약 | 8개 | 예약 상태 관리 → 서버 API |
| 5 | 채팅 | 4개 | WebSocket 연동 |
| 6 | 결제 | 3개 | Stripe 연동 |
| 7 | 리뷰/워런티 | 4개 | 서버 API 연동 |
| 8 | 의사 화면 | 10개 | 전체 서버 API 전환 |

### 4.2 공통 수정 사항

- **로딩 상태 UI** 추가 (Skeleton, Spinner)
- **에러 핸들링** 통일 (Toast 알림)
- **Pull-to-Refresh** 구현
- **Pagination** 적용 (목록 화면)
- **캐싱 전략** 수립 (React Query 또는 SWR 도입 검토)

### 4.3 신규 화면 추가 (필요 시)

| 화면 | 설명 | 우선순위 |
|------|------|----------|
| 비밀번호 재설정 | 이메일 기반 비밀번호 리셋 | P1 |
| 의사 라이센스 상태 | 검증 대기/승인/거절 표시 | P1 |
| 결제 수단 관리 | Stripe 카드 등록/삭제 | P1 |
| 워런티 클레임 작성 | 사진 업로드 + 설명 | P2 |
| 설정 | 알림 설정, 언어 설정, 계정 삭제 | P2 |

---

## 5. 데이터베이스 스키마 확장

### 5.1 추가 Prisma 모델

```prisma
model Booking {
  id              String        @id @default(cuid())
  caseId          String
  quoteId         String
  patientId       String
  doctorId        String
  status          BookingStatus @default(CONFIRMED)
  depositPaid     Float
  totalPrice      Float
  currentVisit    Int           @default(1)
  platformFeeRate Float
  arrivalInfo     Json?
  departurePickup Json?
  savedCard       Json?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  case       PatientCase   @relation(fields: [caseId], references: [id])
  quote      DentistQuote  @relation(fields: [quoteId], references: [id])
  patient    User          @relation("PatientBookings", fields: [patientId], references: [id])
  doctor     User          @relation("DoctorBookings", fields: [doctorId], references: [id])
  visitDates VisitDate[]
  invoices   VisitInvoice[]
  payments   Payment[]
  review     Review?
}

enum BookingStatus {
  CONFIRMED
  FLIGHT_SUBMITTED
  ARRIVED_KOREA
  CHECKED_IN_CLINIC
  TREATMENT_DONE
  BETWEEN_VISITS
  RETURNING_HOME
  PAYMENT_COMPLETE
  DEPARTURE_SET
  CANCELLED
}

model VisitDate {
  id             String   @id @default(cuid())
  bookingId      String
  visit          Int
  description    String
  date           DateTime?
  confirmedTime  String?
  gapMonths      Int?
  gapDays        Int?
  paymentAmount  Float?
  paymentPercent Float?
  paid           Boolean  @default(false)

  booking Booking @relation(fields: [bookingId], references: [id])
}

model VisitInvoice {
  id                  String  @id @default(cuid())
  bookingId           String
  visit               Int
  items               Json
  visitTotal          Float
  prevCarryForward    Float   @default(0)
  billingPercent      Float
  billedAmount        Float
  deferredAmount      Float
  carryForward        Float
  preDiscountPayment  Float
  appDiscount         Float
  afterDiscount       Float
  depositDeducted     Float   @default(0)
  paymentAmount       Float
  paid                Boolean @default(false)

  booking Booking @relation(fields: [bookingId], references: [id])
}

model Payment {
  id              String        @id @default(cuid())
  bookingId       String
  stripePaymentId String?
  type            PaymentType
  amount          Float
  status          PaymentStatus @default(PENDING)
  createdAt       DateTime      @default(now())

  booking Booking @relation(fields: [bookingId], references: [id])
}

enum PaymentType {
  DEPOSIT
  VISIT_PAYMENT
  FINAL_PAYMENT
  REFUND
}

enum PaymentStatus {
  PENDING
  SUCCEEDED
  FAILED
  REFUNDED
}

model ChatRoom {
  id           String   @id @default(cuid())
  caseId       String
  patientId    String
  doctorId     String
  lastMessage  String?
  lastMessageAt DateTime?
  unreadPatient Int     @default(0)
  unreadDoctor  Int     @default(0)
  createdAt    DateTime @default(now())

  patient  User          @relation("PatientChats", fields: [patientId], references: [id])
  doctor   User          @relation("DoctorChats", fields: [doctorId], references: [id])
  messages ChatMessage[]
}

model ChatMessage {
  id             String   @id @default(cuid())
  chatRoomId     String
  senderId       String
  senderRole     Role
  text           String
  translatedText String?
  originalLang   String?
  delivered      Boolean  @default(false)
  readAt         DateTime?
  createdAt      DateTime @default(now())

  chatRoom ChatRoom @relation(fields: [chatRoomId], references: [id])
  sender   User     @relation(fields: [senderId], references: [id])
}

model Review {
  id                  String   @id @default(cuid())
  bookingId           String   @unique
  patientId           String
  doctorId            String
  rating              Float
  treatmentRating     Float
  clinicRating        Float
  communicationRating Float
  title               String
  comment             String
  treatments          String[]
  verified            Boolean  @default(true)
  createdAt           DateTime @default(now())

  booking Booking @relation(fields: [bookingId], references: [id])
  patient User    @relation("PatientReviews", fields: [patientId], references: [id])
  doctor  User    @relation("DoctorReviews", fields: [doctorId], references: [id])
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String
  title     String
  body      String
  icon      String?
  route     String?
  read      Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}

model UploadedFile {
  id        String   @id @default(cuid())
  userId    String
  caseId    String?
  type      String
  filename  String
  s3Key     String
  size      Int
  mimeType  String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}
```

---

## 6. 보안 고려사항

| 항목 | 현재 | 개선 방향 |
|------|------|-----------|
| 연락처 필터 | 클라이언트 사이드 | **서버 사이드로 이전** (우회 방지) |
| 환불 계산 | 클라이언트 사이드 | **서버 사이드 검증** 필수 |
| Tier 계산 | 클라이언트 사이드 | **서버 Cron Job** 으로 이전 |
| 의료 데이터 | 평문 저장 | **전송 중 TLS + 저장 시 암호화** |
| 라이센스 검증 | 없음 | **Admin 검증 워크플로우** 추가 |
| Rate Limiting | 없음 | **express-rate-limit** 적용 |
| 입력 검증 | Zod (일부) | **모든 엔드포인트에 Zod** 적용 |
| 카드 정보 | JSON 저장 | **Stripe Customer Portal** 사용 |

---

## 7. 배포 전략

### 7.1 프론트엔드

```
개발: expo start (로컬)
테스트: EAS Build → Preview APK 배포
프로덕션: EAS Build → App Store / Google Play
```

### 7.2 백엔드

```
개발: Docker Compose (PostgreSQL + Express)
스테이징: AWS ECS 또는 Railway
프로덕션: AWS ECS + RDS (PostgreSQL) + S3 + CloudFront
```

### 7.3 환경변수

```env
# Backend
DATABASE_URL=postgresql://user:pass@host:5432/dentaroute
JWT_SECRET=<secret>
JWT_REFRESH_SECRET=<secret>
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
AWS_S3_BUCKET=dentaroute-files
AWS_REGION=ap-northeast-2
DEEPL_API_KEY=<key>
EXPO_ACCESS_TOKEN=<token>

# Frontend
EXPO_PUBLIC_API_URL=https://api.dentaroute.com
EXPO_PUBLIC_WS_URL=wss://api.dentaroute.com
```

---

## 8. 개발 일정 (권장)

| Phase | 기간 | 내용 | 산출물 |
|-------|------|------|--------|
| **Phase 4** | 2주 | Bookings + Payments API | 예약/결제 서버 완성 |
| **Phase 5** | 2주 | Chat WebSocket + Push Notifications | 실시간 통신 |
| **Phase 6** | 1주 | File Upload + Reviews API | 파일/리뷰 |
| **Phase 7** | 1주 | Translation + Admin + Tier Cron | 부가 기능 |
| **Phase 8** | 2주 | 프론트엔드 API 연동 마이그레이션 | AsyncStorage → API 전환 |
| **Phase 9** | 1주 | 테스트 + 보안 감사 + 배포 준비 | 프로덕션 배포 |

---

## 9. 파일 구조 참고

```
dentaroute-app/
├── app/                        # 59개 화면 (Expo Router)
│   ├── auth/                   # 인증 (5)
│   ├── patient/                # 환자 (29)
│   └── doctor/                 # 의사 (10)
├── components/                 # 공유 UI 컴포넌트 (11)
├── constants/                  # 테마, 색상, 워런티 설정 (3)
├── hooks/                      # 커스텀 React Hook (3)
├── lib/
│   ├── store.ts               # 로컬 데이터 레이어 (1,142+ lines)
│   ├── api.ts                 # HTTP 클라이언트 (531 lines)
│   ├── chat-filter.ts         # 연락처 필터링 (282 lines)
│   └── tabDirection.ts        # 탭 애니메이션 (6 lines)
├── server/
│   ├── src/
│   │   ├── routes/            # API 라우트
│   │   ├── services/          # 비즈니스 로직
│   │   ├── repositories/      # 데이터 액세스
│   │   ├── middleware/        # 인증, 에러 핸들링
│   │   └── validators/        # Zod 스키마
│   ├── prisma/
│   │   └── schema.prisma      # DB 스키마
│   └── tests/                 # 통합 테스트
└── docs/                      # 사양 문서 (7개)
```

---

## 10. 핵심 비즈니스 로직 요약

### 다회 방문 인보이스 계산 공식

```
visitTotal = sum(items[].price × items[].qty)       -- 이번 방문 치료 합계
billedAmount = payableBase × billingPercent          -- 이번 방문 청구 금액
payableBase = visitTotal + prevCarryForward          -- 이전 이월 포함
deferredAmount = visitTotal - billedAmount           -- 이월 금액
preDiscountPayment = billedAmount                    -- 할인 전 결제액
appDiscount = preDiscountPayment × 0.05              -- 5% 앱 할인
afterDiscount = preDiscountPayment - appDiscount     -- 할인 후 금액
paymentAmount = afterDiscount - depositDeducted      -- 최종 환자 결제액
```

### 환불 정책

```
첫 방문일까지 7일 이상 → 100% 환불 (보증금 전액)
첫 방문일까지 3~6일   → 50% 환불
첫 방문일까지 3일 미만 → 환불 불가
```

### 의사 Tier 시스템

```
Gold (상위 5%)     → 플랫폼 수수료 15%
Silver (5~20%)     → 플랫폼 수수료 18%
Standard (나머지)  → 플랫폼 수수료 20%
조건: 플랫폼 의사 20명 이상, 신규 의사 3개월 Standard 유지
재계산: 매월 1일, 최근 6개월 매출 기준
```

---

> **이 기획서는 현재 dev 브랜치 코드 분석을 기반으로 작성되었습니다.**
> **코드 수정/추가 작업 시 이 문서를 참조하여 진행하면 됩니다.**
