import { Router } from "express";
import type { RequestHandler } from "express";

import { requireRole } from "../middleware/roleGuard";
import { CasesQuotesService } from "../services/casesQuotesService";
import { asyncHandler } from "../utils/asyncHandler";
import { createQuoteSchema } from "../validators/casesQuotes";

export const createQuotesRouter = (input: {
  casesQuotesService: CasesQuotesService;
  authenticate: RequestHandler;
}): Router => {
  const router = Router();

  router.use(input.authenticate);

  router.post(
    "/",
    requireRole("doctor"),
    asyncHandler(async (req, res) => {
      const payload = createQuoteSchema.parse(req.body);
      const quote = await input.casesQuotesService.createQuote(req.auth!, payload);
      res.status(201).json({
        success: true,
        data: {
          quote,
        },
      });
    })
  );

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const quotes = await input.casesQuotesService.listQuotes(req.auth!);
      res.status(200).json({
        success: true,
        data: {
          quotes,
        },
      });
    })
  );

  return router;
};