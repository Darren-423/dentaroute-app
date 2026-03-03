# DentaRoute: Tiered Platform Fee System - Implementation Spec

## 1. Overview

### Current State
- Platform fee: **20% flat** (all doctors, all transactions)
- Hardcoded in `app/doctor/earnings.tsx` as `PLATFORM_FEE = 0.20`
- Doctor profile has no fee/tier fields (typed as `any`)
- No per-doctor commission differentiation

### Proposed State
Doctor revenue ranking based on tiered fee structure:

| Tier | Revenue Ranking | Platform Fee | Doctor Share |
|------|----------------|-------------|-------------|
| Gold | Top 5% | 15% | 85% |
| Silver | Top 5~20% | 18% | 82% |
| Standard | Bottom 80% | 20% | 80% |

---

## 2. Core Design Decisions

### 2.1 Tier Calculation Basis
- **Metric**: Cumulative gross revenue (deposits + payments) per doctor
- **Period**: Rolling 6 months (recalculated monthly on the 1st)
- **Why 6 months**: Balances seasonal variation while rewarding sustained performance
- **Alternative considered**: Quarterly - too volatile; Yearly - too slow to reward growth

### 2.2 Tier Assignment Timing
- Recalculated **monthly** (1st of each month, based on prior 6 months)
- New tier applies to **all new transactions** from that month forward
- Already-processed transactions are NOT retroactively adjusted
- Tier is stored on the doctor profile and cached locally

### 2.3 New Doctor Handling
- New doctors (< 3 months on platform): **Standard tier (20%)**
- After 3 months: eligible for tier promotion based on ranking
- Rationale: Need minimum data to fairly rank

### 2.4 Minimum Doctor Pool
- Tier percentages apply when total active doctors >= 20
- Below 20 doctors: all get Standard tier (early platform stage)
- "Active" = at least 1 completed booking in the past 6 months

---

## 3. Data Model Changes

### 3.1 New: DoctorProfile Interface (`lib/store.ts`)

```typescript
export interface DoctorProfile {
  // -- existing fields --
  fullName: string;
  clinicName: string;
  location: string;
  address?: string;
  specialty: string;
  experience: number;
  bio: string;
  email: string;
  phone: string;
  website?: string;
  license: string;
  rating: number;
  reviewCount: number;
  latitude?: number;
  longitude?: number;
  clinicPhotos?: string[];

  // -- NEW: tier & fee fields --
  tier: "gold" | "silver" | "standard";
  platformFeeRate: number;       // 0.15 | 0.18 | 0.20
  tierUpdatedAt: string;         // ISO date of last tier recalculation
  tierGrossRevenue: number;      // 6-month gross revenue used for ranking
}
```

### 3.2 New: TierConfig Constant

```typescript
export const TIER_CONFIG = {
  gold:     { maxPercentile: 0.05, feeRate: 0.15, label: "Gold",     color: "#f59e0b" },
  silver:   { maxPercentile: 0.20, feeRate: 0.18, label: "Silver",   color: "#94a3b8" },
  standard: { maxPercentile: 1.00, feeRate: 0.20, label: "Standard", color: "#78716c" },
} as const;
```

### 3.3 Booking Record Extension

```typescript
export interface Booking {
  // ... existing fields ...

  // NEW: snapshot of fee rate at booking creation time (audit trail)
  platformFeeRate?: number;  // 0.15 | 0.18 | 0.20
}
```

**Why snapshot on Booking?**
- If a doctor's tier changes mid-month, already-created bookings keep the rate
  that was active when the booking was made
- Provides audit trail for revenue reconciliation
- Prevents disputes about which rate applied

---

## 4. New Store Methods

### 4.1 Tier Calculation

```typescript
// Calculate and assign tiers for all doctors
// Called monthly (or on-demand for demo)
recalculateDoctorTiers: async () => {
  const allDoctors = await store.getAllDoctorProfiles();  // NEW method
  if (allDoctors.length < 20) return; // minimum pool

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Calculate 6-month gross revenue per doctor
  const bookings = await store.getBookings();
  const revenueMap: Record<string, number> = {};

  for (const doc of allDoctors) {
    const docBookings = bookings.filter(
      b => b.dentistName === doc.fullName
        && new Date(b.createdAt) >= sixMonthsAgo
    );
    revenueMap[doc.fullName] = docBookings.reduce((sum, bk) => {
      let rev = bk.depositPaid || 0;
      if (bk.finalInvoice) {
        rev += bk.finalInvoice.balanceDue
            || bk.finalInvoice.discountedTotal
            || bk.finalInvoice.totalAmount;
      }
      return sum + rev;
    }, 0);
  }

  // Sort by revenue descending
  const sorted = allDoctors
    .map(d => ({ doctor: d, revenue: revenueMap[d.fullName] || 0 }))
    .sort((a, b) => b.revenue - a.revenue);

  const total = sorted.length;
  const goldCutoff  = Math.max(1, Math.ceil(total * 0.05));
  const silverCutoff = Math.max(goldCutoff + 1, Math.ceil(total * 0.20));

  for (let i = 0; i < sorted.length; i++) {
    const { doctor, revenue } = sorted[i];
    let tier: "gold" | "silver" | "standard";
    let feeRate: number;

    if (i < goldCutoff) {
      tier = "gold"; feeRate = 0.15;
    } else if (i < silverCutoff) {
      tier = "silver"; feeRate = 0.18;
    } else {
      tier = "standard"; feeRate = 0.20;
    }

    await store.saveDoctorProfile({
      ...doctor,
      tier,
      platformFeeRate: feeRate,
      tierUpdatedAt: new Date().toISOString(),
      tierGrossRevenue: revenue,
    });
  }
}
```

