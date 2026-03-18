import { toDoctorLabel } from "./treatmentTerminology";

export type AvailabilitySlot = { date: string; time: string };

export type VisitGapRule = {
  gapMonths?: number;
  gapDays?: number;
};

export type TreatmentVisitRule = {
  visits: number;
  // gaps[i] is min wait between Visit i+1 and Visit i+2
  gaps: VisitGapRule[];
};

export type TreatmentInput = {
  name: string;
  qty?: number;
};

export type QuoteVisit = {
  visit: number;
  description: string;
  gapMonths?: number;
  gapDays?: number;
  availabilitySlots?: AvailabilitySlot[];
};

const DEFAULT_RULE: TreatmentVisitRule = { visits: 1, gaps: [] };

const RULES_BY_DOCTOR_LABEL: Record<string, TreatmentVisitRule> = {
  [toDoctorLabel("Implant: Whole (Root + Crown)")]: {
    visits: 2,
    gaps: [{ gapMonths: 3 }],
  },
  [toDoctorLabel("Implant: Root (Titanium Post) Only")]: {
    visits: 2,
    gaps: [{ gapMonths: 3 }],
  },
  [toDoctorLabel("Implant: Crown Only")]: {
    visits: 1,
    gaps: [],
  },
  [toDoctorLabel("Veneers")]: {
    visits: 2,
    gaps: [{ gapDays: 7 }],
  },
  [toDoctorLabel("Smile Makeover")]: {
    visits: 2,
    gaps: [{ gapDays: 7 }],
  },
  [toDoctorLabel("Fillings")]: {
    visits: 1,
    gaps: [],
  },
  [toDoctorLabel("Crowns")]: {
    visits: 2,
    gaps: [{ gapDays: 7 }],
  },
  [toDoctorLabel("Root Canals")]: {
    visits: 2,
    gaps: [{ gapDays: 7 }],
  },
  [toDoctorLabel("Gum Treatment")]: {
    visits: 2,
    gaps: [{ gapDays: 14 }],
  },
  [toDoctorLabel("Invisalign")]: {
    visits: 3,
    gaps: [{ gapDays: 30 }, { gapDays: 30 }],
  },
  [toDoctorLabel("Oral Sleep Appliance")]: {
    visits: 2,
    gaps: [{ gapDays: 14 }],
  },
  [toDoctorLabel("Tongue Tie Surgery")]: {
    visits: 2,
    gaps: [{ gapDays: 7 }],
  },
  [toDoctorLabel("Wisdom Teeth Extractions")]: {
    visits: 2,
    gaps: [{ gapDays: 14 }],
  },
};

export const getTreatmentVisitRule = (treatmentName: string): TreatmentVisitRule => {
  const doctorLabel = toDoctorLabel(treatmentName);
  return RULES_BY_DOCTOR_LABEL[doctorLabel] || DEFAULT_RULE;
};

const pickMaxGap = (left: VisitGapRule, right: VisitGapRule): VisitGapRule => ({
  gapMonths: Math.max(left.gapMonths || 0, right.gapMonths || 0) || undefined,
  gapDays: Math.max(left.gapDays || 0, right.gapDays || 0) || undefined,
});

export const buildQuoteVisitsForTreatments = (
  treatments: TreatmentInput[],
  options?: {
    availabilityByVisit?: Record<number, AvailabilitySlot[]>;
    sharedAvailabilitySlots?: AvailabilitySlot[];
  }
): QuoteVisit[] => {
  const rules = treatments.map((item) => getTreatmentVisitRule(item.name));
  const maxVisits = Math.max(1, ...rules.map((rule) => rule.visits || 1));

  const gaps: VisitGapRule[] = [];
  for (let i = 0; i < maxVisits - 1; i++) {
    let merged: VisitGapRule = {};
    for (const rule of rules) {
      const stepGap = rule.gaps[i] || {};
      merged = pickMaxGap(merged, stepGap);
    }
    gaps[i] = merged;
  }

  const byVisit = options?.availabilityByVisit || {};
  const sharedSlots = options?.sharedAvailabilitySlots || [];

  const visits: QuoteVisit[] = [];
  for (let visit = 1; visit <= maxVisits; visit++) {
    const availabilitySlots = byVisit[visit] || sharedSlots;
    const gap = gaps[visit - 1] || {};
    visits.push({
      visit,
      description: `Visit ${visit}`,
      ...(gap.gapMonths ? { gapMonths: gap.gapMonths } : {}),
      ...(gap.gapDays ? { gapDays: gap.gapDays } : {}),
      ...(availabilitySlots.length > 0 ? { availabilitySlots } : {}),
    });
  }

  return visits;
};

export const formatVisitRuleSummary = (treatmentName: string): string => {
  const rule = getTreatmentVisitRule(treatmentName);
  if (rule.visits <= 1) return "1 visit";

  const firstGap = rule.gaps[0] || {};
  const parts: string[] = [];
  if (firstGap.gapMonths) parts.push(`${firstGap.gapMonths}mo`);
  if (firstGap.gapDays) parts.push(`${firstGap.gapDays}d`);

  if (parts.length === 0) return `${rule.visits} visits`;
  return `${rule.visits} visits · min ${parts.join(" ")} gap`;
};