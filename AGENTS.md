# DentaRoute - Codex Agent Instructions

## YOUR ROLE
You are building the **backend server** for DentaRoute, a dental tourism platform connecting international patients with Korean dentists. The frontend (Expo/React Native) already exists and is fully functional with local storage. Your job is to create a production-ready backend that the frontend can connect to.

**IMPORTANT**: Claude Code manages the frontend (`app/`, `lib/`, `components/`, `constants/`). You work exclusively in `server/`. Never modify frontend files.

---

## PROJECT CONTEXT

### What DentaRoute Does
- Patients submit dental cases (treatments needed, medical history, X-rays)
- Multiple Korean dentists send price quotes
- Patient picks a dentist, books, pays deposit
- Patient travels to Korea, gets treatment
- Platform handles: chat, payments, reviews, aftercare

### Current State (Frontend-Only Prototype)
- **Framework**: Expo SDK 54 + React Native 0.81 + TypeScript
- **Data**: All stored in AsyncStorage (local JSON) via `lib/store.ts`
- **Auth**: Mock (no real validation)
- **Payments**: UI only (no real processing)
- **Chat**: Local messages (no real-time)
- **Translation**: Mock function (TODO: DeepL/Google API)

### What Needs Backend
1. Real authentication (JWT)
2. PostgreSQL database
3. REST API endpoints
4. Real-time chat (WebSocket)
5. Payment processing (Stripe)
6. Push notifications
7. Image/file upload (S3)
8. Chat translation API (DeepL)

---

## DATA MODELS (from lib/store.ts)

These are the exact TypeScript interfaces the frontend uses. Your database schema MUST match these structures so the frontend migration is seamless.

### PatientCase
```typescript
{
  id: string;                    // Sequential: "1001", "1002", ...
  patientName: string;
  country: string;
  date: string;                  // ISO date
  treatments: { name: string; qty: number }[];
  medicalNotes: string;
  dentalIssues: string[];
  filesCount: { xrays: number; treatmentPlans: number; photos: number };
  status: "pending" | "quotes_received" | "booked";
  visitDate?: string;
  birthDate?: string;
}
```

### DentistQuote
```typescript
{
  id: string;                    // "q" + timestamp
  caseId: string;
  dentistName: string;
  clinicName: string;
  location: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating: number;
  reviewCount: number;
  totalPrice: number;            // USD
  treatments: { name: string; qty: number; price: number }[];
  treatmentDetails: string;
  duration: string;
  visits?: {
    visit: number;
    description: string;
    gapMonths?: number;
    gapDays?: number;
    paymentAmount?: number;
    paymentPercent?: number;
  }[];
  message: string;
  createdAt: string;
  clinicPhotos?: string[];
  yearsExperience?: number;
  specialties?: string[];
  licenseVerified?: boolean;
  certifications?: string[];
}
```

### Booking (10-stage state machine)
```typescript
{
  id: string;                    // "bk_" + timestamp
  caseId: string;
  quoteId: string;
  dentistName: string;
  clinicName: string;
  depositPaid: number;
  totalPrice: number;
  treatments?: { name: string; qty: number; price: number }[];
  visitDates: {
    visit: number;
    description: string;
    date: string;
    confirmedTime?: string;
    gapMonths?: number;
    gapDays?: number;
    paymentAmount?: number;
    paymentPercent?: number;
    paid?: boolean;
  }[];
  arrivalInfo?: {
    flightNumber: string;
    arrivalTime: string;
    arrivalDate: string;
    pickupRequested: boolean;
    hotelName?: string;
    hotelAddress?: string;
  };
  finalInvoice?: {
    items: { treatment: string; qty: number; price: number }[];
    totalAmount: number;
    appDiscount: number;         // 5% (hidden from doctor)
    discountedTotal: number;
    depositPaid: number;
    balanceDue: number;
    notes?: string;
    createdAt: string;
    visitInvoices?: VisitInvoice[];
  };
  departurePickup?: {
    date: string;
    time: string;
    location: string;
    flightNumber?: string;
  };
  currentVisit?: number;
  status: BookingStatus;
  cancelledAt?: string;
  cancelledBy?: "patient" | "doctor";
  cancelReason?: string;
  refundAmount?: number;
  platformFeeRate?: number;      // 0.15 | 0.18 | 0.20
  savedCard?: { last4: string; brand: string; name: string; expiry: string };
  createdAt: string;
}

type BookingStatus =
  | "confirmed"
  | "flight_submitted"
  | "arrived_korea"
  | "checked_in_clinic"
  | "treatment_done"
  | "between_visits"
  | "returning_home"
  | "payment_complete"
  | "departure_set"
  | "cancelled";
```

