import type { RequestHandler } from "express";

import { AppError } from "../errors/appError";
import type { AuthRepository } from "../repositories/authRepository";
import type { TokenService } from "../services/tokenService";
import { asyncHandler } from "../utils/asyncHandler";

export const createAuthMiddleware = (input: {
  authRepository: AuthRepository;
  tokenService: TokenService;
}): RequestHandler => {
  return asyncHandler(async (req, _res, next) => {
    const authorization = req.header("authorization");

    if (!authorization || !authorization.startsWith("Bearer ")) {
      throw new AppError(401, {
        code: "AUTH_REQUIRED",
        message: "Authorization header is required.",
      });
    }

    const token = authorization.slice("Bearer ".length).trim();
    const payload = input.tokenService.verifyAccessToken(token);

    if (payload.type !== "access") {
      throw new AppError(401, {
        code: "AUTH_INVALID",
        message: "Invalid access token.",
      });
    }

    const user = await input.authRepository.findUserById(payload.sub);
    if (!user) {
      throw new AppError(401, {
        code: "AUTH_INVALID",
        message: "User no longer exists.",
      });
    }

    req.auth = {
      userId: user.id,
      role: user.role,
    };

    next();
  });
};
