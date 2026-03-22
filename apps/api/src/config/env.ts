import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_PUBLIC_URL: z.string().url(),
  BACKEND_PUBLIC_URL: z.string().url(),
  BETTER_AUTH_URL: z.string().url(),
  CORS_ALLOWED_ORIGINS: z.string().min(1),
  COOKIE_DOMAIN: z.string().optional(),
  DATABASE_URL: z.string().min(1),
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),
});

export type AppEnv = z.infer<typeof envSchema> & {
  corsAllowedOrigins: string[];
};

function normalizeBetterAuthUrl(value: string): string {
  const url = new URL(value);

  if (url.pathname === "/api/auth" || url.pathname === "/api/auth/") {
    url.pathname = "";
    url.search = "";
    url.hash = "";
  }

  return url.toString().replace(/\/$/, "");
}

function parseAllowedOrigins(value: string): string[] {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    throw new Error(
      `Invalid API environment:\n${parsed.error.issues
        .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
        .join("\n")}`,
    );
  }

  return {
    ...parsed.data,
    BETTER_AUTH_URL: normalizeBetterAuthUrl(parsed.data.BETTER_AUTH_URL),
    corsAllowedOrigins: parseAllowedOrigins(parsed.data.CORS_ALLOWED_ORIGINS),
  };
}

export const env = loadEnv();
