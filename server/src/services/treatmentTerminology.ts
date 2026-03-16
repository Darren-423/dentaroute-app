type ViewerRole = "patient" | "doctor";

interface TreatmentTermMapping {
  patientLabel: string;
  doctorLabel: string;
  aliases?: string[];
}

const TREATMENT_TERM_MAPPINGS: TreatmentTermMapping[] = [
  {
    patientLabel: "Implant: Whole (Root + Crown)",
    doctorLabel: "Implant: Fixture Placement + Crown Restoration",
    aliases: [
      "Implant: Whole Implant (Root + Crown)",
      "Implant: whole implant(Root+crown)",
      "Implant: Fixture placement+ Crown restoration",
      "Implant: Fixture placement + Crown restoration",
    ],
  },
  {
    patientLabel: "Implant: Root (Titanium Post) Only",
    doctorLabel: "Implant: Fixture Placement Only",
    aliases: ["Implant: Fixture placement Only"],
  },
  {
    patientLabel: "Implant: Crown Only",
    doctorLabel: "Implant: Crown Restoration Only",
    aliases: ["Implant: Crown restoration only"],
  },
  {
    patientLabel: "Fillings",
    doctorLabel: "Direct/Indirect Fillings (Composites, Inlays, Onlays)",
    aliases: ["Direct/Indirect fillings(Composites, Inlays, Onlays)"],
  },
  {
    patientLabel: "Gum Treatment",
    doctorLabel: "Perio Surgery",
  },
  {
    patientLabel: "Invisalign",
    doctorLabel: "Clear Aligner Orthodontics",
  },
  {
    patientLabel: "Tongue Tie Surgery",
    doctorLabel: "Lingual Frenectomy",
    aliases: ["Tongue tie surgery"],
  },
  {
    patientLabel: "Veneers",
    doctorLabel: "Veneers",
    aliases: ["Veneer"],
  },
  {
    patientLabel: "Smile Makeover",
    doctorLabel: "Smile Makeover",
    aliases: ["Smile makeover"],
  },
  {
    patientLabel: "Crowns",
    doctorLabel: "Crowns",
    aliases: ["Crown"],
  },
  {
    patientLabel: "Root Canals",
    doctorLabel: "Root Canals",
    aliases: ["Root canals", "Root Canal"],
  },
  {
    patientLabel: "Oral Sleep Appliance",
    doctorLabel: "Oral Sleep Appliance",
  },
  {
    patientLabel: "Wisdom Teeth Extractions",
    doctorLabel: "Wisdom Teeth Extractions",
    aliases: ["Wisdom teeth extractions"],
  },
  {
    patientLabel: "Other",
    doctorLabel: "Other",
  },
];

const normalizeTreatmentName = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
};

const treatmentLookup = new Map<string, TreatmentTermMapping>();

for (const mapping of TREATMENT_TERM_MAPPINGS) {
  const keys = [mapping.patientLabel, mapping.doctorLabel, ...(mapping.aliases ?? [])];

  for (const key of keys) {
    treatmentLookup.set(normalizeTreatmentName(key), mapping);
  }
}

export const translateTreatmentName = (name: string, viewerRole: ViewerRole): string => {
  const mapping = treatmentLookup.get(normalizeTreatmentName(name));
  if (!mapping) {
    return name;
  }

  return viewerRole === "patient" ? mapping.patientLabel : mapping.doctorLabel;
};

export const translateTreatmentItems = <T extends { name: string }>(
  items: T[],
  viewerRole: ViewerRole
): T[] => {
  return items.map((item) => ({
    ...item,
    name: translateTreatmentName(item.name, viewerRole),
  })) as T[];
};