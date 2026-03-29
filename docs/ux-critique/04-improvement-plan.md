# Concourse UX/UI Improvement Plan

Based on comprehensive analysis from 4-agent team (current score: 5.2/10).

---

## Phase 0: Immediate Bug Fixes (Day 1)

### Bug 1: Edit button routing error in review.tsx
- **File**: `app/patient/review.tsx:484`
- **Problem**: Edit button routes to `/patient/concern` which does not exist. Correct route: `/patient/concern-describe`.
- **Fix**: Change `router.push("/patient/concern?from=review" as any)` to `router.push("/patient/concern-describe?from=review" as any)`
- **Difficulty**: Low (1 line)

### Bug 2: Avatar initial bug in doctor/profile.tsx
- **File**: `app/doctor/profile.tsx:47`
- **Problem**: `profile?.name?.[4]` takes 5th character instead of 1st.
- **Fix**: Change `name[4]` to `name[0]`
- **Difficulty**: Low (1 line)

### Bug 3: Progress dot count mismatch
- **Files**: `app/patient/basic-info.tsx:284-291`, `app/patient/dental-history.tsx:124-130`, `app/patient/medical-history.tsx:281-287`
- **Problem**: basic-info shows 4 dots, dental/medical-history show 3 dots each.
- **Fix**: Standardize all profile setup screens to same dot count matching actual flow.
- **Difficulty**: Low (3 files, ~5 lines each)

---

## Phase 1: Quick Wins (Week 1)

### 1.1 Remove "Dr. Kim" hardcoding
- **File**: `app/doctor/dashboard.tsx:211`
- **Change**: Use `profile?.name || "Doctor"` (pattern exists in doctor/profile.tsx:50)
- **Effect**: Personalized experience; removes demo impression
- **Difficulty**: Low

### 1.2 "Best Value" → "Lowest Price"
- **File**: `app/patient/quotes.tsx:272`
- **Change**: Replace `Best Value` with `Lowest Price`
- **Effect**: Honest, clear labeling
- **Difficulty**: Low

### 1.3 Quote compare 3-limit feedback
- **File**: `app/patient/quotes.tsx`
- **Change**: Add toast: "Compare up to 3 quotes. Deselect one to add another."
- **Effect**: No more silent failures
- **Difficulty**: Low

### 1.4 Splash screen doctor awareness
- **File**: `app/index.tsx`
- **Change**: Add doctor-oriented card: "Are you a dentist? Join Korea's dental tourism network."
- **Effect**: Better first impression for doctors
- **Difficulty**: Medium

### 1.5 Chat translation disclaimer
- **Files**: `app/patient/chat.tsx`, `app/doctor/chat.tsx`
- **Change**: Banner: "Messages are auto-translated. Verify important details with your care team."
- **Effect**: Reduces liability; sets correct expectations
- **Difficulty**: Low

### 1.6 "Payment" label consistency
- **File**: `app/patient/dashboard.tsx:62`
- **Change**: Update journey label to "Service Plan"
- **Effect**: Consistent terminology
- **Difficulty**: Low

### 1.7 Doctor "Pass / Not Interested" button
- **File**: `app/doctor/case-detail.tsx`
- **Change**: Add "Not Interested" button + `passed` status in store
- **Effect**: Enables cross-role feedback loop
- **Difficulty**: Medium

### 1.8 "Awaiting Quotes" timeout message
- **File**: `app/patient/dashboard.tsx`
- **Change**: After 72 hours: "No quotes yet? Try broadening your request."
- **Effect**: Reduces patient anxiety; actionable guidance
- **Difficulty**: Medium

---

## Phase 2: Core UX Refactoring (Week 2-3)

### 2.1 Arrival Info multi-step wizard
- **File**: `app/patient/arrival-info.tsx`
- **As-Is**: One giant form (20+ fields)
- **To-Be**: 3 steps: Arrival Flight → Accommodation → Return Flight (each with Skip option)
- **Difficulty**: High

### 2.2 Case Detail screen separation (Doctor)
- **File**: `app/doctor/case-detail.tsx`
- **As-Is**: Patient info + files + quote builder all mixed
- **To-Be**: Collapsible accordion: Patient Overview (collapsed after first view) + Build Quote (expanded). Sticky header with patient name.
- **Difficulty**: Medium

### 2.3 Hours/Schedule unification (Doctor)
- **File**: `app/doctor/availability.tsx`
- **To-Be**: Single "Schedule" screen with calendar primary view. Default hours via gear icon/bottom sheet.
- **Difficulty**: Medium-High

