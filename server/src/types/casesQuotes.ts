import type { AuthRole } from "./auth";

export type CaseStatus = "pending" | "quotes_received" | "booked";

export interface CaseTreatmentItem {
  name: string;
  qty: number;
}

export interface CaseFilesCount {
  xrays: number;
  treatmentPlans: number;
  photos: number;
}

export interface PatientCase {
  id: string;
  patientName: string;
  country: string;
  date: string;
  treatments: CaseTreatmentItem[];
  medicalNotes: string;
  dentalIssues: string[];
  filesCount: CaseFilesCount;
  status: CaseStatus;
  visitDate?: string;
  birthDate?: string;
}

export interface QuoteTreatmentItem {
  name: string;
  qty: number;
  price: number;
}

export interface QuoteVisit {
  visit: number;
  description: string;
  gapMonths?: number;
  gapDays?: number;
  paymentAmount?: number;
  paymentPercent?: number;
}

export interface DentistQuote {
  id: string;
  caseId: string;
  dentistName: string;
  clinicName: string;
  location: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating: number;
  reviewCount: number;
  totalPrice: number;
  treatments: QuoteTreatmentItem[];
  treatmentDetails: string;
  duration: string;
  visits?: QuoteVisit[];
  message: string;
  createdAt: string;
  clinicPhotos?: string[];
  yearsExperience?: number;
  specialties?: string[];
  licenseVerified?: boolean;
  certifications?: string[];
}

export interface CreatePatientCaseInput {
  patientName: string;
  country: string;
  treatments: CaseTreatmentItem[];
  medicalNotes: string;
  dentalIssues: string[];
  filesCount: CaseFilesCount;
  visitDate?: string;
  birthDate?: string;
}

export interface UpdatePatientCaseInput {
  patientName?: string;
  country?: string;
  treatments?: CaseTreatmentItem[];
  medicalNotes?: string;
  dentalIssues?: string[];
  filesCount?: CaseFilesCount;
  visitDate?: string;
  birthDate?: string;
}

export interface CreateDentistQuoteInput {
  caseId: string;
  dentistName: string;
  clinicName: string;
  location: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating: number;
  reviewCount: number;
  totalPrice: number;
  treatments: QuoteTreatmentItem[];
  treatmentDetails: string;
  duration: string;
  visits?: QuoteVisit[];
  message: string;
  clinicPhotos?: string[];
  yearsExperience?: number;
  specialties?: string[];
  licenseVerified?: boolean;
  certifications?: string[];
}

export interface AuthContext {
  userId: string;
  role: AuthRole;
}