### VisitInvoice (multi-visit billing)
```typescript
{
  visit: number;
  description: string;
  items: { treatment: string; qty: number; price: number }[];
  visitTotal: number;
  prevCarryForward: number;
  billingPercent: number;
  billedAmount: number;
  deferredAmount: number;
  carryForward: number;
  preDiscountPayment: number;    // Doctor sees this (no discount visible)
  appDiscount: number;           // 5% absorbed by platform
  afterDiscount: number;
  paymentPercent: number;
  paymentAmount: number;         // Patient actually pays this
  depositDeducted?: number;      // Visit 1 only
  paid: boolean;
  paidAt?: string;
}
```

### Review (with verified patient system)
```typescript
{
  id: string;
  caseId: string;
  bookingId: string;
  dentistName: string;
  clinicName: string;
  patientName: string;
  rating: number;                // 1-5
  treatmentRating: number;
  clinicRating: number;
  communicationRating: number;
  title: string;
  comment: string;
  treatments: string[];
  verified: boolean;             // true = completed treatment through DentaRoute
  verifiedTreatments?: string[]; // actual treatments from booking (tamper-proof)
  createdAt: string;
}
```

### ChatRoom + ChatMessage
```typescript
// ChatRoom
{
  id: string;
  caseId: string;
  patientName: string;
  dentistName: string;
  clinicName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadPatient: number;
  unreadDoctor: number;
}

// ChatMessage
{
  id: string;
  chatRoomId: string;
  sender: "patient" | "doctor";
  text: string;
  translatedText?: string | null;
  originalLang?: "en" | "ko";
  timestamp: string;
  messageType?: "text" | "image";
  imageUri?: string;
  delivered?: boolean;
  readAt?: string;
}
```

### User / Auth
```typescript
// Patient Profile
{
  fullName: string;
  email: string;
  phone: string;
  country: string;
  birthDate: string;
  language: string;
  profileImage?: string;
}

// Doctor Profile
{
  fullName: string;
  name: string;
  clinicName: string;
  clinic: string;
  location: string;
  address: string;
  specialty: string;
  experience: number;
  bio: string;
  email: string;
  phone: string;
  website: string;
  license: string;
  rating: number;
  reviewCount: number;
  latitude: number;
  longitude: number;
  tier: "gold" | "silver" | "standard";
  platformFeeRate: number;
  tierUpdatedAt: string;
  licenseVerified: boolean;
  certifications: string[];
  beforeAfterPhotos: { before: string; after: string; treatment: string }[];
}
```

### AppNotification
```typescript
{
  id: string;
  role: "patient" | "doctor";
  type: "new_quote" | "quote_accepted" | "new_message" | "new_case" |
        "new_review" | "payment_received" | "reminder" |
        "system" | "booking_cancelled" | "case_updated";
  title: string;
  body: string;
  icon: string;
  read: boolean;
  route?: string;               // Deep link path
  createdAt: string;
}
```

---

## STORE API METHODS (what the frontend calls)

The frontend's `lib/store.ts` exports a `store` object with these methods. Your REST API must provide equivalent endpoints:

### Auth
| Frontend Method | Backend Endpoint |
|---|---|
| `setCurrentUser(role, name)` | `POST /api/auth/login` |
| `getCurrentUser()` | `GET /api/auth/me` |
| `clearCurrentUser()` | `POST /api/auth/logout` |

