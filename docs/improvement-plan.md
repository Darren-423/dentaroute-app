# DentaRoute 앱 개선 기획서

**작성일**: 2026-03-11
**버전**: v1.0
**대상**: DentaRoute 모바일 앱 (Expo/React Native)

---

## 목차

1. [개요](#1-개요)
2. [Phase 1: 보안 강화](#2-phase-1-보안-강화-critical)
3. [Phase 2: 코드 품질 & 테스트](#3-phase-2-코드-품질--테스트)
4. [Phase 3: 핵심 기능 구현](#4-phase-3-핵심-기능-구현)
5. [Phase 4: UX & 접근성 개선](#5-phase-4-ux--접근성-개선)
6. [Phase 5: 운영 인프라](#6-phase-5-운영-인프라)
7. [구현 일정 로드맵](#7-구현-일정-로드맵)
8. [기술 의사결정 사항](#8-기술-의사결정-사항)

---

## 1. 개요

### 1.1 현재 상태

DentaRoute는 치과 관광 양면 마켓플레이스 모바일 앱으로, 프로토타입 단계에서 높은 완성도를 보이고 있다. 아키텍처(Expo Router 파일 기반 라우팅), 비즈니스 로직(다회 방문 빌링, 티어 수수료, 환불 정책), UI/UX(애니메이션, 그래디언트) 등 핵심 설계가 잘 되어 있다.

### 1.2 개선 목적

프로토타입 → 프로덕션 전환을 위해 보안, 테스트, 성능, 접근성, 국제화 등 전방위적 개선이 필요하다.

### 1.3 평가 현황

| 카테고리 | 현재 점수 | 목표 점수 |
|---------|----------|----------|
| 아키텍처 | 8/10 | 9/10 |
| UI/UX 디자인 | 8/10 | 9/10 |
| 코드 품질 | 6/10 | 8/10 |
| 보안 | 2/10 | 8/10 |
| 성능 | 6/10 | 8/10 |
| 테스트 | 0/10 | 7/10 |
| 국제화/접근성 | 1/10 | 7/10 |
| 모바일 표준 기능 | 4/10 | 7/10 |

---

## 2. Phase 1: 보안 강화 (CRITICAL)

> **우선순위**: 최상 | **예상 기간**: 2-3주

### 2.1 인증 시스템 재구축

**현재 문제:**
- Mock 로그인: 아무 이메일로든 로그인 가능
- OTP 인증 미구현 (Dev 모드에서 스킵)
- 비밀번호 평문 저장 가능성
- 세션 관리 없음

**개선 항목:**

#### 2.1.1 JWT 기반 인증 구현
```
대상 파일:
- app/auth/patient-login.tsx
- app/auth/patient-create-account.tsx
- app/auth/doctor-login.tsx
- app/auth/doctor-create-account.tsx
- lib/store.ts (새 인증 관련 메서드 추가)
- [신규] lib/auth.ts

구현 내용:
- 로그인 시 서버에서 JWT Access Token + Refresh Token 발급
- Access Token: 15분 만료, Authorization 헤더로 전송
- Refresh Token: 7일 만료, expo-secure-store에 암호화 저장
- 토큰 자동 갱신 로직 (API 호출 시 401 → Refresh → 재시도)
- 로그아웃 시 서버측 토큰 무효화 + 로컬 토큰 삭제
```

#### 2.1.2 비밀번호 보안
```
구현 내용:
- 비밀번호는 서버에서만 bcrypt 해싱 (salt rounds: 12)
- 클라이언트에서는 비밀번호를 저장하지 않음
- 비밀번호 정책 강화: 최소 8자, 대소문자+숫자+특수문자
- 비밀번호 찾기/재설정 플로우 추가
```

#### 2.1.3 OTP 인증 실제 구현
```
구현 내용:
- 이메일 OTP: AWS SES 또는 SendGrid로 6자리 코드 발송
- 전화번호 OTP: Twilio SMS 연동
- OTP 유효시간: 5분
- 최대 시도 횟수: 5회 (초과 시 15분 잠금)
- 스마트 붙여넣기 기능 유지 (현재 구현 양호)
```

#### 2.1.4 생체인증 추가
```
대상 파일:
- [신규] lib/biometric.ts
- app/auth/patient-login.tsx
- app/auth/doctor-login.tsx

구현 내용:
- expo-local-authentication 사용
- Face ID / Touch ID / 지문인식 지원
- 최초 로그인 후 "생체인증 활성화" 옵션 제공
- 앱 재실행 시 생체인증으로 빠른 로그인
- 생체인증 실패 시 비밀번호 폴백
```

### 2.2 데이터 암호화

**현재 문제:**
- AsyncStorage에 모든 데이터 평문 저장
- 의료 정보, 결제 정보 등 민감 데이터 노출 위험

**개선 항목:**

#### 2.2.1 민감 데이터 분리 저장
```
대상 파일:
- lib/store.ts
- [신규] lib/secure-storage.ts

구현 내용:
- expo-secure-store 도입 (Keychain/Keystore 기반)
- 민감 데이터 분류:
  [Secure Store에 저장]
  - JWT 토큰
  - 저장된 카드 정보 (last4, brand만 → 전체 카드번호는 저장 금지)
  - 의료 이력 요약
  - 비밀번호 관련 임시 데이터

  [AsyncStorage 유지 (비민감)]
  - 케이스 목록/상태
  - UI 설정 (테마, 언어)
  - 알림 목록
  - 채팅 메시지 (암호화 전송은 백엔드에서 처리)
```

### 2.3 입력 검증 통합

**현재 문제:**
- 각 화면마다 개별적으로 검증 로직 작성
- 일부 화면은 검증 누락
- JSON.parse 에러 핸들링 부재

**개선 항목:**

#### 2.3.1 Zod 스키마 기반 검증
```
대상 파일:
- [신규] lib/validation.ts
- 모든 폼 화면 (약 15개)

구현 내용:
- zod 라이브러리 도입
- 엔티티별 검증 스키마 정의:

  patientProfileSchema:
    - name: 2-50자, 특수문자 제한
    - email: 이메일 형식
    - phone: E.164 형식
    - birthDate: 과거 날짜, 최소 18세

  quoteSchema:
    - totalPrice: 양수, 최대 $500,000
    - treatments: 최소 1개
    - duration: 양수

  bookingSchema:
    - depositPaid: 양수, totalPrice 이하
    - visitDates: 최소 1개, 미래 날짜

  chatMessageSchema:
    - text: 1-5000자, XSS 패턴 차단

- 공통 sanitize 함수:
  - HTML 태그 제거
  - SQL 인젝션 패턴 차단
  - 이모지 허용, 스크립트 태그 차단
```

### 2.4 API 보안

**현재 문제:**
- API URL이 `patient-create-account.tsx:18`에 하드코딩
- HTTPS 외 보안 헤더 없음

**개선 항목:**

#### 2.4.1 환경변수 관리
```
대상 파일:
- [신규] .env, .env.example
- app.config.ts (또는 app.json 수정)
- [신규] lib/config.ts

구현 내용:
- expo-constants를 통한 환경변수 주입
- .env 파일:
  API_URL=https://dentaroute-api.onrender.com/api
  SENTRY_DSN=...
  STRIPE_PUBLISHABLE_KEY=...
- .env는 .gitignore에 추가
- .env.example만 커밋 (값 비워둠)
```

#### 2.4.2 API 클라이언트 보안
```
대상 파일:
- [신규] lib/api-client.ts

구현 내용:
- axios 또는 fetch 래퍼 생성
- 모든 요청에 Authorization 헤더 자동 추가
- Request/Response 인터셉터:
  - 401 → 토큰 갱신 → 재시도
  - 403 → 로그인 화면으로 리다이렉트
  - 429 → "잠시 후 다시 시도" 안내
  - 5xx → 에러 로깅 + 사용자 알림
- API 타임아웃: 30초
- 요청 중복 방지 (debounce)
```

### 2.5 세션 관리

```
구현 내용:
- 앱 백그라운드 30분 후 자동 잠금
- 잠금 시 생체인증 또는 비밀번호 요구
- 장기 미사용 시 자동 로그아웃 (7일)
- 다중 기기 로그인 감지 및 알림
```

---

## 3. Phase 2: 코드 품질 & 테스트

> **우선순위**: 상 | **예상 기간**: 2-3주

### 3.1 코드 중복 제거

**현재 문제:**
- 51개 화면 각각에 동일한 컬러 팔레트 `const T = {...}` 중복 정의
- 치료 목록이 3개 파일에 중복
- 국가 코드 목록이 2개 파일에 중복
- `useEffect(() => { load(); }, [])` 패턴 83회 반복

**개선 항목:**

#### 3.1.1 컬러 팔레트 통합
```
대상 파일:
- constants/colors.ts (기존 파일 확장)
- 51개 화면 파일 (inline T 객체 제거)

구현 내용:
- constants/colors.ts에 통합 팔레트 정의:
  export const T = {
    purple: "#4A0080",
    purpleMid: "#5C10A0",
    purpleLight: "#f0e6f6",
    navy: "#0f172a",
    slate: "#64748b",
    slateLight: "#94a3b8",
    border: "#e2e8f0",
    bg: "#f8fafc",
    white: "#ffffff",
    coral: "#e05a3a",
    coralLight: "#fef2ee",
    green: "#16a34a",
    greenLight: "#dcfce7",
  } as const;

- 모든 화면에서 import { T } from '@/constants/colors'로 교체
```

#### 3.1.2 상수 통합
```
대상 파일:
- [신규] constants/treatments.ts
- [신규] constants/countries.ts

구현 내용:
- 치료 목록 (13종) 단일 소스로 통합
- 국가 코드 목록 (195개국) 단일 소스로 통합
- 각 화면에서 import하여 사용
```

#### 3.1.3 커스텀 훅 추출
```
대상 파일:
- [신규] hooks/use-async.ts
- [신규] hooks/use-form-validation.ts
- [신규] hooks/use-booking-status.ts

구현 내용:
- useAsync<T>(asyncFn, deps):
  - loading, error, data 상태 자동 관리
  - 컴포넌트 언마운트 시 상태 업데이트 방지
  - 재시도(retry) 함수 포함
  - 83개의 useEffect+loading 패턴을 교체

- useFormValidation(schema):
  - Zod 스키마 기반 폼 검증
  - 필드별 에러 메시지 관리
  - touched/dirty 상태 추적
  - 제출 시 전체 검증

- useBookingStatus(bookingId):
  - 예약 상태별 다음 액션, 아이콘, 색상 반환
  - 대시보드, 케이스 상세 등에서 중복 제거
```

### 3.2 타입 안전성 강화

**현재 문제:**
- 153개의 `any` 타입 사용
- 일부 컴포넌트 props 타입 미정의

**개선 항목:**

#### 3.2.1 any 타입 제거
```
구현 내용:
- 153개 any → 적절한 타입으로 교체
- 우선순위:
  1. store.ts 내부 함수 반환 타입 (데이터 레이어)
  2. useState<any> → useState<SpecificType | null>
  3. 이벤트 핸들러 파라미터
  4. 네비게이션 파라미터

- tsconfig.json에 noImplicitAny: true 추가 (점진적 적용)
```

### 3.3 에러 처리 체계화

**현재 문제:**
- `catch { return []; }` — 에러를 삼키는 패턴
- Error Boundary 없음
- 사용자에게 에러 미표시

**개선 항목:**

#### 3.3.1 Error Boundary 구현
```
대상 파일:
- [신규] components/ErrorBoundary.tsx
- app/_layout.tsx (래핑)

구현 내용:
- React Error Boundary 클래스 컴포넌트
- 크래시 발생 시:
  - 에러 메시지 + "다시 시도" 버튼 표시
  - Sentry로 에러 리포트 전송
  - 앱 전체 크래시 방지
- 루트 레이아웃에서 전체 앱 래핑
```

#### 3.3.2 에러 처리 표준화
```
대상 파일:
- [신규] lib/error-handler.ts
- lib/store.ts (기존 catch 블록 개선)
- 모든 화면의 데이터 로드 함수

구현 내용:
- AppError 클래스 정의:
  - NetworkError (네트워크 문제)
  - AuthError (인증 만료)
  - ValidationError (입력 오류)
  - StorageError (저장소 문제)

- 각 에러 유형별 사용자 메시지:
  - NetworkError → "인터넷 연결을 확인해주세요"
  - AuthError → 로그인 화면으로 이동
  - ValidationError → 해당 필드 하이라이트
  - StorageError → "데이터 저장 실패. 다시 시도해주세요"

- Toast/Snackbar 컴포넌트로 에러 표시
```

### 3.4 테스트 환경 구축

**현재 문제:**
- 테스트 파일 0개
- 테스트 프레임워크 미설정

**개선 항목:**

#### 3.4.1 테스트 인프라 설정
```
신규 파일:
- jest.config.ts
- jest.setup.ts
- __mocks__/async-storage.ts
- __mocks__/expo-*.ts

의존성 추가:
- jest
- @testing-library/react-native
- @testing-library/jest-native
- jest-expo
```

#### 3.4.2 단위 테스트 (목표: 70% 커버리지)
```
대상:
- lib/store.ts → __tests__/store.test.ts
  - createCase: 케이스 생성 + ID 자동 생성 검증
  - createQuote: 견적 생성 + 케이스 상태 변경 검증
  - createBooking: 예약 생성 + 보증금 계산 검증
  - cancelBooking: 환불 금액 계산 (3단계) 검증
  - getRefundInfo: 경계값 테스트 (정확히 7일, 3일, 0일)
  - seedDemoData: 시드 데이터 무결성 검증

- lib/validation.ts → __tests__/validation.test.ts
  - 각 스키마별 유효/무효 케이스
  - 경계값 테스트
  - XSS 패턴 차단 테스트
```

#### 3.4.3 컴포넌트 테스트
```
대상 (주요 화면):
- __tests__/screens/patient-dashboard.test.tsx
  - 케이스 목록 렌더링
  - 상태별 뱃지 표시
  - 빈 상태 표시

- __tests__/screens/quote-detail.test.tsx
  - 견적 정보 표시
  - Accept 버튼 동작
  - 치료 항목 목록

- __tests__/screens/payment.test.tsx
  - 카드 번호 마스킹
  - 유효성 검증
  - 결제 버튼 상태
```

#### 3.4.4 E2E 테스트
```
도구: Maestro (React Native 친화적)

시나리오:
1. 환자 회원가입 → 로그인 → 케이스 제출
2. 의사 로그인 → 견적 발송
3. 환자 견적 수락 → 예약 생성
4. 예약 취소 → 환불 확인
5. 채팅 전송 → 번역 확인
```

#### 3.4.5 CI/CD 파이프라인
```
신규 파일:
- .github/workflows/ci.yml

구현 내용:
- PR 시 자동 실행:
  - TypeScript 컴파일 체크
  - ESLint 검사
  - Jest 단위 테스트
  - 번들 사이즈 체크
- main 머지 시:
  - EAS Build 트리거
  - 테스트 커버리지 리포트
```

---

## 4. Phase 3: 핵심 기능 구현

> **우선순위**: 상 | **예상 기간**: 3-4주

### 4.1 백엔드 API 연동

**현재 문제:**
- 모든 데이터가 AsyncStorage 로컬 저장
- 사용자 간 데이터 공유 불가
- 실시간 기능 불가

**개선 항목:**

#### 4.1.1 API 클라이언트 교체
```
대상 파일:
- lib/store.ts → API 호출로 점진적 교체
- [신규] lib/api-client.ts

구현 내용:
- store.ts의 기존 인터페이스(함수 시그니처) 유지
- 내부 구현만 AsyncStorage → API 호출로 교체
- 오프라인 폴백: API 실패 시 로컬 캐시 사용
- 교체 순서:
  1단계: 인증 API (로그인/회원가입)
  2단계: 케이스/견적 API
  3단계: 예약/결제 API
  4단계: 채팅 API (WebSocket)
  5단계: 알림 API (Push)
```

### 4.2 실제 결제 연동

**현재 문제:**
- 결제 UI만 존재, 실제 처리 없음
- 카드 정보 로컬 저장 (보안 위험)

**개선 항목:**

#### 4.2.1 Stripe 연동
```
대상 파일:
- app/patient/payment.tsx (보증금)
- app/patient/final-payment.tsx (최종 결제)
- [신규] lib/payment.ts

의존성 추가:
- @stripe/stripe-react-native

구현 내용:
- Stripe PaymentSheet 사용 (PCI DSS 준수)
- 카드 정보는 Stripe에만 저장 (앱에 저장 금지)
- 결제 플로우:
  1. 서버에서 PaymentIntent 생성
  2. 클라이언트에서 PaymentSheet 표시
  3. 결제 완료 시 서버에서 Webhook 수신
  4. 예약 상태 업데이트
- 환불 처리: 서버 사이드에서 Stripe Refund API 호출
- 분할 결제 지원 (방문별 인보이스)
```

### 4.3 푸시 알림 구현

**현재 문제:**
- 인앱 알림만 존재 (앱 종료 시 알림 불가)
- 리마인더 기능 없음

**개선 항목:**

#### 4.3.1 expo-notifications 연동
```
대상 파일:
- [신규] lib/push-notification.ts
- app/_layout.tsx (초기화)
- app/notifications.tsx (기존 화면 확장)
- [신규] app/patient/notification-settings.tsx
- [신규] app/doctor/notification-settings.tsx

구현 내용:
- expo-notifications + Firebase Cloud Messaging 연동
- 푸시 토큰 서버 등록/갱신
- 알림 유형별 채널 (Android):
  - 견적 알림 (높음)
  - 채팅 메시지 (높음)
  - 예약 리마인더 (중간)
  - 시스템 공지 (낮음)
- 알림 설정 화면:
  - 카테고리별 On/Off
  - 방해금지 시간 설정
  - 이메일 알림 동시 발송 옵션
- 스케줄 알림:
  - 치료 1일 전 리마인더
  - 치료 3일 전 리마인더
  - 리뷰 작성 요청 (치료 완료 후 3일)
  - 미결제 리마인더 (결제 대기 24시간 후)
```

### 4.4 실시간 채팅 개선

**현재 문제:**
- 2초 `setInterval` 폴링 (비효율적, 배터리 소모)
- Mock 번역 함수
- 이미지/파일 전송 불가

**개선 항목:**

#### 4.4.1 WebSocket 실시간 통신
```
대상 파일:
- app/patient/chat.tsx
- app/doctor/chat.tsx
- [신규] lib/websocket.ts

구현 내용:
- Socket.IO 또는 Firebase Realtime Database 연동
- 실시간 메시지 수신 (폴링 제거)
- 타이핑 표시기 ("Dr. Kim is typing...")
- 메시지 읽음 표시 (파란 체크마크)
- 연결 상태 표시 (온라인/오프라인)
- 재연결 자동 처리 (네트워크 복구 시)
```

#### 4.4.2 번역 API 연동
```
대상 파일:
- lib/store.ts (translateMessages 함수)
- [신규] lib/translation.ts

구현 내용:
- DeepL API 또는 Google Cloud Translation API 연동
- 지원 언어: 영어 ↔ 한국어 (초기)
- 자동 번역 On/Off 토글
- 번역 캐싱 (동일 메시지 재번역 방지)
- 원문 보기/번역 보기 전환
```

#### 4.4.3 미디어 메시지
```
구현 내용:
- 이미지 전송 (카메라/갤러리)
- 파일 전송 (X-ray, 치료계획 PDF)
- 이미지 미리보기 + 풀스크린 뷰어
- 파일 다운로드
- 이미지 압축 (전송 전 리사이징)
```

### 4.5 오프라인 지원

**현재 문제:**
- 네트워크 상태 감지 없음
- 오프라인 시 앱 사용 불가 (백엔드 연동 후)

**개선 항목:**

#### 4.5.1 네트워크 상태 관리
```
대상 파일:
- [신규] lib/network.ts
- [신규] hooks/use-network-status.ts
- [신규] components/OfflineBanner.tsx

의존성 추가:
- @react-native-community/netinfo

구현 내용:
- 실시간 네트워크 상태 감지
- 오프라인 배너 표시 ("인터넷 연결 없음")
- 오프라인 시 읽기 전용 모드:
  - 캐시된 케이스/견적/예약 조회 가능
  - 새 데이터 생성은 큐에 저장
- 재연결 시 자동 동기화:
  - 큐에 쌓인 작업 순차 실행
  - 충돌 감지 및 해결 (서버 우선)
```

#### 4.5.2 폼 자동저장
```
대상 파일:
- app/patient/basic-info.tsx
- app/patient/medical-history.tsx
- app/patient/dental-history.tsx
- 기타 긴 폼 화면

구현 내용:
- 입력 중 5초마다 AsyncStorage에 자동저장
- 앱 재실행 시 "이전 입력을 복구하시겠습니까?" 확인
- 제출 완료 시 자동저장 데이터 삭제
```

---

## 5. Phase 4: UX & 접근성 개선

> **우선순위**: 중 | **예상 기간**: 2-3주

### 5.1 다크 모드

**현재 문제:**
- `useColorScheme` 훅 존재하지만 화면에서 미사용
- 모든 화면이 라이트 모드 고정

**개선 항목:**

#### 5.1.1 테마 시스템 확장
```
대상 파일:
- constants/theme.ts (확장)
- constants/colors.ts (다크 모드 팔레트 추가)
- [신규] hooks/use-app-theme.ts
- 51개 화면 파일 (스타일 교체)

구현 내용:
- 라이트/다크 모드 컬러 팔레트 정의:
  다크 모드:
    bg: "#0f172a"
    card: "#1e293b"
    text: "#f8fafc"
    border: "#334155"
    purple: "#7c3aed" (밝게 조정)

- useAppTheme 훅:
  - 시스템 설정 자동 감지
  - 수동 전환 옵션 (Light / Dark / System)
  - 설정 AsyncStorage에 저장

- 점진적 적용:
  1단계: 대시보드, 채팅 (가장 많이 사용)
  2단계: 인증 화면
  3단계: 예약/결제 화면
  4단계: 설정/프로필 화면
```

### 5.2 접근성 (Accessibility)

**현재 문제:**
- accessibilityLabel 0개
- 색상만으로 상태 구분
- 스크린 리더 미지원

**개선 항목:**

#### 5.2.1 스크린 리더 지원
```
적용 범위: 모든 화면

구현 내용:
- 모든 TouchableOpacity/Pressable에 accessibilityLabel 추가
  예시:
  <TouchableOpacity
    accessibilityLabel="Accept quote from Dr. Kim, $4,150"
    accessibilityRole="button"
    accessibilityHint="Double tap to accept this quote"
  >

- 이미지에 accessibilityLabel 추가
  예시:
  <Image
    accessibilityLabel="Clinic photo of Seoul Bright Dental"
    accessibilityRole="image"
  />

- 상태 변경 시 accessibilityLiveRegion 사용
  예시:
  <Text accessibilityLiveRegion="polite">
    {`Booking status: ${status}`}
  </Text>
```

#### 5.2.2 시각적 접근성
```
구현 내용:
- 색상 외 보조 지표 추가:
  - 상태 뱃지에 아이콘 + 텍스트 병행 (색각 이상 대응)
  - 필수 필드에 * 마크 + "Required" 텍스트
  - 에러 필드에 빨간 테두리 + 에러 아이콘 + 텍스트

- 터치 영역 최소 44x44pt 보장:
  - 현재 일부 버튼이 36px → 44px로 확대
  - 체크박스, 라디오 버튼 터치 영역 확대

- 텍스트 크기 조절:
  - 시스템 폰트 크기 설정 존중
  - maxFontSizeMultiplier 설정으로 레이아웃 깨짐 방지
```

### 5.3 다국어 지원 (i18n)

**현재 문제:**
- 모든 문자열 하드코딩 (영어)
- 195개국 지원인데 영어만 사용

**개선 항목:**

#### 5.3.1 i18n 프레임워크 도입
```
대상 파일:
- [신규] lib/i18n.ts (초기화)
- [신규] locales/en.json
- [신규] locales/ko.json
- [신규] locales/zh.json
- [신규] locales/ja.json

의존성 추가:
- i18next
- react-i18next
- expo-localization

구현 내용:
- 번역 키 체계:
  common: { save, cancel, next, back, loading, error, success }
  auth: { login, signup, email, password, ... }
  patient: { dashboard, cases, quotes, booking, ... }
  doctor: { dashboard, cases, invoice, earnings, ... }
  treatment: { implant, crown, veneer, ... }

- 초기 지원 언어: 영어, 한국어
- 2차 지원 언어: 중국어(간체), 일본어
- 언어 자동 감지 (기기 설정 기반)
- 앱 내 수동 언어 변경

- 적용 우선순위:
  1단계: 공통 UI (버튼, 네비게이션, 에러 메시지)
  2단계: 환자 화면
  3단계: 의사 화면
  4단계: 인증/온보딩 화면
```

### 5.4 UX 기능 추가

#### 5.4.1 견적 비교 화면
```
대상 파일:
- [신규] app/patient/quote-compare.tsx

구현 내용:
- 2-3개 견적 나란히 비교
- 비교 항목: 가격, 방문 횟수, 기간, 평점, 경력
- 항목별 최저가/최고가 하이라이트
- "Best Value" / "Highest Rated" 자동 태그
```

#### 5.4.2 예약 캘린더 뷰
```
대상 파일:
- [신규] app/patient/calendar.tsx

의존성 추가:
- react-native-calendars

구현 내용:
- 월간 캘린더 뷰로 방문 일정 시각화
- 방문일 마커 + 기간 범위 표시
- 탭하면 해당 방문 상세 정보
- 다회 방문 간 간격 시각적 표시
```

#### 5.4.3 치과의사 즐겨찾기
```
대상 파일:
- [신규] app/patient/favorites.tsx
- app/patient/dentist-profile.tsx (즐겨찾기 버튼 추가)
- lib/store.ts (즐겨찾기 CRUD 추가)

구현 내용:
- 하트 아이콘으로 즐겨찾기 토글
- 즐겨찾기 목록 화면
- 즐겨찾기한 의사의 새 프로모션/업데이트 알림
```

#### 5.4.4 검색 기능 강화
```
대상 파일:
- [신규] app/patient/search.tsx
- app/patient/dashboard.tsx (검색 바 추가)

구현 내용:
- 케이스 검색 (치료명, 날짜, 상태)
- 치과의사 검색 (이름, 클리닉명, 전문분야, 위치)
- 최근 검색어 저장
- 자동완성 추천
```

#### 5.4.5 문서 내보내기
```
대상 파일:
- [신규] lib/export.ts
- app/patient/final-payment.tsx (영수증 다운로드)
- app/doctor/final-invoice.tsx (인보이스 다운로드)

의존성 추가:
- expo-print
- expo-sharing

구현 내용:
- 인보이스/영수증 PDF 생성
- 치료 기록 요약 PDF
- 공유 기능 (이메일, 메시지, 파일 앱)
```

---

## 6. Phase 5: 운영 인프라

> **우선순위**: 중-하 | **예상 기간**: 1-2주

### 6.1 에러 모니터링

```
대상 파일:
- [신규] lib/error-tracking.ts
- app/_layout.tsx (초기화)

의존성 추가:
- @sentry/react-native

구현 내용:
- Sentry 연동
- 자동 크래시 리포트
- 사용자 컨텍스트 (역할, 화면, 액션)
- 성능 트레이싱 (화면 로드 시간)
- 소스맵 업로드 (EAS Build 연동)
```

### 6.2 앱 Analytics

```
대상 파일:
- [신규] lib/analytics.ts
- 주요 화면 (이벤트 트래킹 추가)

구현 내용:
- Firebase Analytics 또는 Amplitude 연동
- 추적 이벤트:
  - 화면 조회 (모든 화면)
  - 케이스 생성/완료
  - 견적 수락/거절
  - 결제 완료/실패
  - 채팅 시작/메시지 수
  - 검색 쿼리
  - 에러 발생
- 퍼널 분석:
  - 회원가입 → 케이스 제출 전환율
  - 견적 수신 → 예약 전환율
  - 결제 시작 → 완료 전환율
- 일일/주간/월간 리포트 대시보드
```

### 6.3 앱 업데이트 관리

```
구현 내용:
- expo-updates OTA 업데이트 설정
- 강제 업데이트 (보안 패치)
- 선택적 업데이트 (기능 추가)
- 업데이트 가능 시 모달 표시
```

### 6.4 개인정보 보호 / GDPR

```
대상 파일:
- [신규] app/patient/privacy-settings.tsx
- [신규] app/doctor/privacy-settings.tsx

구현 내용:
- 개인정보 처리방침 표시 (인앱)
- 데이터 수집 동의 관리
- 계정 삭제 기능:
  - "계정 삭제" 버튼
  - 삭제 전 확인 (비밀번호 재입력)
  - 30일 유예 기간 후 완전 삭제
  - 삭제 철회 가능
- 데이터 다운로드 요청 (내 정보 내려받기)
- 마케팅 동의 On/Off
```

---

## 7. 구현 일정 로드맵

```
Phase 1: 보안 강화                    [Week 1-3]
├── 1.1 JWT 인증                     [Week 1]
├── 1.2 데이터 암호화                  [Week 1]
├── 1.3 입력 검증 (Zod)               [Week 2]
├── 1.4 환경변수 / API 보안            [Week 2]
└── 1.5 세션 관리 / 생체인증            [Week 3]

Phase 2: 코드 품질 & 테스트            [Week 3-5]
├── 2.1 코드 중복 제거                 [Week 3]
├── 2.2 any 타입 제거                  [Week 3-4]
├── 2.3 에러 처리 체계화                [Week 4]
└── 2.4 테스트 (Unit + CI/CD)          [Week 4-5]

Phase 3: 핵심 기능 구현                [Week 5-8]
├── 3.1 백엔드 API 연동                [Week 5-6]
├── 3.2 Stripe 결제 연동               [Week 6-7]
├── 3.3 푸시 알림                      [Week 7]
├── 3.4 실시간 채팅 (WebSocket)         [Week 7-8]
└── 3.5 오프라인 지원                   [Week 8]

Phase 4: UX & 접근성                  [Week 8-10]
├── 4.1 다크 모드                      [Week 8-9]
├── 4.2 접근성 (A11y)                  [Week 9]
├── 4.3 다국어 (i18n)                  [Week 9-10]
└── 4.4 UX 기능 (비교, 캘린더, 검색 등)  [Week 10]

Phase 5: 운영 인프라                   [Week 10-11]
├── 5.1 Sentry 에러 모니터링            [Week 10]
├── 5.2 Analytics                     [Week 10]
├── 5.3 OTA 업데이트                   [Week 11]
└── 5.4 GDPR / 개인정보                [Week 11]

총 예상 기간: 약 11주 (2.5개월)
```

---

## 8. 기술 의사결정 사항

아래 항목은 구현 전 확정이 필요합니다:

### 8.1 백엔드 기술 선택
| 옵션 | 장점 | 단점 |
|------|------|------|
| **Node.js + Express** | Expo와 동일 언어, 빠른 개발 | 타입 안전성 약함 |
| **NestJS** | TypeScript 네이티브, 구조화된 아키텍처 | 학습 곡선 |
| **Firebase (BaaS)** | 실시간 DB + Auth + Push 올인원 | 벤더 종속, 비용 스케일 |
| **Supabase** | PostgreSQL, 오픈소스, Auth 내장 | 상대적으로 새로운 플랫폼 |

### 8.2 실시간 통신
| 옵션 | 장점 | 단점 |
|------|------|------|
| **Socket.IO** | 성숙한 라이브러리, 자동 재연결 | 서버 직접 관리 필요 |
| **Firebase Realtime DB** | 관리 불필요, 오프라인 동기화 | 복잡한 쿼리 제한 |
| **Supabase Realtime** | PostgreSQL 기반, RLS 보안 | 아직 성숙도 낮음 |

### 8.3 번역 API
| 옵션 | 장점 | 단점 |
|------|------|------|
| **DeepL API** | 번역 품질 최상 (특히 한↔영) | 무료 티어 제한적 |
| **Google Cloud Translation** | 100+ 언어, 안정적 | 의료 용어 정확도 중간 |
| **Papago (Naver)** | 한↔영 특화, 무료 | 기타 언어 지원 제한 |

### 8.4 결제 게이트웨이
| 옵션 | 장점 | 단점 |
|------|------|------|
| **Stripe** | 글로벌 지원, 우수한 SDK | 한국 원화 정산 수수료 |
| **Toss Payments** | 한국 특화, 낮은 수수료 | 글로벌 카드 지원 제한 |
| **Stripe + Toss 병행** | 환자(Stripe) + 의사정산(Toss) | 구현 복잡도 증가 |

---

## 부록: 신규 파일 목록 (예상)

```
[신규 파일 - 약 25개]
lib/
├── auth.ts                    # JWT 인증 관리
├── secure-storage.ts          # 민감 데이터 암호화 저장
├── validation.ts              # Zod 검증 스키마
├── config.ts                  # 환경변수 관리
├── api-client.ts              # API 요청 래퍼
├── biometric.ts               # 생체인증
├── error-handler.ts           # 에러 처리 표준화
├── push-notification.ts       # 푸시 알림
├── websocket.ts               # WebSocket 클라이언트
├── translation.ts             # 번역 API
├── network.ts                 # 네트워크 상태 관리
├── export.ts                  # PDF 내보내기
├── error-tracking.ts          # Sentry 연동
├── analytics.ts               # 이벤트 추적
└── i18n.ts                    # 국제화 초기화

hooks/
├── use-async.ts               # 비동기 상태 관리
├── use-form-validation.ts     # 폼 검증
├── use-booking-status.ts      # 예약 상태 관리
├── use-network-status.ts      # 네트워크 상태
└── use-app-theme.ts           # 테마 관리

components/
├── ErrorBoundary.tsx          # 에러 바운더리
└── OfflineBanner.tsx          # 오프라인 배너

constants/
├── treatments.ts              # 치료 목록 통합
└── countries.ts               # 국가 코드 통합

locales/
├── en.json                    # 영어
├── ko.json                    # 한국어
├── zh.json                    # 중국어
└── ja.json                    # 일본어

app/patient/
├── quote-compare.tsx          # 견적 비교
├── calendar.tsx               # 예약 캘린더
├── favorites.tsx              # 즐겨찾기
├── search.tsx                 # 검색
├── notification-settings.tsx  # 알림 설정
└── privacy-settings.tsx       # 개인정보 설정

app/doctor/
├── notification-settings.tsx  # 알림 설정
└── privacy-settings.tsx       # 개인정보 설정

[설정/인프라 파일]
.env.example
.github/workflows/ci.yml
jest.config.ts
jest.setup.ts
__mocks__/async-storage.ts
__tests__/store.test.ts
__tests__/validation.test.ts
__tests__/screens/... (주요 화면별)
```

---

**이 기획서에 대한 피드백이나 수정 사항이 있으면 말씀해주세요.**
