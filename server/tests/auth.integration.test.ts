import request from "supertest";

import { createApp } from "../src/app";
import { createAuthMiddleware } from "../src/middleware/auth";
import { AuthService } from "../src/services/authService";
import type { FileStorage, UploadFile } from "../src/services/fileStorage";
import { BcryptPasswordService } from "../src/services/passwordService";
import { JwtTokenService } from "../src/services/tokenService";
import type { VerificationSender } from "../src/services/verificationSender";
import { InMemoryAuthRepository } from "./support/inMemoryAuthRepository";

const FIXED_CODE = "123456";

class MemoryFileStorage implements FileStorage {
  async storeDoctorLicenseFiles(userId: string, files: UploadFile[]) {
    return files.map((file, index) => ({
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      storageKey: `licenses/${userId}/${index}-${file.originalName}`,
    }));
  }
}

class TestVerificationSender implements VerificationSender {
  async sendEmailCode(): Promise<void> {}
  async sendSmsCode(): Promise<void> {}
}

const buildTestApp = () => {
  const authRepository = new InMemoryAuthRepository();
  const tokenService = new JwtTokenService({
    accessSecret: "test-access-secret-1234567890",
    refreshSecret: "test-refresh-secret-1234567890",
    accessTokenTtlMinutes: 15,
    refreshTokenTtlDays: 30,
  });

  const authService = new AuthService({
    authRepository,
    passwordService: new BcryptPasswordService(1),
    tokenService,
    verificationSender: new TestVerificationSender(),
    fileStorage: new MemoryFileStorage(),
    verificationCodeTtlMinutes: 5,
    verificationResendSec: 0,
    refreshTokenTtlDays: 30,
    fixedVerificationCode: FIXED_CODE,
  });

  const authenticate = createAuthMiddleware({
    authRepository,
    tokenService,
  });

  return createApp({ authService, authenticate });
};

const completePatientVerification = async (app: ReturnType<typeof buildTestApp>) => {
  await request(app).post("/api/auth/send-email-code").send({
    email: "sarah@example.com",
    role: "patient",
  });
  await request(app).post("/api/auth/verify-email").send({
    email: "sarah@example.com",
    code: FIXED_CODE,
    role: "patient",
  });
  await request(app).post("/api/auth/send-sms-code").send({
    phoneCountryCode: "+1",
    phone: "5551234567",
    role: "patient",
  });
  await request(app).post("/api/auth/verify-sms").send({
    phoneCountryCode: "+1",
    phone: "5551234567",
    code: FIXED_CODE,
    role: "patient",
  });
};

describe("Auth API", () => {
  it("supports patient registration and me lookup", async () => {
    const app = buildTestApp();
    await completePatientVerification(app);

    const registerResponse = await request(app).post("/api/auth/register/patient").send({
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah@example.com",
      phoneCountryCode: "+1",
      phone: "5551234567",
      password: "strong-password",
      agreedToTerms: true,
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.success).toBe(true);
    expect(registerResponse.body.data.user.role).toBe("patient");
    expect(registerResponse.body.data.user.profileStatus).toBe("needs_profile_setup");

    const meResponse = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${registerResponse.body.data.token}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.data.user.email).toBe("sarah@example.com");
  });

  it("supports login, refresh, and logout token rotation", async () => {
    const app = buildTestApp();
    await completePatientVerification(app);

    await request(app).post("/api/auth/register/patient").send({
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah@example.com",
      phoneCountryCode: "+1",
      phone: "5551234567",
      password: "strong-password",
      agreedToTerms: true,
    });

    const loginResponse = await request(app).post("/api/auth/login").send({
      email: "sarah@example.com",
      password: "strong-password",
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.data.user.role).toBe("patient");

    const refreshResponse = await request(app).post("/api/auth/refresh").send({
      refreshToken: loginResponse.body.data.refreshToken,
    });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.data.token).toBeDefined();
    expect(refreshResponse.body.data.refreshToken).toBeDefined();

    const logoutResponse = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${refreshResponse.body.data.token}`)
      .send({
        refreshToken: refreshResponse.body.data.refreshToken,
      });

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.data.loggedOut).toBe(true);

    const secondRefreshResponse = await request(app).post("/api/auth/refresh").send({
      refreshToken: refreshResponse.body.data.refreshToken,
    });

    expect(secondRefreshResponse.status).toBe(401);
    expect(secondRefreshResponse.body.error.code).toBe("AUTH_INVALID");
  });

  it("supports doctor registration with license uploads", async () => {
    const app = buildTestApp();

    await request(app).post("/api/auth/send-email-code").send({
      email: "doctor@clinic.com",
      role: "doctor",
    });
    await request(app).post("/api/auth/verify-email").send({
      email: "doctor@clinic.com",
      code: FIXED_CODE,
      role: "doctor",
    });
    await request(app).post("/api/auth/send-sms-code").send({
      phoneCountryCode: "+82",
      phone: "1023456789",
      role: "doctor",
    });
    await request(app).post("/api/auth/verify-sms").send({
      phoneCountryCode: "+82",
      phone: "1023456789",
      code: FIXED_CODE,
      role: "doctor",
    });

    const registerResponse = await request(app)
      .post("/api/auth/register/doctor")
      .field("firstName", "Minjun")
      .field("lastName", "Kim")
      .field("email", "doctor@clinic.com")
      .field("phoneCountryCode", "+82")
      .field("phone", "1023456789")
      .field("password", "strong-password")
      .field("agreedToTerms", "true")
      .attach("licenseFiles[]", Buffer.from("fake-image-1"), "license-1.png")
      .attach("licenseFiles[]", Buffer.from("fake-image-2"), "license-2.png");

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.success).toBe(true);
    expect(registerResponse.body.data.user.role).toBe("doctor");
    expect(registerResponse.body.data.user.licenseVerificationStatus).toBe("pending_review");
    expect(registerResponse.body.data.user.profileStatus).toBe("needs_profile_setup");
  });
});
