# Cases + Quotes API Contract

Status: Approved by Claude Code
Date: 2026-03-15
Scope: Cases + Quotes slice only

## Goals

- Replace local `store.createCase()`, `getCases()`, `getCase()`, `updateCaseStatus()`, `updateCase()`, `createQuote()`, `getQuotesForCase()`, and `getQuotes()` with authenticated REST endpoints.
- Keep the current patient case-submission and quote-comparison flow stable for [review.tsx](/C:/Dentaroute/app/patient/review.tsx), [dashboard.tsx](/C:/Dentaroute/app/patient/dashboard.tsx), [quotes.tsx](/C:/Dentaroute/app/patient/quotes.tsx), [quote-detail.tsx](/C:/Dentaroute/app/patient/quote-detail.tsx), [quote-compare.tsx](/C:/Dentaroute/app/patient/quote-compare.tsx), [payment.tsx](/C:/Dentaroute/app/patient/payment.tsx), [dashboard.tsx](/C:/Dentaroute/app/doctor/dashboard.tsx), and [case-detail.tsx](/C:/Dentaroute/app/doctor/case-detail.tsx).
- Preserve the frontend data shapes from `lib/store.ts` so the API-client swap stays mechanical.

## Response Envelope

All endpoints follow the repo-wide API format:

```ts
type ApiSuccess<T> = { success: true; data: T };
type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
};
```

## Auth Model

All Cases + Quotes endpoints require:

```http
Authorization: Bearer <token>
```

Role rules for this slice:

- `patient` can create cases, read their own cases, read quotes for their own cases, and mark a case as `booked` after deposit flow.
- `doctor` can read the case feed, read individual cases, create one quote per case, and read only their own quotes for a case.
- `doctor` must not see competing doctors' quotes.

## PatientCase Shape

```ts
interface PatientCase {
  id: string; // sequential string: "1001", "1002", ...
  patientName: string;
  country: string;
  date: string; // ISO date string: YYYY-MM-DD
  treatments: { name: string; qty: number }[];
  medicalNotes: string;
  dentalIssues: string[];
  filesCount: {
    xrays: number;
    treatmentPlans: number;
    photos: number;
  };
  status: "pending" | "quotes_received" | "booked";
  visitDate?: string;
  birthDate?: string;
}
```

## DentistQuote Shape

```ts
interface DentistQuote {
  id: string;
  caseId: string;
  dentistName: string;
  clinicName: string;
  location: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating: number;
  reviewCount: number;
  totalPrice: number;
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

## Business Rules For This Slice

- New cases are created with `status: "pending"`.
- Creating the first quote for a case updates that case to `status: "quotes_received"` automatically.
- When the patient confirms a booking/deposit, the case is updated to `status: "booked"`.
- Case IDs remain sequential numeric-looking strings so the current UI can keep displaying `Case #1001` style labels.
- One doctor can have at most one active quote per case in slice 2. Duplicate submissions return `VALIDATION_ERROR`.
- Doctor identity and profile-backed fields may be backfilled by the server even if the frontend sends them.
- Treatment-item `name` stays a single string field, but the server translates it by viewer role for cases and quotes.

### Treatment Terminology Bridge

The API keeps the existing `treatments[].name` shape and applies a role-aware label mapping:

- Patient viewers see: `Implant: Whole (Root + Crown)`, `Implant: Root (Titanium Post) Only`, `Implant: Crown Only`, `Fillings`, `Gum Treatment`, `Invisalign`, `Tongue Tie Surgery`
- Doctor viewers see: `Implant: Fixture Placement + Crown Restoration`, `Implant: Fixture Placement Only`, `Implant: Crown Restoration Only`, `Direct/Indirect Fillings (Composites, Inlays, Onlays)`, `Perio Surgery`, `Clear Aligner Orthodontics`, `Lingual Frenectomy`
- Shared labels remain unchanged for both roles: `Veneers`, `Smile Makeover`, `Crowns`, `Root Canals`, `Oral Sleep Appliance`, `Wisdom Teeth Extractions`
- Legacy aliases such as `Implant: whole implant(Root+crown)` and `Direct/Indirect fillings(Composites, Inlays, Onlays)` are normalized to the canonical labels above.

## Endpoints

### POST /api/cases

Purpose: Create a new patient case from the review/submit flow.

Allowed role:

- `patient`

Request:

```json
{
  "patientName": "Sarah Johnson",
  "country": "United States",
  "treatments": [
    { "name": "Implant: Whole (Root + Crown)", "qty": 2 },
    { "name": "Crowns", "qty": 1 }
  ],
  "medicalNotes": "{\"conditions\":[\"None\"],\"allergies\":[\"None\"]}",
  "dentalIssues": ["Missing Teeth", "Discoloration"],
  "filesCount": {
    "xrays": 2,
    "treatmentPlans": 1,
    "photos": 3
  },
  "visitDate": "Mar 15 - Mar 22, 2026",
  "birthDate": "1990-05-15"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "case": {
      "id": "1003",
      "patientName": "Sarah Johnson",
      "country": "United States",
      "date": "2026-03-15",
      "treatments": [
        { "name": "Implant: Whole (Root + Crown)", "qty": 2 },
        { "name": "Crowns", "qty": 1 }
      ],
      "medicalNotes": "{\"conditions\":[\"None\"],\"allergies\":[\"None\"]}",
      "dentalIssues": ["Missing Teeth", "Discoloration"],
      "filesCount": {
        "xrays": 2,
        "treatmentPlans": 1,
        "photos": 3
      },
      "status": "pending",
      "visitDate": "Mar 15 - Mar 22, 2026",
      "birthDate": "1990-05-15"
    }
  }
}
```

Frontend behavior after success:

- Show `Case Submitted` confirmation.
- Route to `/patient/dashboard`.
- Doctor dashboards can surface the case as a new quote opportunity.

### GET /api/cases

Purpose: Replace `store.getCases()`.

Allowed roles:

- `patient`
- `doctor`

Response:

```json
{
  "success": true,
  "data": {
    "cases": [
      {
        "id": "1001",
        "patientName": "Sarah Johnson",
        "country": "United States",
        "date": "2026-02-23",
        "treatments": [
          { "name": "Implant: Whole (Root + Crown)", "qty": 2 },
          { "name": "Crowns", "qty": 1 }
        ],
        "medicalNotes": "No known allergies.",
        "dentalIssues": ["Missing Teeth"],
        "filesCount": {
          "xrays": 2,
          "treatmentPlans": 1,
          "photos": 3
        },
        "status": "quotes_received",
        "visitDate": "Mar 15 - Mar 22, 2026",
        "birthDate": "1990-05-15"
      }
    ]
  }
}
```

Filtering behavior:

- For `patient`: return only the authenticated patient's cases.
- For `doctor`: return the doctor-visible case feed.

### GET /api/cases/:id

Purpose: Replace `store.getCase(id)`.

Allowed roles:

- `patient`
- `doctor`

Response:

```json
{
  "success": true,
  "data": {
    "case": {
      "id": "1001",
      "patientName": "Sarah Johnson",
      "country": "United States",
      "date": "2026-02-23",
      "treatments": [
        { "name": "Implant: Whole (Root + Crown)", "qty": 2 },
        { "name": "Crowns", "qty": 1 }
      ],
      "medicalNotes": "No known allergies.",
      "dentalIssues": ["Missing Teeth"],
      "filesCount": {
        "xrays": 2,
        "treatmentPlans": 1,
        "photos": 3
      },
      "status": "quotes_received",
      "visitDate": "Mar 15 - Mar 22, 2026",
      "birthDate": "1990-05-15"
    }
  }
}
```

### PATCH /api/cases/:id/status

Purpose: Replace `store.updateCaseStatus(id, status)`.

Allowed roles:

- `patient`

Request:

```json
{
  "status": "booked"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "case": {
      "id": "1001",
      "status": "booked"
    }
  }
}
```

Notes:

- Frontend should use this only for the booking confirmation flow.
- `quotes_received` should be triggered automatically by quote creation, not by a separate frontend call.

### PATCH /api/cases/:id

Purpose: Replace `store.updateCase(id, updates)` for partial edits.

Allowed roles:

- `patient`

Request example:

```json
{
  "medicalNotes": "Updated medical notes",
  "dentalIssues": ["Missing Teeth", "Gum Recession"],
  "filesCount": {
    "xrays": 3,
    "treatmentPlans": 1,
    "photos": 4
  }
}
```

Response:

