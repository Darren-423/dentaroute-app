import { Router } from "express";
import multer from "multer";
import type { RequestHandler } from "express";

import { AppError } from "../errors/appError";
import { AuthService } from "../services/authService";
import type { UploadFile } from "../services/fileStorage";
import { asyncHandler } from "../utils/asyncHandler";
import {
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerDoctorSchema,
  registerPatientSchema,
  sendEmailCodeSchema,
  sendSmsCodeSchema,
  verifyEmailSchema,
  verifySmsSchema,
} from "../validators/auth";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 3,
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(
        new AppError(400, {
          code: "VALIDATION_ERROR",
          message: "Invalid request body.",
          details: {
            licenseFiles: ["Only image files are allowed."],
          },
        })
      );
      return;
    }

    cb(null, true);
  },
});

const doctorLicenseUpload = upload.fields([
  { name: "licenseFiles[]", maxCount: 3 },
  { name: "licenseFiles", maxCount: 3 },
]);

const extractLicenseFiles = (files: Express.Request["files"]): UploadFile[] => {
  if (!files || Array.isArray(files)) {
    return [];
  }

  const uploadedFiles = [...(files["licenseFiles[]"] ?? []), ...(files.licenseFiles ?? [])];
  return uploadedFiles.map((file) => ({
    originalName: file.originalname,
    mimeType: file.mimetype,
    buffer: file.buffer,
    sizeBytes: file.size,
  }));
};

export const createAuthRouter = (input: {
  authService: AuthService;
  authenticate: RequestHandler;
}): Router => {
  const router = Router();

  router.post(
    "/send-email-code",
    asyncHandler(async (req, res) => {
      const payload = sendEmailCodeSchema.parse(req.body);
      const data = await input.authService.sendEmailCode(payload);
      res.status(200).json({ success: true, data });
    })
  );

  router.post(
    "/verify-email",
    asyncHandler(async (req, res) => {
      const payload = verifyEmailSchema.parse(req.body);
      const data = await input.authService.verifyEmail(payload);
      res.status(200).json({ success: true, data });
    })
  );

  router.post(
    "/send-sms-code",
    asyncHandler(async (req, res) => {
      const payload = sendSmsCodeSchema.parse(req.body);
      const data = await input.authService.sendSmsCode(payload);
      res.status(200).json({ success: true, data });
    })
  );

  router.post(
    "/verify-sms",
    asyncHandler(async (req, res) => {
      const payload = verifySmsSchema.parse(req.body);
      const data = await input.authService.verifySms(payload);
      res.status(200).json({ success: true, data });
    })
  );

  router.post(
    "/register/patient",
    asyncHandler(async (req, res) => {
      const payload = registerPatientSchema.parse(req.body);
      const data = await input.authService.registerPatient(payload);
      res.status(201).json({ success: true, data });
    })
  );

  router.post(
    "/register/doctor",
    doctorLicenseUpload,
    asyncHandler(async (req, res) => {
      const payload = registerDoctorSchema.parse(req.body);
      const licenseFiles = extractLicenseFiles(req.files);
      const data = await input.authService.registerDoctor({
        ...payload,
        licenseFiles,
      });
      res.status(201).json({ success: true, data });
    })
  );

  router.post(
    "/login",
    asyncHandler(async (req, res) => {
      const payload = loginSchema.parse(req.body);
      const data = await input.authService.login(payload);
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/me",
    input.authenticate,
    asyncHandler(async (req, res) => {
      const user = await input.authService.getMe(req.auth!.userId);
      res.status(200).json({
        success: true,
        data: {
          user,
        },
      });
    })
  );

  router.post(
    "/refresh",
    asyncHandler(async (req, res) => {
      const payload = refreshSchema.parse(req.body);
      const data = await input.authService.refresh(payload.refreshToken);
      res.status(200).json({ success: true, data });
    })
  );

  router.post(
    "/logout",
    input.authenticate,
    asyncHandler(async (req, res) => {
      const payload = logoutSchema.parse(req.body);
      const data = await input.authService.logout(payload.refreshToken, req.auth!.userId);
      res.status(200).json({ success: true, data });
    })
  );

  return router;
};
