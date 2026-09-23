import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { deletePrivateJson, readLatestPrivateJsonUnderPrefix, readPrivateJson, writePrivateJson } from "@/lib/persistence/blob";
import { legacyUserHash, ownerStoragePath } from "@/lib/persistence/single-owner";

const DOCUMENT_VERSION = 1 as const;
const CIPHER_VERSION = 1 as const;

type EncryptedSecret = {
  version: typeof CIPHER_VERSION;
  iv: string;
  tag: string;
  ciphertext: string;
};

export type GitHubSettingsDocument = {
  version: typeof DOCUMENT_VERSION;
  token: EncryptedSecret;
  login: string;
  avatarUrl?: string;
  connectedAt: string;
  updatedAt: string;
};

const STORAGE_PATH = ownerStoragePath("settings/github", DOCUMENT_VERSION);

function legacyStoragePath(userId: string): string {
  return `settings/github/v1/${legacyUserHash(userId)}.json`;
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

function encryptSecret(secret: string): EncryptedSecret {
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

function decryptSecret(secret: EncryptedSecret): string {
  if (secret.version !== CIPHER_VERSION) {
    throw new Error("Unsupported GitHub secret version.");
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

export async function readGitHubSettings(userId: string): Promise<GitHubSettingsDocument | undefined> {
  let document = await readPrivateJson<GitHubSettingsDocument>(STORAGE_PATH);
  if (!document) {
    document = await readPrivateJson<GitHubSettingsDocument>(legacyStoragePath(userId));
    document ??= await readLatestPrivateJsonUnderPrefix<GitHubSettingsDocument>("settings/github/v1/");
    if (document) await writePrivateJson(STORAGE_PATH, document);
  }
  if (!document) return undefined;
  if (document.version !== DOCUMENT_VERSION || !document.token || !document.login) {
    throw new Error("GitHub settings have an unsupported format.");
  }
  return document;
}

export async function writeGitHubSettings(
  userId: string,
  input: { token: string; login: string; avatarUrl?: string },
): Promise<void> {
  const now = new Date().toISOString();
  const existing = await readGitHubSettings(userId);
  const document: GitHubSettingsDocument = {
    version: DOCUMENT_VERSION,
    token: encryptSecret(input.token),
    login: input.login,
    avatarUrl: input.avatarUrl,
    connectedAt: existing?.connectedAt ?? now,
    updatedAt: now,
  };
  await writePrivateJson(STORAGE_PATH, document);
}

export async function deleteGitHubSettings(_userId: string): Promise<void> {
  await deletePrivateJson(STORAGE_PATH);
}

export async function readGitHubToken(userId: string): Promise<string | undefined> {
  const settings = await readGitHubSettings(userId);
  return settings ? decryptSecret(settings.token) : undefined;
}
