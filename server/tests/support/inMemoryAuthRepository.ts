import { randomUUID } from "crypto";

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
} from "../../src/repositories/authRepository";

export class InMemoryAuthRepository implements AuthRepository {
  private users: UserRecord[] = [];
  private verificationCodes: VerificationCodeRecord[] = [];
  private refreshSessions: RefreshSessionRecord[] = [];
  private doctorLicenseFiles: DoctorLicenseFileRecord[] = [];

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async findUserById(userId: string): Promise<UserRecord | null> {
    return this.users.find((user) => user.id === userId) ?? null;
  }

  async findUserByNormalizedPhone(normalizedPhone: string): Promise<UserRecord | null> {
    return this.users.find((user) => user.normalizedPhone === normalizedPhone) ?? null;
  }

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    const now = new Date();
    const user: UserRecord = {
      id: `usr_${randomUUID()}`,
      role: input.role,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      phoneCountryCode: input.phoneCountryCode,
      normalizedPhone: input.normalizedPhone,
      passwordHash: input.passwordHash,
      emailVerified: input.emailVerified,
      phoneVerified: input.phoneVerified,
      profileStatus: input.profileStatus,
      licenseVerificationStatus: input.licenseVerificationStatus,
      createdAt: now,
      updatedAt: now,
    };

    this.users.push(user);
    return user;
  }

  async createVerificationCode(input: CreateVerificationCodeInput): Promise<VerificationCodeRecord> {
    const record: VerificationCodeRecord = {
      id: `vc_${randomUUID()}`,
      channel: input.channel,
      role: input.role,
      target: input.target,
      codeHash: input.codeHash,
      expiresAt: input.expiresAt,
      resendAvailableAt: input.resendAvailableAt,
      verifiedAt: null,
      consumedAt: null,
      createdAt: new Date(),
    };

    this.verificationCodes.push(record);
    return record;
  }

  async findLatestVerificationCode(input: {
    channel: "email" | "sms";
    role: "patient" | "doctor";
    target: string;
  }): Promise<VerificationCodeRecord | null> {
    const records = this.verificationCodes
      .filter(
        (record) =>
          record.channel === input.channel &&
          record.role === input.role &&
          record.target === input.target
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return records[0] ?? null;
  }

  async markVerificationCodeVerified(id: string, verifiedAt: Date): Promise<VerificationCodeRecord> {
    const record = this.verificationCodes.find((item) => item.id === id);
    if (!record) {
      throw new Error(`Verification code ${id} not found`);
    }

    record.verifiedAt = verifiedAt;
    return record;
  }

  async createRefreshSession(input: CreateRefreshSessionInput): Promise<RefreshSessionRecord> {
    const session: RefreshSessionRecord = {
      id: `rs_${randomUUID()}`,
      sessionId: input.sessionId,
      userId: input.userId,
      expiresAt: input.expiresAt,
      revokedAt: null,
      createdAt: new Date(),
      lastUsedAt: null,
    };

    this.refreshSessions.push(session);
    return session;
  }

  async findRefreshSessionBySessionId(sessionId: string): Promise<RefreshSessionRecord | null> {
    return this.refreshSessions.find((session) => session.sessionId === sessionId) ?? null;
  }

  async revokeRefreshSession(sessionId: string, revokedAt: Date): Promise<void> {
    const session = this.refreshSessions.find((item) => item.sessionId === sessionId);
    if (session && !session.revokedAt) {
      session.revokedAt = revokedAt;
    }
  }

  async touchRefreshSession(sessionId: string, lastUsedAt: Date): Promise<void> {
    const session = this.refreshSessions.find((item) => item.sessionId === sessionId);
    if (session) {
      session.lastUsedAt = lastUsedAt;
    }
  }

  async createDoctorLicenseFiles(
    userId: string,
    files: CreateDoctorLicenseFileInput[]
  ): Promise<DoctorLicenseFileRecord[]> {
    const createdFiles = files.map((file) => ({
      id: `dlf_${randomUUID()}`,
      userId,
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      storageKey: file.storageKey,
      createdAt: new Date(),
    }));

    this.doctorLicenseFiles.push(...createdFiles);
    return createdFiles;
  }
}
