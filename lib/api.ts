import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// ══════════════════════════════════════════
//  DentaRoute API Client
//  서버 연동을 위한 HTTP 클라이언트 + JWT 토큰 관리
// ══════════════════════════════════════════

// ── 설정 ──
const STORAGE_KEYS = {
  ACCESS_TOKEN: "dr_access_token",
  REFRESH_TOKEN: "dr_refresh_token",
  AUTH_USER: "dr_auth_user",
} as const;

// Android 에뮬레이터는 localhost 대신 10.0.2.2 사용
const DEFAULT_BASE_URL = Platform.select({
  android: "http://10.0.2.2:3000",
  default: "http://localhost:3000",
});

let baseUrl = DEFAULT_BASE_URL;

export const setApiBaseUrl = (url: string) => {
  baseUrl = url;
};

// ── 서버 응답 타입 (api-contract-auth.md 기준) ──
export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: Record<string, string[]>
  ) {
    super(`[${code}] ${statusCode}`);
    this.name = "ApiError";
  }
}

// ── Auth 타입 ──
export type AuthRole = "patient" | "doctor";
export type ProfileStatus = "needs_profile_setup" | "active";
export type LicenseVerificationStatus = "pending_review" | "verified" | "rejected";

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

interface LoginResponse {
  token: string;
  refreshToken: string;
  user: AuthUser;
}

interface RefreshResponse {
  token: string;
  refreshToken: string;
}

interface VerificationSentResponse {
  sent: true;
  expiresInSec: number;
  resendAfterSec: number;
}

// ── 토큰 저장소 ──
const tokenStore = {
  getAccessToken: async (): Promise<string | null> => {
    return AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  getRefreshToken: async (): Promise<string | null> => {
    return AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },

  saveTokens: async (accessToken: string, refreshToken: string) => {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
      [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
    ]);
  },

  saveAuthUser: async (user: AuthUser) => {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
  },

  getAuthUser: async (): Promise<AuthUser | null> => {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_USER);
    return data ? JSON.parse(data) : null;
  },

  clearAll: async () => {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.AUTH_USER,
    ]);
  },
};

// ── 리프레시 중복 방지 ──
let refreshPromise: Promise<boolean> | null = null;

