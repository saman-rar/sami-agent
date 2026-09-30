import { applyThinkingLevel } from './reasoning';
import type { LanguageModel } from "ai";
import { randomUUID } from "node:crypto";
import { getProviderAdapter } from "./adapters";
import { getProviderDescriptor, getProviderDisplayName, PROVIDER_DESCRIPTORS } from "./catalog";
import {
  decryptProviderSecret,
  encryptProviderSecret,
  readProviderSettings,
  type StoredProviderConnection,
  saveProviderConnection,
  deleteProviderConnection,
  saveModelSelection,
} from "./store";
import type {
  ModelSelection,
  ProviderConnectionInput,
  ProviderConnectionPatch,
  ProviderConnectionRuntime,
  ProviderListItem,
  ProviderModel,
  PublicProviderConnection,
} from "./types";

const MODEL_CACHE_TTL_MS = 15 * 60 * 1000;
export const DEFAULT_EVE_MODEL = "openai/gpt-5.6-luna-fast";

function runtimeConnection(connection: StoredProviderConnection): ProviderConnectionRuntime {
  return {
    id: connection.id,
    kind: connection.kind,
    name: connection.name,
    baseUrl: connection.baseUrl,
    organization: connection.organization,
    project: connection.project,
    apiKey: decryptProviderSecret(connection.apiKey),
  };
}

function publicConnection(connection: StoredProviderConnection): PublicProviderConnection {
  return {
    id: connection.id,
    kind: connection.kind,
    name: connection.name,
    baseUrl: connection.baseUrl,
    organization: connection.organization,
    project: connection.project,
    hasApiKey: true,
    connectedAt: connection.connectedAt,
    updatedAt: connection.updatedAt,
    modelsFetchedAt: connection.modelsFetchedAt,
    modelCount: connection.models?.length ?? 0,
  };
}

function normalizeBaseUrl(baseUrl: string | undefined): string | undefined {
  if (!baseUrl?.trim()) return undefined;
  const parsed = new URL(baseUrl.trim());
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error("Provider base URL must use HTTP or HTTPS.");
  }
  return parsed.toString().replace(/\/$/, "");
}

function connectionIdFor(input: ProviderConnectionInput): string {
  return input.kind === "custom-openai" ? `custom-${randomUUID()}` : input.kind;
}

export async function listProviders(userId: string): Promise<ProviderListItem[]> {
  const settings = await readProviderSettings(userId);
  return PROVIDER_DESCRIPTORS.map((descriptor) => ({
    ...descriptor,
    connections: settings.connections
      .filter((connection) => connection.kind === descriptor.kind)
      .map(publicConnection),
  }));
}

export async function createProviderConnection(
  userId: string,
  input: ProviderConnectionInput,
): Promise<{ connection: PublicProviderConnection; models: ProviderModel[]; testMessage: string }> {
  const descriptor = getProviderDescriptor(input.kind);
  const apiKey = input.apiKey?.trim();
  if (!apiKey) throw new Error("API key is required.");

  const name = getProviderDisplayName(input.kind, input.name);
  const baseUrl = normalizeBaseUrl(input.baseUrl) ?? descriptor.defaultBaseUrl;
  if (!baseUrl) throw new Error("Base URL is required.");

  const settings = await readProviderSettings(userId);
  if (input.kind !== "custom-openai" && settings.connections.some((item) => item.kind === input.kind)) {
    throw new Error(`${descriptor.name} is already connected. Edit the existing connection instead.`);
  }

  const now = new Date().toISOString();
  const stored: StoredProviderConnection = {
    id: connectionIdFor(input),
    kind: input.kind,
    name,
    baseUrl,
    organization: input.organization?.trim() || undefined,
    project: input.project?.trim() || undefined,
    apiKey: encryptProviderSecret(apiKey),
    connectedAt: now,
    updatedAt: now,
  };

  const runtime = runtimeConnection(stored);
  const adapter = getProviderAdapter(stored.kind);
  const test = await adapter.testConnection(runtime);
  const models = await adapter.discoverModels(runtime);
  stored.models = models;
  stored.modelsFetchedAt = now;

  settings.connections.push(stored);
  await saveProviderConnection(stored, true);

  return { connection: publicConnection(stored), models, testMessage: test.message };
}

