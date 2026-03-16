# Server Changelog

Use this file for every Codex <-> Claude Code backend handoff.

## Template

```markdown
## [YYYY-MM-DD] Slice: Auth
- Changed: server/routes/auth.ts created
- Contract: POST /api/auth/login -> { token, user }
- Frontend expects: JWT token in Authorization header
- Tested: curl test completed
- Status: Ready for integration
```

## Notes

- Update this file in the same change whenever shared enums, statuses, or other cross-team contracts change.
- Keep entries mechanical and integration-focused.
- The first slice starts from `docs/api-contract-auth.md`.

## [2026-03-15] Slice: Auth
- Changed: Bootstrapped `server/` with Express, Prisma schema, JWT auth middleware, verification-code flow, patient/doctor registration, login, refresh, logout, local file storage, and Auth integration tests/smoke coverage.
- Contract: `POST /api/auth/send-email-code`, `POST /api/auth/verify-email`, `POST /api/auth/send-sms-code`, `POST /api/auth/verify-sms`, `POST /api/auth/register/patient`, `POST /api/auth/register/doctor`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/refresh`, `POST /api/auth/logout` all return the approved `{ success, data }` envelope.
- Frontend expects: Access token in `Authorization: Bearer <token>`, refresh token in JSON body for refresh/logout, doctor signup as `multipart/form-data` with `licenseFiles[]`, and `profileStatus` / `licenseVerificationStatus` from auth responses.
- Tested: `npm run prisma:generate` and `npm run build` passed; direct smoke flows for patient auth and doctor multipart signup passed via `node` + `supertest`; `npm test` currently hangs in this environment.
- Status: Ready for integration

## [2026-03-15] Slice: Auth
- Changed: Added CORS middleware in `server/src/app.ts`, installed `cors` + `@types/cors`, excluded `server` from the root Expo TypeScript project, and excluded `tests` from the server production build config.
- Contract: `GET /api/health -> { success: true, data: { status: "ok" } }`; Auth response contracts remain unchanged from `docs/api-contract-auth.md`.
- Frontend expects: Requests from Expo localhost or device origins are accepted by CORS, health checks return `{ status: "ok" }`, and Auth endpoints still match the approved Auth contract.
- Tested: `npm run build` passed after the CORS and tsconfig changes.
- Status: Ready for integration

## [2026-03-15] Slice: Cases + Quotes
- Changed: Created `docs/api-contract-cases-quotes.md` for the next contract-first slice.
- Contract: `POST /api/cases`, `GET /api/cases`, `GET /api/cases/:id`, `PATCH /api/cases/:id/status`, `PATCH /api/cases/:id`, `POST /api/quotes`, `GET /api/cases/:caseId/quotes`, and `GET /api/quotes` are defined against the current `PatientCase` and `DentistQuote` shapes.
- Frontend expects: Bearer auth on all routes, exact `PatientCase` / `DentistQuote` payload shapes, automatic `quotes_received` status changes when a doctor submits a quote, and doctor quote visibility scoped to the authenticated doctor.
- Tested: Contract reviewed against `AGENTS.md`, `lib/store.ts`, `app/patient/review.tsx`, `app/patient/quotes.tsx`, `app/patient/quote-detail.tsx`, and `app/doctor/case-detail.tsx`.
- Status: Ready for Claude review
## [2026-03-15] Slice: Cases + Quotes
- Changed: Added `PatientCase` / `DentistQuote` Prisma models, mounted `/api/cases` and `/api/quotes`, implemented repositories, service, validators, role guard, and route handlers, and left `TODO(notification)` trigger comments for `new_case`, `case_updated`, and `new_quote` without shipping notification delivery yet.
- Contract: `docs/api-contract-cases-quotes.md` is approved; `POST /api/cases`, `GET /api/cases`, `GET /api/cases/:id`, `PATCH /api/cases/:id/status`, `PATCH /api/cases/:id`, `POST /api/quotes`, `GET /api/cases/:caseId/quotes`, and `GET /api/quotes` now follow that contract.
- Frontend expects: Bearer auth on all routes, patient-only case creation/editing/booking, doctor-only quote creation, sequential case ids (`1001+`), automatic `quotes_received` after the first quote, and doctor quote visibility scoped to the authenticated doctor for case-level quote reads.
- Tested: `npm run prisma:generate`, `npm run build`, and `npx jest --runInBand --detectOpenHandles --verbose tests/casesQuotes.integration.test.ts --forceExit` passed.
- Status: Ready for integration

## [2026-03-16] Slice: Cases + Quotes
- Changed: Added role-aware treatment terminology translation in `server/src/services/treatmentTerminology.ts` and wired it into case/quote responses so patient-facing and doctor-facing treatment-plan labels stay aligned without changing payload shape.
- Contract: `docs/api-contract-cases-quotes.md` and `AGENTS.md` now define the patient-term <-> doctor-term bridge for `treatments[].name` while keeping the existing `PatientCase` and `DentistQuote` schemas unchanged.
- Frontend expects: Patients continue to send and read patient-friendly treatment names; doctors can submit/read professional treatment-plan labels; shared labels such as `Crowns` and `Veneers` remain unchanged.
- Tested: `npm test -- --runInBand tests/treatmentTerminology.test.ts tests/casesQuotes.integration.test.ts`
- Status: Ready for integration