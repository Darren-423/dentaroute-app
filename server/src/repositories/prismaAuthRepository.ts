import {
  LicenseVerificationStatus as PrismaLicenseVerificationStatus,
  PrismaClient,
  ProfileStatus as PrismaProfileStatus,
  UserRole as PrismaUserRole,
  VerificationChannel as PrismaVerificationChannel,
} from "@prisma/client";

import type {
  AuthRepository,
  CreateDoctorLicenseFileInput,
  CreateRefreshSessionInput,
  CreateUserInput,
  CreateVerificationCodeInput,
  DoctorLicenseFileRecord,
  RefreshSessionRecord,
  UserRecord,
  VerificationCodeRecord,
} from "./authRepository";
import type {
  AuthRole,
  LicenseVerificationStatus,
  ProfileStatus,
  VerificationChannel,
} from "../types/auth";

const toPrismaUserRole = (role: AuthRole): PrismaUserRole => {
  return role === "patient" ? PrismaUserRole.PATIENT : PrismaUserRole.DOCTOR;
};

const fromPrismaUserRole = (role: PrismaUserRole): AuthRole => {
  return role === PrismaUserRole.PATIENT ? "patient" : "doctor";
};

const toPrismaProfileStatus = (status: ProfileStatus): PrismaProfileStatus => {
  return status === "active"
    ? PrismaProfileStatus.ACTIVE
    : PrismaProfileStatus.NEEDS_PROFILE_SETUP;
};

const fromPrismaProfileStatus = (status: PrismaProfileStatus): ProfileStatus => {
  return status === PrismaProfileStatus.ACTIVE ? "active" : "needs_profile_setup";
};

const toPrismaLicenseStatus = (
  status?: LicenseVerificationStatus
): PrismaLicenseVerificationStatus | undefined => {
  if (!status) {
    return undefined;
  }

  switch (status) {
    case "pending_review":
      return PrismaLicenseVerificationStatus.PENDING_REVIEW;
    case "verified":
      return PrismaLicenseVerificationStatus.VERIFIED;
    case "rejected":
      return PrismaLicenseVerificationStatus.REJECTED;
  }
};

const fromPrismaLicenseStatus = (
  status: PrismaLicenseVerificationStatus | null
): LicenseVerificationStatus | undefined => {
  if (!status) {
    return undefined;
  }

  switch (status) {
    case PrismaLicenseVerificationStatus.PENDING_REVIEW:
      return "pending_review";
    case PrismaLicenseVerificationStatus.VERIFIED:
      return "verified";
    case PrismaLicenseVerificationStatus.REJECTED:
      return "rejected";
  }
};

const toPrismaVerificationChannel = (
  channel: VerificationChannel
): PrismaVerificationChannel => {
  return channel === "email" ? PrismaVerificationChannel.EMAIL : PrismaVerificationChannel.SMS;
};

const fromPrismaVerificationChannel = (
  channel: PrismaVerificationChannel
): VerificationChannel => {
  return channel === PrismaVerificationChannel.EMAIL ? "email" : "sms";
};

