import "server-only";

export function parseCsvEnv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizedAllowedEmails(): string[] {
  return parseCsvEnv(process.env.AUTH_ALLOWED_EMAILS).map((item) => item.toLowerCase());
}

export function assertSafeSessionMode(): void {
  if (process.env.NODE_ENV === "development") return;

  const allowedEmails = normalizedAllowedEmails();
  const allowedDomains = parseCsvEnv(process.env.AUTH_ALLOWED_DOMAINS);

  if (allowedEmails.length !== 1 || allowedDomains.length > 0) {
    throw new Error(
      "This build requires exactly one AUTH_ALLOWED_EMAILS entry and no AUTH_ALLOWED_DOMAINS in production until a durable per-session ownership ACL is connected.",
    );
  }
}

export function isUserAllowed(email: string): boolean {
  if (process.env.NODE_ENV === "development") return true;
  assertSafeSessionMode();
  return normalizedAllowedEmails()[0] === email.trim().toLowerCase();
}
