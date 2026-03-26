/**
 * Concourse — Centralized Legal Disclaimers
 * All disclaimer text managed here for easy legal review and updates.
 * Supports EN (patient-facing) and KO (doctor-facing) where needed.
 */

export const DISCLAIMERS = {
  // auth/create-account — consent checkbox
  consent: {
    en: "By creating an account, you agree to our Terms of Service and Privacy Policy.",
  },

  // patient/medical-history, patient/dental-history
  healthData: {
    en: "Your health information is used solely for treatment quotes and is protected under Korean data protection law (PIPA).",
  },

  // patient/upload
  fileUpload: {
    en: "Uploaded files are shared with dentists for quoting purposes only, not for diagnosis. Concourse does not verify the accuracy of uploaded files.",
  },

  // patient/quotes, patient/quote-detail
  quoteEstimate: {
    en: "Quotes are estimates only. Actual treatment costs may change after in-person examination. Concourse does not guarantee treatment outcomes.",
  },

  // patient/chat, doctor/chat
  chatTelemedicine: {
    en: "This chat is for general inquiries and quote discussion only. It does not replace an in-person medical consultation.",
    ko: "이 채팅은 견적 논의 및 일반 상담 전용입니다. 대면 의료 상담을 대체하지 않습니다.",
  },

  // patient/payment
  serviceFee: {
    en: "The service fee covers Concourse concierge services only and is separate from treatment costs. Treatment costs are paid directly to the clinic.",
  },

  // patient/visit-checkout
  treatmentOutcome: {
    en: "Treatment outcomes are the responsibility of the treating clinic. Concourse does not guarantee treatment quality.",
  },

  // patient/write-review
  reviewPolicy: {
    en: "Reviews are published publicly. Fraudulent reviews may result in account restrictions. Concourse does not verify the accuracy of reviews.",
  },

  // patient/dentist-profile
  credentials: {
    en: "Dentist profiles are self-reported. Concourse performs basic credential checks but does not guarantee the accuracy of all qualifications.",
  },

  // patient/help-center (footer)
  platformRole: {
    en: "Concourse is a medical tourism concierge platform, not a healthcare provider. Treatment decisions should be made through in-person consultation between patient and dentist.",
  },

  // doctor/case-detail — quote writing guide
  doctorQuoteGuide: {
    ko: "채팅 및 견적에서 구체적 진단/치료계획을 제공하지 마십시오. 대면 진료 전 추정 견적만 제공하십시오.",
    en: "Do not provide specific diagnoses or treatment plans via chat or quotes. Only provide estimates pending in-person examination.",
  },
} as const;

export type DisclaimerKey = keyof typeof DISCLAIMERS;