const mapUser = (user: {
  id: string;
  role: PrismaUserRole;
  fullName: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
  normalizedPhone: string;
  passwordHash: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  profileStatus: PrismaProfileStatus;
  licenseVerificationStatus: PrismaLicenseVerificationStatus | null;
  createdAt: Date;
  updatedAt: Date;
}): UserRecord => {
  return {
    id: user.id,
    role: fromPrismaUserRole(user.role),
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    phoneCountryCode: user.phoneCountryCode,
    normalizedPhone: user.normalizedPhone,
    passwordHash: user.passwordHash,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    profileStatus: fromPrismaProfileStatus(user.profileStatus),
    licenseVerificationStatus: fromPrismaLicenseStatus(user.licenseVerificationStatus),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const mapVerificationCode = (code: {
  id: string;
  channel: PrismaVerificationChannel;
  role: PrismaUserRole;
  target: string;
  codeHash: string;
  expiresAt: Date;
  resendAvailableAt: Date;
  verifiedAt: Date | null;
  consumedAt: Date | null;
  createdAt: Date;
}): VerificationCodeRecord => {
  return {
    id: code.id,
    channel: fromPrismaVerificationChannel(code.channel),
    role: fromPrismaUserRole(code.role),
    target: code.target,
    codeHash: code.codeHash,
    expiresAt: code.expiresAt,
    resendAvailableAt: code.resendAvailableAt,
    verifiedAt: code.verifiedAt,
    consumedAt: code.consumedAt,
    createdAt: code.createdAt,
  };
};

const mapRefreshSession = (session: {
  id: string;
  sessionId: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  lastUsedAt: Date | null;
}): RefreshSessionRecord => {
  return {
    id: session.id,
    sessionId: session.sessionId,
    userId: session.userId,
    expiresAt: session.expiresAt,
    revokedAt: session.revokedAt,
    createdAt: session.createdAt,
    lastUsedAt: session.lastUsedAt,
  };
};

const mapDoctorLicenseFile = (file: {
  id: string;
  userId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  createdAt: Date;
}): DoctorLicenseFileRecord => {
  return {
    id: file.id,
    userId: file.userId,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    storageKey: file.storageKey,
    createdAt: file.createdAt,
  };
};

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? mapUser(user) : null;
  }

  async findUserById(userId: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user ? mapUser(user) : null;
  }

  async findUserByNormalizedPhone(normalizedPhone: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { normalizedPhone } });
    return user ? mapUser(user) : null;
  }

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    const user = await this.prisma.user.create({
      data: {
        role: toPrismaUserRole(input.role),
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        phoneCountryCode: input.phoneCountryCode,
        normalizedPhone: input.normalizedPhone,
        passwordHash: input.passwordHash,
        emailVerified: input.emailVerified,
        phoneVerified: input.phoneVerified,
        profileStatus: toPrismaProfileStatus(input.profileStatus),
        licenseVerificationStatus: toPrismaLicenseStatus(input.licenseVerificationStatus),
      },
    });

    return mapUser(user);
  }

  async createVerificationCode(input: CreateVerificationCodeInput): Promise<VerificationCodeRecord> {
    const code = await this.prisma.verificationCode.create({
      data: {
        channel: toPrismaVerificationChannel(input.channel),
        role: toPrismaUserRole(input.role),
        target: input.target,
        codeHash: input.codeHash,
        expiresAt: input.expiresAt,
        resendAvailableAt: input.resendAvailableAt,
      },
    });

    return mapVerificationCode(code);
  }

  async findLatestVerificationCode(input: {
    channel: VerificationChannel;
    role: AuthRole;
    target: string;
  }): Promise<VerificationCodeRecord | null> {
    const code = await this.prisma.verificationCode.findFirst({
      where: {
        channel: toPrismaVerificationChannel(input.channel),
        role: toPrismaUserRole(input.role),
        target: input.target,
      },
      orderBy: { createdAt: "desc" },
    });

    return code ? mapVerificationCode(code) : null;
  }

  async markVerificationCodeVerified(id: string, verifiedAt: Date): Promise<VerificationCodeRecord> {
    const code = await this.prisma.verificationCode.update({
      where: { id },
      data: { verifiedAt },
    });

    return mapVerificationCode(code);
  }

  async createRefreshSession(input: CreateRefreshSessionInput): Promise<RefreshSessionRecord> {
    const session = await this.prisma.refreshSession.create({
      data: {
        sessionId: input.sessionId,
        userId: input.userId,
        expiresAt: input.expiresAt,
      },
    });

    return mapRefreshSession(session);
  }

  async findRefreshSessionBySessionId(sessionId: string): Promise<RefreshSessionRecord | null> {
    const session = await this.prisma.refreshSession.findUnique({ where: { sessionId } });
    return session ? mapRefreshSession(session) : null;
  }

  async revokeRefreshSession(sessionId: string, revokedAt: Date): Promise<void> {
    await this.prisma.refreshSession.updateMany({
      where: {
        sessionId,
        revokedAt: null,
      },
      data: { revokedAt },
    });
  }

  async touchRefreshSession(sessionId: string, lastUsedAt: Date): Promise<void> {
    await this.prisma.refreshSession.updateMany({
      where: { sessionId },
      data: { lastUsedAt },
    });
  }

  async createDoctorLicenseFiles(
    userId: string,
    files: CreateDoctorLicenseFileInput[]
  ): Promise<DoctorLicenseFileRecord[]> {
    if (files.length === 0) {
      return [];
    }

    const created = await this.prisma.$transaction(
      files.map((file) =>
        this.prisma.doctorLicenseFile.create({
          data: {
            userId,
            originalName: file.originalName,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            storageKey: file.storageKey,
          },
        })
      )
    );

    return created.map(mapDoctorLicenseFile);
  }
}
