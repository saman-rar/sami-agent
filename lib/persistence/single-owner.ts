import { createHash } from "node:crypto";

export const SINGLE_OWNER_PRINCIPAL_ID = "sami-owner";

/**
 * Sami is intentionally one workspace per deployment. Authentication is only
 * an access gate; persisted application state is shared across this deployment.
 * The literal keeps the storage path compatible with the previous default
 * namespace while keeping workspace identity deployment-local and fixed.
 */
const OWNER_NAMESPACE = createHash("sha256").update("default").digest("hex").slice(0, 24);

export function ownerStoragePath(area: string, version: number): string {
  return `single-owner/${OWNER_NAMESPACE}/${area}/v${version}.json`;
}

export function legacyUserHash(userId: string): string {
  return createHash("sha256").update(userId).digest("hex");
}

export function isConfiguredOwner(email: string | null | undefined): boolean {
  const configured = process.env.SAMI_OWNER_EMAIL?.trim().toLowerCase();
  if (!configured) return true;
  return email?.trim().toLowerCase() === configured;
}
