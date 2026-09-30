import type { ProviderDescriptor, ProviderKind } from "./types";

const API_KEY_FIELD = {
  key: "apiKey" as const,
  label: "API key",
  description: "Stored only on the server. The saved value is never returned to the browser.",
  placeholder: "Paste API key",
  required: true,
  secret: true,
};

export const PROVIDER_DESCRIPTORS: readonly ProviderDescriptor[] = [
  {
    kind: "openrouter",
    name: "OpenRouter",
    shortName: "OpenRouter",
    description: "Use OpenRouter's unified catalog and routing API.",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    documentationUrl: "https://openrouter.ai/docs",
    fields: [API_KEY_FIELD],
  },
  {
    kind: "opencode-zen",
    name: "OpenCode Zen",
    shortName: "OpenCode",
    description: "Use the curated OpenCode Zen model gateway.",
    defaultBaseUrl: "https://opencode.ai/zen/v1",
    documentationUrl: "https://opencode.ai/docs/zen",
    fields: [API_KEY_FIELD],
  },
  {
    kind: "kilo-gateway",
    name: "Kilo Gateway",
    shortName: "Kilo",
    description: "Use Kilo Gateway through its OpenAI-compatible API.",
    defaultBaseUrl: "https://api.kilo.ai/api/gateway",
    documentationUrl: "https://kilo.ai/docs",
    fields: [API_KEY_FIELD],
  },
  {
    kind: "vercel-ai-gateway",
    name: "Vercel AI Gateway",
    shortName: "Vercel",
    description: "Use Vercel AI Gateway with an external gateway API key.",
    defaultBaseUrl: "https://ai-gateway.vercel.sh/v1",
    documentationUrl: "https://vercel.com/docs/ai-gateway",
    fields: [API_KEY_FIELD],
  },
  {
    kind: "openai",
    name: "OpenAI",
    shortName: "OpenAI",
    description: "Connect directly to the OpenAI API.",
    defaultBaseUrl: "https://api.openai.com/v1",
    documentationUrl: "https://platform.openai.com/docs",
    fields: [
      API_KEY_FIELD,
      {
        key: "organization",
        label: "Organization",
        description: "Optional OpenAI organization ID.",
        placeholder: "org_...",
      },
      {
        key: "project",
        label: "Project",
        description: "Optional OpenAI project ID.",
        placeholder: "proj_...",
      },
    ],
  },
  {
    kind: "anthropic",
    name: "Anthropic",
    shortName: "Anthropic",
    description: "Connect directly to the Anthropic Messages API.",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    documentationUrl: "https://docs.anthropic.com",
    fields: [API_KEY_FIELD],
  },
  {
    kind: "google",
    name: "Google Gemini",
    shortName: "Google",
    description: "Connect directly to the Google Generative AI API.",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    documentationUrl: "https://ai.google.dev/gemini-api/docs",
    fields: [API_KEY_FIELD],
  },
  {
    kind: "custom-openai",
    name: "Custom OpenAI-compatible",
    shortName: "Custom",
    description: "Connect any provider that implements the OpenAI-compatible chat API.",
    fields: [
      {
        key: "name",
        label: "Provider name",
        placeholder: "My provider",
        required: true,
      },
      {
        key: "baseUrl",
        label: "Base URL",
        description: "Base URL that contains /models and /chat/completions endpoints.",
        placeholder: "https://api.example.com/v1",
        required: true,
      },
      API_KEY_FIELD,
    ],
  },
] as const;

const descriptorMap = new Map(PROVIDER_DESCRIPTORS.map((provider) => [provider.kind, provider]));

export function getProviderDescriptor(kind: ProviderKind): ProviderDescriptor {
  const descriptor = descriptorMap.get(kind);
  if (!descriptor) {
    throw new Error(`Unsupported provider kind: ${kind}`);
  }
  return descriptor;
}

export function getProviderDisplayName(kind: ProviderKind, configuredName?: string): string {
  if (kind === "custom-openai" && configuredName?.trim()) return configuredName.trim();
  return getProviderDescriptor(kind).name;
}
