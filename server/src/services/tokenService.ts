import jwt from "jsonwebtoken";

import type { AuthRole } from "../types/auth";

export interface AuthTokenUser {
  id: string;
  role: AuthRole;
}

interface BaseTokenPayload {
  sub: string;
  role: AuthRole;
}

export interface AccessTokenPayload extends BaseTokenPayload {
  type: "access";
}

export interface RefreshTokenPayload extends BaseTokenPayload {
  type: "refresh";
  sessionId: string;
}

export interface TokenService {
  issueAccessToken(user: AuthTokenUser): string;
  issueRefreshToken(user: AuthTokenUser, sessionId: string): string;
  verifyAccessToken(token: string): AccessTokenPayload;
  verifyRefreshToken(token: string): RefreshTokenPayload;
}

export interface JwtTokenServiceOptions {
  accessSecret: string;
  refreshSecret: string;
  accessTokenTtlMinutes: number;
  refreshTokenTtlDays: number;
}

export class JwtTokenService implements TokenService {
  constructor(private readonly options: JwtTokenServiceOptions) {}

  issueAccessToken(user: AuthTokenUser): string {
    return jwt.sign(
      {
        sub: user.id,
        role: user.role,
        type: "access",
      },
      this.options.accessSecret,
      {
        expiresIn: `${this.options.accessTokenTtlMinutes}m`,
      }
    );
  }

  issueRefreshToken(user: AuthTokenUser, sessionId: string): string {
    return jwt.sign(
      {
        sub: user.id,
        role: user.role,
        type: "refresh",
        sessionId,
      },
      this.options.refreshSecret,
      {
        expiresIn: `${this.options.refreshTokenTtlDays}d`,
      }
    );
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return jwt.verify(token, this.options.accessSecret) as AccessTokenPayload;
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    return jwt.verify(token, this.options.refreshSecret) as RefreshTokenPayload;
  }
}
