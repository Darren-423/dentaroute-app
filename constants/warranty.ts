// ══════════════════════════════════════════
//  DentaRoute Treatment Warranty Config
//  치료별 보증 기간 및 보증 범위 설정
// ══════════════════════════════════════════

export interface WarrantyConfig {
  treatmentName: string;
  warrantyMonths: number;    // 0 = no warranty
  coverage: string[];        // 보증 범위 항목
  exclusions: string[];      // 제외 항목
}

export const WARRANTY_CONFIG: Record<string, WarrantyConfig> = {
  "Dental Implant": {
    treatmentName: "Dental Implant",
    warrantyMonths: 60,
    coverage: [
      "Implant fixture failure or rejection",
      "Prosthetic (abutment/crown) fracture",
      "Peri-implant bone loss requiring removal",
    ],
    exclusions: [
      "Trauma or external injury",
      "Failure to follow post-op care instructions",
      "Treatment by another provider affecting the implant",
      "Bruxism damage without prescribed night guard use",
    ],
  },
  "Crown": {
    treatmentName: "Crown",
    warrantyMonths: 36,
    coverage: [
      "Crown fracture or chipping",
      "Crown dislodgement or loosening",
      "Significant discoloration (porcelain only)",
    ],
    exclusions: [
      "Normal wear and tear",
      "Trauma or external injury",
      "Biting on hard objects",
    ],
  },
  "Bridge": {
    treatmentName: "Bridge",
    warrantyMonths: 36,
    coverage: [
      "Bridge fracture or breakage",
      "Dislodgement from abutment teeth",
      "Framework failure",
    ],
    exclusions: [
      "Decay of abutment teeth due to poor hygiene",
      "Trauma or external injury",
    ],
  },
  "Veneers": {
    treatmentName: "Veneers",
    warrantyMonths: 24,
    coverage: [
      "Veneer fracture or chipping",
      "Veneer debonding (falling off)",
    ],
    exclusions: [
      "Discoloration from food/drink staining",
      "Trauma or biting hard objects",
      "Bruxism damage",
    ],
  },
  "Root Canal": {
    treatmentName: "Root Canal",
    warrantyMonths: 24,
    coverage: [
      "Re-infection requiring retreatment",
      "Incomplete canal treatment",
    ],
    exclusions: [
      "New decay on the same tooth",
      "Root fracture",
      "Failure to place recommended crown",
    ],
  },
  "Teeth Whitening": {
    treatmentName: "Teeth Whitening",
    warrantyMonths: 0,
    coverage: [],
    exclusions: ["Temporary cosmetic procedure — no warranty applicable"],
  },
  "Cleaning": {
    treatmentName: "Cleaning",
    warrantyMonths: 0,
    coverage: [],
    exclusions: ["Routine maintenance procedure — no warranty applicable"],
  },
  "Filling": {
    treatmentName: "Filling",
    warrantyMonths: 12,
    coverage: [
      "Filling dislodgement or loss",
      "Filling fracture",
    ],
    exclusions: [
      "New decay around the filling",
      "Trauma or biting hard objects",
    ],
  },
  "Extraction": {
    treatmentName: "Extraction",
    warrantyMonths: 0,
    coverage: [],
    exclusions: ["Irreversible procedure — no warranty applicable"],
  },
  "Denture": {
    treatmentName: "Denture",
    warrantyMonths: 24,
    coverage: [
      "Denture fracture or breakage",
      "Poor fit requiring relining",
      "Clasp or attachment failure",
    ],
    exclusions: [
      "Normal wear and tear",
      "Damage from improper handling",
      "Changes in oral structure (bone resorption)",
    ],
  },
  "Orthodontics": {
    treatmentName: "Orthodontics",
    warrantyMonths: 12,
    coverage: [
      "Retainer breakage (post-treatment)",
      "Significant relapse within warranty period",
    ],
    exclusions: [
      "Failure to wear retainer as prescribed",
      "Third-party modifications to treatment",
    ],
  },
  "Gum Treatment": {
    treatmentName: "Gum Treatment",
    warrantyMonths: 12,
    coverage: [
      "Recurrence of treated condition",
      "Need for repeat treatment",
    ],
    exclusions: [
      "Poor oral hygiene post-treatment",
      "Smoking-related recurrence",
    ],
  },
  "Jaw Surgery": {
    treatmentName: "Jaw Surgery",
    warrantyMonths: 24,
    coverage: [
      "Post-surgical complications requiring revision",
      "Hardware failure (plates/screws)",
    ],
    exclusions: [
      "Trauma or external injury",
      "Non-compliance with post-op instructions",
    ],
  },
};

// ══════════════════════════════════════════
//  US Aftercare Partner Network
//  미국 제휴 치과에서 사후 관리 제공
// ══════════════════════════════════════════

export interface AftercarePartner {
  id: string;
  clinicName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  latitude: number;
  longitude: number;
  specialties: string[];
  languages: string[];           // e.g., ["English", "Korean", "Spanish"]
  acceptedTreatments: string[];  // 어떤 치료의 aftercare를 제공하는지
  rating: number;
  partnerSince: string;          // ISO date
}

