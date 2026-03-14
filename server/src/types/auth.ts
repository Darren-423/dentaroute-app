export type AuthRole = "patient" | "doctor";
export type ProfileStatus = "needs_profile_setup" | "active";
export type LicenseVerificationStatus = "pending_review" | "verified" | "rejected";
export type VerificationChannel = "email" | "sms";

export interface AuthUser {
  id: string;
  role: AuthRole;
  fullName: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  profileStatus: ProfileStatus;
  licenseVerificationStatus?: LicenseVerificationStatus;
  createdAt: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RefreshResponse {
  token: string;
  refreshToken: string;
}
