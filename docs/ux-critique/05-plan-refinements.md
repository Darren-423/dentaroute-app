# Improvement Plan — Refinements (Agent Cross-Review)

All specialist agents reviewed each other's recommendations. These are the net changes to the original plan.

---

## Summary of Changes

| Item | Original | Revised | Reason |
|------|----------|---------|--------|
| 2.1 Arrival Info | 4 steps | **3 steps** (merge passengers/pickup into accommodation) | Passengers/pickup too lightweight for own step |
| 2.4 Health questionnaire | Separate screen | **Keep in review.tsx, reorder to top** (downgrade to Quick Win) | Only 4 yes/no questions; separate screen breaks 23→16 screen goal |
| 2.5 Dashboard empty state | Build from scratch | **Enhance existing** (already has basic empty state at lines 401-420) | Scope reduction: Low-Medium instead of Medium |
| 1.7/1.8 Feedback loop | Doctor Pass first | **Patient Timeout first** (zero dependencies, ~2 hrs) | Delivers patient value immediately; Pass needs store changes |
| 3.1 Accessibility | Screen-by-screen | **Component foundation first**, then critical path (~13 hrs) | 62+ TouchableOpacity need consistent labels; wrappers prevent drift |
| 2.3 Schedule | Generic "unify" | **Calendar-primary** with default hours in modal | Doctors think "my schedule" not "my hours" |
| 2.2 Case Detail | Generic "separate" | **Smart Collapse** with remembered state, sticky quote builder | Doctors need X-ray reference while quoting; tabs/separate screens lose context |
| 3.4 Multi-visit presets | 4 presets | **8 presets** with verified clinical gaps, chip UI | Expanded coverage for common Korean dental tourism cases |

---

## Detailed Refinements

### 1. Arrival Info: 3 Steps (was 4)

- **Step 1 — Arrival Flight** (required): Airline, flight number, date, time, airport, terminal, screenshot. "Load from saved trip" button at top.
- **Step 2 — Accommodation & Preferences** (required, some optional): Hotel name + address, check-in/out dates, confirmation number, hotel screenshot, passengers count, pickup toggle, notes.
- **Step 3 — Return Flight** (skippable: "I'll add this later"): Departure airline, flight number, date, time, terminal, screenshot.

Rationale: Passengers/pickup are lightweight (stepper + toggle). Return flight isn't validated (line 199 only checks arrival). Multi-visit patients often don't know return dates.

---

### 2. Health Questionnaire: Reorder, Don't Separate

**Downgraded from Phase 2 "Core Refactoring" to Phase 1 "Quick Win".**

- Quick Health Screen is only 4 yes/no questions (review.tsx:57-84) — too lightweight for separate screen
- Already pre-populates from medical data (lines 107-118) + conditional diabetes question
- **Change**: Move Quick Health section to FIRST section in review screen (above treatment/files cards), with header "Quick Safety Check"
- ~20 line reorder within review.tsx, not a new screen
- Keeps screen count aligned with 23→16 reduction goal

---

### 3. Dashboard Empty State: Enhance Existing

Dashboard already has basic empty state (lines 401-420) with "No cases yet" + "Create First Case" CTA.

**Add:**
- "How It Works" secondary CTA → `/patient/help-center`
- Social proof badge ("500+ patients treated" or "Average savings: 60%")
- New state for "all cases completed" → "All journeys complete!" + "Start New Case" + "View Past Treatments"
- Mid-journey cross-sell card below active booking ("While you wait: Complete your profile" → Enrichment Checklist)

**Keep:** existing routing to `/patient/treatment-intent` (preserves A/B path fork)

Difficulty: Low-Medium (was Medium)

---

### 4. Feedback Loop: Reverse Sequencing

**Patient Timeout FIRST (Phase 1, ~2 hours):**
- Zero data model changes. Cases already have `createdAt`. Dashboard already renders "Awaiting quotes."
- Pure UI: compare `Date.now() - case.createdAt` against 72 hours, show different message.

