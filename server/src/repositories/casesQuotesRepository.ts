import type {
  CaseStatus,
  CreateDentistQuoteInput,
  CreatePatientCaseInput,
  DentistQuote,
  PatientCase,
  UpdatePatientCaseInput,
} from "../types/casesQuotes";

export interface PatientCaseRecord extends PatientCase {
  patientUserId: string;
}

export interface DentistQuoteRecord extends DentistQuote {
  doctorUserId: string;
}

export interface CreatePatientCaseRecordInput extends CreatePatientCaseInput {
  patientUserId: string;
  date: string;
}

export interface CreateDentistQuoteRecordInput extends CreateDentistQuoteInput {
  doctorUserId: string;
  id: string;
  createdAt: Date;
}

export interface CasesQuotesRepository {
  createCase(input: CreatePatientCaseRecordInput): Promise<PatientCaseRecord>;
  listCasesForPatient(patientUserId: string): Promise<PatientCaseRecord[]>;
  listCasesForDoctor(): Promise<PatientCaseRecord[]>;
  findCaseById(caseId: string): Promise<PatientCaseRecord | null>;
  updateCase(caseId: string, updates: UpdatePatientCaseInput): Promise<PatientCaseRecord | null>;
  updateCaseStatus(caseId: string, status: CaseStatus): Promise<PatientCaseRecord | null>;
  createQuote(input: CreateDentistQuoteRecordInput): Promise<DentistQuoteRecord>;
  findQuoteByCaseAndDoctor(
    caseId: string,
    doctorUserId: string
  ): Promise<DentistQuoteRecord | null>;
  listQuotesForCase(caseId: string): Promise<DentistQuoteRecord[]>;
  listQuotesForCaseAndDoctor(caseId: string, doctorUserId: string): Promise<DentistQuoteRecord[]>;
  listQuotesForPatient(patientUserId: string): Promise<DentistQuoteRecord[]>;
  listQuotesForDoctor(doctorUserId: string): Promise<DentistQuoteRecord[]>;
}