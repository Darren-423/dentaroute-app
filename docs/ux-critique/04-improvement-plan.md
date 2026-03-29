# Concourse UX/UI Improvement Plan

Based on comprehensive analysis from 4-agent team (current score: 5.2/10).
*Refined with cross-agent review — see change summary at bottom.*

---

## Phase 0: Immediate Bug Fixes (Day 1)

### Bug 1: Edit button routing error in review.tsx
- **File**: `app/patient/review.tsx:484`
- **Problem**: Edit button routes to `/patient/concern` which does not exist. Correct route: `/patient/concern-describe`.
- **Fix**: Change `router.push("/patient/concern?from=review" as any)` → `router.push("/patient/concern-describe?from=review" as any)`
- **Difficulty**: Low (1 line)

### Bug 2: Avatar initial bug in doctor/profile.tsx
- **File**: `app/doctor/profile.tsx:47`
- **Problem**: `profile?.name?.[4]` takes 5th character instead of 1st.
- **Fix**: Change `name[4]` → `name[0]`
- **Difficulty**: Low (1 line)

### Bug 3: Progress dot count mismatch
- **Files**: `app/patient/basic-info.tsx:284-291`, `app/patient/dental-history.tsx:124-130`, `app/patient/medical-history.tsx:281-287`
- **Problem**: basic-info shows 4 dots, dental/medical-history show 3 dots each.
- **Fix**: Audit canonical flow (3 or 4 steps) and standardize all screens to matching count.
- **Difficulty**: Low (3 files, ~5 lines each)

---

## Phase 1: Quick Wins (Week 1)

### 1.1 Remove "Dr. Kim" hardcoding
- **File**: `app/doctor/dashboard.tsx:211`
- **Change**: Use `profile?.name || "Doctor"` (pattern already exists in doctor/profile.tsx:50)
- **Effect**: Personalized experience; removes demo impression
- **Difficulty**: Low

### 1.2 "Best Value" → "Lowest Price"
- **File**: `app/patient/quotes.tsx:272`
- **Change**: Replace `Best Value` with `Lowest Price`
- **Effect**: Honest, clear labeling; no implied Concourse endorsement
- **Difficulty**: Low

### 1.3 Quote compare 3-limit feedback
- **File**: `app/patient/quotes.tsx` (compare mode selection logic)
- **Change**: Add toast when 4th selection attempted: "Compare up to 3 quotes. Deselect one to add another."
- **Effect**: Eliminates silent failure on 4th selection
- **Difficulty**: Low

### 1.4 Splash screen doctor awareness
- **File**: `app/index.tsx`
- **Change**: Add doctor-oriented card: "Are you a dentist? Join Korea's dental tourism network."
- **Effect**: Better first impression for doctors; "70% less" framing no longer the only message
- **Difficulty**: Medium

### 1.5 Chat translation disclaimer
- **Files**: `app/patient/chat.tsx`, `app/doctor/chat.tsx`
- **Change**: Collapsible banner (dismissible after first view): "Messages are auto-translated. Verify important details with your care team."
- **Effect**: Reduces liability; sets correct expectations for medical communication
- **Difficulty**: Low

### 1.6 "Payment" label consistency
- **File**: `app/patient/dashboard.tsx:62`
- **Change**: Update journey step label to "Service Plan"
- **Effect**: Consistent terminology with the actual payment screen heading
- **Difficulty**: Low

### 1.7 "Awaiting Quotes" timeout message *(was 1.8 — promoted)*
- **File**: `app/patient/dashboard.tsx`
- **Change**: Compare `Date.now() - case.createdAt` vs 72 hours. After threshold: "No quotes yet? Try broadening your treatment request or check back soon."
- **Effect**: Reduces patient anxiety; zero data model changes needed
- **Difficulty**: Low (~2 hours)

### 1.8 Quick Health Screen — reorder in review.tsx *(downgraded from Phase 2)*
- **File**: `app/patient/review.tsx`
- **As-Is**: Quick Health section appears after the case summary cards
- **Change**: Move Quick Health section to FIRST position in the screen, above treatment/files cards. Rename header to "Quick Safety Check" with brief explanation.
- **Effect**: Patients see critical health questions before reviewing case details. ~20 line reorder, no new screen.
- **Difficulty**: Low

---

## Phase 2: Core UX Refactoring (Week 2-3)

### 2.1 Arrival Info 3-step wizard *(was 4 steps)*
- **File**: `app/patient/arrival-info.tsx`
- **As-Is**: One giant scrolling form (20+ fields)
- **To-Be** (3 steps):
  - **Step 1 — Arrival Flight** (required): Airline, flight number, date, time, airport, terminal, screenshot. Add "Load from saved trip" button at top (uses existing `savedTrips` state).
  - **Step 2 — Accommodation & Preferences** (required, some optional): Hotel name + address, check-in/out dates, confirmation number, hotel screenshot, passengers count, pickup toggle, notes.
  - **Step 3 — Return Flight** (skippable: "I'll add this later"): Departure airline, flight number, date, time, terminal, screenshot.