// 데모용 미국 제휴 치과 목록 (실제 서버 연동 시 API로 대체)
export const US_AFTERCARE_PARTNERS: AftercarePartner[] = [
  {
    id: "usp_001",
    clinicName: "NYU Langone Dental",
    address: "345 E 24th St",
    city: "New York",
    state: "NY",
    zipCode: "10010",
    phone: "+1 (212) 998-9800",
    latitude: 40.7390,
    longitude: -73.9780,
    specialties: ["General Dentistry", "Implantology", "Prosthodontics"],
    languages: ["English", "Korean", "Spanish", "Chinese"],
    acceptedTreatments: ["Dental Implant", "Crown", "Bridge", "Veneers", "Root Canal", "Filling", "Denture"],
    rating: 4.8,
    partnerSince: "2025-06-01",
  },
  {
    id: "usp_002",
    clinicName: "LA Korean Dental Center",
    address: "3250 Wilshire Blvd, Suite 1210",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90010",
    phone: "+1 (213) 555-0142",
    latitude: 34.0616,
    longitude: -118.2987,
    specialties: ["General Dentistry", "Cosmetic", "Implantology"],
    languages: ["English", "Korean"],
    acceptedTreatments: ["Dental Implant", "Crown", "Bridge", "Veneers", "Root Canal", "Filling", "Gum Treatment"],
    rating: 4.7,
    partnerSince: "2025-08-15",
  },
  {
    id: "usp_003",
    clinicName: "Chicago Smile Dental",
    address: "55 E Washington St, Suite 1500",
    city: "Chicago",
    state: "IL",
    zipCode: "60602",
    phone: "+1 (312) 555-0198",
    latitude: 41.8832,
    longitude: -87.6268,
    specialties: ["General Dentistry", "Oral Surgery", "Prosthodontics"],
    languages: ["English", "Korean", "Spanish"],
    acceptedTreatments: ["Dental Implant", "Crown", "Bridge", "Denture", "Jaw Surgery", "Extraction"],
    rating: 4.6,
    partnerSince: "2025-10-01",
  },
  {
    id: "usp_004",
    clinicName: "Houston K-Dental",
    address: "9898 Bellaire Blvd, Suite 108",
    city: "Houston",
    state: "TX",
    zipCode: "77036",
    phone: "+1 (713) 555-0167",
    latitude: 29.7065,
    longitude: -95.5394,
    specialties: ["General Dentistry", "Implantology", "Cosmetic"],
    languages: ["English", "Korean", "Vietnamese"],
    acceptedTreatments: ["Dental Implant", "Crown", "Veneers", "Root Canal", "Filling", "Gum Treatment"],
    rating: 4.9,
    partnerSince: "2025-11-01",
  },
  {
    id: "usp_005",
    clinicName: "ATL Premier Dental",
    address: "5150 Buford Hwy NE, Suite 120",
    city: "Atlanta",
    state: "GA",
    zipCode: "30340",
    phone: "+1 (770) 555-0134",
    latitude: 33.8574,
    longitude: -84.2963,
    specialties: ["General Dentistry", "Orthodontics", "Prosthodontics"],
    languages: ["English", "Korean"],
    acceptedTreatments: ["Dental Implant", "Crown", "Bridge", "Orthodontics", "Denture", "Filling"],
    rating: 4.7,
    partnerSince: "2026-01-15",
  },
];

// 치료명으로 해당 aftercare가 가능한 미국 파트너 치과 찾기
export function findAftercarePartners(treatmentName: string, state?: string): AftercarePartner[] {
  let partners = US_AFTERCARE_PARTNERS.filter((p) =>
    p.acceptedTreatments.includes(treatmentName)
  );
  if (state) {
    partners = partners.filter((p) => p.state === state);
  }
  return partners;
}

// Aftercare 포함 항목
export const AFTERCARE_SERVICES = [
  "Post-treatment check-up and X-ray",
  "Suture removal (if applicable)",
  "Adjustment or bite correction",
  "Emergency issue assessment",
  "Prescription refill coordination with Korea dentist",
  "Progress photos sent to your Korea dentist",
] as const;

// 보증 기간을 사람이 읽기 쉬운 문자열로 변환
export function warrantyLabel(months: number): string {
  if (months === 0) return "No warranty";
  if (months < 12) return `${months}-month warranty`;
  const years = months / 12;
  return Number.isInteger(years)
    ? `${years}-year warranty`
    : `${months}-month warranty`;
}

// 치료명으로 보증 설정 가져오기
export function getWarrantyConfig(treatmentName: string): WarrantyConfig | null {
  return WARRANTY_CONFIG[treatmentName] || null;
}

// 보증이 있는 치료인지 확인
export function hasWarranty(treatmentName: string): boolean {
  const config = WARRANTY_CONFIG[treatmentName];
  return !!config && config.warrantyMonths > 0;
}
