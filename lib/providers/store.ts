import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { readLatestPrivateJsonUnderPrefix, readPrivateJson, writePrivateJson } from "@/lib/persistence/blob";
import { legacyUserHash, ownerStoragePath } from "@/lib/persistence/single-owner";
import type { ModelSelection, ProviderKind, ProviderModel } from "./types";

const DOCUMENT_VERSION = 1 as const;
const CIPHER_VERSION = 1 as const;

type EncryptedSecret = {
  version: typeof CIPHER_VERSION;
  iv: string;
  tag: string;
  ciphertext: string;
};

export type StoredProviderConnection = {
  id: string;
  kind: ProviderKind;
  name: string;
  baseUrl?: string;
  organization?: string;
  project?: string;
  apiKey: EncryptedSecret;
  connectedAt: string;
  updatedAt: string;
  models?: ProviderModel[];
  modelsFetchedAt?: string;
};

export type ProviderSettingsDocument = {
  version: typeof DOCUMENT_VERSION;
  connections: StoredProviderConnection[];
  selection?: ModelSelection;
};

const STORAGE_PATH = ownerStoragePath("settings/providers", DOCUMENT_VERSION);

function createEmptyDocument(): ProviderSettingsDocument {
  return { version: DOCUMENT_VERSION, connections: [] };
}

function legacyStoragePath(userId: string): string {
  return `settings/providers/v1/${legacyUserHash(userId)}.json`;
}

function encryptionKey(): Buffer {
  const raw = process.env.PROVIDER_SECRET_ENCRYPTION_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === "development") {
      return createHash("sha256").update("sami-local-development-provider-key").digest();
    }
    throw new Error("PROVIDER_SECRET_ENCRYPTION_KEY is required in production.");
  }
  if (raw.length < 32) {
    throw new Error("PROVIDER_SECRET_ENCRYPTION_KEY must contain at least 32 characters.");
  }
  return createHash("sha256").update(raw).digest();
}

export function encryptProviderSecret(secret: string): EncryptedSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    version: CIPHER_VERSION,
    iv: iv.toString("base64url"),
    tag: tag.toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
  };
}

export function decryptProviderSecret(secret: EncryptedSecret): string {
  if (secret.version !== CIPHER_VERSION) {
    throw new Error("Unsupported provider secret version.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(secret.iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(secret.tag, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(secret.ciphertext, "base64url")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

export async function readProviderSettings(userId: string): Promise<ProviderSettingsDocument> {
  let document = await readPrivateJson<ProviderSettingsDocument>(STORAGE_PATH);
  if (!document) {
    // One-time migration from the previous per-auth-user Blob key.
    document = await readPrivateJson<ProviderSettingsDocument>(legacyStoragePath(userId));
    document ??= await readLatestPrivateJsonUnderPrefix<ProviderSettingsDocument>("settings/providers/v1/");
    if (document) await writePrivateJson(STORAGE_PATH, document);
  }
  if (!document) return createEmptyDocument();
  if (document.version !== DOCUMENT_VERSION || !Array.isArray(document.connections)) {
    throw new Error("Provider settings have an unsupported format.");
  }
  return document;
}

export async function writeProviderSettings(
  _userId: string,
  document: ProviderSettingsDocument,
): Promise<void> {
  await writePrivateJson(STORAGE_PATH, document);
}