const attemptTokenRefresh = async (): Promise<boolean> => {
  // 이미 리프레시 진행 중이면 그 결과를 공유
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = await tokenStore.getRefreshToken();
      if (!refreshToken) return false;

      const res = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) return false;

      const json = (await res.json()) as ApiResponse<RefreshResponse>;
      if (!json.success) return false;

      await tokenStore.saveTokens(json.data.token, json.data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// ── 핵심 fetch 래퍼 ──
async function apiFetch<T>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {}
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers);

  // Content-Type 기본값 (FormData가 아닌 경우)
  if (!(fetchOptions.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Authorization 헤더
  if (!skipAuth) {
    const token = await tokenStore.getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const url = `${baseUrl}${path}`;
  let res = await fetch(url, { ...fetchOptions, headers });

  // 401이고 리프레시 가능하면 한 번 재시도
  if (res.status === 401 && !skipAuth) {
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      const newToken = await tokenStore.getAccessToken();
      if (newToken) {
        headers.set("Authorization", `Bearer ${newToken}`);
      }
      res = await fetch(url, { ...fetchOptions, headers });
    }
  }

  const json = (await res.json()) as ApiResponse<T>;

  if (!json.success) {
    throw new ApiError(res.status, json.error.code, json.error.details);
  }

  return json.data;
}

// ── Auth API ──
export const authApi = {
  // 이메일 인증코드 발송
  sendEmailCode: (email: string, role: AuthRole) =>
    apiFetch<VerificationSentResponse>("/api/auth/send-email-code", {
      method: "POST",
      body: JSON.stringify({ email, role }),
      skipAuth: true,
    }),

  // 이메일 인증코드 확인
  verifyEmail: (email: string, code: string, role: AuthRole) =>
    apiFetch<{ verified: true }>("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ email, code, role }),
      skipAuth: true,
    }),

  // SMS 인증코드 발송
  sendSmsCode: (phoneCountryCode: string, phone: string, role: AuthRole) =>
    apiFetch<VerificationSentResponse>("/api/auth/send-sms-code", {
      method: "POST",
      body: JSON.stringify({ phoneCountryCode, phone, role }),
      skipAuth: true,
    }),

  // SMS 인증코드 확인
  verifySms: (phoneCountryCode: string, phone: string, code: string, role: AuthRole) =>
    apiFetch<{ verified: true }>("/api/auth/verify-sms", {
      method: "POST",
      body: JSON.stringify({ phoneCountryCode, phone, code, role }),
      skipAuth: true,
    }),

  // 환자 회원가입
  registerPatient: async (input: {
    firstName: string;
    lastName: string;
    email: string;
    phoneCountryCode: string;
    phone: string;
    password: string;
    agreedToTerms: true;
  }) => {
    const data = await apiFetch<LoginResponse>("/api/auth/register/patient", {
      method: "POST",
      body: JSON.stringify(input),
      skipAuth: true,
    });
    await tokenStore.saveTokens(data.token, data.refreshToken);
    await tokenStore.saveAuthUser(data.user);
    return data;
  },

  // 의사 회원가입 (multipart/form-data — 면허 이미지 포함)
  registerDoctor: async (input: {
    firstName: string;
    lastName: string;
    email: string;
    phoneCountryCode: string;
    phone: string;
    password: string;
    agreedToTerms: true;
    licenseFiles: { uri: string; name: string; type: string }[];
  }) => {
    const formData = new FormData();
    formData.append("firstName", input.firstName);
    formData.append("lastName", input.lastName);
    formData.append("email", input.email);
    formData.append("phoneCountryCode", input.phoneCountryCode);
    formData.append("phone", input.phone);
    formData.append("password", input.password);
    formData.append("agreedToTerms", "true");

    for (const file of input.licenseFiles) {
      formData.append("licenseFiles[]", {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any);
    }

    const data = await apiFetch<LoginResponse>("/api/auth/register/doctor", {
      method: "POST",
      body: formData,
      skipAuth: true,
    });
    await tokenStore.saveTokens(data.token, data.refreshToken);
    await tokenStore.saveAuthUser(data.user);
    return data;
  },

  // 로그인
  login: async (email: string, password: string) => {
    const data = await apiFetch<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });
    await tokenStore.saveTokens(data.token, data.refreshToken);
    await tokenStore.saveAuthUser(data.user);
    return data;
  },

  // 현재 유저 조회 (세션 복원용)
  me: () => apiFetch<{ user: AuthUser }>("/api/auth/me"),

  // 로그아웃
  logout: async () => {
    try {
      const refreshToken = await tokenStore.getRefreshToken();
      if (refreshToken) {
        await apiFetch<{ loggedOut: true }>("/api/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        });
      }
    } finally {
      await tokenStore.clearAll();
    }
  },

  // 세션 복원: 앱 시작 시 호출
  // 저장된 토큰으로 유저 정보를 가져오거나, 실패 시 null 반환
  restoreSession: async (): Promise<AuthUser | null> => {
    const token = await tokenStore.getAccessToken();
    if (!token) return null;

    try {
      const { user } = await authApi.me();
      await tokenStore.saveAuthUser(user);
      return user;
    } catch {
      // 토큰 만료 → 리프레시 시도 (apiFetch 내부에서 자동 처리됨)
      // 그래도 실패하면 세션 클리어
      await tokenStore.clearAll();
      return null;
    }
  },
};

// ── Cases + Quotes 타입 (api-contract-cases-quotes.md 기준) ──
// store.ts의 PatientCase / DentistQuote와 동일한 shape

export interface CaseTreatmentItem {
  name: string;
  qty: number;
}

export interface CaseFilesCount {
  xrays: number;
  treatmentPlans: number;
  photos: number;
}

export type CaseStatus = "pending" | "quotes_received" | "booked";

