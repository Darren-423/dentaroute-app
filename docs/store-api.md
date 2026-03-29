# Store API — lib/store.ts

> 전체 데이터 관리 레이어 (~1,100줄). AsyncStorage 기반.

---

## 스토리지 키 (16개)

| 키 | 내용 |
|----|------|
| PATIENT_PROFILE | 환자 개인정보 |
| PATIENT_MEDICAL | 의료 이력 (건강 상태, 약물, 알레르기) |
| PATIENT_DENTAL | 치과 이력 (문제점, 이전 치료) |
| PATIENT_FILES | 파일 (X-ray, 치료계획, 사진 URI) |
| PATIENT_TREATMENTS | 선택된 치료 항목 |
| PATIENT_TRAVEL | 여행 날짜 및 일정 |
| DOCTOR_PROFILE | 의사/클리닉 정보 |
| CASES | 환자 케이스 목록 |
| QUOTES | 의사 견적 목록 |
| CURRENT_USER | 현재 활성 사용자 (역할 + 이름) |
| CHATS | 채팅방 목록 |
| MESSAGES | 채팅 메시지 (방별 저장) |
| BOOKINGS | 확정된 예약 목록 |
| REVIEWS | 리뷰 목록 |
| NOTIFICATIONS | 알림 목록 |
| INQUIRIES | 고객 지원 문의 목록 |

---

## API 메서드

### 사용자 관리
- `setCurrentUser(role, name)` / `getCurrentUser()` / `clearCurrentUser()`

### 환자 프로필
- `savePatientProfile()` / `getPatientProfile()`
- `savePatientMedical()` / `getPatientMedical()`
- `savePatientDental()` / `getPatientDental()`
- `savePatientFiles()` / `getPatientFiles()`
- `savePatientTreatments()` / `getPatientTreatments()`
- `savePatientTravel()` / `getPatientTravel()`

### 의사 프로필
- `saveDoctorProfile()` / `getDoctorProfile()`

### 케이스 관리
- `createCase(data)` — 자동 ID, 의사에게 `new_case` 알림
- `getCases()` / `getCase(id)` / `updateCaseStatus(id, status)`
- `updateCase(id, updates)` — 부분 업데이트
- `updateCasesForProfile()` — 프로필 변경 시 일괄 업데이트 + 의사 알림

### 견적 관리
- `createQuote(data)` — 케이스 → `quotes_received`, 환자에게 `new_quote` 알림
- `getQuotesForCase(caseId)` / `getQuotes()`

### 채팅
- `getOrCreateChatRoom(caseId, patient, dentist, clinic)` — 중복 방지
- `getChatRooms()` / `getChatRoomsForUser(role, name)`
- `sendMessage(roomId, sender, text)` — 읽지 않음 카운터 자동 증가
- `getMessages(roomId)` / `markAsRead(roomId, role)`
- `translateMessages(chatRoomId, messageIds)` — 일괄 번역

### 예약
- `createBooking(data)` / `getBookings()` / `getBooking(id)`
- `getBookingForCase(caseId)` — 취소되지 않은 예약 우선 반환
- `updateBooking(id, updates)` — 부분 업데이트
- `cancelBooking(bookingId, reason?)` — 환불 계산 + 양방향 알림

### 리뷰
- `createReview(data)` / `getReviews()` / `getReviewsForDentist(name)` / `getReviewForBooking(id)`

### 알림
- `addNotification(data)` — 최신순 prepend
- `getNotifications(role?)` / `getUnreadCount(role)`
- `markNotificationRead(id)` / `markAllNotificationsRead(role)`

### 고객 지원
- `submitInquiry(data)` — 문의 + 시스템 알림 자동 생성
- `getInquiries()`

### 유틸리티
- `resetAll()` / `debugAll()` / `seedDemoData()`

---

## 데이터 패턴

- **ID 생성**: 케이스 = 순차(1001+), 나머지 = 타임스탬프
- **저장 방식**: JSON 배열 → 단일 키 → 전체 fetch → 수정 → 저장
- **양방향 업데이트**: 견적 생성 시 케이스 상태 자동 변경
- **알림 자동 트리거**: 엔티티 생성 시 알림 자동 생성 (딥링크 포함)

---

## 시드 데모 데이터 (`seedDemoData()`)

| 항목 | 내용 |
|------|------|
| 환자 | Sarah Johnson, 미국, 1990-05-15 |
| 의사 | Dr. Kim Minjun, Seoul Bright Dental, 강남 |
| 케이스 | #1 Implant+Crown+Veneers (booked), #2 Veneers (pending) |
| 견적 3개 | Dr. Kim $4,150 / Dr. Park $4,500 / Dr. Lee $3,600 |
| 예약 | confirmed, 4회 방문, $4,450, 보증금 $445 |
| 기타 | 채팅 1방(5 msgs), 리뷰 3개, 알림 8개, Trip 2건 |
