import { Router } from "express";
import type { RequestHandler } from "express";

import { requireRole } from "../middleware/roleGuard";
import { CasesQuotesService } from "../services/casesQuotesService";
import { asyncHandler } from "../utils/asyncHandler";
import {
  caseIdParamsSchema,
  caseQuotesParamsSchema,
  createCaseSchema,
  updateCaseSchema,
  updateCaseStatusSchema,
} from "../validators/casesQuotes";

export const createCasesRouter = (input: {
  casesQuotesService: CasesQuotesService;
  authenticate: RequestHandler;
}): Router => {
  const router = Router();

  router.use(input.authenticate);

  router.post(
    "/",
    requireRole("patient"),
    asyncHandler(async (req, res) => {
      const payload = createCaseSchema.parse(req.body);
      const patientCase = await input.casesQuotesService.createCase(req.auth!, payload);
      res.status(201).json({
        success: true,
        data: {
          case: patientCase,
        },
      });
    })
  );

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const cases = await input.casesQuotesService.listCases(req.auth!);
      res.status(200).json({
        success: true,
        data: {
          cases,
        },
      });
    })
  );

  router.get(
    "/:caseId/quotes",
    asyncHandler(async (req, res) => {
      const params = caseQuotesParamsSchema.parse(req.params);
      const quotes = await input.casesQuotesService.listQuotesForCase(req.auth!, params.caseId);
      res.status(200).json({
        success: true,
        data: {
          quotes,
        },
      });
    })
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const params = caseIdParamsSchema.parse(req.params);
      const patientCase = await input.casesQuotesService.getCase(req.auth!, params.id);
      res.status(200).json({
        success: true,
        data: {
          case: patientCase,
        },
      });
    })
  );

  router.patch(
    "/:id/status",
    requireRole("patient"),
    asyncHandler(async (req, res) => {
      const params = caseIdParamsSchema.parse(req.params);
      const payload = updateCaseStatusSchema.parse(req.body);
      const patientCase = await input.casesQuotesService.updateCaseStatus(
        req.auth!,
        params.id,
        payload.status
      );

      res.status(200).json({
        success: true,
        data: {
          case: {
            id: patientCase.id,
            status: patientCase.status,
          },
        },
      });
    })
  );

  router.patch(
    "/:id",
    requireRole("patient"),
    asyncHandler(async (req, res) => {
      const params = caseIdParamsSchema.parse(req.params);
      const payload = updateCaseSchema.parse(req.body);
      const patientCase = await input.casesQuotesService.updateCase(req.auth!, params.id, payload);
      res.status(200).json({
        success: true,
        data: {
          case: patientCase,
        },
      });
    })
  );

  return router;
};