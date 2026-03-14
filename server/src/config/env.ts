import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  PORT: z.coerce.number().int().positive().default(3000),
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  VERIFICATION_CODE_TTL_MIN: z.coerce.number().int().positive().default(5),
  VERIFICATION_RESEND_SEC: z.coerce.number().int().positive().default(60),
  AUTH_DEV_VERIFICATION_CODE: z.string().regex(/^\d{6}$/).optional(),
  UPLOAD_DIR: z.string().default("./uploads"),
});

export const env = envSchema.parse(process.env);