### Patient Profile
| Frontend Method | Backend Endpoint |
|---|---|
| `savePatientProfile(data)` | `PUT /api/patient/profile` |
| `getPatientProfile()` | `GET /api/patient/profile` |
| `savePatientMedical(data)` | `PUT /api/patient/medical` |
| `getPatientMedical()` | `GET /api/patient/medical` |
| `savePatientDental(data)` | `PUT /api/patient/dental` |
| `getPatientDental()` | `GET /api/patient/dental` |
| `savePatientFiles(data)` | `PUT /api/patient/files` |
| `getPatientFiles()` | `GET /api/patient/files` |
| `savePatientTreatments(data)` | `PUT /api/patient/treatments` |
| `getPatientTreatments()` | `GET /api/patient/treatments` |
| `savePatientTravel(data)` | `PUT /api/patient/travel` |
| `getPatientTravel()` | `GET /api/patient/travel` |

### Doctor Profile
| Frontend Method | Backend Endpoint |
|---|---|
| `saveDoctorProfile(data)` | `PUT /api/doctor/profile` |
| `getDoctorProfile()` | `GET /api/doctor/profile` |

### Cases
| Frontend Method | Backend Endpoint |
|---|---|
| `createCase(data)` | `POST /api/cases` |
| `getCases()` | `GET /api/cases` |
| `getCase(id)` | `GET /api/cases/:id` |
| `updateCaseStatus(id, status)` | `PATCH /api/cases/:id/status` |
| `updateCase(id, updates)` | `PATCH /api/cases/:id` |

### Quotes
| Frontend Method | Backend Endpoint |
|---|---|
| `createQuote(data)` | `POST /api/quotes` |
| `getQuotesForCase(caseId)` | `GET /api/cases/:caseId/quotes` |
| `getQuotes()` | `GET /api/quotes` |

### Bookings
| Frontend Method | Backend Endpoint |
|---|---|
| `createBooking(data)` | `POST /api/bookings` |
| `getBookings()` | `GET /api/bookings` |
| `getBooking(id)` | `GET /api/bookings/:id` |
| `getBookingForCase(caseId)` | `GET /api/cases/:caseId/booking` |
| `updateBooking(id, updates)` | `PATCH /api/bookings/:id` |
| `cancelBooking(id, reason?)` | `POST /api/bookings/:id/cancel` |

### Chat
| Frontend Method | Backend Endpoint |
|---|---|
| `getOrCreateChatRoom(...)` | `POST /api/chat/rooms` |
| `getChatRoomsForUser(role, name)` | `GET /api/chat/rooms` |
| `sendMessage(roomId, sender, text)` | `POST /api/chat/rooms/:id/messages` |
| `getMessages(roomId)` | `GET /api/chat/rooms/:id/messages` |
| `markAsRead(roomId, role)` | `POST /api/chat/rooms/:id/read` |
| `translateMessages(roomId, ids)` | `POST /api/chat/translate` |

### Reviews
| Frontend Method | Backend Endpoint |
|---|---|
| `createReview(data)` | `POST /api/reviews` |
| `getReviewsForDentist(name)` | `GET /api/doctors/:name/reviews` |
| `getReviewForBooking(id)` | `GET /api/bookings/:id/review` |
| `checkReviewEligibility(id)` | `GET /api/bookings/:id/review-eligibility` |

### Notifications
| Frontend Method | Backend Endpoint |
|---|---|
| `addNotification(data)` | `POST /api/notifications` |
| `getNotifications(role?)` | `GET /api/notifications` |
| `markNotificationRead(id)` | `PATCH /api/notifications/:id/read` |
| `markAllNotificationsRead(role)` | `POST /api/notifications/read-all` |

---

## BUSINESS RULES (CRITICAL)

### Tier System
```
Gold:     top 5% by revenue  → 15% platform fee
Silver:   5-20% by revenue   → 18% platform fee
Standard: rest               → 20% platform fee
```

### Refund Policy
```
7+ days before visit  → 100% refund
3-6 days before visit → 50% refund
< 3 days before visit → No refund
```

### 5% App Discount (IMPORTANT)
- Patient pays 5% less than the invoice total
- Doctor sees the FULL amount (discount is invisible to them)
- Platform absorbs the 5% from its fee margin
- This is an anti-bypass incentive ("pay through app = 5% off")

