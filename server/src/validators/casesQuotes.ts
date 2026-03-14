import { z } from "zod";

const publicCaseIdSchema = z
  .string()
  .trim()
  .regex(/^\d+$/)
  .refine((value) => Number.isInteger(Number(value)) && Number(value) >= 1001, {
    message: "Case id must be a sequential string.",
  });

const caseTreatmentSchema = z.object({
  name: z.string().trim().min(1).max(200),
  qty: z.number().int().min(1),
});

const filesCountSchema = z.object({
  xrays: z.number().int().min(0),
  treatmentPlans: z.number().int().min(0),
  photos: z.number().int().min(0),
});

export const createCaseSchema = z.object({
  patientName: z.string().trim().min(1).max(200),
  country: z.string().trim().min(1).max(120),
  treatments: z.array(caseTreatmentSchema).min(1),
  medicalNotes: z.string(),
  dentalIssues: z.array(z.string().trim().min(1).max(120)),
  filesCount: filesCountSchema,
  visitDate: z.string().trim().min(1).max(120).optional(),
  birthDate: z.string().trim().min(1).max(20).optional(),
});

export const updateCaseSchema = createCaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided.",
  });

export const updateCaseStatusSchema = z.object({
  status: z.enum(["pending", "quotes_received", "booked"]),
});

const quoteTreatmentSchema = z.object({
  name: z.string().trim().min(1).max(200),
  qty: z.number().int().min(1),
  price: z.number().min(0),
});

const quoteVisitSchema = z.object({
  visit: z.number().int().min(1),
  description: z.string().trim().min(1).max(240),
  gapMonths: z.number().int().min(0).optional(),
  gapDays: z.number().int().min(0).optional(),
  paymentAmount: z.number().min(0).optional(),
  paymentPercent: z.number().min(0).max(100).optional(),
});

export const createQuoteSchema = z.object({
  caseId: publicCaseIdSchema,
  dentistName: z.string().trim().min(1).max(200),
  clinicName: z.string().trim().min(1).max(200),
  location: z.string().trim().min(1).max(200),
  address: z.string().trim().min(1).max(240).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().min(0),
  totalPrice: z.number().positive(),
  treatments: z.array(quoteTreatmentSchema).min(1),
  treatmentDetails: z.string().trim().min(1),
  duration: z.string().trim().min(1).max(120),
  visits: z.array(quoteVisitSchema).min(1).optional(),
  message: z.string().trim().min(1),
  clinicPhotos: z.array(z.string().trim().min(1)).optional(),
  yearsExperience: z.number().int().min(0).optional(),
  specialties: z.array(z.string().trim().min(1).max(120)).optional(),
  licenseVerified: z.boolean().optional(),
  certifications: z.array(z.string().trim().min(1).max(160)).optional(),
});

export const caseIdParamsSchema = z.object({
  id: publicCaseIdSchema,
});

export const caseQuotesParamsSchema = z.object({
  caseId: publicCaseIdSchema,
});