import type { RequestHandler } from "express";
import request from "supertest";

import { createApp } from "../src/app";
import { AppError } from "../src/errors/appError";
import type {
  CasesQuotesRepository,
  CreateDentistQuoteRecordInput,
  CreatePatientCaseRecordInput,
  DentistQuoteRecord,
  PatientCaseRecord,
} from "../src/repositories/casesQuotesRepository";
import { CasesQuotesService } from "../src/services/casesQuotesService";
import type { CaseStatus, UpdatePatientCaseInput } from "../src/types/casesQuotes";

class InMemoryCasesQuotesRepository implements CasesQuotesRepository {
  private readonly cases: PatientCaseRecord[] = [];
  private readonly quotes: DentistQuoteRecord[] = [];
  private nextCaseId = 1001;

  async createCase(input: CreatePatientCaseRecordInput): Promise<PatientCaseRecord> {
    const record: PatientCaseRecord = {
      id: String(this.nextCaseId++),
      patientUserId: input.patientUserId,
      patientName: input.patientName,
      country: input.country,
      date: input.date,
      treatments: input.treatments,
      medicalNotes: input.medicalNotes,
      dentalIssues: input.dentalIssues,
      filesCount: input.filesCount,
      status: "pending",
      ...(input.visitDate ? { visitDate: input.visitDate } : {}),
      ...(input.birthDate ? { birthDate: input.birthDate } : {}),
    };

    this.cases.unshift(record);
    return record;
  }

  async listCasesForPatient(patientUserId: string): Promise<PatientCaseRecord[]> {
    return this.cases.filter((record) => record.patientUserId === patientUserId);
  }

  async listCasesForDoctor(): Promise<PatientCaseRecord[]> {
    return [...this.cases];
  }

  async findCaseById(caseId: string): Promise<PatientCaseRecord | null> {
    return this.cases.find((record) => record.id === caseId) ?? null;
  }

  async updateCase(
    caseId: string,
    updates: UpdatePatientCaseInput
  ): Promise<PatientCaseRecord | null> {
    const record = this.cases.find((item) => item.id === caseId);
    if (!record) {
      return null;
    }

    Object.assign(record, updates);
    return record;
  }

  async updateCaseStatus(caseId: string, status: CaseStatus): Promise<PatientCaseRecord | null> {
    const record = this.cases.find((item) => item.id === caseId);
    if (!record) {
      return null;
    }

    record.status = status;
    return record;
  }

  async createQuote(input: CreateDentistQuoteRecordInput): Promise<DentistQuoteRecord> {
    const record: DentistQuoteRecord = {
      id: input.id,
      caseId: input.caseId,
      doctorUserId: input.doctorUserId,
      dentistName: input.dentistName,
      clinicName: input.clinicName,
      location: input.location,
      rating: input.rating,
      reviewCount: input.reviewCount,
      totalPrice: input.totalPrice,
      treatments: input.treatments,
      treatmentDetails: input.treatmentDetails,
      duration: input.duration,
      message: input.message,
      createdAt: input.createdAt.toISOString(),
      ...(input.address ? { address: input.address } : {}),
      ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
      ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
      ...(input.visits ? { visits: input.visits } : {}),
      ...(input.clinicPhotos ? { clinicPhotos: input.clinicPhotos } : {}),
      ...(input.yearsExperience !== undefined ? { yearsExperience: input.yearsExperience } : {}),
      ...(input.specialties ? { specialties: input.specialties } : {}),
      ...(input.licenseVerified !== undefined ? { licenseVerified: input.licenseVerified } : {}),
      ...(input.certifications ? { certifications: input.certifications } : {}),
    };

    this.quotes.unshift(record);
    return record;
  }

  async findQuoteByCaseAndDoctor(
    caseId: string,
    doctorUserId: string
  ): Promise<DentistQuoteRecord | null> {
    return (
      this.quotes.find(
        (record) => record.caseId === caseId && record.doctorUserId === doctorUserId
      ) ?? null
    );
  }

  async listQuotesForCase(caseId: string): Promise<DentistQuoteRecord[]> {
    return this.quotes.filter((record) => record.caseId === caseId);
  }

  async listQuotesForCaseAndDoctor(
    caseId: string,
    doctorUserId: string
  ): Promise<DentistQuoteRecord[]> {
    return this.quotes.filter(
      (record) => record.caseId === caseId && record.doctorUserId === doctorUserId
    );
  }

  async listQuotesForPatient(patientUserId: string): Promise<DentistQuoteRecord[]> {
    const ownedCaseIds = new Set(
      this.cases
        .filter((record) => record.patientUserId === patientUserId)
        .map((record) => record.id)
    );

    return this.quotes.filter((record) => ownedCaseIds.has(record.caseId));
  }

  async listQuotesForDoctor(doctorUserId: string): Promise<DentistQuoteRecord[]> {
    return this.quotes.filter((record) => record.doctorUserId === doctorUserId);
  }
}

