const DOCTOR_TREATMENT_TERM_MAP: Record<string, string> = {
  "Implant: Whole (Root + Crown)": "Implant fixture placement + restoration",
  "Implant: Root (Titanium Post) Only": "Implant fixture placement (surgical phase)",
  "Implant: Crown Only": "Implant-supported crown restoration",
  "Veneers": "Porcelain laminate veneers",
  "Smile Makeover": "Comprehensive esthetic rehabilitation",
  "Fillings": "Direct composite resin restorations",
  "Crowns": "Full-coverage crown restorations",
  "Root Canals": "Endodontic root canal therapy",
  "Gum Treatment": "Periodontal therapy",
  "Invisalign": "Clear aligner orthodontic therapy",
  "Oral Sleep Appliance": "Mandibular advancement oral appliance therapy",
  "Tongue Tie Surgery": "Lingual frenectomy",
  "Wisdom Teeth Extractions": "Third molar extractions",
  "Other": "Other dental procedure",
};

export const toDoctorTreatmentTerm = (name: string) => {
  return DOCTOR_TREATMENT_TERM_MAP[name] ?? name;
};
