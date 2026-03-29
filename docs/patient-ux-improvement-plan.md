# Concourse Patient UX Improvement Plan

**Document version**: 3.0
**Date**: 2026-03-28
**Status**: Team-reviewed, consensus reached (Planner final decisions)
**Authors**: UX Planning Team (Research, Experience, Planner, QA Agents)

---

## 1. Executive Summary

- **Cut case-creation from 8 screens to 4** by moving treatment selection earlier, deferring medical/dental history to a post-submission enrichment checklist. Aligns with industry benchmark of 1-3 steps to first value (70-80% conversion) vs current 7-9 step zone (30-40% conversion).

- **Adopt the treatment-intent split from Flow B** ("I know what I need" vs "Help me figure it out"). Proven pattern (SmileDirectClub, Zocdoc) that routes patients to the right experience immediately.

- **Introduce an Enrichment Checklist on the dashboard** for pending/active cases. Medical history, dental history, and file uploads become optional-but-encouraged tasks. Includes a mandatory "Quick Health Screen" (3 yes/no questions) to protect quote quality.

- **Simplify registration**: Remove phone OTP (defer to pre-booking). Registration saves profile to store immediately.

- **Add doctor-side support for minimal cases**: Empty-state messaging, "Help me" case type with dentist-proposed treatments, and live enrichment data sync.

---

## 2. Current State Analysis

### 2.1 Flow A Problems (devdesign branch)

| Problem | Severity | Evidence |
|---------|----------|----------|
| 8 screens before case submission | Critical | Industry benchmark is 1-3 steps. Flow A is 2-3x the norm. |
| Medical/dental history before ANY value shown | Critical | No major healthcare app does this (Zocdoc, Practo, PlacidWay all defer). |
| Dual OTP (email + phone) at registration | High | 4/5 drop-off score. Industry standard is single verification. |
| Treatment selection is screen 6 of 8 | High | First screen where patients feel engaged -- buried too deep. |
| Review screen shows "Completed" badges, not actual data | Medium | Patient cannot verify selections without tapping "Edit" on each. |
| Upload button label says "Next: Select Treatment" (wrong) | Medium | Should say "Next: Review". |
| No progress indicator showing total journey length | Low | Patient doesn't know how many steps remain. |

**Flow A route**:
```
Login -> basic-info -> medical-history -> dental-history -> travel-dates
  -> treatment-select -> upload -> review -> dashboard
```

### 2.2 Flow B Problems (devnewflow branch)

| Problem | Severity | Evidence |
|---------|----------|----------|
| Removed custom treatment inputs | High | Regression: Flow A allows custom treatment names, Flow B lost this. |
| patient-info accordion combines too much | Medium | Basic + medical + dental in one scrollable accordion, overwhelming on small phones. |
| "Help me" path skips to upload with no context | Medium | Dentists receive photos with no description of the concern. |
| No travel dates screen at all | Medium | Completely dropped with no replacement. |

### 2.3 What Each Flow Gets Right

| Flow A Strengths | Flow B Strengths |
|-----------------|-----------------|
| Complete data collection (all fields) | Treatment-intent split (validated UX pattern) |
| Custom treatment inputs | Fewer screens to submission |
| Travel dates screen (well-designed) | JourneyChecklist concept on dashboard |
| Upload supports 3 categories | "Help me" path for uncertain patients |
| Medical/dental history screens are thorough | Combined profile approach (concept) |

---

## 3. Proposed New Flow

### 3.1 Overview

```
PHASE 1: REGISTRATION (1 screen)
  /auth/patient-create-account
    - Email OTP only (no phone)
    - Saves name + country to PATIENT_PROFILE + sets CURRENT_USER  [QA Fix #1]
    - Navigates to: /patient/basic-info

PHASE 2: CASE CREATION (4 screens to submit)
  Screen 1: /patient/basic-info         DOB only (name+country already saved)
  Screen 2: /patient/treatment-intent   "I know" vs "Help me" choice
  Screen 3: /patient/treatment-select   OR /patient/concern-describe
  Screen 4: /patient/review             Data summary + Quick Health Screen + submit

PHASE 3: POST-SUBMIT (dashboard)
  /patient/dashboard                    Cases list + Enrichment Checklist

PHASE 4: POST-SUBMIT ENRICHMENT (checklist, any order)
  /patient/upload                       X-rays, treatment plans, photos
  /patient/medical-history              Full medical history
  /patient/dental-history               Full dental history

PHASE 5: PRE-BOOKING (required gates)
  Phone verification modal              Inline on quote-detail before booking
  (travel-dates REMOVED — visit-schedule + arrival-info already cover this)
```