describe("Cases + Quotes routes", () => {
  it("creates cases, creates quotes, updates case status, and blocks duplicate doctor quotes", async () => {
    const fakeAuthService = {
      sendEmailCode: async () => ({}),
      verifyEmail: async () => ({}),
      sendSmsCode: async () => ({}),
      verifySms: async () => ({}),
      registerPatient: async () => ({}),
      registerDoctor: async () => ({}),
      login: async () => ({}),
      getMe: async () => ({}),
      refresh: async () => ({}),
      logout: async () => ({}),
    };

    const authenticate: RequestHandler = (req, _res, next) => {
      const role = req.header("x-role");
      const userId = req.header("x-user-id");

      if (!role || !userId || (role !== "patient" && role !== "doctor")) {
        next(
          new AppError(401, {
            code: "AUTH_REQUIRED",
            message: "Authorization header is required.",
          })
        );
        return;
      }

      req.auth = {
        role,
        userId,
      };
      next();
    };

    const casesQuotesService = new CasesQuotesService({
      casesQuotesRepository: new InMemoryCasesQuotesRepository(),
      now: () => new Date("2026-03-15T10:00:00.000Z"),
      quoteIdFactory: () => "q1742010000",
    });

    const app = createApp({
      authService: fakeAuthService as never,
      casesQuotesService,
      authenticate,
    });

    const patientHeaders = { "x-role": "patient", "x-user-id": "patient_1" };
    const doctorHeaders = { "x-role": "doctor", "x-user-id": "doctor_1" };

    const createCaseResponse = await request(app)
      .post("/api/cases")
      .set("Content-Type", "application/json").set(patientHeaders)
      .send({
        patientName: "Sarah Johnson",
        country: "United States",
        treatments: [
          { name: "Implant: Whole (Root + Crown)", qty: 2 },
          { name: "Crowns", qty: 1 },
        ],
        medicalNotes: "No known allergies.",
        dentalIssues: ["Missing Teeth"],
        filesCount: { xrays: 2, treatmentPlans: 1, photos: 3 },
        visitDate: "Mar 15 - Mar 22, 2026",
        birthDate: "1990-05-15",
      });

    expect(createCaseResponse.status).toBe(201);
    expect(createCaseResponse.body.data.case).toMatchObject({
      id: "1001",
      status: "pending",
      date: "2026-03-15",
    });

    const createQuoteResponse = await request(app)
      .post("/api/quotes")
      .set("Content-Type", "application/json").set(doctorHeaders)
      .send({
        caseId: "1001",
        dentistName: "Dr. Kim Minjun",
        clinicName: "Seoul Bright Dental",
        location: "Gangnam, Seoul",
        rating: 4.9,
        reviewCount: 127,
        totalPrice: 4150,
        treatments: [
          { name: "Implant: Whole (Root + Crown)", qty: 2, price: 1500 },
          { name: "Crowns", qty: 1, price: 350 },
        ],
        treatmentDetails: "Premium implants with zirconia crowns.",
        duration: "6 Days",
        message: "We can complete all treatments during your visit.",
      });

    expect(createQuoteResponse.status).toBe(201);
    expect(createQuoteResponse.body.data.quote).toMatchObject({
      id: "q1742010000",
      caseId: "1001",
      dentistName: "Dr. Kim Minjun",
    });

    const patientCaseResponse = await request(app)
      .get("/api/cases/1001")
      .set("Content-Type", "application/json").set(patientHeaders);

    expect(patientCaseResponse.status).toBe(200);
    expect(patientCaseResponse.body.data.case.status).toBe("quotes_received");

    const patientQuotesResponse = await request(app)
      .get("/api/cases/1001/quotes")
      .set("Content-Type", "application/json").set(patientHeaders);

    expect(patientQuotesResponse.status).toBe(200);
    expect(patientQuotesResponse.body.data.quotes).toHaveLength(1);

    const duplicateQuoteResponse = await request(app)
      .post("/api/quotes")
      .set("Content-Type", "application/json").set(doctorHeaders)
      .send({
        caseId: "1001",
        dentistName: "Dr. Kim Minjun",
        clinicName: "Seoul Bright Dental",
        location: "Gangnam, Seoul",
        rating: 4.9,
        reviewCount: 127,
        totalPrice: 4150,
        treatments: [{ name: "Implant: Whole (Root + Crown)", qty: 2, price: 1500 }],
        treatmentDetails: "Duplicate quote attempt.",
        duration: "6 Days",
        message: "Duplicate quote attempt.",
      });

    expect(duplicateQuoteResponse.status).toBe(400);
    expect(duplicateQuoteResponse.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
    });

    const bookCaseResponse = await request(app)
      .patch("/api/cases/1001/status")
      .set("Content-Type", "application/json").set(patientHeaders)
      .send({ status: "booked" });

    expect(bookCaseResponse.status).toBe(200);
    expect(bookCaseResponse.body.data.case).toEqual({
      id: "1001",
      status: "booked",
    });
  });
});