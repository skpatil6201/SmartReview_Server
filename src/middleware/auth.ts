import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.ts";

export type AuthTokenPayload = {
  id: number;
  email: string;
  isAdmin: boolean;
};

/** Express Request once `requireAuth` has run. */
export interface AuthedRequest extends Request {
  auth?: AuthTokenPayload;
}

const readBearerToken = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (!header) return null;

  const [scheme, token] = header.split(" ");
  if (!token || scheme?.toLowerCase() !== "bearer") return null;

  return token.trim() || null;
};

/**
 * Rejects the request unless it carries a valid JWT, and hangs the decoded
 * payload off `req.auth`. Every Google endpoint needs this: the tokens we hold
 * belong to one specific business, and the caller must prove which one.
 */
export const requireAuth = (req: AuthedRequest, res: Response, next: NextFunction) => {
  const token = readBearerToken(req);

  if (!token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
    req.auth = {
      id: Number(decoded.id),
      email: decoded.email,
      isAdmin: Boolean(decoded.isAdmin),
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Session expired. Please log in again." });
  }
};

/** Same as `requireAuth`, plus an admin check. */
export const requireAdmin = (req: AuthedRequest, res: Response, next: NextFunction) => {
  requireAuth(req, res, () => {
    if (!req.auth?.isAdmin) {
      return res.status(403).json({ message: "Admin access required." });
    }
    return next();
  });
};

export default requireAuth;
