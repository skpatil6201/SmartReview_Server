import "dotenv/config";

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
  jwtSecret: string;
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
  jwtSecret: required("JWT_SECRET"),
  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT ? numberFromEnv("EMAIL_PORT") : undefined,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    secure: booleanFromEnv("EMAIL_SECURE", false),
  },
};