**Screen count comparison**:

| Metric | Flow A | Flow B | Proposed v2 |
|--------|--------|--------|-------------|
| Screens to submit case | 8 | 5-6 | 4 |
| Required data fields pre-submit | ~15+ | ~10 | 5-7 (name, country, DOB, treatment/concern, 3-4 health Qs) |
| Medical history timing | Pre-value | Pre-value (accordion) | Post-submit checklist |

### 3.2 Screen-by-Screen Specification

---

#### Screen 0: Registration (`/auth/patient-create-account`)

**Changes from current**:
- REMOVE phone number + phone OTP
- KEEP email + email OTP, name, password, terms checkbox
- ADD: Country selector using `ALL_COUNTRIES` + `POPULAR_COUNTRIES` from basic-info (195 countries, name-only — NOT the `COUNTRY_CODES` phone dial code list which only has 20 entries). Extract the country data to a shared constant in `constants/countries.ts` for reuse. **Medium effort** per QA.
- **NEW: Save to store on completion** [QA Fix #1]:

```typescript
// After successful registration, BEFORE navigation:
await store.savePatientProfile({
  fullName: `${firstName} ${lastName}`,
  country: selectedCountry,
  email: email,
});
await store.setCurrentUser('patient', `${firstName} ${lastName}`);

// Then navigate
router.replace('/patient/basic-info');
```

**Navigation**: From login → To basic-info

---

#### Screen 1: Basic Info (`/patient/basic-info`)

**Purpose**: Collect DOB only (name and country already saved at registration).

**Changes**: Simplify to DOB picker + "Next" button. Keep the passport name display as read-only confirmation ("Hi Sarah Johnson, United States").

**Navigation**: → `/patient/treatment-intent`

**For returning users creating a new case**: Dashboard "New Case" button skips this screen (DOB already exists), goes directly to `/patient/treatment-intent`.

---

#### Screen 2: Treatment Intent (`/patient/treatment-intent`)

**Adopted from**: Flow B (devnewflow) with copy tweaks.

**Two cards**:
- **Card A**: "I know what I need" → `/patient/treatment-select?caseMode=specific`
- **Card B**: "Help me figure it out" → `/patient/concern-describe`

**Footer**: "Either way, the final plan is confirmed at the clinic."

**On mount**: Clear stale drafts as safety net [QA Fix #18]:
```typescript
useEffect(() => {
  AsyncStorage.multiRemove(['CASE_DRAFT_TREATMENTS', 'CASE_DRAFT_CONCERN']);
}, []);
```

**Back button**: Returns to basic-info (first case) or dashboard (new case).

---

#### Screen 3A: Treatment Select (`/patient/treatment-select`)

**Changes**:
- KEEP all 13 treatments with sub-options + custom inputs
- FIX button label: "Next: Review"
- Data saved to **session draft, not global singleton** [QA Fix #2]:

```typescript
// Instead of store.savePatientTreatments() (global),
// save to a temporary draft key:
const DRAFT_KEY = 'CASE_DRAFT_TREATMENTS';
await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(selections));
```

**Navigation**: → `/patient/review?caseMode=specific`

---

#### Screen 3B: Concern Describe (`/patient/concern-describe`) — NEW [OQ #2 resolved]

**Purpose**: "Help me" patients describe their concern in text + optional photo.

**Layout**:
```
[Header] "Describe your concern"
[TextInput multiline, 4+ lines, min 20 chars, max 500 chars]
  placeholder: "What's bothering you? E.g., 'Missing front tooth
  and pain in my lower left molar'"
[Character counter: "127 / 500"]
[Optional photo: Camera / Gallery buttons, inline preview]
[Photo nudge after typing 20+ chars, if no photo attached]:
  "A photo helps dentists give you a more accurate assessment."
[CTA: "Next: Review"]  — disabled until text >= 20 chars
```

**Photo policy**: Text is required (min 20 chars). Photo is optional but strongly encouraged via contextual nudge. If patient skips photo, the review screen shows a yellow warning: "No photo attached — dentists may ask for one before quoting." Track metric: proposal cases with photo vs without → quote response rate. If photo cases get 2x+ better rates, upgrade to required in v2.

**Data storage**: Save to `CASE_DRAFT_CONCERN` key (not URL param) [QA Fix for #9]:
```typescript
await AsyncStorage.setItem('CASE_DRAFT_CONCERN', JSON.stringify({
  text: concernText,
  photoUri: photoUri || null,
}));
```

**Navigation**: → `/patient/review?caseMode=proposal`

---

#### Screen 4: Review & Submit (`/patient/review`)

**Major rewrite**. Two key changes:

**Change 1: Show actual data summaries** (not "Completed" badges):

```
[Your Info]
  Sarah Johnson, United States, born May 15 1990    [Edit]

[Selected Treatments]  (specific mode)
  2x Dental Implant (Whole) — $2,000-3,000
  1x Crown — $300-600
  Est. total: $2,300-3,600                           [Edit]

[Your Concern]  (proposal mode)
  "Missing front tooth and pain in lower left..."
  [photo thumbnail]                                  [Edit]
```

**Change 2: Quick Health Screen** (3 base + 1 conditional yes/no questions) [QA Fix for #14] [OQ #1 resolved]:

```
[Quick Health Check]  — required before submit
  Are you currently taking blood thinners?    [Yes] [No]
  Do you have any drug allergies?             [Yes] [No]
  Are you pregnant or nursing?                [Yes] [No]

  (Shown only when caseMode=specific AND treatments include implant):
  Do you have diabetes?                       [Yes] [No]

  If any "Yes": [Text input] "Please briefly describe:"
```

**Rationale**: 3 base questions cover universal safety-critical conditions (blood thinners, allergies, pregnancy). Diabetes is added as a conditional 4th question only for implant patients, since diabetes significantly affects implant osseointegration and healing. This keeps the screen at 3 questions for most patients (~10 seconds) while capturing the critical factor for the treatment type where it matters most. If enrichment checklist completion falls below 50%, revisit making diabetes a base question for all patients.

**Decision**: 3 base + conditional diabetes for implants. Do NOT expand further — 4+ base questions starts feeling like a medical form, undermining the streamlined flow.

**Change 3: Visit Timeframe indicator** (optional, from Research agent) [Late addition]:

```
When are you thinking of visiting Korea?
( ) Within 2 weeks
( ) Within 1 month
( ) Within 3 months
( ) Flexible
( ) Not sure yet    ← default if unanswered
```

Single-select, optional. Defaults to "Not sure yet" if skipped. Helps dentists prioritize cases without requiring exact travel dates. Shown on doctor case-detail as an info badge: "Timeline: Within 1 month".

**Submit button validation gate** [QA Fix #17]:
- Submit button is **disabled** until:
  - All 3 base Quick Health questions are answered (+ diabetes if shown)
  - Specific mode: at least 1 treatment selected
  - Proposal mode: concern text >= 20 characters

**Submit logic — NO fake fallback data** [QA Fix #3]:
```typescript
const handleSubmit = async () => {
  const profile = await store.getPatientProfile();
  const caseMode = params.caseMode || 'specific';

  let treatments = [];
  let concernDescription = '';
  let concernPhoto: string | undefined;

  if (caseMode === 'specific') {
    const draft = await AsyncStorage.getItem('CASE_DRAFT_TREATMENTS');
    treatments = draft ? JSON.parse(draft) : [];
  } else {
    const draft = await AsyncStorage.getItem('CASE_DRAFT_CONCERN');
    const concern = draft ? JSON.parse(draft) : {};
    concernDescription = concern.text || '';
    concernPhoto = concern.photoUri || undefined;  // Transfer photo to case [QA Fix #22]
  }

  await store.createCase({
    patientName: profile.fullName,
    country: profile.country,
    birthDate: profile.birthDate,
    caseMode,                              // NEW field
    treatments: treatments,                // Empty array for "proposal" mode — NOT fake data
    concernDescription: concernDescription, // NEW field for "help me" cases
    concernPhoto: concernPhoto || undefined, // Photo URI from draft [QA Fix #22]
    medicalNotes: '',                       // Explicitly empty — NOT fake defaults
    dentalIssues: [],                       // Explicitly empty array
    quickHealth: {                          // NEW: Quick Health Screen answers
      bloodThinners: bloodThinnersAnswer,
      drugAllergies: drugAllergiesAnswer,
      pregnantNursing: pregnantAnswer,
      ...(hasImplantTreatment && { diabetesImplant: diabetesAnswer }),
      details: healthDetails || '',
    },
    visitDate: selectedTimeframe || 'Not sure yet',  // Reuse existing field (not new visitTimeframe)
    filesCount: { xrays: 0, treatmentPlans: 0, photos: 0 },
  });

  // Clear draft keys
  await AsyncStorage.multiRemove(['CASE_DRAFT_TREATMENTS', 'CASE_DRAFT_CONCERN']);
};
```

---

#### Screen 5: Dashboard + Enrichment Checklist

**Enrichment Checklist** appears as a card at the top of the dashboard when a case has `status: "pending"` or `"quotes_received"`.

**Checklist spec**:
```
+--------------------------------------------+
| Complete your profile for better quotes 3/6 |
| [======--------] 50%                       |
|                                            |
| [x] Basic info                             |
| [x] Treatment / concern submitted          |
| [x] Case submitted                         |
| [ ] Upload X-rays & photos      [Add ->]  |
| [ ] Medical history              [Add ->]  |
| [ ] Dental history               [Add ->]  |
+--------------------------------------------+
```

**Completion check — single source of truth (store keys only)** [QA Fix for #12]:

No `enrichmentStatus` field on `PatientCase`. Instead, checklist reads directly from store:

```typescript
// Single async batch load with loading state [QA Fix for #11]
const [checklistState, setChecklistState] = useState<Record<string, boolean> | null>(null);

useFocusEffect(useCallback(async () => {
  const [files, medical, dental] = await Promise.all([
    store.getPatientFiles(),
    store.getPatientMedical(),
    store.getPatientDental(),
  ]);
  setChecklistState({
    files: !!(files?.xrays?.length || files?.photos?.length),
    medical: !!(medical?.conditions?.length || medical?.medications?.length),
    dental: !!(dental?.issues?.length),
  });
}, []));

// Show skeleton while checklistState === null
```

**Navigation from checklist items** [QA Fix for #15]:

Each "Add" button uses `router.push` with `?from=checklist`. Target screens detect this param:

```typescript
// In medical-history.tsx, dental-history.tsx, upload.tsx:
const { from } = useLocalSearchParams();
const handleDone = () => {
  if (from === 'checklist') {
    router.replace('/patient/dashboard');  // Predictable nav, avoids stack depth issues [QA Fix #19]
  } else if (from === 'review') {
    router.back();  // Review is always exactly one screen back
  } else {
    router.push('/patient/next-screen');  // Normal linear flow
  }
};
```

**Returning users creating a second case** [QA Fix for #16]:

Dashboard "New Case" button clears draft keys before navigating:
```typescript
const handleNewCase = async () => {
  await AsyncStorage.multiRemove(['CASE_DRAFT_TREATMENTS', 'CASE_DRAFT_CONCERN']);
  router.push('/patient/treatment-intent');
};
```

Global profile data (`PATIENT_MEDICAL`, `PATIENT_DENTAL`, `PATIENT_FILES`) is reused across cases — this is correct behavior since a patient's medical history doesn't change between cases.

### 3.3 Enrichment Nudging Strategy [OQ #3 resolved]

Three-layer approach to drive checklist completion without push notifications:

**Layer 1: In-app banner on dashboard** (as specced above). Catches patients who open the app.

**Layer 2: Email CTA on quote notification**. When a quote notification email is sent (e.g., "You have 2 new quotes!"), include a secondary CTA: "Complete your profile for more accurate quotes." This piggybacks on an email the patient already expects, requires no new notification infrastructure.

**Layer 3: Enrichment prompt on quote-detail** (highest leverage). When viewing a specific quote, if the enrichment checklist is incomplete, show a gentle banner at the top:
```
+----------------------------------------------+
| Want more accurate pricing?                   |
| Complete your medical history for better      |
| quotes. [Complete now]                        |
+----------------------------------------------+
```
This targets the patient at the moment they CARE most about quote accuracy — when evaluating a specific dentist's offer.

**Implementation**: Layer 1 is P1 (dashboard checklist). Layer 3 is P1 (add to quote-detail). Layer 2 is P2 (requires email integration).

---

## 4. Doctor-Side Changes [QA Fix #4, #5, #6]

### 4.1 Case Detail — Empty State Messaging

`doctor/case-detail.tsx` must handle cases with missing data:

```typescript
// Medical section
{c.medicalNotes ? (
  <Text>{c.medicalNotes}</Text>
) : (
  <View style={s.pendingInfo}>
    <Text style={s.pendingIcon}>⏳</Text>
    <Text style={s.pendingText}>
      Patient hasn't provided medical history yet.
      Quick health screen: {c.quickHealth?.bloodThinners ? 'Blood thinners: Yes' : 'No flags reported'}
    </Text>
  </View>
)}

// Treatments section (for "proposal" / "Help me" cases)
{c.caseMode === 'proposal' ? (
  <View style={s.proposalCard}>
    <Text style={s.proposalLabel}>PATIENT CONCERN</Text>
    <Text style={s.proposalText}>{c.concernDescription}</Text>
    {c.concernPhoto && <Image source={{ uri: c.concernPhoto }} style={s.concernPhoto} />}
    <Text style={s.proposalHint}>
      This patient needs your diagnosis. Suggest treatments in your quote.
    </Text>
  </View>
) : (
  // Normal treatment list rendering (existing code)
)}
```

### 4.2 Quote Creation — "Proposal" Cases [QA Fix #6]

For `caseMode === 'proposal'` cases, the doctor's quote flow changes:

- Doctor can ADD treatment line items (not just price existing ones)
- Quote UI shows "Suggest treatments for this patient" header
- Doctor fills: treatment name, qty, price per item — building the treatment plan
- These proposed treatments are saved on `DentistQuote.treatments[]` as usual
- Patient sees the proposed treatments on quote-detail

**Implementation**: Modify `doctor/case-detail.tsx` "Send Quote" section to allow adding treatment rows when no treatments exist on the case.

### 4.3 Notification Text for Proposal Cases [QA Codebase Fix]

The `createCase()` notification body (store.ts ~line 481) says `${caseData.treatments?.length || 0} treatments`. For proposal cases with no treatments, this shows "0 treatments". Fix:

```typescript
body: caseData.caseMode === 'proposal'
  ? `New consultation request from ${caseData.patientName} (${caseData.country})`
  : `${caseData.treatments?.length || 0} treatments requested by ${caseData.patientName} (${caseData.country})`,
```

### 4.4 Live Enrichment Sync [QA Fix #5]

When a patient completes checklist items, the case must be updated:

```typescript
// NEW function in store.ts:
async syncCaseEnrichment(caseId: string) {
  const [medical, dental, files] = await Promise.all([
    this.getPatientMedical(),
    this.getPatientDental(),
    this.getPatientFiles(),
  ]);

  const updates: Partial<PatientCase> = {};

  if (medical) {
    const notes = [];
    if (medical.conditions?.length) notes.push(`Conditions: ${medical.conditions.join(', ')}`);
    if (medical.medications?.length) notes.push(`Medications: ${medical.medications.join(', ')}`);
    if (medical.allergies?.length) notes.push(`Allergies: ${medical.allergies.join(', ')}`);
    updates.medicalNotes = notes.join('. ') || '';
  }

  if (dental?.issues?.length) {
    updates.dentalIssues = dental.issues;
  }

  if (files) {
    updates.filesCount = {
      xrays: files.xrays?.length || 0,
      treatmentPlans: files.treatmentPlans?.length || 0,
      photos: files.photos?.length || 0,
    };
  }

  await this.updateCase(caseId, updates);

  // Notify doctors that case was updated
  await this.addNotification({
    role: 'doctor',
    type: 'case_updated',
    title: 'Patient updated their case',
    body: `New information added to Case #${caseId}`,
    icon: '📋',
    route: `/doctor/case-detail?caseId=${caseId}`,
  });
}
```

**Trigger**: Call `syncCaseEnrichment(caseId)` at the end of medical-history, dental-history, and upload screens when `from=checklist`.

---

## 5. Data Model Changes

### 5.1 PatientCase Additions (`lib/store.ts`)

```typescript
interface PatientCase {
  // ... existing fields ...

  // NEW fields:
  caseMode?: 'specific' | 'proposal';
  concernDescription?: string;        // Free text for "Help me" path
  concernPhoto?: string;              // Photo URI for "Help me" path [QA Fix #22]
  quickHealth?: {                     // 3 base + 1 conditional question
    bloodThinners: boolean;
    drugAllergies: boolean;
    pregnantNursing: boolean;
    diabetesImplant?: boolean;        // Only present when implant treatment selected
    details: string;
  };
  // visitDate already exists on PatientCase — reuse it for the review-screen timeframe indicator.
  // Do NOT add a separate visitTimeframe field. Write timeframe values ("Within 1 month", etc.)
  // to `visitDate`. Pre-booking travel-dates screen overwrites with exact dates later.
}
```

No `enrichmentStatus` field — checklist reads store keys directly [QA Fix #12].

### 5.2 Draft Storage Pattern [QA Fix #2]

Instead of overwriting global `PATIENT_TREATMENTS` singleton during case creation:

| Key | Purpose | Lifecycle |
|-----|---------|-----------|
| `CASE_DRAFT_TREATMENTS` | Temp storage during "I know" flow | Cleared on submit |
| `CASE_DRAFT_CONCERN` | Temp storage during "Help me" flow | Cleared on submit |
| `PATIENT_TREATMENTS` | Global (existing) | Kept for existing screens, backward compat |
| `PATIENT_MEDICAL` | Global (existing) | Shared across cases (correct — same patient) |
| `PATIENT_FILES` | Global (existing) | Shared across cases |

### 5.3 seedDemoData() Updates [QA Fix for #10]

```typescript
// Add to seedDemoData():
// Case 1 (booked) — full data, caseMode: 'specific'
// Case 2 (pending) — minimal data, caseMode: 'proposal', with concernDescription
// Case 3 (pending) — caseMode: 'specific', no medical data yet (shows checklist)

// Add quickHealth to booked case (has implant → includes diabetesImplant):
quickHealth: { bloodThinners: false, drugAllergies: false, pregnantNursing: false, diabetesImplant: false, details: '' },

// Add caseMode to existing cases:
caseMode: 'specific',  // on Case 1
caseMode: 'proposal',  // on Case 2 (new demo case)
concernDescription: 'I have a missing front tooth and some pain in my lower left area. Want to explore implant options.',
```

---

## 6. Migration Plan

### 6.1 Keep from Flow A (devdesign)

| Asset | Notes |
|-------|-------|
| treatment-select.tsx | Keep all 13 treatments + custom inputs. Fix button label. |
| upload.tsx | Keep 3-category system. Add `from` param support. |
| medical-history.tsx | Keep as-is. Add `from=checklist` support + `syncCaseEnrichment` call. |
| dental-history.tsx | Keep as-is. Add `from=checklist` support + `syncCaseEnrichment` call. |
| travel-dates.tsx | Keep. Move to pre-booking (triggered from quote-detail). |
| All post-booking screens | No changes. |

### 6.2 Keep from Flow B (devnewflow)

| Asset | Notes |
|-------|-------|
| treatment-intent.tsx | Adopt with minor copy tweaks. |
| JourneyChecklist concept | Reimplement as Enrichment Checklist (simpler, store-key based). |
| `caseMode` parameter pattern | Adopt for routing. |
| Dashboard "New Case" → intent routing | Adopt. |

### 6.3 New

| Asset | Description |
|-------|-------------|
| concern-describe.tsx | New screen for "Help me" path. |
| Enrichment Checklist component | New component on dashboard. |
| Quick Health Screen | 3 yes/no questions on review screen. |
| Phone verification modal | Inline on quote-detail pre-booking. |
| `syncCaseEnrichment()` | New store function for live case updates. |
| Doctor case-detail empty states | Messaging for missing data + proposal cases. |
| Doctor quote creation for proposal cases | UI for suggesting treatments. |

### 6.4 Remove

| Asset | Reason |
|-------|--------|
| Phone OTP in registration | Deferred to pre-booking. Remove ~50 lines: phone number input, `COUNTRY_CODES` phone picker, phone OTP verification state/UI, `phoneVerified` validation gate (line 208). The `COUNTRY_CODES` list is NOT reused for the new country selector (different dataset). |
| patient-info.tsx accordion (Flow B) | Not adopted. Separate screens via checklist instead. |
| Mandatory medical/dental before submit | Replaced by Quick Health Screen + optional checklist. |
| Fake fallback data in review.tsx | Removed. Empty = legitimately empty. |

### 6.5 Travel Dates Placement [QA Fix for #13]

Travel dates are required **before booking confirmation**, not before case submission.

**Trigger**: When patient taps "Accept Quote" on quote-detail:
1. Check if `PATIENT_TRAVEL` has data
2. If not → push `/patient/travel-dates?from=booking&quoteId=X`
3. travel-dates "Next" button → return to quote-detail, continue booking flow
4. If yes → proceed directly to booking confirmation

---

## 7. Implementation Priority

### P0 — Must Do (core flow change)

| Task | Effort | Files |
|------|--------|-------|
| Registration saves to store | Small | `auth/patient-create-account.tsx` |
| Remove phone OTP from registration | Small | `auth/patient-create-account.tsx` |
| Add country selector to registration | Medium | `auth/patient-create-account.tsx` (import from basic-info) |
| Simplify basic-info to DOB only | Small | `patient/basic-info.tsx` |
| Port treatment-intent from devnewflow | Small | `patient/treatment-intent.tsx` |
| Create concern-describe screen | Medium | New: `patient/concern-describe.tsx` |
| Rewrite review with data summaries + Quick Health | Medium | `patient/review.tsx` |
| Use draft keys instead of global singleton | Small | `patient/treatment-select.tsx`, `patient/review.tsx` |
| Remove fake fallback data from review submit | Small | `patient/review.tsx` |
| Fix upload button label | Trivial | `patient/upload.tsx` |
| Update dashboard "New Case" routing | Small | `patient/dashboard.tsx` |

**Total P0**: ~5-6 dev days

### P1 — Should Do (within 1 week of P0)

| Task | Effort | Files |
|------|--------|-------|
| Build Enrichment Checklist component | Medium | New: `components/EnrichmentChecklist.tsx` |
| Integrate checklist into dashboard | Medium | `patient/dashboard.tsx` |
| Add `from=checklist` nav support | Small | medical-history, dental-history, upload |
| Add `syncCaseEnrichment()` to store | Medium | `lib/store.ts` |
| Doctor case-detail empty states | Medium | `doctor/case-detail.tsx` |
| Doctor quote creation for proposal cases | Medium | `doctor/case-detail.tsx` |
| Fix notification text for proposal cases | Trivial | `lib/store.ts` |
| Add enrichment prompt on quote-detail | Small | `patient/quote-detail.tsx` |
| Add case card completion badge on dashboard | Small | `patient/dashboard.tsx` |
| Update seedDemoData() | Small | `lib/store.ts` |

**Total P1**: ~5-6 dev days

### P2 — Nice to Have (within 2 weeks)

| Task | Effort | Files |
|------|--------|-------|
| Phone verification modal pre-booking | Medium | `patient/quote-detail.tsx` |
| Travel dates as pre-booking gate | Small | `patient/quote-detail.tsx`, routing |
| Progress bar on case creation screens | Small | All 4 screens |
| Email CTA for enrichment on quote notifications | Small | Email template (needs backend) |
| Checklist push notifications (needs backend) | Medium | Backend + notification system |

**Total P2**: ~3-4 dev days

---

## 8. Success Metrics

| Metric | Current (est.) | Target | How to Measure |
|--------|---------------|--------|----------------|
| Case submission rate | ~30-40% | 65-75% | Cases / registrations |
| Time to first submit | ~8-12 min | ~3-5 min | Timestamp delta |
| Registration completion | ~50% | ~75% | Completed / started |
| Enrichment checklist completion | N/A | 60-70% | Items done within 48h |
| Quote acceptance rate | Baseline | +15-20% | Bookings / quotes |

### Risk Metrics

| Risk | Metric | Threshold | Action |
|------|--------|-----------|--------|
| Dentists get low-quality cases | Quote response time | > 20% increase | Add mandatory fields |
| Patients skip checklist | Completion < 40% at 1 week | Trigger reminders |
| Phone verify at booking blocks | Abandonment > 30% at phone step | Move phone earlier |
| "Help me" cases get poor quotes | Proposal case quote rate < 50% of specific | Require at least 1 photo for proposal |

---

## 9. QA Resolution Log

| # | Blocking Issue | Resolution |
|---|---------------|------------|
| 1 | Registration doesn't save to store | Spec now requires `store.savePatientProfile()` + `store.setCurrentUser()` calls after registration, before navigation. See Section 3.2 Screen 0. |
| 2 | `PATIENT_TREATMENTS` is global singleton | Introduced `CASE_DRAFT_TREATMENTS` and `CASE_DRAFT_CONCERN` temp keys. Cleared on submit. Global keys kept for backward compat. See Section 5.2. |
| 3 | Review uses fake fallback data | Submit logic now uses explicit empty values (`medicalNotes: ''`, `dentalIssues: []`). No fake defaults. See Section 3.2 Screen 4. |
| 4 | Doctor-side not addressed | Added Section 4 with empty-state messaging, proposal case UI, and quote creation for treatment-less cases. |
| 5 | Enrichment data doesn't sync to case | Added `syncCaseEnrichment()` store function. Called when checklist items are completed. Sends doctor notification. See Section 4.4. |
| 6 | "Help me" cases break doctor quote flow | Doctors can now ADD treatment suggestions for proposal cases. Quote UI adapts based on `caseMode`. See Section 4.2. |

| # | Important Issue | Resolution |
|---|----------------|------------|
| 7 | Basic-info purpose contradictory | Clarified: Registration = name + country + email. Basic-info = DOB only. Returning users skip basic-info. |
| 8 | Country selector effort underestimated | Marked as Medium effort (not Small). |
| 9 | Concern as URL param fragile | Changed to `CASE_DRAFT_CONCERN` AsyncStorage key. |
| 10 | seedDemoData needs updating | Added spec in Section 5.3. |
| 11 | Checklist no loading state | Added `Promise.all` batch load + skeleton while null. See Section 3.2 Screen 5. |
| 12 | Dual source of truth | Removed `enrichmentStatus` from PatientCase. Checklist reads store keys only. |
| 13 | Travel dates unspecified | Added to Section 6.5: triggered as pre-booking gate from quote-detail. |
| 14 | Deferred medical hurts quotes | Added mandatory Quick Health Screen (3 yes/no) on review. Covers critical safety info. |
| 15 | `from=checklist` not implemented | Added nav spec in Section 3.2 Screen 5 with code example. |
| 16 | Returning users / second case | Dashboard "New Case" clears draft keys. Global profile data intentionally shared. |
| 17 | Submit button has no validation gate | Submit disabled until all Quick Health questions answered AND treatments/concern provided. See Section 3.2 Screen 4. |
| 18 | Stale drafts on app kill / deep link | treatment-intent clears both draft keys on mount as safety net. |
| 19 | `router.back()` unreliable for checklist | Use `router.replace('/patient/dashboard')` for `from=checklist`. Keep `router.back()` for `from=review`. |
| 20 | Notification says "0 treatments" for proposal cases | Conditional notification body based on `caseMode`. See Section 4.3. |
| 21 | Country selector dataset confusion | Registration uses `ALL_COUNTRIES` (195, name-only), NOT `COUNTRY_CODES` (20, dial codes). Extract to shared `constants/countries.ts`. |
| 22 | `concernPhoto` referenced but not on data model | Added `concernPhoto?: string` to PatientCase. Submit logic now transfers `photoUri` from `CASE_DRAFT_CONCERN` to case. Doctor code at Section 4.1 can reference `c.concernPhoto`. |

---

## 10. Open Questions — Resolved

All open questions have been resolved by team consensus (Planner final decisions, informed by Experience and QA input):

### OQ #1: Quick Health Screen — is 3 questions enough?

**Decision: 3 base questions + conditional diabetes for implant patients.**

Keep blood thinners, drug allergies, and pregnant/nursing as universal. Add "Do you have diabetes?" only when `caseMode=specific` AND selected treatments include implant. Rationale: 3 feels like a quick checkpoint (~10 seconds); 4+ feels like a medical form. Diabetes is critical for implants specifically (osseointegration) but not a universal safety blocker like blood thinners. If enrichment completion falls below 50%, revisit making diabetes universal.

*Sources: Experience agent (patient perspective on friction), QA (interface update)*

### OQ #2: "Help me" minimum quality — require photo?

**Decision: Text required (min 20 chars), photo strongly encouraged but optional.**

Require minimum 20 characters of concern description. Show contextual photo nudge after text is typed. On review screen, show yellow warning if no photo: "No photo attached — dentists may ask for one before quoting." Track proposal-with-photo vs without-photo quote response rates. If photo cases get 2x+ better rates, upgrade to required in v2.

*Sources: Experience agent (patient would skip photo if forced, text is minimum viable), Risk Metrics table already covers this escalation path*

### OQ #3: Checklist nudging — how to remind without push notifications?

**Decision: 3-layer nudging approach.**

1. **In-app dashboard banner** (P1) — catches patients who open the app
2. **Enrichment prompt on quote-detail** (P1, highest leverage) — targets patients at the moment they care most about quote accuracy
3. **Email CTA on quote notification** (P2, needs backend) — piggybacks on expected email

Layer 2 (quote-detail prompt) is the most impactful because it targets the highest-intent moment. See Section 3.3 for full spec.

*Sources: Experience agent (3-layer proposal), Planner (prioritization)*

### OQ #4: Travel dates timing — should dentists see them before quoting?

**Decision: Keep travel dates as pre-booking gate. Do NOT move to case submission.**

Dental treatment pricing is based on procedures, not travel dates. Seasonal pricing is not standard in dental tourism — clinics have fixed treatment prices. Travel dates affect logistics (scheduling, coordination) not clinical quoting. Adding travel dates pre-submit would add a 5th screen, undermining the core "4 screens to submit" improvement. Dentists can ask about timing via chat if needed.

*Sources: Planner analysis (dental pricing is procedure-based, not seasonal)*

### OQ #5: Existing Flow A users — data migration needed?

**Decision: No migration needed. Old data coexists safely.**

All new fields on PatientCase are optional (`caseMode?`, `concernDescription?`, `quickHealth?`). Existing cases without these fields will render correctly via optional chaining (already used throughout the codebase). Old `PATIENT_TREATMENTS` global key is kept for backward compatibility. No AsyncStorage schema version or migration script required.

*Sources: QA (confirmed optional chaining pattern), Planner (risk assessment)*
