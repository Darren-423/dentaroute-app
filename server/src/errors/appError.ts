import type { ApiErrorBody } from "../types/api";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, string[]>;

  constructor(statusCode: number, error: ApiErrorBody) {
    super(error.message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = error.code;
    this.details = error.details;
  }
}