### Treatment Terminology Bridge
- Cases and quotes keep `treatments[].name` as a single string field
- Patient-facing labels: `Implant: Whole (Root + Crown)`, `Implant: Root (Titanium Post) Only`, `Implant: Crown Only`, `Fillings`, `Gum Treatment`, `Invisalign`, `Tongue Tie Surgery`
- Doctor-facing labels: `Implant: Fixture Placement + Crown Restoration`, `Implant: Fixture Placement Only`, `Implant: Crown Restoration Only`, `Direct/Indirect Fillings (Composites, Inlays, Onlays)`, `Perio Surgery`, `Clear Aligner Orthodontics`, `Lingual Frenectomy`
- Shared labels remain unchanged across both roles: `Veneers`, `Smile Makeover`, `Crowns`, `Root Canals`, `Oral Sleep Appliance`, `Wisdom Teeth Extractions`
- The backend must normalize legacy aliases such as `Implant: whole implant(Root+crown)` to the canonical role-specific labels above

### Chat Contact Filter (Anti-Bypass)
- Before booking is confirmed: block phone numbers, emails, messenger IDs, URLs
- After booking confirmed: filter is OFF
- 3-tier warning system (1→2→3 based on violation count)
- Safe numbers (prices, dates, tooth numbers) are NOT blocked
- See `lib/chat-filter.ts` for full implementation

### Verified Reviews
- Only patients with booking status in `[treatment_done, between_visits, returning_home, payment_complete, departure_set]` can write reviews
- `verified: true` is set automatically when creating review
- `verifiedTreatments` is pulled from the actual booking data (tamper-proof)

---

## SERVER ARCHITECTURE

### Recommended Stack
```
server/
├── src/
│   ├── index.ts                 # Express app entry
│   ├── config/
│   │   ├── database.ts          # Prisma client
│   │   └── env.ts               # Environment vars
│   ├── middleware/
│   │   ├── auth.ts              # JWT verification
│   │   ├── roleGuard.ts         # Patient vs Doctor access
│   │   └── errorHandler.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── cases.ts
│   │   ├── quotes.ts
│   │   ├── bookings.ts
│   │   ├── chat.ts
│   │   ├── reviews.ts
│   │   ├── notifications.ts
│   │   ├── patients.ts
│   │   └── doctors.ts
│   ├── services/
│   │   ├── chatFilter.ts        # Port from lib/chat-filter.ts
│   │   ├── billing.ts           # Multi-visit billing logic
│   │   ├── refund.ts            # Refund calculations
│   │   ├── tier.ts              # Monthly tier recalculation
│   │   ├── translation.ts       # DeepL API integration
│   │   └── notification.ts      # Push notification service
│   ├── websocket/
│   │   └── chat.ts              # Socket.io for real-time chat
│   └── types/
│       └── index.ts             # Shared TypeScript types
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── seed.ts                  # Demo data seeder
├── tests/
├── package.json
├── tsconfig.json
├── Dockerfile
└── docker-compose.yml           # PostgreSQL + Redis + Server
```

### Tech Stack
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT (access + refresh tokens)
- **Real-time**: Socket.io (chat)
- **Cache**: Redis (sessions, typing status)
- **File Storage**: AWS S3 (X-rays, photos, license uploads)
- **Payments**: Stripe (deposits + final payments)
- **Translation**: DeepL API
- **Push Notifications**: Expo Push Notifications API

---

## CODING STANDARDS

### TypeScript
- Strict mode enabled
- All API responses typed
- Use Zod for request validation

### API Response Format
```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: { code: string, message: string } }

// Paginated
{ success: true, data: T[], meta: { page: number, limit: number, total: number } }
```

### Error Codes
```
AUTH_REQUIRED, AUTH_INVALID, AUTH_EXPIRED
CASE_NOT_FOUND, QUOTE_NOT_FOUND, BOOKING_NOT_FOUND
REVIEW_NOT_ELIGIBLE, REVIEW_ALREADY_EXISTS
BOOKING_CANNOT_CANCEL, REFUND_NOT_AVAILABLE
FILTER_BLOCKED (chat contact filter)
VALIDATION_ERROR
```