```json
{
  "success": true,
  "data": {
    "case": {
      "id": "1001",
      "patientName": "Sarah Johnson",
      "country": "United States",
      "date": "2026-02-23",
      "treatments": [
        { "name": "Implant: Whole (Root + Crown)", "qty": 2 },
        { "name": "Crowns", "qty": 1 }
      ],
      "medicalNotes": "Updated medical notes",
      "dentalIssues": ["Missing Teeth", "Gum Recession"],
      "filesCount": {
        "xrays": 3,
        "treatmentPlans": 1,
        "photos": 4
      },
      "status": "pending"
    }
  }
}
```

Notes:

- Slice 2 assumes patient edits are allowed only before the case is booked.

### POST /api/quotes

Purpose: Replace `store.createQuote(data)`.

Allowed role:

- `doctor`

Request:

```json
{
  "caseId": "1001",
  "dentistName": "Dr. Kim Minjun",
  "clinicName": "Seoul Bright Dental",
  "location": "Gangnam, Seoul",
  "address": "123 Teheran-ro, Gangnam-gu, Seoul 06133",
  "latitude": 37.5012,
  "longitude": 127.0396,
  "rating": 4.9,
  "reviewCount": 127,
  "totalPrice": 4150,
  "treatments": [
    { "name": "Implant: Whole (Root + Crown)", "qty": 2, "price": 1500 },
    { "name": "Crowns", "qty": 1, "price": 350 }
  ],
  "treatmentDetails": "Premium Osstem implants with zirconia crowns.",
  "duration": "6 Days",
  "visits": [
    {
      "visit": 1,
      "description": "Initial consultation and X-ray",
      "gapMonths": 0,
      "gapDays": 1,
      "paymentPercent": 30
    },
    {
      "visit": 2,
      "description": "Implant placement surgery",
      "gapMonths": 3,
      "gapDays": 0,
      "paymentPercent": 40
    }
  ],
  "message": "We can complete all treatments during your visit.",
  "clinicPhotos": [
    "https://example.com/clinic-1.jpg"
  ],
  "yearsExperience": 12,
  "specialties": ["Implants", "Cosmetic Dentistry"],
  "licenseVerified": true,
  "certifications": ["Korean Dental Association"]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "quote": {
      "id": "q1742010000",
      "caseId": "1001",
      "dentistName": "Dr. Kim Minjun",
      "clinicName": "Seoul Bright Dental",
      "location": "Gangnam, Seoul",
      "address": "123 Teheran-ro, Gangnam-gu, Seoul 06133",
      "latitude": 37.5012,
      "longitude": 127.0396,
      "rating": 4.9,
      "reviewCount": 127,
      "totalPrice": 4150,
      "treatments": [
        { "name": "Implant: Whole (Root + Crown)", "qty": 2, "price": 1500 },
        { "name": "Crowns", "qty": 1, "price": 350 }
      ],
      "treatmentDetails": "Premium Osstem implants with zirconia crowns.",
      "duration": "6 Days",
      "visits": [
        {
          "visit": 1,
          "description": "Initial consultation and X-ray",
          "gapMonths": 0,
          "gapDays": 1,
          "paymentPercent": 30
        }
      ],
      "message": "We can complete all treatments during your visit.",
      "createdAt": "2026-03-15T10:00:00.000Z",
      "clinicPhotos": [
        "https://example.com/clinic-1.jpg"
      ],
      "yearsExperience": 12,
      "specialties": ["Implants", "Cosmetic Dentistry"],
      "licenseVerified": true,
      "certifications": ["Korean Dental Association"]
    }
  }
}
```

Notes:

- On success, the server updates the linked case to `quotes_received`.
- The server may source profile-backed fields such as `dentistName`, `clinicName`, `rating`, `reviewCount`, `specialties`, and `licenseVerified` from the authenticated doctor's profile even when the frontend sends them.
- The response keeps doctor-facing treatment labels for doctor viewers; patient reads of the same quote are translated back to patient-facing labels.

### GET /api/cases/:caseId/quotes

Purpose: Replace `store.getQuotesForCase(caseId)`.

Allowed roles:

- `patient`
- `doctor`

Response for patient:

```json
{
  "success": true,
  "data": {
    "quotes": [
      {
        "id": "q1742010000",
        "caseId": "1001",
        "dentistName": "Dr. Kim Minjun",
        "clinicName": "Seoul Bright Dental",
        "location": "Gangnam, Seoul",
        "rating": 4.9,
        "reviewCount": 127,
        "totalPrice": 4150,
        "treatments": [
          { "name": "Implant: Whole (Root + Crown)", "qty": 2, "price": 1500 }
        ],
        "treatmentDetails": "Premium Osstem implants with zirconia crowns.",
        "duration": "6 Days",
        "message": "We can complete all treatments during your visit.",
        "createdAt": "2026-03-15T10:00:00.000Z"
      }
    ]
  }
}
```

Visibility behavior:

- For `patient`: return all quotes for that patient's case.
- For `doctor`: return only the authenticated doctor's own quote for that case.
- Treatment names are translated to patient-facing or doctor-facing terminology based on the authenticated viewer role.

### GET /api/quotes

Purpose: Replace `store.getQuotes()` and provide the cross-case quote list endpoint.

Allowed roles:

- `patient`
- `doctor`

Response:

```json
{
  "success": true,
  "data": {
    "quotes": [
      {
        "id": "q1742010000",
        "caseId": "1001",
        "dentistName": "Dr. Kim Minjun",
        "clinicName": "Seoul Bright Dental",
        "location": "Gangnam, Seoul",
        "rating": 4.9,
        "reviewCount": 127,
        "totalPrice": 4150,
        "treatments": [
          { "name": "Implant: Whole (Root + Crown)", "qty": 2, "price": 1500 }
        ],
        "treatmentDetails": "Premium Osstem implants with zirconia crowns.",
        "duration": "6 Days",
        "message": "We can complete all treatments during your visit.",
        "createdAt": "2026-03-15T10:00:00.000Z"
      }
    ]
  }
}
```

Filtering behavior:

- For `patient`: return quotes belonging to the authenticated patient's cases.
- For `doctor`: return quotes created by the authenticated doctor.
- Treatment names are translated to patient-facing or doctor-facing terminology based on the authenticated viewer role.

## Error Handling

Common errors for this slice:

- `AUTH_REQUIRED`
- `AUTH_INVALID`
- `CASE_NOT_FOUND`
- `QUOTE_NOT_FOUND`
- `VALIDATION_ERROR`

Field-level validation errors should use `details`:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body.",
    "details": {
      "treatments": ["At least one treatment is required."],
      "totalPrice": ["Total price must be greater than 0."],
      "caseId": ["You already submitted a quote for this case."]
    }
  }
}
```

## Open Decisions For Review

1. For slice 2, keep patient-submitted `patientName`, `country`, and `medicalNotes` in the case request so the frontend API swap stays simple, even though later slices may normalize more from stored patient profile data.
2. Keep doctor quote list visibility scoped so doctors receive only their own quote records for a case; patients still receive the full comparison set.
3. Use `GET /api/quotes` as the all-quotes endpoint instead of relying on `getQuotesForCase("")` fallback behavior from the local store.

## Frontend Mapping

Current frontend methods and screens this slice should unlock:

- `POST /api/cases` -> [review.tsx](/C:/Dentaroute/app/patient/review.tsx)
- `GET /api/cases` -> [dashboard.tsx](/C:/Dentaroute/app/patient/dashboard.tsx), [dashboard.tsx](/C:/Dentaroute/app/doctor/dashboard.tsx), [patient-info.tsx](/C:/Dentaroute/app/doctor/patient-info.tsx)
- `GET /api/cases/:id` -> [case-detail.tsx](/C:/Dentaroute/app/doctor/case-detail.tsx)
- `PATCH /api/cases/:id/status` -> [payment.tsx](/C:/Dentaroute/app/patient/payment.tsx)
- `PATCH /api/cases/:id` -> future replacement for patient case/profile resync flows
- `POST /api/quotes` -> [case-detail.tsx](/C:/Dentaroute/app/doctor/case-detail.tsx)
- `GET /api/cases/:caseId/quotes` -> [quotes.tsx](/C:/Dentaroute/app/patient/quotes.tsx), [quote-detail.tsx](/C:/Dentaroute/app/patient/quote-detail.tsx), [quote-compare.tsx](/C:/Dentaroute/app/patient/quote-compare.tsx), [case-detail.tsx](/C:/Dentaroute/app/doctor/case-detail.tsx)
- `GET /api/quotes` -> future replacement for global quote list fallback behavior