- **Rationale**: Passengers/pickup are lightweight fields that group naturally with accommodation. Return flight not validated (line 199 only checks arrival) — multi-visit patients often don't know return dates yet.
- **Difficulty**: High (must preserve `tripIndex` dual-mode behavior)

### 2.2 Case Detail Smart Collapse (Doctor) *(was "generic separation")*
- **File**: `app/doctor/case-detail.tsx`
- **As-Is**: Patient info + files + quote builder all in one long scroll
- **To-Be** (Smart Collapse layout):
```
Header (patient name, case #, avatar)

PATIENT CONTEXT (auto-collapsed after first visit, remembers state)
  [v] Patient Info
  [v] Medical History
  [v] Dental Issues
  [>] Files & X-rays (3)  ← count badge always visible even when collapsed

─── divider ───

REQUESTED TREATMENTS  ← always visible
  [Copy to Plan] button

YOUR TREATMENT PLAN   ← never collapsible (primary action area)
  Plan items + pricing
  Visit settings + gaps
  Total

[Send Quote → $X,XXX]  ← sticky bottom bar
```
- **Effect**: Reduces 15+ screen-height scroll to 2-3 heights. Doctor can still reference X-rays while building quote.
- **Difficulty**: Medium

### 2.3 Schedule: Calendar-Primary Design (Doctor) *(was "generic unify")*
- **Files**: `app/doctor/availability.tsx`, `app/doctor/schedule-patient.tsx`, `app/doctor/_layout.tsx`
- **As-Is**: Two separate tabs ("Hours" + "Schedule") with overlapping functionality
- **To-Be** (single "Schedule" tab):
```
Calendar (always visible, color-coded)
  Teal = open | Gray = closed | Red dot = blocked slots | Yellow dot = date override
  Tap date → shows day's time slots below

Selected Day Panel
  Time slot grid (30-min blocks, tap to block/unblock)
  Block All / Unblock All buttons

Bottom bar
  "Set Default Hours" → full-screen modal with weekly hours editor
  Save button
```
- **Freed tab slot**: Replace with "Earnings" tab (currently only accessible via dashboard header icon)
- **Difficulty**: Medium-High

### 2.4 Doctor Pass mechanism *(was 1.7 — moved to Phase 2)*
- **Files**: `app/doctor/case-detail.tsx`, `lib/store.ts`
- **Change**: Add "Not Interested" button on case cards + new store method `store.passCase(caseId, doctorId)` + "Passed" section on doctor dashboard.
- **Phase 2 followup**: Connect pass counts to patient timeout message: "3 of 5 doctors reviewed your case, waiting for 2 more."
- **Effect**: Completes cross-role feedback loop
- **Difficulty**: Medium (~5 hours + 2 hours for patient-side connection)

### 2.5 Dashboard empty states *(was "build from scratch" — enhance existing)*
- **File**: `app/patient/dashboard.tsx` (existing empty state at lines 401-420)
- **Add to existing:**
  - "How It Works" secondary CTA → `/patient/help-center`
  - Social proof badge ("500+ patients treated" / "Average savings: 60%")
  - New "all cases completed" state → "All journeys complete!" + "Start New Case" + "View Past Treatments"
  - Mid-journey cross-sell card: "While you wait: Complete your profile" → Enrichment Checklist
- **Keep**: existing routing to `/patient/treatment-intent` (preserves A/B path fork)
- **Difficulty**: Low-Medium (was Medium)

### 2.6 Refund policy pre-exposure
- **Files**: `app/patient/quote-detail.tsx`, `app/patient/payment.tsx`
- **Change**: Add collapsible "Cancellation Policy" section before accepting/paying. Content from existing terms.tsx.
- **Difficulty**: Low-Medium

---

## Phase 3: Platform Maturity (Month 2)

### 3.1 Accessibility — Component foundation first *(was "screen-by-screen")*

**Phase 3a: Create 2 wrapper components (~2-3 hours):**
1. `components/AccessibleButton.tsx` — wraps TouchableOpacity, requires `accessibilityLabel` (TypeScript enforced), auto-sets `accessibilityRole="button"`, sensible `hitSlop`
2. `components/AccessibleInput.tsx` — wraps TextInput, requires `accessibilityLabel`, auto-associates errors via `accessibilityHint`

**Phase 3b-f: Apply via critical path (~10-11 hours):**
- 3b: Auth screens (both roles) — ~1 hour (mostly done already)
- 3c: Both dashboards — ~3 hours (62 TouchableOpacity total: 15 doctor + 47 patient)
- 3d: Patient case submission flow (treatment-intent → treatment-select → concern-describe → upload → review) — ~3 hours
- 3e: Doctor case-detail + quote builder — ~2 hours
- 3f: Quote acceptance → booking flow — ~2 hours

**Total: ~13 hours. Score improvement: 2/10 → 5-6/10.**

### 3.2 Doctor registration wizard
- **File**: `app/doctor/profile-setup.tsx`
- **To-Be**: 3-4 steps: Personal Info → Clinic Details → Credentials/License → Review & Publish
- **Difficulty**: High