### 2.4 Review & Submit health questionnaire separation
- **Files**: `app/patient/review.tsx`, new `app/patient/quick-health.tsx`
- **To-Be**: Move Quick Health check between concern-describe and upload. Review becomes purely confirmation.
- **Difficulty**: Medium

### 2.5 Dashboard empty states
- **File**: `app/patient/dashboard.tsx`
- **To-Be**: "Start your dental journey" + CTA for new users. "Welcome back!" + review prompts for returning users.
- **Difficulty**: Medium

### 2.6 Refund policy pre-exposure
- **Files**: `app/patient/quote-detail.tsx`, `app/patient/payment.tsx`
- **Change**: Collapsible "Cancellation Policy" section before accepting/paying
- **Difficulty**: Low-Medium

---

## Phase 3: Platform Maturity (Month 2)

### 3.1 Accessibility foundation
- **Problem**: Doctor flow = 0 labels, Patient = 48 labels in 7/43 files
- **Strategy**: Create accessible component wrappers → Apply to critical paths (auth → dashboard → case flow → chat)
- **Score improvement**: Doctor 1→4, Patient 3→5

### 3.2 Doctor registration wizard
- **File**: `app/doctor/profile-setup.tsx`
- **To-Be**: 3-4 steps: Personal → Clinic → Credentials → Review

### 3.3 Date format internationalization
- **Strategy**: Create `lib/dateFormat.ts` with `Intl.DateTimeFormat` locale support

### 3.4 Multi-visit quote presets
- Presets: Single Implant (2 visits, 3-6mo), Implant+Bone Graft (3 visits), Veneer Set (2 visits, 1-2wk), Root Canal+Crown (2 visits)

### 3.5 Earnings withdrawal placeholder
- Add "Settlements processed monthly" section with disabled "Request Settlement" button

### 3.6 Before-After photo simplification
- Replace 3-step Alert with side-by-side image slots + inline treatment name field

---

## Phase 4: Polish & Delight (Month 2-3)

- 4.1 Path B optional Upload addition
- 4.2 Dashboard status animation improvements
- 4.3 Chat Quick Reply enhancement (doctor-specific chips)
- 4.4 Earnings monthly trend chart
- 4.5 Tier upgrade criteria tooltip

---

## Expected Score Changes

| Category | Current | Phase 1 | Phase 2 | Phase 3 | Final |
|----------|---------|---------|---------|---------|-------|
| Simplicity | 4.5 | 5.0 | 6.5 | 7.5 | 8.0 |
| Clarity | 5.5 | 6.5 | 7.5 | 8.0 | 8.5 |
| Flow | 6.5 | 7.0 | 8.0 | 8.5 | 9.0 |
| Visual Design | 7.5 | 7.5 | 8.0 | 8.0 | 8.5 |
| Accessibility | 2.0 | 2.5 | 3.0 | 6.0 | 7.5 |
| **Overall** | **5.2** | **5.7** | **6.6** | **7.6** | **8.3** |

---

## Priority Matrix (Impact vs Effort)

### High Impact + Low Effort (Do First)
- Phase 0 bug fixes (3 bugs, ~30 min)
- 1.1 Remove "Dr. Kim" hardcoding
- 1.2 "Best Value" → "Lowest Price"
- 1.5 Chat translation disclaimer
- 1.6 "Payment" label consistency
- 2.6 Refund policy pre-exposure

### High Impact + High Effort (Plan Carefully)
- 2.1 Arrival Info multi-step wizard
- 2.2 Case Detail separation
- 2.4 Review health questionnaire separation
- 3.1 Accessibility foundation
- 3.2 Doctor registration wizard
- 1.7 Doctor "Pass" button

### Low Impact + Low Effort (Fill Gaps)
- 1.3 Quote compare limit feedback
- 1.8 Awaiting Quotes timeout message
- 3.5 Earnings settlement placeholder
- 4.5 Tier upgrade criteria

### Low Impact + High Effort (Defer)
- 3.3 Date format internationalization
- 4.4 Earnings trend charts
- Full accessibility coverage beyond critical path

---

## Risks & Caveats

1. **No backend**: All improvements are UI-only. Features like Doctor Pass, timeout notifications require store.ts changes but no real backend.
2. **Arrival Info refactor scope**: Must preserve tripIndex dual-mode behavior (first-visit vs return-visit).
3. **Progress dot standardization**: Need to audit full profile setup flow to determine canonical 3 or 4 step count.
4. **Accessibility is iterative**: Score 2→6 requires systematic work across 50+ files. Track with checklist, one flow at a time.
5. **No automated testing**: Verify each phase on device via Expo tunnel mode.