export interface PatientCase {
  id: string;
  patientName: string;
  country: string;
  date: string;
  treatments: CaseTreatmentItem[];
  medicalNotes: string;
  dentalIssues: string[];
  filesCount: CaseFilesCount;
  status: CaseStatus;
  visitDate?: string;
  birthDate?: string;
}

export interface QuoteTreatmentItem {
  name: string;
  qty: number;
  price: number;
}

export interface QuoteVisit {
  visit: number;
  description: string;
  gapMonths?: number;
  gapDays?: number;
  paymentAmount?: number;
  paymentPercent?: number;
}

export interface DentistQuote {
  id: string;
  caseId: string;
  dentistName: string;
  clinicName: string;
  location: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating: number;
  reviewCount: number;
  totalPrice: number;
  treatments: QuoteTreatmentItem[];
  treatmentDetails: string;
  duration: string;
  visits?: QuoteVisit[];
  message: string;
  createdAt: string;
  clinicPhotos?: string[];
  yearsExperience?: number;
  specialties?: string[];
  licenseVerified?: boolean;
  certifications?: string[];
}

// ── Cases API ──
export const casesApi = {
  // 케이스 생성 (환자 전용)
  create: (input: {
    patientName: string;
    country: string;
    treatments: CaseTreatmentItem[];
    medicalNotes: string;
    dentalIssues: string[];
    filesCount: CaseFilesCount;
    visitDate?: string;
    birthDate?: string;
  }) =>
    apiFetch<{ case: PatientCase }>("/api/cases", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // 케이스 목록 (환자: 본인 케이스, 의사: 전체 피드)
  list: () =>
    apiFetch<{ cases: PatientCase[] }>("/api/cases"),

  // 단일 케이스 조회
  get: (caseId: string) =>
    apiFetch<{ case: PatientCase }>(`/api/cases/${caseId}`),

  // 케이스 상태 변경 (환자 전용, booked 전환용)
  updateStatus: (caseId: string, status: CaseStatus) =>
    apiFetch<{ case: { id: string; status: CaseStatus } }>(
      `/api/cases/${caseId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }
    ),

  // 케이스 부분 수정 (환자 전용, booked 전 한정)
  update: (
    caseId: string,
    updates: Partial<{
      patientName: string;
      country: string;
      treatments: CaseTreatmentItem[];
      medicalNotes: string;
      dentalIssues: string[];
      filesCount: CaseFilesCount;
      visitDate: string;
      birthDate: string;
    }>
  ) =>
    apiFetch<{ case: PatientCase }>(`/api/cases/${caseId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),

  // 케이스별 견적 목록 (환자: 전체, 의사: 본인 것만)
  getQuotes: (caseId: string) =>
    apiFetch<{ quotes: DentistQuote[] }>(`/api/cases/${caseId}/quotes`),
};

// ── Quotes API ──
export const quotesApi = {
  // 견적 생성 (의사 전용)
  create: (input: {
    caseId: string;
    dentistName: string;
    clinicName: string;
    location: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    rating: number;
    reviewCount: number;
    totalPrice: number;
    treatments: QuoteTreatmentItem[];
    treatmentDetails: string;
    duration: string;
    visits?: QuoteVisit[];
    message: string;
    clinicPhotos?: string[];
    yearsExperience?: number;
    specialties?: string[];
    licenseVerified?: boolean;
    certifications?: string[];
  }) =>
    apiFetch<{ quote: DentistQuote }>("/api/quotes", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // 전체 견적 목록 (환자: 본인 케이스 견적, 의사: 본인 견적)
  list: () =>
    apiFetch<{ quotes: DentistQuote[] }>("/api/quotes"),
};

// ── 서버 연결 여부 확인 ──
export const checkServerHealth = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${baseUrl}/api/health`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const json = await res.json();
    return json.success === true;
  } catch {
    return false;
  }
};

// ── 외부에서 토큰 스토어 접근 (store.ts 마이그레이션 용) ──
export { tokenStore, STORAGE_KEYS as AUTH_STORAGE_KEYS };