### 4.2 Get Doctor Fee Rate

```typescript
getDoctorFeeRate: async (dentistName: string): Promise<number> => {
  const profile = await store.getDoctorProfile(); // or by name
  return profile?.platformFeeRate ?? 0.20; // default to Standard
}
```

### 4.3 Multi-Doctor Support (Future)

Current store uses a single `DOCTOR_PROFILE` key. For multi-doctor support:

```typescript
// Option A: Keyed storage (recommended for demo)
KEYS.DOCTOR_PROFILES = "dr_doctor_profiles"  // JSON array

// Option B: Backend API (production)
GET /api/doctors/:id/profile
```

---

## 5. Affected Files & Changes

### 5.1 `lib/store.ts` - Data Layer

| Change | Description |
|--------|------------|
| Add `DoctorProfile` interface | Type the currently untyped doctor profile |
| Add `TIER_CONFIG` constant | Centralized tier definitions |
| Add `tier`, `platformFeeRate`, `tierUpdatedAt`, `tierGrossRevenue` to profile | Per-doctor fee tracking |
| Add `platformFeeRate` to `Booking` interface | Snapshot fee at booking time |
| Add `recalculateDoctorTiers()` method | Monthly tier recalculation logic |
| Add `getDoctorFeeRate()` method | Quick lookup for current fee rate |
| Update `createBooking()` | Snapshot `platformFeeRate` from doctor profile |
| Update `seedDemoData()` | Add tier fields to demo doctor profile |

### 5.2 `app/doctor/earnings.tsx` - Earnings Display

| Change | Description |
|--------|------------|
| Remove hardcoded `PLATFORM_FEE` / `DOCTOR_SHARE` | Use per-booking `platformFeeRate` |
| Load doctor profile for current tier info | Display tier badge in header |
| Per-transaction fee calculation | `booking.platformFeeRate` instead of global constant |
| Show tier badge | "Gold 15%" / "Silver 18%" / "Standard 20%" |
| Add tier progress section | "You're top X% - $Y more to reach next tier" |

**Revised calculation logic:**
```typescript
// Before (flat rate)
const doctorAmt = Math.round(bk.depositPaid * DOCTOR_SHARE);

// After (per-booking rate)
const feeRate = bk.platformFeeRate ?? 0.20;
const doctorAmt = Math.round(bk.depositPaid * (1 - feeRate));
```

### 5.3 `app/doctor/profile.tsx` - Doctor Profile

| Change | Description |
|--------|------------|
| Display current tier badge | Gold/Silver/Standard with color |
| Show fee rate | "Platform Fee: 15%" |
| Show ranking info | "Top 3% by revenue" |
| Show next tier threshold | "Earn $X more to reach Gold" |

### 5.4 `app/doctor/dashboard.tsx` - Dashboard

| Change | Description |
|--------|------------|
| Tier badge in header | Small badge next to doctor name |

### 5.5 `app/patient/payment.tsx` - Deposit Payment

| Change | Description |
|--------|------------|
| Snapshot fee rate into booking | `platformFeeRate: doctorProfile.platformFeeRate` |

### 5.6 `app/patient/final-payment.tsx` - Final Payment

| Change | Description |
|--------|------------|
| Use booking's fee rate for calculations | Consistent with snapshot |

### 5.7 `app/doctor/final-invoice.tsx` - Invoice

| Change | Description |
|--------|------------|
| Show doctor's net amount | After fee deduction |
| Display fee rate | "Platform fee: X%" |

### 5.8 `app/dev-menu.tsx` - Dev Tools

| Change | Description |
|--------|------------|
| Add "Recalculate Tiers" button | Manual trigger for testing |
| Add "Set Doctor Tier" override | Force Gold/Silver/Standard for testing |

---

## 6. UI Design

### 6.1 Tier Badge Component

```
 ┌──────────┐   ┌──────────┐   ┌──────────┐
 │ ★ Gold   │   │ ◆ Silver │   │ ● Standard│
 │   15%    │   │   18%    │   │    20%    │
 └──────────┘   └──────────┘   └──────────┘
   #f59e0b        #94a3b8        #78716c
```

### 6.2 Earnings Header (Updated)

```
 ┌─────────────────────────────────────┐
 │  ← Back                            │
 │  Earnings              ★ Gold 15%  │
 │  Mar 2026                          │
 │                                    │
 │         This Month                 │
 │         $3,400                     │
 │                                    │
 │  ┌─────────┬─────────┬──────────┐  │
 │  │ $12,450 │    8    │    5     │  │
 │  │All Time │ Active  │Completed │  │
 │  └─────────┴─────────┴──────────┘  │
 └─────────────────────────────────────┘
```

