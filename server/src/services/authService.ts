import { AppError } from "../errors/appError";
import type { AuthRepository, UserRecord } from "../repositories/authRepository";
import type { FileStorage, UploadFile } from "./fileStorage";
import type { PasswordService } from "./passwordService";
import type { TokenService } from "./tokenService";
import type { VerificationSender } from "./verificationSender";
import type { AuthRole, AuthUser, LoginResponse, RefreshResponse, VerificationChannel } from "../types/auth";
import { createSessionId, generateVerificationCode, hashValue } from "../utils/crypto";

export interface SendCodeInput {
  email?: string;
  phoneCountryCode?: string;
  phone?: string;
  role: AuthRole;
}

export interface VerifyCodeInput {
  email?: string;
  phoneCountryCode?: string;
  phone?: string;
  code: string;
  role: AuthRole;
}

export interface RegisterPatientInput {
  firstName: string;
  lastName: string;
  email: string;
  phoneCountryCode: string;
  phone: string;
  password: string;
  agreedToTerms: true;
}

export interface RegisterDoctorInput extends RegisterPatientInput {
  licenseFiles: UploadFile[];
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthServiceOptions {
  authRepository: AuthRepository;
  passwordService: PasswordService;
  tokenService: TokenService;
  verificationSender: VerificationSender;
  fileStorage: FileStorage;
  verificationCodeTtlMinutes: number;
  verificationResendSec: number;
  refreshTokenTtlDays: number;
  fixedVerificationCode?: string;
  now?: () => Date;
}

const INVALID_CREDENTIALS_ERROR = new AppError(401, {
  code: "AUTH_INVALID",
  message: "Invalid email or password.",
});

const INVALID_VERIFICATION_CODE_ERROR = new AppError(401, {
  code: "AUTH_INVALID",
  message: "Invalid or expired verification code.",
});

const normalizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

const normalizePhone = (phoneCountryCode: string, phone: string): string => {
  return `${phoneCountryCode}${phone}`;
};

const toAuthUser = (user: UserRecord): AuthUser => {
  return {
    id: user.id,
    role: user.role,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    phoneCountryCode: user.phoneCountryCode,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    profileStatus: user.profileStatus,
    ...(user.licenseVerificationStatus
      ? { licenseVerificationStatus: user.licenseVerificationStatus }
      : {}),
    createdAt: user.createdAt.toISOString(),
  };
};

export class AuthService {
  private readonly now: () => Date;

  constructor(private readonly options: AuthServiceOptions) {
    this.now = options.now ?? (() => new Date());
  }

  async sendEmailCode(input: Required<Pick<SendCodeInput, "email" | "role">>) {
    const email = normalizeEmail(input.email);
    await this.ensureEmailAvailable(email);

    return this.issueVerificationCode({
      channel: "email",
      role: input.role,
      target: email,
      deliver: (code) =>
        this.options.verificationSender.sendEmailCode({
          email,
          role: input.role,
          code,
        }),
    });
  }

  async verifyEmail(input: Required<Pick<VerifyCodeInput, "email" | "code" | "role">>) {
    const email = normalizeEmail(input.email);
    await this.verifyCode({
      channel: "email",
      role: input.role,
      target: email,
      code: input.code,
    });

    return { verified: true as const };
  }

  async sendSmsCode(
    input: Required<Pick<SendCodeInput, "phoneCountryCode" | "phone" | "role">>
  ) {
    const normalizedPhone = normalizePhone(input.phoneCountryCode, input.phone);
    await this.ensurePhoneAvailable(normalizedPhone);

    return this.issueVerificationCode({
      channel: "sms",
      role: input.role,
      target: normalizedPhone,
      deliver: (code) =>
        this.options.verificationSender.sendSmsCode({
          phoneCountryCode: input.phoneCountryCode,
          phone: input.phone,
          role: input.role,
          code,
        }),
    });
  }

  async verifySms(
    input: Required<Pick<VerifyCodeInput, "phoneCountryCode" | "phone" | "code" | "role">>
  ) {
    const normalizedPhone = normalizePhone(input.phoneCountryCode, input.phone);
    await this.verifyCode({
      channel: "sms",
      role: input.role,
      target: normalizedPhone,
      code: input.code,
    });

    return { verified: true as const };
  }

