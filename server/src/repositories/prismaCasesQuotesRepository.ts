import {
  CaseStatus as PrismaCaseStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";

import type {
  CasesQuotesRepository,
  CreateDentistQuoteRecordInput,
  CreatePatientCaseRecordInput,
  DentistQuoteRecord,
  PatientCaseRecord,
} from "./casesQuotesRepository";
import type {
  CaseFilesCount,
  CaseStatus,
  CaseTreatmentItem,
  QuoteTreatmentItem,
  QuoteVisit,
  UpdatePatientCaseInput,
} from "../types/casesQuotes";
import { toInternalCaseId, toPublicCaseId } from "../utils/caseId";

const toPrismaCaseStatus = (status: CaseStatus): PrismaCaseStatus => {
  switch (status) {
    case "pending":
      return PrismaCaseStatus.PENDING;
    case "quotes_received":
      return PrismaCaseStatus.QUOTES_RECEIVED;
    case "booked":
      return PrismaCaseStatus.BOOKED;
  }
};

const fromPrismaCaseStatus = (status: PrismaCaseStatus): CaseStatus => {
  switch (status) {
    case PrismaCaseStatus.PENDING:
      return "pending";
    case PrismaCaseStatus.QUOTES_RECEIVED:
      return "quotes_received";
    case PrismaCaseStatus.BOOKED:
      return "booked";
  }
};

const toInputJson = (value: unknown): Prisma.InputJsonValue => {
  return value as Prisma.InputJsonValue;
};

const mapCase = (record: {
  id: number;
  patientUserId: string;
  patientName: string;
  country: string;
  date: string;
  treatments: Prisma.JsonValue;
  medicalNotes: string;
  dentalIssues: Prisma.JsonValue;
  filesCount: Prisma.JsonValue;
  status: PrismaCaseStatus;
  visitDate: string | null;
  birthDate: string | null;
}): PatientCaseRecord => {
  return {
    id: toPublicCaseId(record.id),
    patientUserId: record.patientUserId,
    patientName: record.patientName,
    country: record.country,
    date: record.date,
    treatments: record.treatments as unknown as CaseTreatmentItem[],
    medicalNotes: record.medicalNotes,
    dentalIssues: record.dentalIssues as unknown as string[],
    filesCount: record.filesCount as unknown as CaseFilesCount,
    status: fromPrismaCaseStatus(record.status),
    ...(record.visitDate ? { visitDate: record.visitDate } : {}),
    ...(record.birthDate ? { birthDate: record.birthDate } : {}),
  };
};

const mapQuote = (record: {
  id: string;
  caseId: number;
  doctorUserId: string;
  dentistName: string;
  clinicName: string;
  location: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number;
  reviewCount: number;
  totalPrice: number;
  treatments: Prisma.JsonValue;
  treatmentDetails: string;
  duration: string;
  visits: Prisma.JsonValue | null;
  message: string;
  createdAt: Date;
  clinicPhotos: Prisma.JsonValue | null;
  yearsExperience: number | null;
  specialties: Prisma.JsonValue | null;
  licenseVerified: boolean | null;
  certifications: Prisma.JsonValue | null;
}): DentistQuoteRecord => {
  return {
    id: record.id,
    caseId: toPublicCaseId(record.caseId),
    doctorUserId: record.doctorUserId,
    dentistName: record.dentistName,
    clinicName: record.clinicName,
    location: record.location,
    ...(record.address ? { address: record.address } : {}),
    ...(record.latitude !== null ? { latitude: record.latitude } : {}),
    ...(record.longitude !== null ? { longitude: record.longitude } : {}),
    rating: record.rating,
    reviewCount: record.reviewCount,
    totalPrice: record.totalPrice,
    treatments: record.treatments as unknown as QuoteTreatmentItem[],
    treatmentDetails: record.treatmentDetails,
    duration: record.duration,
    ...(record.visits ? { visits: record.visits as unknown as QuoteVisit[] } : {}),
    message: record.message,
    createdAt: record.createdAt.toISOString(),
    ...(record.clinicPhotos ? { clinicPhotos: record.clinicPhotos as unknown as string[] } : {}),
    ...(record.yearsExperience !== null ? { yearsExperience: record.yearsExperience } : {}),
    ...(record.specialties ? { specialties: record.specialties as unknown as string[] } : {}),
    ...(record.licenseVerified !== null ? { licenseVerified: record.licenseVerified } : {}),
    ...(record.certifications
      ? { certifications: record.certifications as unknown as string[] }
      : {}),
  };
};

const buildCaseUpdateData = (
  updates: UpdatePatientCaseInput
): Prisma.PatientCaseUpdateInput => {
  const data: Prisma.PatientCaseUpdateInput = {};

  if (updates.patientName !== undefined) {
    data.patientName = updates.patientName;
  }

  if (updates.country !== undefined) {
    data.country = updates.country;
  }

  if (updates.treatments !== undefined) {
    data.treatments = toInputJson(updates.treatments);
  }

  if (updates.medicalNotes !== undefined) {
    data.medicalNotes = updates.medicalNotes;
  }

  if (updates.dentalIssues !== undefined) {
    data.dentalIssues = toInputJson(updates.dentalIssues);
  }

  if (updates.filesCount !== undefined) {
    data.filesCount = toInputJson(updates.filesCount);
  }

  if (updates.visitDate !== undefined) {
    data.visitDate = updates.visitDate;
  }

  if (updates.birthDate !== undefined) {
    data.birthDate = updates.birthDate;
  }

  return data;
};

export class PrismaCasesQuotesRepository implements CasesQuotesRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createCase(input: CreatePatientCaseRecordInput): Promise<PatientCaseRecord> {
    const record = await this.prisma.patientCase.create({
      data: {
        patientUserId: input.patientUserId,
        patientName: input.patientName,
        country: input.country,
        date: input.date,
        treatments: toInputJson(input.treatments),
        medicalNotes: input.medicalNotes,
        dentalIssues: toInputJson(input.dentalIssues),
        filesCount: toInputJson(input.filesCount),
        status: PrismaCaseStatus.PENDING,
        visitDate: input.visitDate,
        birthDate: input.birthDate,
      },
    });

    return mapCase(record);
  }

  async listCasesForPatient(patientUserId: string): Promise<PatientCaseRecord[]> {
    const records = await this.prisma.patientCase.findMany({
      where: { patientUserId },
      orderBy: { id: "desc" },
    });

    return records.map(mapCase);
  }

  async listCasesForDoctor(): Promise<PatientCaseRecord[]> {
    const records = await this.prisma.patientCase.findMany({
      orderBy: { id: "desc" },
    });

    return records.map(mapCase);
  }

  async findCaseById(caseId: string): Promise<PatientCaseRecord | null> {
    const internalCaseId = toInternalCaseId(caseId);
    if (!internalCaseId) {
      return null;
    }

    const record = await this.prisma.patientCase.findUnique({
      where: { id: internalCaseId },
    });

    return record ? mapCase(record) : null;
  }

  async updateCase(caseId: string, updates: UpdatePatientCaseInput): Promise<PatientCaseRecord | null> {
    const internalCaseId = toInternalCaseId(caseId);
    if (!internalCaseId) {
      return null;
    }

    try {
      const record = await this.prisma.patientCase.update({
        where: { id: internalCaseId },
        data: buildCaseUpdateData(updates),
      });

      return mapCase(record);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        return null;
      }

      throw error;
    }
  }

  async updateCaseStatus(caseId: string, status: CaseStatus): Promise<PatientCaseRecord | null> {
    const internalCaseId = toInternalCaseId(caseId);
    if (!internalCaseId) {
      return null;
    }

    try {
      const record = await this.prisma.patientCase.update({
        where: { id: internalCaseId },
        data: {
          status: toPrismaCaseStatus(status),
        },
      });

      return mapCase(record);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        return null;
      }

      throw error;
    }
  }

  async createQuote(input: CreateDentistQuoteRecordInput): Promise<DentistQuoteRecord> {
    const internalCaseId = toInternalCaseId(input.caseId);
    if (!internalCaseId) {
      throw new Error(`Invalid case id: ${input.caseId}`);
    }

    const record = await this.prisma.dentistQuote.create({
      data: {
        id: input.id,
        caseId: internalCaseId,
        doctorUserId: input.doctorUserId,
        dentistName: input.dentistName,
        clinicName: input.clinicName,
        location: input.location,
        address: input.address,
        latitude: input.latitude,
        longitude: input.longitude,
        rating: input.rating,
        reviewCount: input.reviewCount,
        totalPrice: input.totalPrice,
        treatments: toInputJson(input.treatments),
        treatmentDetails: input.treatmentDetails,
        duration: input.duration,
        visits: input.visits ? toInputJson(input.visits) : Prisma.JsonNull,
        message: input.message,
        createdAt: input.createdAt,
        clinicPhotos: input.clinicPhotos ? toInputJson(input.clinicPhotos) : Prisma.JsonNull,
        yearsExperience: input.yearsExperience,
        specialties: input.specialties ? toInputJson(input.specialties) : Prisma.JsonNull,
        licenseVerified: input.licenseVerified,
        certifications: input.certifications
          ? toInputJson(input.certifications)
          : Prisma.JsonNull,
      },
    });

    return mapQuote(record);
  }

  async findQuoteByCaseAndDoctor(
    caseId: string,
    doctorUserId: string
  ): Promise<DentistQuoteRecord | null> {
    const internalCaseId = toInternalCaseId(caseId);
    if (!internalCaseId) {
      return null;
    }

    const record = await this.prisma.dentistQuote.findUnique({
      where: {
        caseId_doctorUserId: {
          caseId: internalCaseId,
          doctorUserId,
        },
      },
    });

    return record ? mapQuote(record) : null;
  }

  async listQuotesForCase(caseId: string): Promise<DentistQuoteRecord[]> {
    const internalCaseId = toInternalCaseId(caseId);
    if (!internalCaseId) {
      return [];
    }

    const records = await this.prisma.dentistQuote.findMany({
      where: { caseId: internalCaseId },
      orderBy: { createdAt: "desc" },
    });

    return records.map(mapQuote);
  }

  async listQuotesForCaseAndDoctor(
    caseId: string,
    doctorUserId: string
  ): Promise<DentistQuoteRecord[]> {
    const internalCaseId = toInternalCaseId(caseId);
    if (!internalCaseId) {
      return [];
    }

    const records = await this.prisma.dentistQuote.findMany({
      where: {
        caseId: internalCaseId,
        doctorUserId,
      },
      orderBy: { createdAt: "desc" },
    });

    return records.map(mapQuote);
  }

  async listQuotesForPatient(patientUserId: string): Promise<DentistQuoteRecord[]> {
    const records = await this.prisma.dentistQuote.findMany({
      where: {
        patientCase: {
          patientUserId,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return records.map(mapQuote);
  }

  async listQuotesForDoctor(doctorUserId: string): Promise<DentistQuoteRecord[]> {
    const records = await this.prisma.dentistQuote.findMany({
      where: { doctorUserId },
      orderBy: { createdAt: "desc" },
    });

    return records.map(mapQuote);
  }
}