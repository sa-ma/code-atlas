import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { env } from "../config/env";
import { prisma } from "./prisma";

const trustedOrigins = Array.from(
  new Set([env.FRONTEND_PUBLIC_URL, ...env.corsAllowedOrigins]),
);

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  trustedOrigins,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
  },
  advanced: {
    cookiePrefix: "code-atlas",
    crossSubDomainCookies: env.COOKIE_DOMAIN
      ? {
          enabled: true,
          domain: env.COOKIE_DOMAIN,
        }
      : {
          enabled: false,
        },
  },
});
