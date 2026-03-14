import { z } from "zod";

const roleSchema = z.enum(["patient", "doctor"]);
const emailSchema = z.string().trim().email();
const phoneCountryCodeSchema = z.string().trim().min(1).max(6);
const phoneSchema = z.string().trim().regex(/^\d{6,15}$/);
const codeSchema = z.string().trim().regex(/^\d{6}$/);
const passwordSchema = z.string().min(8).max(128);

const agreedToTermsSchema = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }
  }

  return value;
}, z.literal(true));

export const sendEmailCodeSchema = z.object({
  email: emailSchema,
  role: roleSchema,
});

export const verifyEmailSchema = z.object({
  email: emailSchema,
  code: codeSchema,
  role: roleSchema,
});

export const sendSmsCodeSchema = z.object({
  phoneCountryCode: phoneCountryCodeSchema,
  phone: phoneSchema,
  role: roleSchema,
});

export const verifySmsSchema = z.object({
  phoneCountryCode: phoneCountryCodeSchema,
  phone: phoneSchema,
  code: codeSchema,
  role: roleSchema,
});

export const registerPatientSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: emailSchema,
  phoneCountryCode: phoneCountryCodeSchema,
  phone: phoneSchema,
  password: passwordSchema,
  agreedToTerms: agreedToTermsSchema,
});

export const registerDoctorSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: emailSchema,
  phoneCountryCode: phoneCountryCodeSchema,
  phone: phoneSchema,
  password: passwordSchema,
  agreedToTerms: agreedToTermsSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});
