# Auth API Contract

Status: Draft for Claude Code review
Date: 2026-03-15
Scope: Auth slice only

## Goals

- Replace mock login with real JWT auth.
- Support the current patient and doctor signup flows in [app/auth/patient-create-account.tsx](/C:/Dentaroute/app/auth/patient-create-account.tsx) and [app/auth/doctor-create-account.tsx](/C:/Dentaroute/app/auth/doctor-create-account.tsx).
- Keep the frontend contract stable for [app/auth/patient-login.tsx](/C:/Dentaroute/app/auth/patient-login.tsx), [app/auth/doctor-login.tsx](/C:/Dentaroute/app/auth/doctor-login.tsx), and future API-client replacement of `store.setCurrentUser()`, `getCurrentUser()`, and `clearCurrentUser()`.

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

## Auth User Shape

```ts
type AuthRole = "patient" | "doctor";

interface AuthUser {
  id: string;
  role: AuthRole;
  fullName: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  profileStatus: "needs_profile_setup" | "active";
  licenseVerificationStatus?: "pending_review" | "verified" | "rejected";
  createdAt: string;
}
```

## Token Model

- `token`: JWT access token.
- `refreshToken`: JWT refresh token.
- Frontend stores `token` and sends it as `Authorization: Bearer <token>`.
- Refresh token handling can start as JSON-body based; cookie migration can happen later without changing the access-token contract.

## Endpoints

### POST /api/auth/send-email-code

Purpose: Send a 6-digit verification code during signup.

Request:

```json
{
  "email": "user@example.com",
  "role": "patient"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "sent": true,
    "expiresInSec": 300,
    "resendAfterSec": 60
  }
}
```

Notes:

- Same endpoint is used for both patient and doctor signup.
- On duplicate email, return `VALIDATION_ERROR` with `details.email`.

### POST /api/auth/verify-email

Purpose: Verify the signup email code.

Request:

```json
{
  "email": "user@example.com",
  "code": "123456",
  "role": "patient"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "verified": true
  }
}
```

### POST /api/auth/send-sms-code

Purpose: Send a 6-digit phone verification code during signup.

Request:

```json
{
  "phoneCountryCode": "+1",
  "phone": "5551234567",
  "role": "patient"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "sent": true,
    "expiresInSec": 300,
    "resendAfterSec": 60
  }
}
```

### POST /api/auth/verify-sms

Purpose: Verify the signup phone code.

Request:

```json
{
  "phoneCountryCode": "+1",
  "phone": "5551234567",
  "code": "123456",
  "role": "patient"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "verified": true
  }
}
```

### POST /api/auth/register/patient

Purpose: Create a patient auth account after email and phone verification.

Request:

```json
{
  "firstName": "Sarah",
  "lastName": "Johnson",
  "email": "sarah@example.com",
  "phoneCountryCode": "+1",
  "phone": "5551234567",
  "password": "strong-password",
  "agreedToTerms": true
}
```

Response:

```json
{
  "success": true,
  "data": {
    "token": "jwt-access-token",
    "refreshToken": "jwt-refresh-token",
    "user": {
      "id": "usr_123",
      "role": "patient",
      "fullName": "Sarah Johnson",
      "email": "sarah@example.com",
      "phone": "5551234567",
      "phoneCountryCode": "+1",
      "emailVerified": true,
      "phoneVerified": true,
      "profileStatus": "needs_profile_setup",
      "createdAt": "2026-03-15T09:00:00.000Z"
    }
  }
}
```

Frontend behavior after success:

- Persist `token`.
- Route to `/patient/basic-info`.

### POST /api/auth/register/doctor

Purpose: Create a doctor auth account after email and phone verification.

Content-Type: `multipart/form-data`

Fields:

- `firstName`
- `lastName`
- `email`
- `phoneCountryCode`
- `phone`
- `password`
- `agreedToTerms`
- `licenseFiles[]` (1-3 image files)

Response:

```json
{
  "success": true,
  "data": {
    "token": "jwt-access-token",
    "refreshToken": "jwt-refresh-token",
    "user": {
      "id": "usr_456",
      "role": "doctor",
      "fullName": "Dr. Kim Minjun",
      "email": "doctor@clinic.com",
      "phone": "1023456789",
      "phoneCountryCode": "+82",
      "emailVerified": true,
      "phoneVerified": true,
      "profileStatus": "needs_profile_setup",
      "licenseVerificationStatus": "pending_review",
      "createdAt": "2026-03-15T09:00:00.000Z"
    }
  }
}
```

Frontend behavior after success:

- Persist `token`.
- Route to `/doctor/profile-setup`.

### POST /api/auth/login

Purpose: Log in an existing patient or doctor.

Request:

```json
{
  "email": "user@example.com",
  "password": "strong-password"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "token": "jwt-access-token",
    "refreshToken": "jwt-refresh-token",
    "user": {
      "id": "usr_123",
      "role": "patient",
      "fullName": "Sarah Johnson",
      "email": "sarah@example.com",
      "phone": "5551234567",
      "phoneCountryCode": "+1",
      "emailVerified": true,
      "phoneVerified": true,
      "profileStatus": "active",
      "createdAt": "2026-03-15T09:00:00.000Z"
    }
  }
}
```

Frontend behavior after success:

- Persist `token`.
- Use `user.role` to route to patient or doctor flow.
- Use `profileStatus` to decide whether onboarding/profile setup is needed.

### GET /api/auth/me

Purpose: Replace `store.getCurrentUser()`.

Headers:

```http
Authorization: Bearer <token>
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_123",
      "role": "patient",
      "fullName": "Sarah Johnson",
      "email": "sarah@example.com",
      "phone": "5551234567",
      "phoneCountryCode": "+1",
      "emailVerified": true,
      "phoneVerified": true,
      "profileStatus": "active",
      "createdAt": "2026-03-15T09:00:00.000Z"
    }
  }
}
```

### POST /api/auth/refresh

Purpose: Issue a new access token.

Request:

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "token": "new-jwt-access-token",
    "refreshToken": "new-jwt-refresh-token"
  }
}
```

### POST /api/auth/logout

Purpose: Replace `store.clearCurrentUser()`.

Headers:

```http
Authorization: Bearer <token>
```

Request:

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "loggedOut": true
  }
}
```

## Error Handling

Common errors for this slice:

- `VALIDATION_ERROR`
- `AUTH_INVALID`
- `AUTH_REQUIRED`
- `AUTH_EXPIRED`

Field-level validation errors should use `details`:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body.",
    "details": {
      "email": ["Email is already in use."],
      "phone": ["Phone verification is required."]
    }
  }
}
```

## Open Decisions For Review

1. Keep refresh tokens in JSON for slice 1, then migrate to HTTP-only cookies later if needed.
2. Use `multipart/form-data` for doctor registration because license upload is already required in the current screen.
3. Return `profileStatus` from auth so the frontend can branch without extra bootstrap calls.

## Frontend Mapping

Current frontend methods and screens this slice should unlock:

- `POST /api/auth/login` -> [app/auth/patient-login.tsx](/C:/Dentaroute/app/auth/patient-login.tsx), [app/auth/doctor-login.tsx](/C:/Dentaroute/app/auth/doctor-login.tsx)
- `GET /api/auth/me` -> future replacement for `store.getCurrentUser()`
- `POST /api/auth/logout` -> future replacement for `store.clearCurrentUser()`
- `POST /api/auth/send-email-code` -> [app/auth/patient-create-account.tsx](/C:/Dentaroute/app/auth/patient-create-account.tsx), [app/auth/doctor-create-account.tsx](/C:/Dentaroute/app/auth/doctor-create-account.tsx)
- `POST /api/auth/verify-email` -> signup verification
- `POST /api/auth/send-sms-code` -> signup verification
- `POST /api/auth/verify-sms` -> signup verification
- `POST /api/auth/register/patient` -> patient signup completion
- `POST /api/auth/register/doctor` -> doctor signup completion