### 3.3 Date format internationalization
- **Strategy**: Create `lib/dateFormat.ts` with `Intl.DateTimeFormat` locale support. Apply across all screens.
- **Difficulty**: Medium

### 3.4 Multi-visit quote presets — 8 templates *(was 4)*

| Preset | Visits | Default Gaps | Reason |
|--------|--------|-------------|--------|
| Standard Implant | 2 | 4 months | Bone integration |
| Implant + Bone Graft | 3 | 5mo, then 4mo | Bone integration |
| Veneer Set (4-10) | 2 | 10 days | Lab processing (Korean labs: 5-10 days) |
| Full Mouth Reconstruction | 3 | 14 days, 10 days | Lab/fabrication |
| Smile Makeover | 2 | 12 days | Lab processing |
| Invisalign Start | 2 | 18 days | Custom fabrication |
| Root Canal + Crown | 2 | 10 days | Lab processing |
| Extraction + Immediate Implant | 2 | 4 months | Bone integration |

**UI (chip pattern):**
```
── QUICK SETUP ──
[Standard Implant]  [Veneers]  [Root Canal + Crown]  [More ▾]
                                                        ├── Implant + Bone Graft
                                                        ├── Full Mouth
                                                        ├── Smile Makeover
                                                        ├── Invisalign Start
                                                        └── Extraction + Implant
```
- Preset auto-fills: visit count, gap configs (months/days, reason label)
- Does NOT overwrite treatment items or prices
- Doctor can adjust any preset value after selection
- **Difficulty**: Medium

### 3.5 Earnings withdrawal placeholder
- Add "Settlements processed monthly" section with disabled "Request Settlement" button
- **Difficulty**: Low

### 3.6 Before-After photo simplification
- Replace 3-step Alert flow with side-by-side image slots + inline treatment name field. One "Save" button.
- **Difficulty**: Medium

---

## Phase 4: Polish & Delight (Month 2-3)

- **4.1** Path B optional Upload addition (X-ray upload option for "Help me figure it out" path)
- **4.2** Dashboard status section animations (expand/collapse with counts)
- **4.3** Chat Quick Reply enhancement — doctor-specific chips: "Please upload your X-ray", "Your appointment is confirmed for [date]"
- **4.4** Earnings monthly trend chart + year-over-year comparison
- **4.5** Tier upgrade criteria — tooltip showing revenue needed for next tier

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
- Phase 0 bug fixes (3 bugs, ~30 min total)
- 1.1 Remove "Dr. Kim" hardcoding
- 1.2 "Best Value" → "Lowest Price"
- 1.5 Chat translation disclaimer
- 1.6 "Payment" label consistency
- 1.7 Awaiting Quotes timeout message (~2 hrs)
- 1.8 Quick Health Screen reorder (~20 lines)
- 2.6 Refund policy pre-exposure

### High Impact + High Effort (Plan Carefully)
- 2.1 Arrival Info 3-step wizard
- 2.2 Case Detail Smart Collapse
- 2.3 Schedule calendar-primary redesign
- 2.4 Doctor Pass mechanism
- 3.1 Accessibility foundation (~13 hrs)
- 3.2 Doctor registration wizard

### Low Impact + Low Effort (Fill Gaps)
- 1.3 Quote compare limit feedback
- 2.5 Dashboard empty state enhancements
- 3.5 Earnings settlement placeholder
- 4.5 Tier upgrade criteria

### Low Impact + High Effort (Defer)
- 3.3 Date format internationalization
- 4.4 Earnings trend charts
- Full accessibility coverage beyond critical path

---

## Risks & Caveats

1. **No backend**: All improvements are UI-only. Doctor Pass and timeout notifications require store.ts changes but no real backend — patterns translate cleanly when backend is built.
2. **Arrival Info refactor scope**: Must preserve `tripIndex` dual-mode behavior (first-visit vs return-visit trips).
3. **Progress dot standardization**: Audit full profile setup flow first to determine canonical step count (3 or 4) before fixing dots.
4. **Accessibility is iterative**: Score 2→6 requires ~13 hours systematic work. Track with checklist; do one flow at a time, not scattered changes.
5. **No automated testing**: Verify each phase on device via Expo tunnel mode.

---

## Refinement Summary (vs. original plan)

| Item | Original | Revised |
|------|----------|---------|
| 1.7/1.8 order | Doctor Pass first | Patient Timeout first (zero deps, ~2 hrs) |
| 2.4 Health questionnaire | New separate screen | Reorder within review.tsx (downgraded to Quick Win) |
| 2.5 Dashboard empty state | Build from scratch | Enhance existing (lines 401-420 already exist) |
| 2.1 Arrival Info | 4 steps | 3 steps (passengers/pickup merged into accommodation) |
| 2.2 Case Detail | Generic separation | Smart Collapse with remembered state + sticky quote bar |
| 2.3 Schedule | Generic unify | Calendar-primary + default hours in modal; free tab → Earnings |
| 3.1 Accessibility | Screen-by-screen | Component wrappers first, then critical path (~13 hrs) |
| 3.4 Multi-visit presets | 4 presets | 8 presets with verified clinical gaps + chip UI |