export async function updateProviderConnection(
  userId: string,
  providerId: string,
  patch: ProviderConnectionPatch,
): Promise<{ connection: PublicProviderConnection; models: ProviderModel[]; testMessage: string }> {
  const settings = await readProviderSettings(userId);
  const index = settings.connections.findIndex((item) => item.id === providerId);
  if (index < 0) throw new Error("Provider connection not found.");

  const current = settings.connections[index];
  const descriptor = getProviderDescriptor(current.kind);
  const next: StoredProviderConnection = {
    ...current,
    name:
      current.kind === "custom-openai" && patch.name !== undefined
        ? getProviderDisplayName(current.kind, patch.name)
        : current.name,
    baseUrl:
      patch.baseUrl !== undefined
        ? normalizeBaseUrl(patch.baseUrl) ?? descriptor.defaultBaseUrl
        : current.baseUrl,
    organization:
      patch.organization !== undefined ? patch.organization.trim() || undefined : current.organization,
    project: patch.project !== undefined ? patch.project.trim() || undefined : current.project,
    apiKey: patch.apiKey?.trim() ? encryptProviderSecret(patch.apiKey.trim()) : current.apiKey,
    updatedAt: new Date().toISOString(),
  };
  if (!next.baseUrl) throw new Error("Base URL is required.");

  const runtime = runtimeConnection(next);
  const adapter = getProviderAdapter(next.kind);
  const test = await adapter.testConnection(runtime);
  const models = await adapter.discoverModels(runtime);
  next.models = models;
  next.modelsFetchedAt = new Date().toISOString();
  settings.connections[index] = next;

  if (
    settings.selection?.providerId === providerId &&
    !models.some((model) => model.id === settings.selection?.modelId)
  ) {
    settings.selection = undefined;
  }

  await saveProviderConnection(next, false, current.updatedAt);
  return { connection: publicConnection(next), models, testMessage: test.message };
}

export async function removeProviderConnection(userId: string, providerId: string): Promise<void> {
  await deleteProviderConnection(providerId);
}

export async function testProviderConnection(userId: string, providerId: string) {
  const settings = await readProviderSettings(userId);
  const connection = settings.connections.find((item) => item.id === providerId);
  if (!connection) throw new Error("Provider connection not found.");
  return getProviderAdapter(connection.kind).testConnection(runtimeConnection(connection));
}

export async function getProviderModels(
  userId: string,
  providerId: string,
  options: { refresh?: boolean } = {},
): Promise<{ models: ProviderModel[]; fetchedAt?: string }> {
  const settings = await readProviderSettings(userId);
  const index = settings.connections.findIndex((item) => item.id === providerId);
  if (index < 0) throw new Error("Provider connection not found.");
  const connection = settings.connections[index];

  const previousUpdatedAt = connection.updatedAt;
  const fetchedAtMs = connection.modelsFetchedAt ? Date.parse(connection.modelsFetchedAt) : 0;
  const cacheFresh = Date.now() - fetchedAtMs < MODEL_CACHE_TTL_MS;
  if (!options.refresh && cacheFresh && connection.models) {
    return { models: connection.models, fetchedAt: connection.modelsFetchedAt };
  }

  const models = await getProviderAdapter(connection.kind).discoverModels(runtimeConnection(connection));
  connection.models = models;
  connection.modelsFetchedAt = new Date().toISOString();
  connection.updatedAt = new Date().toISOString();
  settings.connections[index] = connection;

  if (
    settings.selection?.providerId === providerId &&
    !models.some((model) => model.id === settings.selection?.modelId)
  ) {
    settings.selection = undefined;
  }

  await saveProviderConnection(connection, false, previousUpdatedAt);
  return { models, fetchedAt: connection.modelsFetchedAt };
}

export async function listAvailableModels(userId: string): Promise<{
  models: ProviderModel[];
  selection?: ModelSelection;
}> {
  const settings = await readProviderSettings(userId);
  const models = settings.connections.flatMap((connection) => connection.models ?? []);
  return { models, selection: settings.selection };
}

export async function setModelSelection(
  userId: string,
  selection: ModelSelection | undefined,
): Promise<ModelSelection | undefined> {
  const settings = await readProviderSettings(userId);
  if (!selection) {
    settings.selection = undefined;
    await saveModelSelection(undefined);
    return undefined;
  }

  const connection = settings.connections.find((item) => item.id === selection.providerId);
  if (!connection) throw new Error("Selected provider is not connected.");
  const models = connection.models ?? [];
  if (!models.some((model) => model.id === selection.modelId)) {
    throw new Error("Selected model is not available in the provider's current catalog.");
  }

  settings.selection = selection;
  await saveModelSelection(selection);
  return selection;
}

export async function resolveSelectedModelForRuntime(userId: string) {
  const settings = await readProviderSettings(userId);
  if (!settings.selection) return DEFAULT_EVE_MODEL;

  const connection = settings.connections.find(
    (item) => item.id === settings.selection?.providerId,
  );
  if (!connection) return DEFAULT_EVE_MODEL;

  const selectedModel = connection.models?.find(
    (model) => model.id === settings.selection?.modelId,
  );
  // Official AI SDK provider packages can be installed with a separate patch copy of
  // @ai-sdk/provider. Their runtime V4 contract is compatible, but TypeScript treats
  // the duplicated package identities as distinct. Normalize once at this boundary
  // instead of weakening types throughout the provider adapter layer.
  const model = applyThinkingLevel(getProviderAdapter(connection.kind).createModel(
    runtimeConnection(connection),
    settings.selection.modelId,
  ), selectedModel, settings.selection.thinkingLevel) as unknown as LanguageModel;

  return selectedModel?.contextWindow
    ? { model, modelContextWindowTokens: selectedModel.contextWindow }
    : model;
}
