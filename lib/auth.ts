import { betterAuth } from "better-auth";
import { assertSafeSessionMode, parseCsvEnv } from "@/lib/server-config";

assertSafeSessionMode();

const SESSION_MAX_AGE_SECONDS = 4 * 60 * 60;
const DEVELOPMENT_ALLOWED_HOSTS = ["localhost:*", "127.0.0.1:*"];

function normalizeHost(host: string): string {
  return host.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function getAllowedHosts(): string[] {
  if (process.env.NODE_ENV === "development") {
    return DEVELOPMENT_ALLOWED_HOSTS;
  }

  const deploymentHosts = [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    ...parseCsvEnv(process.env.AUTH_ALLOWED_HOSTS),
  ]
    .filter((host): host is string => Boolean(host))
    .map(normalizeHost)
    .filter(Boolean);

  if (deploymentHosts.length === 0) {
    throw new Error(
      "No trusted deployment hosts are configured. Set AUTH_ALLOWED_HOSTS for custom domains.",
    );
  }

  return Array.from(new Set(deploymentHosts));
}

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === "development") return `development-${name}`;
  throw new Error(`Missing required environment variable: ${name}`);
}

export const auth = betterAuth({
  baseURL: {
    allowedHosts: getAllowedHosts(),
    protocol: process.env.NODE_ENV === "development" ? "auto" : "https",
  },
  secret: requireEnvironmentVariable("BETTER_AUTH_SECRET"),
  session: {
    expiresIn: SESSION_MAX_AGE_SECONDS,
    disableSessionRefresh: false,
    updateAge: 60 * 60,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
      refreshCache: true,
      strategy: "jwe",
    },
  },
  socialProviders: {
    vercel: {
      clientId: requireEnvironmentVariable("VERCEL_APP_CLIENT_ID"),
      clientSecret: requireEnvironmentVariable("VERCEL_APP_CLIENT_SECRET"),
    },
  },
});