  async registerPatient(input: RegisterPatientInput): Promise<LoginResponse> {
    const email = normalizeEmail(input.email);
    const normalizedPhone = normalizePhone(input.phoneCountryCode, input.phone);

    await this.ensureEmailAvailable(email);
    await this.ensurePhoneAvailable(normalizedPhone);
    await this.assertVerifiedContact({
      channel: "email",
      role: "patient",
      target: email,
      field: "email",
      message: "Email verification is required.",
    });
    await this.assertVerifiedContact({
      channel: "sms",
      role: "patient",
      target: normalizedPhone,
      field: "phone",
      message: "Phone verification is required.",
    });

    const user = await this.options.authRepository.createUser({
      role: "patient",
      fullName: `${input.firstName.trim()} ${input.lastName.trim()}`.trim(),
      email,
      phone: input.phone.trim(),
      phoneCountryCode: input.phoneCountryCode.trim(),
      normalizedPhone,
      passwordHash: await this.options.passwordService.hash(input.password),
      emailVerified: true,
      phoneVerified: true,
      profileStatus: "needs_profile_setup",
    });

    return this.issueLoginResponse(user);
  }

  async registerDoctor(input: RegisterDoctorInput): Promise<LoginResponse> {
    const email = normalizeEmail(input.email);
    const normalizedPhone = normalizePhone(input.phoneCountryCode, input.phone);

    await this.ensureEmailAvailable(email);
    await this.ensurePhoneAvailable(normalizedPhone);
    await this.assertVerifiedContact({
      channel: "email",
      role: "doctor",
      target: email,
      field: "email",
      message: "Email verification is required.",
    });
    await this.assertVerifiedContact({
      channel: "sms",
      role: "doctor",
      target: normalizedPhone,
      field: "phone",
      message: "Phone verification is required.",
    });

    if (input.licenseFiles.length === 0 || input.licenseFiles.length > 3) {
      throw new AppError(400, {
        code: "VALIDATION_ERROR",
        message: "Invalid request body.",
        details: {
          licenseFiles: ["Upload between 1 and 3 license images."],
        },
      });
    }

    const user = await this.options.authRepository.createUser({
      role: "doctor",
      fullName: `${input.firstName.trim()} ${input.lastName.trim()}`.trim(),
      email,
      phone: input.phone.trim(),
      phoneCountryCode: input.phoneCountryCode.trim(),
      normalizedPhone,
      passwordHash: await this.options.passwordService.hash(input.password),
      emailVerified: true,
      phoneVerified: true,
      profileStatus: "needs_profile_setup",
      licenseVerificationStatus: "pending_review",
    });

    const storedFiles = await this.options.fileStorage.storeDoctorLicenseFiles(user.id, input.licenseFiles);
    await this.options.authRepository.createDoctorLicenseFiles(user.id, storedFiles);

    return this.issueLoginResponse(user);
  }

  async login(input: LoginInput): Promise<LoginResponse> {
    const email = normalizeEmail(input.email);
    const user = await this.options.authRepository.findUserByEmail(email);

    if (!user) {
      throw INVALID_CREDENTIALS_ERROR;
    }

    const passwordMatches = await this.options.passwordService.verify(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw INVALID_CREDENTIALS_ERROR;
    }

    return this.issueLoginResponse(user);
  }

  async getMe(userId: string): Promise<AuthUser> {
    const user = await this.options.authRepository.findUserById(userId);
    if (!user) {
      throw new AppError(401, {
        code: "AUTH_INVALID",
        message: "User no longer exists.",
      });
    }

    return toAuthUser(user);
  }

  async refresh(refreshToken: string): Promise<RefreshResponse> {
    const payload = this.options.tokenService.verifyRefreshToken(refreshToken);
    const now = this.now();
    const session = await this.options.authRepository.findRefreshSessionBySessionId(payload.sessionId);

    if (!session || session.userId !== payload.sub || session.revokedAt) {
      throw new AppError(401, {
        code: "AUTH_INVALID",
        message: "Invalid refresh token.",
      });
    }

    if (session.expiresAt < now) {
      throw new AppError(401, {
        code: "AUTH_EXPIRED",
        message: "Refresh token has expired.",
      });
    }

    const user = await this.options.authRepository.findUserById(payload.sub);
    if (!user) {
      throw new AppError(401, {
        code: "AUTH_INVALID",
        message: "User no longer exists.",
      });
    }

    await this.options.authRepository.revokeRefreshSession(session.sessionId, now);

    const newSessionId = createSessionId();
    await this.options.authRepository.createRefreshSession({
      sessionId: newSessionId,
      userId: user.id,
      expiresAt: this.addDays(now, this.options.refreshTokenTtlDays),
    });

    return {
      token: this.options.tokenService.issueAccessToken({ id: user.id, role: user.role }),
      refreshToken: this.options.tokenService.issueRefreshToken(
        { id: user.id, role: user.role },
        newSessionId
      ),
    };
  }

