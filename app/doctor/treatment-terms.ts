type TreatmentDef = {
  canonical: string;
  doctorTerm: string;
  emoji: string;
  aliases?: string[];
};

const TREATMENT_DEFS: TreatmentDef[] = [
  {
    canonical: "Implant: Whole (Root + Crown)",
    doctorTerm: "Implant: Fixture placement + Crown restoration",
    emoji: "🔩👑",
    aliases: ["Implant: whole implant(Root + Crown)"],
  },
  {
    canonical: "Implant: Root (Titanium Post) Only",
    doctorTerm: "Implant: Fixture placement",
    emoji: "🔩",
  },
  {
    canonical: "Implant: Crown Only",
    doctorTerm: "Implant: Crown restoration",
    emoji: "👑",
  },
  { canonical: "Veneers", doctorTerm: "Veneers", emoji: "✨" },
  { canonical: "Smile Makeover", doctorTerm: "Smile makeover", emoji: "😁" },
  {
    canonical: "Fillings",
    doctorTerm: "Simple restorations(Composites, inlays, onlays)",
    emoji: "🧩",
  },
  { canonical: "Crowns", doctorTerm: "Crowns", emoji: "👑" },
  { canonical: "Root Canals", doctorTerm: "Root canal therapy", emoji: "🦷" },
  { canonical: "Gum Treatment", doctorTerm: "Perio Surgery", emoji: "🩺" },
  { canonical: "Invisalign", doctorTerm: "Clear Aligner Orthodontics", emoji: "🪥" },
  { canonical: "Oral Sleep Appliance", doctorTerm: "Oral Sleep Appliance", emoji: "🌙" },
  { canonical: "Tongue Tie Surgery", doctorTerm: "Lingual frenectomy", emoji: "✂️" },
  { canonical: "Wisdom Teeth Extractions", doctorTerm: "Third molar extractions", emoji: "🦷" },
  { canonical: "Other", doctorTerm: "Other dental procedure", emoji: "📌" },
];

const canonicalByAnyName = new Map<string, string>();
const doctorTermByCanonical = new Map<string, string>();
const emojiByCanonical = new Map<string, string>();

for (const def of TREATMENT_DEFS) {
  doctorTermByCanonical.set(def.canonical, def.doctorTerm);
  emojiByCanonical.set(def.canonical, def.emoji);

  const keys = [
    def.canonical,
    def.doctorTerm,
    `${def.emoji} ${def.doctorTerm}`,
    ...(def.aliases ?? []),
  ];
  for (const key of keys) {
    canonicalByAnyName.set(key, def.canonical);
  }
}

export const toCanonicalTreatmentName = (name: string) => {
  return canonicalByAnyName.get(name.trim()) ?? name.trim();
};

export const toDoctorTreatmentTerm = (name: string) => {
  const canonical = toCanonicalTreatmentName(name);
  return doctorTermByCanonical.get(canonical) ?? canonical;
};

export const getTreatmentEmoji = (name: string) => {
  const canonical = toCanonicalTreatmentName(name);
  return emojiByCanonical.get(canonical) ?? "🦷";
};

export const toDoctorTreatmentLabel = (name: string) => {
  return `${getTreatmentEmoji(name)} ${toDoctorTreatmentTerm(name)}`;
};
