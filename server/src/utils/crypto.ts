import { createHash, randomInt, randomUUID } from "crypto";

export const generateVerificationCode = (): string => {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
};

export const hashValue = (value: string): string => {
  return createHash("sha256").update(value).digest("hex");
};

export const createSessionId = (): string => {
  return randomUUID();
};
