# Concourse UX/UI Comprehensive Evaluation

## Executive Summary

Concourse is a well-structured prototype for a complex dental tourism domain. The patient-side Treatment Intent A/B fork and doctor-side Dashboard status grouping are excellent core flow designs. However, both roles share common patterns of **information overload**, **incomplete feedback loops**, and **accessibility gaps**. As a demo, functional completeness is impressive, but moving to a shippable product requires resolving single-screen overload, cross-role communication gaps, and internationalization foundations.

---

## Cross-Role Pattern Analysis

Structural issues found on both sides:

- **Single screen overload**: Patient Review (case summary + health questionnaire), Doctor Case Detail (patient info + X-ray + quote builder + multi-visit) all pack too much into one screen
- **Accessibility imbalance**: Auth screens have 23 labels, patient screens 48 labels (7/43 files), doctor screens **0 labels** (all 14 files). Screen reader users cannot use the doctor flow at all.
- **Feedback loop gaps**: If a doctor ignores a case, patient waits indefinitely ("Awaiting Quotes"). If a patient needs refund info, they must find terms.tsx section 6. Neither side gets feedback about the other's action/inaction.
- **Internationalization gaps**: Dates hardcoded to `en-US` format, doctor chat disclaimer in Korean, license limited to "U.S. Dental License" -- mismatches with the international patient + Korean doctor target audience.
- **Demo data in production paths**: "Dr. Kim" (doctor/dashboard.tsx:211), "70% less" (index.tsx:65) hardcoded instead of dynamic.
- **No withdrawal/settlement path**: Doctor Earnings shows revenue but no withdrawal mechanism. Patient side also lacks payment receipt/confirmation flow.

---

## Urgency Classification

### 🔴 Immediate Fix (Bug/Crash)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | Edit button routes to non-existent `/patient/concern` | review.tsx:488 | Crash or blank screen |
| 2 | Avatar initial bug — `name[4]` → `name[0]` | doctor/profile.tsx:47 | Undefined/crash for short names |
| 3 | Progress dot count mismatch (4/3/3/3) | Patient onboarding | User location confusion |

### 🟡 Short-term (1-2 weeks) — 12 items

1. Remove "Dr. Kim" hardcoding → dynamic name
2. "Payment" → "Service Plan" / "Choose Your Plan"
3. Chat disclaimer English translation
4. "Hours" vs "Schedule" tab merge
5. Quote compare 3-limit feedback message
6. Arrival Info multi-step split (8+ fields → 2-3 steps)
7. Path B Upload screen inclusion (optional)
8. Refund policy pre-exposure on booking detail
9. "Best Value" → "Lowest Price" badge
10. Splash screen doctor message branching
11. Case "Pass/Not Interested" button for doctors
12. "Awaiting Quotes" timeout guidance (72 hours)

### 🟢 Medium-term (1-2 months) — 12 items

1. Doctor registration multi-step wizard
2. Doctor flow accessibility labels (currently 0)
3. Multi-visit quote presets (implant etc.)
4. Earnings withdrawal/settlement UI placeholder
5. Date format internationalization
6. License field expansion (include Korean licenses)
7. Case Detail screen separation
8. Review & Submit health questionnaire separation
9. Dashboard empty state
10. Before-After photo Alert simplification
11. Collapsible disclaimer
12. Tier upgrade criteria display

---

## UX Scorecard

| Category | Patient | Doctor | Average |
|----------|---------|--------|---------|
| Simplicity | 5/10 | 4/10 | 4.5/10 |
| Clarity | 6/10 | 5/10 | 5.5/10 |
| Flow | 7/10 | 6/10 | 6.5/10 |
| Visual Design | 8/10 | 7/10 | 7.5/10 |
| Accessibility | 3/10 | 1/10 | 2/10 |
| **Overall** | **5.8/10** | **4.6/10** | **5.2/10** |

---

## Keep Doing (Strengths)

- Treatment Intent 2-path (A/B) design
- Dashboard status grouping
- Tag-based medical/dental history selection
- Quote detail information hierarchy
- Quick Health Screen (3 yes/no questions)
- Chat Quick Reply chips
- Earnings breakdown transparency
- DoctorTheme teal / PatientTheme purple separation
- checked_in_clinic → Final Invoice auto-routing

---

## Conclusion & Key Recommendations

### 1. "One screen = One purpose" principle (Simplicity)
Separate overloaded screens: Patient Review, Doctor Case Detail, Doctor Registration. This alone could raise Simplicity by 2-3 points.

### 2. Complete cross-role feedback loops (Flow)
Add Doctor "Pass" feature and Patient "waiting timeout" guidance. A matching platform's core value is trust -- both sides need feedback about the other's actions. 72-hour auto-guidance + 7-day auto-expiry would significantly reduce patient churn.

### 3. Accessibility foundation (Accessibility)
Zero accessibility labels across the entire doctor flow is a critical gap. Start with reusable accessible component wrappers, then apply to critical path screens.
