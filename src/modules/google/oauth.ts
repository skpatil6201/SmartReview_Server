import jwt from "jsonwebtoken";
import { env } from "../../config/env.ts";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const TOKENINFO_ENDPOINT = "https://oauth2.googleapis.com/tokeninfo";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";

/**
 * `business.manage` is the only scope that unlocks the Business Profile APIs -
 * the ones that return every review and let us post replies. Places API data
 * (what this project used before) is capped at five public reviews.
 */
export const BUSINESS_PROFILE_SCOPES = [
  "https://www.googleapis.com/auth/business.manage",
  "openid",
  "email",
  "profile",
];

export class GoogleOAuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 502) {
    super(message);
    this.statusCode = statusCode;
  }
}

export type GoogleTokenSet = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
  scope: string | null;
  idToken: string | null;
};

export type GoogleIdentity = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
};

const requireOAuthConfig = () => {
  if (!env.google.clientId || !env.google.clientSecret) {
    throw new GoogleOAuthError(
      "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
      503,
    );
  }
  return { clientId: env.google.clientId, clientSecret: env.google.clientSecret };
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

const postForm = async (url: string, body: Record<string, string>): Promise<TokenResponse> => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });

  const data = (await response.json().catch(() => ({}))) as TokenResponse;

  if (!response.ok || data.error) {
    throw new GoogleOAuthError(
      data.error_description || data.error || `Google token request failed (${response.status}).`,
    );
  }

  return data;
};

const toTokenSet = (data: TokenResponse): GoogleTokenSet => {
  if (!data.access_token) {
    throw new GoogleOAuthError("Google did not return an access token.");
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    // Expire a minute early so a request never starts on a token about to die.
    expiresAt: new Date(Date.now() + ((data.expires_in ?? 3600) - 60) * 1000),
    scope: data.scope ?? null,
    idToken: data.id_token ?? null,
  };
};

/**
 * The `state` is a short-lived signed JWT rather than a random string, so the
 * callback can identify the business without us keeping server-side session
 * storage. It is signed with the app secret and expires in 15 minutes.
 */
export const createOAuthState = (businessId: number): string =>
  jwt.sign({ businessId, purpose: "google-oauth" }, env.jwtSecret, { expiresIn: "15m" });

export const readOAuthState = (state: string): number => {
  try {
    const decoded = jwt.verify(state, env.jwtSecret) as {
      businessId: number;
      purpose?: string;
    };
    if (decoded.purpose !== "google-oauth") throw new Error("wrong purpose");
    return Number(decoded.businessId);
  } catch {
    throw new GoogleOAuthError("This verification link is invalid or has expired.", 400);
  }
};

/** Consent-screen URL. `prompt=consent` guarantees we get a refresh token. */
export const buildAuthUrl = (state: string): string => {
  const { clientId } = requireOAuthConfig();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: env.google.redirectUri,
    response_type: "code",
    scope: BUSINESS_PROFILE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });

  return `${AUTH_ENDPOINT}?${params.toString()}`;
};

export const exchangeCodeForTokens = async (code: string): Promise<GoogleTokenSet> => {
  const { clientId, clientSecret } = requireOAuthConfig();

  return toTokenSet(
    await postForm(TOKEN_ENDPOINT, {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: env.google.redirectUri,
      grant_type: "authorization_code",
    }),
  );
};

export const refreshAccessToken = async (refreshToken: string): Promise<GoogleTokenSet> => {
  const { clientId, clientSecret } = requireOAuthConfig();

  const tokens = toTokenSet(
    await postForm(TOKEN_ENDPOINT, {
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  );

  // A refresh response omits the refresh token; keep the one we already hold.
  return { ...tokens, refreshToken: tokens.refreshToken ?? refreshToken };
};

/**
 * Verifies a mobile Sign-In ID token through Google's tokeninfo endpoint.
 * Google checks the signature for us, so this needs no crypto dependency -
 * we only have to confirm the audience is one of our own client ids.
 */
export const verifyGoogleIdToken = async (idToken: string): Promise<GoogleIdentity> => {
  if (!idToken?.trim()) {
    throw new GoogleOAuthError("A Google ID token is required.", 400);
  }

  const response = await fetch(
    `${TOKENINFO_ENDPOINT}?id_token=${encodeURIComponent(idToken.trim())}`,
  );

  if (!response.ok) {
    throw new GoogleOAuthError("Google rejected this sign-in token.", 401);
  }

  const payload = (await response.json()) as {
    sub?: string;
    aud?: string;
    email?: string;
    email_verified?: string | boolean;
    name?: string;
    picture?: string;
    iss?: string;
    exp?: string;
  };

  if (payload.iss !== "accounts.google.com" && payload.iss !== "https://accounts.google.com") {
    throw new GoogleOAuthError("Google sign-in token has an unexpected issuer.", 401);
  }

  const audiences = env.google.allowedAudiences;
  if (audiences.length && (!payload.aud || !audiences.includes(payload.aud))) {
    throw new GoogleOAuthError("Google sign-in token was issued for another app.", 401);
  }

  if (payload.exp && Number(payload.exp) * 1000 < Date.now()) {
    throw new GoogleOAuthError("Google sign-in token has expired.", 401);
  }

  if (!payload.sub || !payload.email) {
    throw new GoogleOAuthError("Google sign-in did not return an email address.", 400);
  }

  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
    name: payload.name ?? null,
    picture: payload.picture ?? null,
  };
};

/** Best-effort: a failed revoke should not block a local disconnect. */
export const revokeToken = async (token: string): Promise<void> => {
  try {
    await fetch(REVOKE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }).toString(),
    });
  } catch (error) {
    console.warn("Failed to revoke Google token:", error);
  }
};