### 6.3 Tier Progress Card (New Section)

```
 ┌─────────────────────────────────────┐
 │  YOUR TIER                         │
 │  ┌─────────────────────────────┐   │
 │  │ ★ Gold Tier (Top 3%)       │   │
 │  │ Platform Fee: 15%          │   │
 │  │                            │   │
 │  │ 6-Month Revenue: $28,500   │   │
 │  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░ 90% │   │
 │  │ Next review: Apr 1, 2026   │   │
 │  └─────────────────────────────┘   │
 └─────────────────────────────────────┘
```

### 6.4 Transaction Row (Updated)

```
 ┌─────────────────────────────────────┐
 │ 💳  Sarah Johnson                  │
 │     Case #1001 • Deposit           │
 │     Mar 1, 2026          +$356     │
 │                     (fee: -$89)    │
 └─────────────────────────────────────┘
```

---

## 7. Edge Cases

| Case | Handling |
|------|---------|
| New doctor (no history) | Standard tier (20%) until 3 months on platform |
| Doctor with $0 revenue in 6 months | Standard tier, ranked last |
| Tied revenue at tier boundary | Earlier registration date gets higher tier |
| Only 1 doctor on platform | Standard tier (min pool = 20) |
| Doctor leaves and returns | Revenue history preserved, re-ranked on return |
| Mid-month tier change | New rate applies only to NEW bookings |
| Booking created before tier change | Uses `booking.platformFeeRate` snapshot |
| Refund/cancellation | Refund uses the original booking's fee rate |

---

## 8. Migration Plan

### Phase A: Data Model (No UI Changes)
1. Create `DoctorProfile` TypeScript interface in `store.ts`
2. Add `tier`, `platformFeeRate`, `tierUpdatedAt`, `tierGrossRevenue` fields
3. Add `platformFeeRate` to `Booking` interface
4. Update `createBooking()` to snapshot fee rate
5. Update `seedDemoData()` with default tier fields
6. Default all existing doctors to `standard` / `0.20`

### Phase B: Earnings Calculation
1. Replace hardcoded `PLATFORM_FEE` with per-booking `platformFeeRate`
2. Update earnings calculation to read from booking snapshot
3. Add tier badge to earnings header
4. Add tier progress card

### Phase C: Profile & Dashboard
1. Display tier badge on doctor profile
2. Display tier badge on doctor dashboard
3. Show fee rate and ranking info

### Phase D: Tier Recalculation Engine
1. Implement `recalculateDoctorTiers()` in store
2. Add dev-menu trigger for testing
3. Add monthly auto-recalculation (or cron job in production)

### Phase E: Multi-Doctor Support (Production Only)
1. Switch from single `DOCTOR_PROFILE` key to per-doctor storage
2. Backend API for tier management
3. Admin panel for manual tier overrides

---

## 9. Production Considerations

### 9.1 Backend Requirements
- **Tier calculation should run server-side** (not client-side)
- Prevents manipulation of local storage to fake tier
- Cron job: 1st of each month at 00:00 UTC
- Admin API: `PATCH /api/doctors/:id/tier` for manual override

### 9.2 Notification System
- Notify doctor when tier changes: "Congratulations! You've been promoted to Gold tier"
- Notify 2 weeks before recalculation: "You're $X away from Silver tier"
- Use existing `addNotification()` infrastructure

### 9.3 Analytics Dashboard (Admin)
- Revenue distribution histogram
- Tier cutoff thresholds (dollar amounts)
- Fee revenue by tier
- Doctor churn by tier

### 9.4 Legal/Compliance
- Fee rate must be disclosed to doctors before they sign up
- Terms of Service must describe tier calculation methodology
- 30-day advance notice for tier changes (some jurisdictions)
- Fee schedule must be accessible in-app at all times

---

## 10. Estimated Implementation Effort

| Phase | Scope | Effort |
|-------|-------|--------|
| A: Data Model | store.ts types + seed data | ~30 min |
| B: Earnings Calculation | earnings.tsx rewrite | ~1 hr |
| C: Profile & Dashboard UI | profile.tsx + dashboard.tsx | ~45 min |
| D: Tier Engine | recalculation logic + dev menu | ~1 hr |
| E: Multi-Doctor (Production) | Backend API + admin | ~3-5 days |
| **Total (Demo/Prototype)** | **Phases A-D** | **~3.5 hrs** |
| **Total (Production)** | **All phases** | **~1-2 weeks** |

---

## 11. Open Questions

1. **Recalculation frequency**: Monthly is proposed. Should it be quarterly for more stability?
2. **Tier lock period**: Should a doctor keep their tier for at least 2 months (prevent yo-yo)?
3. **Revenue metric**: Gross revenue (patient pays) or net revenue (after app discount)?
4. **Promotional tiers**: Should new high-volume doctors get a temporary Gold trial?
5. **Fee transparency to patients**: Should patients see that their doctor is a "Gold" doctor?
6. **Multi-doctor storage**: For the demo, keep single-doctor or implement multi-doctor array?
