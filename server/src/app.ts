import cors from "cors";
import express from "express";
import type { RequestHandler } from "express";

import { errorHandler } from "./middleware/errorHandler";
import { createAuthRouter } from "./routes/auth";
import { createCasesRouter } from "./routes/cases";
import { createQuotesRouter } from "./routes/quotes";
import { AuthService } from "./services/authService";
import { CasesQuotesService } from "./services/casesQuotesService";

export interface AppServices {
  authService: AuthService;
  casesQuotesService: CasesQuotesService;
  authenticate: RequestHandler;
}

export const createApp = (services: AppServices) => {
  const app = express();
  app.use(
    cors({
      origin: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      success: true,
      data: {
        status: "ok",
      },
    });
  });

  app.use("/api/auth", createAuthRouter(services));
  app.use("/api/cases", createCasesRouter(services));
  app.use("/api/quotes", createQuotesRouter(services));

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Route not found.",
      },
    });
  });

  app.use(errorHandler);
  return app;
};