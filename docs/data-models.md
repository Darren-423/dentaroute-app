# Data Models — TypeScript Interfaces

> `lib/store.ts`에 정의된 핵심 데이터 모델

---

## PatientCase (환자 케이스)
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

## DentistQuote (의사 견적)
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
    gapMonths?, gapDays?: number;
    paymentAmount?, paymentPercent?: number;
  }];
  message: string;               // 의사 메시지
  createdAt: string;
  clinicPhotos?: string[];
  yearsExperience?: number;
  specialties?: string[];
}
```

## Booking (예약) — 10단계 상태 머신
```typescript
{
  id: string;                    // "bk_" + 타임스탬프
  caseId, quoteId: string;
  dentistName, clinicName: string;
  depositPaid, totalPrice: number;
  treatments?: { name, qty, price }[];
  visitDates: VisitDate[];
  arrivalInfo?: ArrivalInfo;
  finalInvoice?: FinalInvoice;
  departurePickup?: DeparturePickup;
  currentVisit?: number;         // 1-based
  status: BookingStatus;
  cancelledAt?: string;
  cancelledBy?: "patient" | "doctor";
  cancelReason?: string;
  refundAmount?: number;
  platformFeeRate?: number;      // 0.15 (Gold) | 0.18 (Silver) | 0.20 (Standard)
  savedCard?: { last4: string; brand: string; name: string; expiry: string };
  createdAt: string;
}
```

**상태 흐름:**
```
confirmed → flight_submitted → arrived_korea → checked_in_clinic
→ treatment_done → between_visits → returning_home
→ payment_complete → departure_set
                                    ↕
                              cancelled (어느 단계에서든)
```

## VisitDate (방문 일정)
```typescript
{
  visit: number;
  description: string;
  date: string;
  confirmedTime?: string;
  gapMonths?, gapDays?: number;
  paymentAmount?, paymentPercent?: number;
  paid?: boolean;
}
```

## VisitInvoice (방문별 인보이스)
```typescript
{
  visit: number;
  description: string;
  items: { treatment, qty, price }[];
  visitTotal: number;
  prevCarryForward: number;      // 이전 방문 이월금
  billingPercent: number;
  billedAmount: number;
  deferredAmount: number;
  carryForward: number;          // 다음 방문으로 이월
  preDiscountPayment: number;    // 할인 전 (의사에게 보이는 금액)
  appDiscount: number;           // 5% 앱 할인 (의사에게 숨김)
  afterDiscount: number;
  paymentPercent: number;
  paymentAmount: number;         // 환자 실제 결제액
  depositDeducted?: number;      // Visit 1만
  paid: boolean;
  paidAt?: string;
}
```

## ChatRoom + ChatMessage
```typescript
// ChatRoom
{ id, caseId, patientName, dentistName, clinicName,
  lastMessage, lastMessageAt,
  unreadPatient: number, unreadDoctor: number }

// ChatMessage
{ id, chatRoomId, sender: "patient"|"doctor", text,
  translatedText?: string | null,
  originalLang?: "en" | "ko",
  timestamp }
```

## Review
```typescript
{ id, caseId, bookingId, dentistName, clinicName, patientName,
  rating, treatmentRating, clinicRating, communicationRating,
  title, comment, treatments: string[], createdAt }
```

## AppNotification
```typescript
{ id, role: "patient"|"doctor",
  type: "new_quote"|"quote_accepted"|"new_message"|"new_case"|
        "new_review"|"payment_received"|"reminder"|
        "system"|"booking_cancelled"|"case_updated",
  title, body, icon, read: boolean, route?: string, createdAt }
```

## FinalInvoice
```typescript
{ items: {treatment, qty, price}[], totalAmount, appDiscount (5%),
  discountedTotal, depositPaid, balanceDue, notes?, createdAt,
  visitInvoices?: VisitInvoice[] }
```

## SupportInquiry
```typescript
{ id, category: "booking"|"payment"|"treatment"|"travel"|"technical"|"other",
  subject, message, email,
  status: "submitted"|"in_review"|"resolved",
  createdAt, response?, respondedAt? }
```

## 상수 & 유틸
- `TIER_CONFIG` — Gold 15%, Silver 18%, Standard 20%
- `DoctorTier` — `"gold" | "silver" | "standard"`
- `getRefundInfo(booking)` — 환불 계산 (7일+ 전액, 3-6일 50%, 3일미만 불가)
