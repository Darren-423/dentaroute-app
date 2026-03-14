import { createApp } from "./app";
import { prisma } from "./config/database";
import { env } from "./config/env";
import { createAuthMiddleware } from "./middleware/auth";
import { PrismaAuthRepository } from "./repositories/prismaAuthRepository";
import { PrismaCasesQuotesRepository } from "./repositories/prismaCasesQuotesRepository";
import { AuthService } from "./services/authService";
import { CasesQuotesService } from "./services/casesQuotesService";
import { LocalFileStorage } from "./services/fileStorage";
import { BcryptPasswordService } from "./services/passwordService";
import { JwtTokenService } from "./services/tokenService";
import { ConsoleVerificationSender } from "./services/verificationSender";

const authRepository = new PrismaAuthRepository(prisma);
const casesQuotesRepository = new PrismaCasesQuotesRepository(prisma);
const tokenService = new JwtTokenService({
  accessSecret: env.JWT_SECRET,
  refreshSecret: env.JWT_REFRESH_SECRET,
  accessTokenTtlMinutes: env.ACCESS_TOKEN_TTL_MIN,
  refreshTokenTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
});

const authService = new AuthService({
  authRepository,
  passwordService: new BcryptPasswordService(),
  tokenService,
  verificationSender: new ConsoleVerificationSender(),
  fileStorage: new LocalFileStorage(env.UPLOAD_DIR),
  verificationCodeTtlMinutes: env.VERIFICATION_CODE_TTL_MIN,
  verificationResendSec: env.VERIFICATION_RESEND_SEC,
  refreshTokenTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
  fixedVerificationCode: env.AUTH_DEV_VERIFICATION_CODE,
});

const casesQuotesService = new CasesQuotesService({
  casesQuotesRepository,
});

const authenticate = createAuthMiddleware({
  authRepository,
  tokenService,
});

export const app = createApp({
  authService,
  casesQuotesService,
  authenticate,
});