  async logout(refreshToken: string, expectedUserId?: string): Promise<{ loggedOut: true }> {
    const payload = this.options.tokenService.verifyRefreshToken(refreshToken);

    if (expectedUserId && payload.sub !== expectedUserId) {
      throw new AppError(401, {
        code: "AUTH_INVALID",
        message: "Refresh token does not belong to the authenticated user.",
      });
    }

    await this.options.authRepository.revokeRefreshSession(payload.sessionId, this.now());
    return { loggedOut: true };
  }

  private async issueVerificationCode(input: {
    channel: VerificationChannel;
    role: AuthRole;
    target: string;
    deliver: (code: string) => Promise<void>;
  }) {
    const now = this.now();
    const latestCode = await this.options.authRepository.findLatestVerificationCode({
      channel: input.channel,
      role: input.role,
      target: input.target,
    });

    if (latestCode && latestCode.resendAvailableAt > now) {
      throw new AppError(400, {
        code: "VALIDATION_ERROR",
        message: "Please wait before requesting a new verification code.",
      });
    }

    const code = this.options.fixedVerificationCode ?? generateVerificationCode();
    await this.options.authRepository.createVerificationCode({
      channel: input.channel,
      role: input.role,
      target: input.target,
      codeHash: hashValue(code),
      expiresAt: this.addMinutes(now, this.options.verificationCodeTtlMinutes),
      resendAvailableAt: this.addSeconds(now, this.options.verificationResendSec),
    });

    await input.deliver(code);

    return {
      sent: true as const,
      expiresInSec: this.options.verificationCodeTtlMinutes * 60,
      resendAfterSec: this.options.verificationResendSec,
    };
  }

  private async verifyCode(input: {
    channel: VerificationChannel;
    role: AuthRole;
    target: string;
    code: string;
  }): Promise<void> {
    const latestCode = await this.options.authRepository.findLatestVerificationCode({
      channel: input.channel,
      role: input.role,
      target: input.target,
    });

    if (!latestCode || latestCode.expiresAt < this.now()) {
      throw INVALID_VERIFICATION_CODE_ERROR;
    }

    if (latestCode.codeHash !== hashValue(input.code)) {
      throw INVALID_VERIFICATION_CODE_ERROR;
    }

    if (!latestCode.verifiedAt) {
      await this.options.authRepository.markVerificationCodeVerified(latestCode.id, this.now());
    }
  }

  private async ensureEmailAvailable(email: string): Promise<void> {
    const existingUser = await this.options.authRepository.findUserByEmail(email);
    if (existingUser) {
      throw new AppError(400, {
        code: "VALIDATION_ERROR",
        message: "Invalid request body.",
        details: {
          email: ["Email is already in use."],
        },
      });
    }
  }

  private async ensurePhoneAvailable(normalizedPhone: string): Promise<void> {
    const existingUser = await this.options.authRepository.findUserByNormalizedPhone(normalizedPhone);
    if (existingUser) {
      throw new AppError(400, {
        code: "VALIDATION_ERROR",
        message: "Invalid request body.",
        details: {
          phone: ["Phone number is already in use."],
        },
      });
    }
  }

  private async assertVerifiedContact(input: {
    channel: VerificationChannel;
    role: AuthRole;
    target: string;
    field: "email" | "phone";
    message: string;
  }): Promise<void> {
    const record = await this.options.authRepository.findLatestVerificationCode({
      channel: input.channel,
      role: input.role,
      target: input.target,
    });

    if (!record || !record.verifiedAt || record.expiresAt < this.now()) {
      throw new AppError(400, {
        code: "VALIDATION_ERROR",
        message: "Invalid request body.",
        details: {
          [input.field]: [input.message],
        },
      });
    }
  }

  private async issueLoginResponse(user: UserRecord): Promise<LoginResponse> {
    const now = this.now();
    const sessionId = createSessionId();
    await this.options.authRepository.createRefreshSession({
      sessionId,
      userId: user.id,
      expiresAt: this.addDays(now, this.options.refreshTokenTtlDays),
    });

    return {
      token: this.options.tokenService.issueAccessToken({ id: user.id, role: user.role }),
      refreshToken: this.options.tokenService.issueRefreshToken(
        { id: user.id, role: user.role },
        sessionId
      ),
      user: toAuthUser(user),
    };
  }

  private addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  private addSeconds(date: Date, seconds: number): Date {
    return new Date(date.getTime() + seconds * 1000);
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }
}
