import { existsSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

/**
 * dotenv only reads the current working directory, but this project keeps its
 * .env one level up in Backend/ - so `npm run dev` from SmartReview_Server
 * found nothing and every required variable blew up on import. Walk up a few
 * directories instead, so the server boots from either folder.
 */
const findEnvFile = (): string | undefined => {
  let dir = process.cwd();

  for (let depth = 0; depth < 4; depth += 1) {
    const candidate = path.join(dir, ".env");
    if (existsSync(candidate)) return candidate;

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return undefined;
};

const envFile = findEnvFile();

if (envFile) {
  dotenv.config({ path: envFile });
} else {
  console.warn("No .env file found. Falling back to the process environment.");
}

type AppEnv = {
  nodeEnv: string;
  port: number;
  db: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    ssl: boolean;
  };
  appBaseUrl: string;
  jwtSecret: string;
  geminiApiKey: string | undefined;
  googlePlacesApiKey: string | undefined;
  google: {
    /** Web OAuth client - drives the server-side Business Profile consent flow. */
    clientId: string | undefined;
    clientSecret: string | undefined;
    redirectUri: string;
    /** Every client id we accept a mobile ID token from (web + android + ios). */
    allowedAudiences: string[];
  };
  razorpay: {
    keyId: string | undefined;
    keySecret: string | undefined;
  };
  email: {
    host: string | undefined;
    port: number | undefined;
    user: string | undefined;
    pass: string | undefined;
    secure: boolean;
  };
};

const required = (key: string) => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const numberFromEnv = (key: string, fallback?: number) => {
  const value = process.env[key];

  if (!value) {
    if (fallback !== undefined) {
      return fallback;
    }

    throw new Error(`Missing required environment variable: ${key}`);
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number.`);
  }

  return parsed;
};

const booleanFromEnv = (key: string, fallback: boolean) => {
  const value = process.env[key];

  if (!value) {
    return fallback;
  }

  return ["1", "true", "yes"].includes(value.toLowerCase());
};

const optionalFromEnv = (key: string) => {
  const value = process.env[key]?.trim();
  return value && !/^your_/.test(value) ? value : undefined;
};

const appBaseUrl =
  process.env.APP_BASE_URL?.trim() || `http://localhost:${numberFromEnv("PORT", 8000)}`;

export const env: AppEnv = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: numberFromEnv("PORT", 8000),
  db: {
    host: required("DB_HOST"),
    port: numberFromEnv("DB_PORT", 5432),
    username: required("DB_USERNAME"),
    password: required("DB_PASSWORD"),
    database: required("DB_NAME"),
    ssl: booleanFromEnv("DB_SSL", true),
  },
  appBaseUrl,
  jwtSecret: required("JWT_SECRET"),
  geminiApiKey: optionalFromEnv("GEMINI_API_KEY"),
  googlePlacesApiKey: optionalFromEnv("GOOGLE_PLACES_API_KEY"),
  google: {
    clientId: optionalFromEnv("GOOGLE_CLIENT_ID"),
    clientSecret: optionalFromEnv("GOOGLE_CLIENT_SECRET"),
    redirectUri:
      optionalFromEnv("GOOGLE_REDIRECT_URI") ??
      `${appBaseUrl}/api/google/oauth/callback`,
    // A mobile ID token is minted for whichever client id signed the user in,
    // so every platform's client id has to be an acceptable audience.
    // A Set, because GOOGLE_CLIENT_ID and GOOGLE_WEB_CLIENT_ID are normally
    // the same value and a duplicate audience is just noise.
    allowedAudiences: [
      ...new Set(
        [
          optionalFromEnv("GOOGLE_CLIENT_ID"),
          optionalFromEnv("GOOGLE_WEB_CLIENT_ID"),
          optionalFromEnv("GOOGLE_ANDROID_CLIENT_ID"),
          optionalFromEnv("GOOGLE_IOS_CLIENT_ID"),
          // Any further client in the same Cloud project, comma-separated.
          ...(optionalFromEnv("GOOGLE_EXTRA_CLIENT_IDS")?.split(",") ?? []),
        ]
          .map((value) => value?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ],
  },
  razorpay: {
    keyId: optionalFromEnv("RAZORPAY_KEY_ID"),
    keySecret: optionalFromEnv("RAZORPAY_KEY_SECRET"),
  },
  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT ? numberFromEnv("EMAIL_PORT") : undefined,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    secure: booleanFromEnv("EMAIL_SECURE", false),
  },
};
