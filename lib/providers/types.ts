import type { LanguageModelV4 } from "@ai-sdk/provider";

export const PROVIDER_KINDS = [
  "openrouter",
  "opencode-zen",
  "kilo-gateway",
  "vercel-ai-gateway",
  "openai",
  "anthropic",
  "google",
  "custom-openai",
] as const;

export type ProviderKind = (typeof PROVIDER_KINDS)[number];

export type ProviderField = {
  key: "apiKey" | "baseUrl" | "name" | "organization" | "project";
  label: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  secret?: boolean;
};

export type ProviderDescriptor = {
  kind: ProviderKind;
  name: string;
  shortName: string;
  description: string;
  defaultBaseUrl?: string;
  documentationUrl?: string;
  fields: ProviderField[];
};

export type ModelCapabilities = {
  supportsTools: boolean;
  supportsVision: boolean;
  supportsThinking: boolean;
  thinkingLevels?: string[];
};

export type AgentModel = {
  id: string;
  name: string;
  providerId: string;
  providerName: string;
  contextWindow: number;
  maxOutputTokens?: number;
  capabilities: ModelCapabilities;
  inputPrice?: number;
  outputPrice?: number;
  custom?: boolean;

  // Compatibility aliases for existing UI and runtime consumers.
  supportsTools?: boolean;
  supportsVision?: boolean;
};

// Kept as the persisted provider catalog type to avoid breaking existing data.
export type ProviderModel = AgentModel & {
  supportsReasoning?: boolean;
};

export type ProviderConnectionInput = {
  kind: ProviderKind;
  apiKey?: string;
  name?: string;
  baseUrl?: string;
  organization?: string;
  project?: string;
};

export type ProviderConnectionPatch = Omit<ProviderConnectionInput, "kind">;

export type PublicProviderConnection = {
  id: string;
  kind: ProviderKind;
  name: string;
  baseUrl?: string;
  organization?: string;
  project?: string;
  hasApiKey: boolean;
  connectedAt: string;
  updatedAt: string;
  modelsFetchedAt?: string;
  modelCount: number;
};

export type ProviderListItem = ProviderDescriptor & {
  connections: PublicProviderConnection[];
};

export type ModelSelection = {
  providerId: string;
  modelId: string;
  thinkingLevel?: string;
};

export type ProviderConnectionRuntime = {
  id: string;
  kind: ProviderKind;
  name: string;
  baseUrl?: string;
  organization?: string;
  project?: string;
  apiKey: string;
};

export type ProviderConnectionTest = {
  ok: boolean;
  message: string;
  validatesCredential: boolean;
};

export type ProviderAdapter = {
  kind: ProviderKind;
  discoverModels(connection: ProviderConnectionRuntime): Promise<ProviderModel[]>;
  testConnection(connection: ProviderConnectionRuntime): Promise<ProviderConnectionTest>;
  createModel(connection: ProviderConnectionRuntime, modelId: string): LanguageModelV4;
};
