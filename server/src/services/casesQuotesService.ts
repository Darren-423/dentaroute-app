import { randomInt } from "crypto";

import { AppError } from "../errors/appError";
import type {
  CasesQuotesRepository,
  DentistQuoteRecord,
  PatientCaseRecord,
} from "../repositories/casesQuotesRepository";
import type {
  AuthContext,
  CaseStatus,
  CreateDentistQuoteInput,
  CreatePatientCaseInput,
  DentistQuote,
  PatientCase,
  UpdatePatientCaseInput,
} from "../types/casesQuotes";

export interface CasesQuotesServiceOptions {
  casesQuotesRepository: CasesQuotesRepository;
  now?: () => Date;
  quoteIdFactory?: () => string;
}

const CASE_NOT_FOUND_ERROR = new AppError(404, {
  code: "CASE_NOT_FOUND",
  message: "Case not found.",
});

const createValidationError = (
  details: Record<string, string[]>,
  message = "Invalid request body."
) => {
  return new AppError(400, {
    code: "VALIDATION_ERROR",
    message,
    details,
  });
};

const toPatientCase = (record: PatientCaseRecord): PatientCase => {
  const { patientUserId: _patientUserId, ...patientCase } = record;
  return patientCase;
};

const toDentistQuote = (record: DentistQuoteRecord): DentistQuote => {
  const { doctorUserId: _doctorUserId, ...quote } = record;
  return quote;
};

const defaultQuoteIdFactory = (): string => {
  return `q${Date.now()}${String(randomInt(0, 1000)).padStart(3, "0")}`;
};

export class CasesQuotesService {
  private readonly now: () => Date;
  private readonly quoteIdFactory: () => string;

  constructor(private readonly options: CasesQuotesServiceOptions) {
    this.now = options.now ?? (() => new Date());
    this.quoteIdFactory = options.quoteIdFactory ?? defaultQuoteIdFactory;
  }

  async createCase(auth: AuthContext, input: CreatePatientCaseInput): Promise<PatientCase> {
    const record = await this.options.casesQuotesRepository.createCase({
      patientUserId: auth.userId,
      date: this.now().toISOString().split("T")[0] ?? "",
      ...input,
    });

    // TODO(notification): trigger doctor-side "new_case" notifications for newly submitted patient cases.

    return toPatientCase(record);
  }

  async listCases(auth: AuthContext): Promise<PatientCase[]> {
    const records =
      auth.role === "patient"
        ? await this.options.casesQuotesRepository.listCasesForPatient(auth.userId)
        : await this.options.casesQuotesRepository.listCasesForDoctor();

    return records.map(toPatientCase);
  }

  async getCase(auth: AuthContext, caseId: string): Promise<PatientCase> {
    const record = await this.getAccessibleCase(auth, caseId);
    return toPatientCase(record);
  }

  async updateCase(
    auth: AuthContext,
    caseId: string,
    updates: UpdatePatientCaseInput
  ): Promise<PatientCase> {
    const currentCase = await this.getOwnedCase(auth.userId, caseId);

    if (currentCase.status === "booked") {
      throw createValidationError({
        status: ["Booked cases can no longer be edited in this slice."],
      });
    }

    const updated = await this.options.casesQuotesRepository.updateCase(caseId, updates);
    if (!updated) {
      throw CASE_NOT_FOUND_ERROR;
    }

    // TODO(notification): trigger doctor-side "case_updated" notifications when active case details change.

    return toPatientCase(updated);
  }

  async updateCaseStatus(auth: AuthContext, caseId: string, status: CaseStatus): Promise<PatientCase> {
    const currentCase = await this.getOwnedCase(auth.userId, caseId);

    if (status !== "booked") {
      throw createValidationError({
        status: ['Patients can only set case status to "booked" in this slice.'],
      });
    }

    if (currentCase.status === "pending") {
      throw createValidationError({
        status: ["Cases can be booked only after at least one quote is received."],
      });
    }

    if (currentCase.status === "booked") {
      return toPatientCase(currentCase);
    }

    const updated = await this.options.casesQuotesRepository.updateCaseStatus(caseId, "booked");
    if (!updated) {
      throw CASE_NOT_FOUND_ERROR;
    }

    return toPatientCase(updated);
  }

  async createQuote(auth: AuthContext, input: CreateDentistQuoteInput): Promise<DentistQuote> {
    const patientCase = await this.options.casesQuotesRepository.findCaseById(input.caseId);
    if (!patientCase) {
      throw CASE_NOT_FOUND_ERROR;
    }

    if (patientCase.status === "booked") {
      throw createValidationError({
        caseId: ["Booked cases no longer accept new quotes."],
      });
    }

    const existingQuote = await this.options.casesQuotesRepository.findQuoteByCaseAndDoctor(
      input.caseId,
      auth.userId
    );

    if (existingQuote) {
      throw createValidationError({
        caseId: ["You already submitted a quote for this case."],
      });
    }

    const record = await this.options.casesQuotesRepository.createQuote({
      ...input,
      doctorUserId: auth.userId,
      id: this.quoteIdFactory(),
      createdAt: this.now(),
    });

    if (patientCase.status === "pending") {
      await this.options.casesQuotesRepository.updateCaseStatus(input.caseId, "quotes_received");
    }

    // TODO(notification): trigger patient-side "new_quote" notification for the case owner.

    return toDentistQuote(record);
  }

  async listQuotesForCase(auth: AuthContext, caseId: string): Promise<DentistQuote[]> {
    await this.getAccessibleCase(auth, caseId);

    const records =
      auth.role === "patient"
        ? await this.options.casesQuotesRepository.listQuotesForCase(caseId)
        : await this.options.casesQuotesRepository.listQuotesForCaseAndDoctor(caseId, auth.userId);

    return records.map(toDentistQuote);
  }

  async listQuotes(auth: AuthContext): Promise<DentistQuote[]> {
    const records =
      auth.role === "patient"
        ? await this.options.casesQuotesRepository.listQuotesForPatient(auth.userId)
        : await this.options.casesQuotesRepository.listQuotesForDoctor(auth.userId);

    return records.map(toDentistQuote);
  }

  private async getAccessibleCase(auth: AuthContext, caseId: string): Promise<PatientCaseRecord> {
    const patientCase = await this.options.casesQuotesRepository.findCaseById(caseId);
    if (!patientCase) {
      throw CASE_NOT_FOUND_ERROR;
    }

    if (auth.role === "patient" && patientCase.patientUserId !== auth.userId) {
      throw CASE_NOT_FOUND_ERROR;
    }

    return patientCase;
  }

  private async getOwnedCase(userId: string, caseId: string): Promise<PatientCaseRecord> {
    const patientCase = await this.options.casesQuotesRepository.findCaseById(caseId);
    if (!patientCase || patientCase.patientUserId !== userId) {
      throw CASE_NOT_FOUND_ERROR;
    }

    return patientCase;
  }
}