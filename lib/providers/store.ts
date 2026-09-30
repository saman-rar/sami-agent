import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { withDatabase } from "@/lib/db";
import { providers, providerModels, agentSettings } from "@/lib/db/schema";
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

export async function readProviderSettings(_userId: string): Promise<ProviderSettingsDocument> {
  return withDatabase(db => db.transaction(async tx => {
    const rows = await tx.select().from(providers);
    const models = await tx.select().from(providerModels);
    const [settings] = await tx.select().from(agentSettings).where(eq(agentSettings.id, 'owner'));
    const byProvider = new Map<string, ProviderModel[]>();
    for (const row of models) { const items = byProvider.get(row.providerId) ?? []; items.push(row.model); byProvider.set(row.providerId, items); }
    return { version: 1, connections: rows.map(row => ({ ...row.connection, models: byProvider.get(row.id) ?? [] })), selection: settings?.selection ?? undefined };
  }, { isolationLevel: 'repeatable read', accessMode: 'read only' }));
}
export async function saveProviderConnection(connection: StoredProviderConnection, create = false, expectedUpdatedAt?: string): Promise<void> {
  await withDatabase(db => db.transaction(async tx => {
    const { models = [], ...stored } = connection;
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${'provider:' + stored.id}, 0))`);
    const [existing] = await tx.select().from(providers).where(eq(providers.id, stored.id));
    if (expectedUpdatedAt && existing?.connection.updatedAt !== expectedUpdatedAt) throw new Error('Provider changed in another request. Refresh and retry.');
    if (create) {
      if (existing) throw new Error('Provider is already connected.');
      await tx.insert(providers).values({ id: stored.id, connection: stored });
    } else {
      if (!existing) throw new Error('Provider connection not found.');
      await tx.update(providers).set({ connection: stored }).where(eq(providers.id, stored.id));
    }
    await tx.delete(providerModels).where(eq(providerModels.providerId, stored.id));
    if (models.length) await tx.insert(providerModels).values(models.map(model => ({ providerId: stored.id, modelId: model.id, model }))).onConflictDoNothing();
    await tx.update(agentSettings).set({ selection: null }).where(sql`${agentSettings.selection}->>'providerId' = ${stored.id} and not exists (select 1 from ${providerModels} where ${providerModels.providerId} = ${stored.id} and ${providerModels.modelId} = ${agentSettings.selection}->>'modelId')`);
  }));
}
export async function deleteProviderConnection(providerId: string): Promise<void> {
  await withDatabase(db => db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${'provider:' + providerId}, 0))`);
    const rows = await tx.delete(providers).where(eq(providers.id, providerId)).returning({ id: providers.id });
    if (!rows.length) throw new Error('Provider connection not found.');
    await tx.update(agentSettings).set({ selection: null }).where(sql`${agentSettings.selection}->>'providerId' = ${providerId}`);
  }));
}
export async function saveModelSelection(selection: ModelSelection | undefined): Promise<void> {
  await withDatabase(db => db.transaction(async tx => {
    if (selection) {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${'provider:' + selection.providerId}, 0))`);
      const [model] = await tx.select().from(providerModels).where(sql`${providerModels.providerId} = ${selection.providerId} and ${providerModels.modelId} = ${selection.modelId}`);
      if (!model) throw new Error('Selected model is not available.');
      if (selection.thinkingLevel && (!model.model.capabilities.supportsThinking || !model.model.capabilities.thinkingLevels?.includes(selection.thinkingLevel))) {
        throw new Error('Selected thinking level is not supported by this model.');
      }
    }
    await tx.insert(agentSettings).values({ id: 'owner', selection: selection ?? null }).onConflictDoUpdate({ target: agentSettings.id, set: { selection: selection ?? null } });
  }));
}