### Environment Variables
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=...
DEEPL_API_KEY=...
EXPO_PUSH_ACCESS_TOKEN=...
REDIS_URL=...
PORT=3000
```

---

## COORDINATION WITH CLAUDE CODE

### Division of Labor
| Area | Owner | Notes |
|------|-------|-------|
| `server/` folder | **Codex (You)** | Full ownership |
| `app/` folder | Claude Code | DO NOT TOUCH |
| `lib/store.ts` | Claude Code | Will convert to API client |
| `lib/chat-filter.ts` | Claude Code | Port logic to `server/src/services/chatFilter.ts` |
| `constants/` | Claude Code | Port to `server/src/services/` |
| `docs/` | Shared | API contracts and shared specs live here |

### Collaboration Protocol
This `AGENTS.md` section is the canonical Codex <-> Claude Code collaboration protocol. Do not create a separate collaboration-protocol doc elsewhere.

1. Respect ownership boundaries strictly: Codex edits only `server/`, shared docs, and server-facing handoff files. Never edit `app/`, `lib/`, `components/`, or `constants/`.
2. Treat repository files as the source of truth. Verbal chat context is not sufficient unless it is written into tracked files.
3. Work contract-first for integration slices. Before implementing a backend slice, write `docs/api-contract-<slice>.md` and let Claude Code review it.
4. Use these integration slices, in order: `Auth` -> `Cases + Quotes` -> `Bookings` -> `Chat` -> `Reviews`.
5. Record every backend/frontend handoff in `server/CHANGELOG.md` using the exact format defined below.
6. If any enum, status value, or other cross-team contract changes, update `AGENTS.md` and `server/CHANGELOG.md` in the same change.
7. Server seed data must reproduce the frontend `store.seedDemoData()` flow as closely as possible so both sides integrate against the same journey.
8. Keep handoffs short and mechanical: changed files, contract shape, frontend expectations, test status, and readiness.

### Git Workflow
1. Work on `dev` branch
2. Commit with descriptive messages: `feat(server): add booking API endpoints`
3. Push frequently so Claude Code can integrate
4. Never force-push or rebase without coordinating

### Communication Protocol
Create `server/CHANGELOG.md` before backend implementation begins and append every slice handoff there.

Use this exact format:
```markdown
## [YYYY-MM-DD] Slice: Auth
- Changed: server/routes/auth.ts created
- Contract: POST /api/auth/login -> { token, user }
- Frontend expects: JWT token in Authorization header
- Tested: curl test completed
- Status: Ready for integration
```

The first collaboration slice is `Auth`. Before writing Auth server code, create and review `docs/api-contract-auth.md`.

---

## PRIORITY ORDER

Build in this order (each must be fully working before moving on):

1. **Project Setup** - package.json, tsconfig, Prisma, Docker
2. **Database Schema** - All tables matching the interfaces above
3. **Auth** - Register, login, JWT, role guard
4. **Cases + Quotes** - CRUD with proper auth
5. **Bookings** - State machine, status transitions
6. **Chat** - REST + WebSocket, contact filter
7. **Reviews** - With verified patient logic
8. **Payments** - Stripe integration, deposit + final
9. **Notifications** - Push via Expo, in-app storage
10. **File Upload** - S3 for X-rays, photos, license
11. **Translation** - DeepL for chat messages
12. **Tier System** - Monthly recalculation cron job
13. **Admin API** - For future admin dashboard

---

## TESTING

- Write tests for ALL business logic (billing, refunds, tier)
- Use Jest + Supertest for API tests
- Provide a seed script that creates demo data matching `store.seedDemoData()`
- Test the chat filter with the same edge cases from `lib/chat-filter.ts`

---

## QUICK REFERENCE FILES

Read these files to understand business logic before implementing:
- `lib/store.ts` - All data models and business logic (1200+ lines)
- `lib/chat-filter.ts` - Chat contact filtering patterns
- `docs/tiered-platform-fee-spec.md` - Tier system specification
- `docs/per-visit-discount-spec.md` - 5% discount specification
- `docs/multi-visit-billing-spec.md` - Multi-visit billing logic
- `docs/anti-bypass-implementation-plan.md` - Anti-bypass strategy
- `docs/api-contract-auth.md` - First backend/frontend contract slice
- `server/CHANGELOG.md` - Required Codex <-> Claude handoff log
- `CLAUDE.md` - Full project analysis and architecture
