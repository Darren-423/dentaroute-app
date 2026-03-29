# Patient Experience UX/UI Critic Report

## 1. Overall Journey Summary

The patient journey flows through these phases:

**Onboarding** (2 screens): Splash with value prop + pricing carousel -> Role select (Patient/Dentist)

**Auth** (2 screens): Login -> Create Account (with email verification)

**Profile Collection** (up to 9 screens): Basic Info -> Treatment Intent (A/B fork) -> Path A: Treatment Select -> Review & Submit OR Path B: Concern Describe -> Review & Submit. Medical History and Dental History are collected but deferred via "enrichment checklist" on the dashboard after case submission. Travel Dates and Upload are also part of the flow.

**Core Loop** (4 screens): Dashboard -> Quotes list -> Quote Detail -> Quote Compare

**Booking Journey** (10+ screens): Visit Schedule -> Payment (Service Tier) -> Arrival Info -> Hotel Arrived -> Clinic Check-in -> Visit Checkout -> Stay or Return -> Departure Pickup -> Treatment Complete -> Write Review

**Auxiliary**: Chat, Profile, Help Center, My Trips, Cancel Booking, Reservations calendar

---

## 2. Simplicity Analysis

**Good:**
- The Treatment Intent screen (A/B fork) is excellent -- "I know what I need" vs "Help me figure it out" is a brilliant simplification that prevents overwhelm
- Tag-based selection for medical/dental history is much simpler than free-form input
- The "Quick Health Screen" on the Review page (3 yes/no questions) is a smart way to collect critical safety info without adding another screen
- "Skip for now" option on file upload reduces friction
- Country selection with popular countries as quick tags + full list modal is well designed
- The splash screen pricing comparison (US vs Korea) immediately communicates value

**Issues:**
- **[Medium]** Progress indicators are inconsistent. Basic Info shows 4 dots, Medical History shows 3 dots, Dental History shows 3 dots, Travel Dates shows 3 dots -- these don't match each other or the actual number of steps.
- **[Medium]** The profile collection flow is split across registration AND post-case-submission enrichment. A new user goes: Create Account -> Basic Info -> Treatment Intent -> (Treatment Select or Concern) -> Review & Submit. Medical History and Dental History are deferred to a dashboard checklist.
- **[Minor]** The create account screen has email verification with 6-digit code, password, confirm password, AND terms checkbox all on one long scrolling form.
- **[Minor]** `dental-history.tsx:340` -- the info card text color is `#0f5c53` (teal/green) which doesn't match the Patient purple theme.

---

## 3. Confusion Analysis

- **`basic-info.tsx` -> `treatment-intent.tsx` routing confusion**: After basic info, the patient goes directly to Treatment Intent, skipping Medical History and Dental History entirely on first run. The button says "Next" but the next screen is a completely different topic.
- **`review.tsx` "Edit" for Concern navigates to wrong route**: Line 488 navigates to `/patient/concern?from=review` but the actual screen file is `concern-describe.tsx` at route `/patient/concern-describe`. This would cause a navigation error.
- **`treatment-select.tsx` Implant UX**: The implant card behaves differently from all other treatments -- tapping it toggles an expandable sub-section instead of selecting it.
- **`quotes.tsx` "Best Value" badge**: Only shows for the lowest price, but "best value" could mean best price-to-quality ratio.
- **`payment.tsx` confusing terminology**: The screen is called "Payment" but the patient isn't paying for treatment here -- they're selecting a Concourse service tier ($49-$199).
- **Dashboard filter tabs**: The filter options use internal terminology. "with_quotes" is not patient-friendly language.

---

## 4. Flow Analysis

**Issues:**
- **Dead end on login**: `patient-login.tsx:44-58` -- The login handler does NO validation. "Forgot password?" button has no `onPress` handler.
- **Quote flow potential dead end**: If no quotes arrive, the only UI is a "waiting" card with no actionable options.
- **Back button inconsistency on auth flow**: `role-select.tsx:132` uses `router.replace('/')`, but `patient-login.tsx:101` uses `router.back()`.
- **`concern-describe.tsx` -> `review.tsx` flow**: Path B skips the Upload screen entirely.
- **Multi-visit booking gap**: `stay-or-return.tsx` presents both options equally even when "Return Home" makes no practical sense for a 2-day gap.

---

## 5. Information Architecture Analysis

**Good:**
- Quote detail screen has an excellent information hierarchy
- The comparison table in `quote-compare.tsx` is well structured
- Help Center FAQ covers the key patient concerns

**Issues:**
- **[Critical] Information overload on Review & Submit**: `review.tsx` serves double duty as both a case summary AND a health screening form.
- **[Medium] Arrival Info screen is extremely dense**: 8+ input fields on one screen.
- **[Medium] Visit Schedule screen complexity**: Combines calendar picker, visit timeline, availability slots, and booking summary.
- **[Minor] Treatment prices shown too early**: `treatment-select.tsx` shows Korean price ranges that may anchor expectations.

---

## 6. Accessibility & Internationalization Analysis

**Issues:**
- **[Medium]** No accessibility labels on most patient flow screens beyond auth.
- **[Medium]** Emoji-heavy UI — screen readers read full Unicode names.
- **[Minor]** Date format is US-centric (Month Day, Year).

---

## 7. Screen-by-Screen Issue Table

| Screen | Issue | Severity | Suggestion |
|--------|-------|----------|------------|
| `index.tsx` | Swipe hint text might be missed | Minor | Add animated arrow |
| `patient-create-account.tsx` | Form is very long for mobile | Medium | Split into 2 steps |
| `basic-info.tsx` | Progress dots don't match actual step count | Medium | Consistent progress system |
| `medical-history.tsx` | No "None of the above" quick-select | Minor | Add "I'm healthy - skip" |
| `dental-history.tsx` | Info card uses teal color (Doctor theme leak) | Minor | Change to PatientTheme |
| `treatment-select.tsx` | Implant expand/collapse differs from other cards | Medium | Add explicit accordion indicator |
| `concern-describe.tsx` | Only 1 photo allowed vs Upload's multiple | Medium | Allow multiple photos |
| `review.tsx` | Quick Health Screen mixed into case review | Medium | Separate into own step |
| `review.tsx:488` | Edit concern navigates to wrong route | Critical | Fix to `/patient/concern-describe` |
| `dashboard.tsx` | No empty state for new users | Medium | Add welcoming empty state |
| `quotes.tsx` | "Best Value" implies Concourse endorsement | Medium | Change to "Lowest Price" |
| `arrival-info.tsx` | Too many fields on one screen (8+ inputs) | Medium | Split into sections |
| `payment.tsx` | Screen name misleads about what's being paid | Medium | Rename to "Choose Your Plan" |
| `cancel-booking.tsx` | Refund policy not visible until after selecting reason | Medium | Show refund info upfront |

---

## 8. Top 5 Critical Issues

1. **Broken navigation in proposal mode**: `review.tsx:488` -- routes to `/patient/concern` which doesn't exist.
2. **Inconsistent progress indicators**: Each profile screen shows different dot counts (4, 3, 3, 3).
3. **Information overload on Review & Submit**: Mixed case summary + health screening form.
4. **Arrival Info screen too dense**: 8+ input fields on one form.
5. **"Payment" screen naming misleads patients**: Actually a service tier selection, not treatment payment.
