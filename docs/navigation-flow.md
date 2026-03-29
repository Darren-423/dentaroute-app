# Navigation Flow — 전체 라우팅 구조

---

## 라우트 트리

```
/ (index.tsx — 온보딩)
│
├── /auth/role-select
│   │
│   ├── 환자 플로우 ──────────────────────
│   │   ├── /auth/patient-login
│   │   │   └── /auth/patient-create-account
│   │   │
│   │   └── (로그인 후) /patient/basic-info
│   │       → medical-history → dental-history
│   │       → travel-dates → treatment-select
│   │       → upload → review (케이스 생성)
│   │       → dashboard
│   │           │
│   │           ├── 케이스 → quotes?caseId=X
│   │           │   ├── quote-detail?quoteId=Q
│   │           │   │   └── dentist-profile → dentist-reviews
│   │           │   └── visit-schedule?quoteId=Q
│   │           │
│   │           ├── 예약 진행 →
│   │           │   arrival-info → hotel-arrived
│   │           │   → clinic-checkin → clinic-map
│   │           │   → final-payment → treatment-complete
│   │           │   → stay-or-return (다회 방문)
│   │           │   → departure-pickup → write-review
│   │           │
│   │           ├── 예약 관리 →
│   │           │   cancel-booking?bookingId=B
│   │           │   help-center
│   │           │
│   │           ├── 채팅 → chat-list → chat?chatRoomId=C
│   │           └── 프로필 → profile
│   │
│   └── 의사 플로우 ──────────────────────
│       ├── /auth/doctor-login
│       │   └── /auth/doctor-create-account
│       │
│       └── (로그인 후) /doctor/profile-setup
│           → dashboard
│               ├── case-detail?caseId=X → patient-info
│               ├── final-invoice?bookingId=B
│               ├── earnings
│               ├── chat-list → chat
│               └── profile
│
├── /notifications (공통 알림)
└── /dev-menu (개발자 메뉴)
```

---

## 환자 여정 (Patient Journey)

```
1. 온보딩 (가격 비교)
2. 역할 선택 → 환자
3. 로그인 / 회원가입 (이메일+전화 OTP)
4. 프로필 수집 (기본정보 → 의료 → 치과 → 여행 → 치료 → 업로드 → 검토)
5. 케이스 제출 → 의사들에게 알림
6. 견적 수신 → 비교
7. 견적 수락 → 예약 (보증금 결제)
8. 방문 시간 확정
9. 항공편 정보 제출
10. 한국 도착 → 호텔 체크인
11. 클리닉 체크인 → 지도
12. 치료 → 완료
13. (다회 방문) 체류 vs 귀국
14. 최종 결제 (총액 - 5%할인 - 보증금)
15. 출발 픽업
16. 리뷰 작성
```

## 의사 여정 (Doctor Journey)

```
1. 역할 선택 → 의사
2. 로그인 / 회원가입 (면허 업로드)
3. 프로필 설정 (클리닉, 전문분야, 경력)
4. 대시보드 → 새 케이스 알림
5. 케이스 상세 확인
6. 견적 작성
7. 채팅 상담 (번역 지원)
8. 인보이스 발행
9. 결제 확인 + 수익 대시보드
```

## 루트 레이아웃 (`app/_layout.tsx`)
- SafeAreaProvider + StatusBar
- Stack 네비게이터, 헤더 없음, 슬라이드-라이트 애니메이션
