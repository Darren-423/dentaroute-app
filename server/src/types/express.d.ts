import type { AuthRole } from "./auth";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        role: AuthRole;
      };
    }
  }
}

export {};
