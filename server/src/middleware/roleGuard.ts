import type { RequestHandler } from "express";

import { AppError } from "../errors/appError";
import type { AuthRole } from "../types/auth";

export const requireRole = (...roles: AuthRole[]): RequestHandler => {
  return (req, _res, next) => {
    if (!req.auth) {
      next(
        new AppError(401, {
          code: "AUTH_REQUIRED",
          message: "Authentication is required.",
        })
      );
      return;
    }

    if (!roles.includes(req.auth.role)) {
      next(
        new AppError(403, {
          code: "AUTH_INVALID",
          message: "You do not have access to this resource.",
        })
      );
      return;
    }

    next();
  };
};