**Doctor Pass SECOND (Phase 2, ~5 hours):**
- New store method: `store.passCase(caseId, doctorId)`, new storage key, dashboard filtering.
- UI: Pass button on case cards, "Passed" section, undo mechanism.

**Connect Pass → Timeout (Phase 2 followup, ~2 hours):**
- Upgrade timeout: "3 of 5 doctors reviewed your case, waiting for 2 more."

---

### 5. Accessibility: Component Foundation Strategy

**Phase 3a: Create 2 wrapper components (~2-3 hours):**
1. `AccessibleButton` — wraps TouchableOpacity, requires `accessibilityLabel` (TypeScript enforced), auto-sets `accessibilityRole="button"`, sensible `hitSlop`
2. `AccessibleInput` — wraps TextInput, requires `accessibilityLabel`, auto-associates error messages via `accessibilityHint`

**Then apply via critical path (~10-11 hours):**
- 3b: Auth screens (both roles) — ~1 hour (mostly done)
- 3c: Both dashboards — ~3 hours (62 TouchableOpacity: 15 doctor + 47 patient)
- 3d: Patient case submission flow — ~3 hours
- 3e: Doctor case-detail + quote builder — ~2 hours
- 3f: Quote acceptance → booking flow — ~2 hours

**Total: ~13 hours. Score: 2/10 → 5-6/10.**

---

### 6. Schedule: Calendar-Primary Design

**Unified "Schedule" tab structure:**
```
Calendar (always visible, color-coded)
  - Teal = open, Gray = closed, Red dot = blocked slots, Yellow dot = date override
  - Tap date → shows day's time slots below

Selected Day Panel (below calendar)
  - Time slot grid (30-min blocks, tap to block/unblock)
  - Block All / Unblock All

Bottom action bar
  - "Set Default Hours" button → full-screen modal with weekly hours editor
  - Save button for slot changes
```

- Default hours = set-once modal (not always visible)
- Freed tab slot → "Earnings" (currently only via dashboard header icon)
- Tab name: "Schedule"

---

### 7. Case Detail: Smart Collapse Pattern

```
Header (patient name, case #, avatar)

PATIENT CONTEXT (auto-collapsed after first visit)
  [v] Patient Info         ← collapsed by default on revisit
  [v] Medical History      ← collapsed
  [v] Dental Issues        ← collapsed
  [>] Files & X-rays (3)  ← count badge always visible

─── divider ───

REQUESTED TREATMENTS      ← always visible (short)
  [Copy to Plan] button

YOUR TREATMENT PLAN       ← never collapsible (action area)
  Plan items + pricing
  Visit settings + gaps
  Total

[Send Quote → $X,XXX]    ← sticky bottom bar
```

- Patient Context: expanded first visit, remembers collapsed state
- Files: count badge visible even when collapsed
- Treatment Plan: never collapsible (primary action)
- Reduces 15+ screen-height scroll to 2-3 with collapse

---

### 8. Multi-Visit Presets: 8 Templates

| Preset | Visits | Default Gaps | Reason |
|--------|--------|-------------|--------|
| Standard Implant | 2 | 4 months | Bone integration |
| Implant + Bone Graft | 3 | 5mo, then 4mo | Bone integration |
| Veneer Set (4-10) | 2 | 10 days | Lab processing |
| Full Mouth Reconstruction | 3 | 14 days, 10 days | Lab/fabrication |
| Smile Makeover | 2 | 12 days | Lab processing |
| Invisalign Start | 2 | 18 days | Custom fabrication |
| Root Canal + Crown | 2 | 10 days | Lab processing |
| Extraction + Immediate Implant | 2 | 4 months | Bone integration |

**UI:**
```
── QUICK SETUP ──
[Standard Implant]  [Veneers]  [Root Canal + Crown]  [More v]
                                                       ├── Implant + Bone Graft
                                                       ├── Full Mouth
                                                       ├── Smile Makeover
                                                       ├── Invisalign Start
                                                       └── Extraction + Implant
```

- Top 3 as horizontal chips, rest in "More" dropdown
- Auto-fills visit count + gap configs (months, days, reason)
- Does NOT overwrite treatment items or prices
- Doctor can adjust any preset value after selection
