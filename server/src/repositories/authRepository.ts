import type {
  AuthRole,
  LicenseVerificationStatus,
  ProfileStatus,
  VerificationChannel,
} from "../types/auth";

export interface UserRecord {
  id: string;
  role: AuthRole;
  fullName: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
  normalizedPhone: string;
  passwordHash: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  profileStatus: ProfileStatus;
  licenseVerificationStatus?: LicenseVerificationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface VerificationCodeRecord {
  id: string;
  channel: VerificationChannel;
  role: AuthRole;
  target: string;
  codeHash: string;
  expiresAt: Date;
  resendAvailableAt: Date;
  verifiedAt: Date | null;
  consumedAt: Date | null;
  createdAt: Date;
}

export interface RefreshSessionRecord {
  id: string;
  sessionId: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export interface DoctorLicenseFileRecord {
  id: string;
  userId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  createdAt: Date;
}

export interface CreateUserInput {
  role: AuthRole;
  fullName: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
  normalizedPhone: string;
  passwordHash: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  profileStatus: ProfileStatus;
  licenseVerificationStatus?: LicenseVerificationStatus;
}

export interface CreateVerificationCodeInput {
  channel: VerificationChannel;
  role: AuthRole;
  target: string;
  codeHash: string;
  expiresAt: Date;
  resendAvailableAt: Date;
}

export interface CreateRefreshSessionInput {
  sessionId: string;
  userId: string;
  expiresAt: Date;
}

export interface CreateDoctorLicenseFileInput {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(userId: string): Promise<UserRecord | null>;
  findUserByNormalizedPhone(normalizedPhone: string): Promise<UserRecord | null>;
  createUser(input: CreateUserInput): Promise<UserRecord>;
  createVerificationCode(input: CreateVerificationCodeInput): Promise<VerificationCodeRecord>;
  findLatestVerificationCode(input: {
    channel: VerificationChannel;
    role: AuthRole;
    target: string;
  }): Promise<VerificationCodeRecord | null>;
  markVerificationCodeVerified(id: string, verifiedAt: Date): Promise<VerificationCodeRecord>;
  createRefreshSession(input: CreateRefreshSessionInput): Promise<RefreshSessionRecord>;
  findRefreshSessionBySessionId(sessionId: string): Promise<RefreshSessionRecord | null>;
  revokeRefreshSession(sessionId: string, revokedAt: Date): Promise<void>;
  touchRefreshSession(sessionId: string, lastUsedAt: Date): Promise<void>;
  createDoctorLicenseFiles(
    userId: string,
    files: CreateDoctorLicenseFileInput[]
  ): Promise<DoctorLicenseFileRecord[]>;
}
