import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { getProviderDescriptor } from "./catalog";
import { safeProviderFetch } from "./safe-fetch";
import type {
  ProviderAdapter,
  ProviderConnectionRuntime,
  ProviderKind,
  ProviderModel,
} from "./types";

const REQUEST_TIMEOUT_MS = 15_000;

type UnknownRecord = Record<string, unknown>;

type GenericModelRecord = UnknownRecord & {
  id?: unknown;
  name?: unknown;
  display_name?: unknown;
  context_length?: unknown;
  context_window?: unknown;
  inputTokenLimit?: unknown;
  input_token_limit?: unknown;
  pricing?: unknown;
  tags?: unknown;
  supported_parameters?: unknown;
  architecture?: unknown;
  type?: unknown;
  thinking?: unknown;
  supportedGenerationMethods?: unknown;
};

function asRecord(value: unknown): UnknownRecord | undefined {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function joinUrl(baseUrl: string, pathname: string): string {
  return `${baseUrl.replace(/\/$/, "")}/${pathname.replace(/^\//, "")}`;
}

function connectionBaseUrl(connection: ProviderConnectionRuntime): string {
  return (
    connection.baseUrl ??
    getProviderDescriptor(connection.kind).defaultBaseUrl ??
    (() => {
      throw new Error(`A base URL is required for ${connection.name}.`);
    })()
  );
}

function bearerHeaders(connection: ProviderConnectionRuntime): HeadersInit {
  return {
    Authorization: `Bearer ${connection.apiKey}`,
    Accept: "application/json",
  };
}

async function fetchJson(
  url: string,
  init: RequestInit,
  errorContext: string,
): Promise<unknown> {
  let response: Response;
  try {
    response = await safeProviderFetch(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error(`${errorContext} timed out.`);
    }
    throw new Error(`${errorContext} could not be reached.`);
  }

  if (!response.ok) {
    const explanation =
      response.status === 401 || response.status === 403
        ? " Credentials were rejected."
        : response.status === 429
          ? " The provider rate limit was reached."
          : "";
    throw new Error(`${errorContext} failed with HTTP ${response.status}.${explanation}`);
  }

  return response.json();
}

function normalizeGenericModels(
  payload: unknown,
  connection: ProviderConnectionRuntime,
): ProviderModel[] {
  const body = asRecord(payload);
  const data = Array.isArray(body?.data)
    ? body.data
    : Array.isArray(body?.models)
      ? body.models
      : Array.isArray(payload)
        ? payload
        : [];

  return data
    .map((raw): ProviderModel | undefined => normalizeGenericModel(raw, connection))
    .filter((model): model is ProviderModel => model !== undefined)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeGenericModel(
  raw: unknown,
  connection: ProviderConnectionRuntime,
): ProviderModel | undefined {
  const model = asRecord(raw) as GenericModelRecord | undefined;
  if (!model || typeof model.id !== "string") return undefined;

  const pricing = asRecord(model.pricing);
  const tags = asStringArray(model.tags).map((tag) => tag.toLowerCase());
  const parameters = asStringArray(model.supported_parameters).map((parameter) =>
    parameter.toLowerCase(),
  );
  const architecture = asRecord(model.architecture);
  const inputModalities = asStringArray(
    architecture?.input_modalities ?? architecture?.inputModalities,
  ).map((item) => item.toLowerCase());
  const modelType = typeof model.type === "string" ? model.type.toLowerCase() : undefined;

  if (modelType && ["embedding", "image", "video", "audio"].includes(modelType)) return undefined;

  const contextWindow =
    asNumber(model.context_length) ??
    asNumber(model.context_window) ??
    asNumber(model.inputTokenLimit) ??
    asNumber(model.input_token_limit);

  const inputPrice = asNumber(pricing?.input ?? pricing?.prompt);
  const outputPrice = asNumber(pricing?.output ?? pricing?.completion);
  const supportsThinking =
    tags.includes("reasoning") ||
    model.thinking === true ||
    parameters.includes("reasoning") ||
    model.id.toLowerCase().includes("reasoning");

  const thinkingLevels = supportsThinking
    ? ["minimal", "low", "medium", "high"]
    : undefined;

  return {
    id: model.id,
    name:
      (typeof model.name === "string" && model.name) ||
      (typeof model.display_name === "string" && model.display_name) ||
      model.id,
    providerId: connection.id,
    providerName: connection.name,
    contextWindow: contextWindow ?? 128000,
    capabilities: {
      supportsTools: tags.includes("tool-use") || tags.includes("tools") || parameters.includes("tools"),
      supportsVision:
        tags.includes("vision") ||
        inputModalities.includes("image") ||
        inputModalities.includes("images"),
      supportsThinking,
      thinkingLevels,
    },
    supportsTools:
      tags.includes("tool-use") ||
      tags.includes("tools") ||
      parameters.includes("tools") ||
      undefined,
    supportsVision:
      tags.includes("vision") ||
      inputModalities.includes("image") ||
      inputModalities.includes("images") ||
      undefined,
    supportsReasoning: supportsThinking || undefined,
    inputPrice,
    outputPrice,
  };
}

async function discoverOpenAICompatible(
  connection: ProviderConnectionRuntime,
): Promise<ProviderModel[]> {
  const payload = await fetchJson(
    joinUrl(connectionBaseUrl(connection), "models"),
    { headers: bearerHeaders(connection) },
    `${connection.name} model discovery`,
  );
  return normalizeGenericModels(payload, connection);
}

async function testOpenAICompatible(
  connection: ProviderConnectionRuntime,
): Promise<{ ok: true; message: string; validatesCredential: true }> {
  await discoverOpenAICompatible(connection);
  return {
    ok: true,
    message: "Connection successful. The model catalog accepted the configured credentials.",
    validatesCredential: true,
  };
}

function createCompatibleModel(connection: ProviderConnectionRuntime, modelId: string) {
  return createOpenAICompatible({
    name: connection.id,
    apiKey: connection.apiKey,
    baseURL: connectionBaseUrl(connection),
    fetch: safeProviderFetch,
  }).chatModel(modelId);
}

const openRouterAdapter: ProviderAdapter = {
  kind: "openrouter",
  discoverModels: discoverOpenAICompatible,
  async testConnection(connection) {
    await fetchJson(
      joinUrl(connectionBaseUrl(connection), "key"),
      { headers: bearerHeaders(connection) },
      "OpenRouter credential validation",
    );
    return {
      ok: true,
      message: "API key validated successfully.",
      validatesCredential: true,
    };
  },
  createModel: createCompatibleModel,
};

const openCodeAdapter: ProviderAdapter = {
  kind: "opencode-zen",
  discoverModels: discoverOpenAICompatible,
  async testConnection(connection) {
    await discoverOpenAICompatible(connection);
    return {
      ok: true,
      message:
        "OpenCode Zen is reachable and its model catalog loaded. Zen does not expose a non-billable key-introspection endpoint, so the key is fully validated on the first model request.",
      validatesCredential: false,
    };
  },
  createModel(connection, modelId) {
    if (modelId.startsWith("gpt-")) {
      return createOpenAI({
        apiKey: connection.apiKey,
        baseURL: connectionBaseUrl(connection),
        name: connection.id,
        fetch: safeProviderFetch,
      }).responses(modelId);
    }
    return createCompatibleModel(connection, modelId);
  },
};

const kiloAdapter: ProviderAdapter = {
  kind: "kilo-gateway",
  discoverModels: discoverOpenAICompatible,
  async testConnection(connection) {
    await discoverOpenAICompatible(connection);
    return {
      ok: true,
      message:
        "Kilo Gateway is reachable and its model catalog loaded. The catalog endpoint is public, so the API key is fully validated on the first model request.",
      validatesCredential: false,
    };
  },
  createModel: createCompatibleModel,
};

const vercelGatewayAdapter: ProviderAdapter = {
  kind: "vercel-ai-gateway",
  discoverModels: discoverOpenAICompatible,
  async testConnection(connection) {
    await discoverOpenAICompatible(connection);
    return {
      ok: true,
      message:
        "Vercel AI Gateway is reachable and its catalog loaded. The catalog is public, so the gateway key is fully validated on the first model request.",
      validatesCredential: false,
    };
  },
  createModel: createCompatibleModel,
};

const openAIAdapter: ProviderAdapter = {
  kind: "openai",
  discoverModels: discoverOpenAICompatible,
  testConnection: testOpenAICompatible,
  createModel(connection, modelId) {
    return createOpenAI({
      apiKey: connection.apiKey,
      baseURL: connectionBaseUrl(connection),
      organization: connection.organization,
      project: connection.project,
      name: connection.id,
      fetch: safeProviderFetch,
    })(modelId);
  },
};

const anthropicAdapter: ProviderAdapter = {
  kind: "anthropic",
  async discoverModels(connection) {
    const models: ProviderModel[] = [];
    let afterId: string | undefined;

    for (let page = 0; page < 20; page += 1) {
      const url = new URL(joinUrl(connectionBaseUrl(connection), "models"));
      url.searchParams.set("limit", "100");
      if (afterId) url.searchParams.set("after_id", afterId);

      const payload = asRecord(
        await fetchJson(
          url.toString(),
          {
            headers: {
              "x-api-key": connection.apiKey,
              "anthropic-version": "2023-06-01",
              Accept: "application/json",
            },
          },
          "Anthropic model discovery",
        ),
      );
      const pageModels = normalizeGenericModels(payload, connection);
      models.push(...pageModels);

      if (payload?.has_more !== true || typeof payload.last_id !== "string") break;
      afterId = payload.last_id;
    }

    return models.sort((left, right) => left.name.localeCompare(right.name));
  },
  async testConnection(connection) {
    const url = new URL(joinUrl(connectionBaseUrl(connection), "models"));
    url.searchParams.set("limit", "1");
    await fetchJson(
      url.toString(),
      {
        headers: {
          "x-api-key": connection.apiKey,
          "anthropic-version": "2023-06-01",
          Accept: "application/json",
        },
      },
      "Anthropic credential validation",
    );
    return { ok: true, message: "API key validated successfully.", validatesCredential: true };
  },
  createModel(connection, modelId) {
    return createAnthropic({
      apiKey: connection.apiKey,
      baseURL: connectionBaseUrl(connection),
      fetch: safeProviderFetch,
    })(modelId);
  },
};

const googleAdapter: ProviderAdapter = {
  kind: "google",
  async discoverModels(connection) {
    const models: ProviderModel[] = [];
    let pageToken: string | undefined;

    for (let page = 0; page < 20; page += 1) {
      const url = new URL(joinUrl(connectionBaseUrl(connection), "models"));
      url.searchParams.set("key", connection.apiKey);
      url.searchParams.set("pageSize", "1000");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const payload = asRecord(
        await fetchJson(url.toString(), {}, "Google Gemini model discovery"),
      );
      const data = Array.isArray(payload?.models) ? payload.models : [];
      for (const raw of data) {
        const model = asRecord(raw);
        if (!model || typeof model.name !== "string") continue;
        const methods = asStringArray(model.supportedGenerationMethods);
        if (!methods.includes("generateContent")) continue;
        const id =
          typeof model.baseModelId === "string"
            ? model.baseModelId
            : model.name.replace(/^models\//, "");
        models.push({
          id,
          name: typeof model.displayName === "string" ? model.displayName : id,
          providerId: connection.id,
          providerName: connection.name,
          contextWindow: asNumber(model.inputTokenLimit) ?? 128000,
          capabilities: {
            supportsTools: false,
            supportsVision: false,
            supportsThinking: model.thinking === true,
            thinkingLevels: model.thinking === true ? ["minimal", "low", "medium", "high"] : undefined,
          },
          supportsReasoning: model.thinking === true || undefined,
        });
      }

      pageToken = typeof payload?.nextPageToken === "string" ? payload.nextPageToken : undefined;
      if (!pageToken) break;
    }

    return models.sort((left, right) => left.name.localeCompare(right.name));
  },
  async testConnection(connection) {
    const url = new URL(joinUrl(connectionBaseUrl(connection), "models"));
    url.searchParams.set("key", connection.apiKey);
    url.searchParams.set("pageSize", "1");
    await fetchJson(url.toString(), {}, "Google Gemini credential validation");
    return { ok: true, message: "API key validated successfully.", validatesCredential: true };
  },
  createModel(connection, modelId) {
    return createGoogleGenerativeAI({
      apiKey: connection.apiKey,
      baseURL: connectionBaseUrl(connection),
      name: connection.id,
      fetch: safeProviderFetch,
    })(modelId);
  },
};

const customOpenAIAdapter: ProviderAdapter = {
  kind: "custom-openai",
  discoverModels: discoverOpenAICompatible,
  testConnection: testOpenAICompatible,
  createModel: createCompatibleModel,
};

const adapters = new Map<ProviderKind, ProviderAdapter>(
  [
    openRouterAdapter,
    openCodeAdapter,
    kiloAdapter,
    vercelGatewayAdapter,
    openAIAdapter,
    anthropicAdapter,
    googleAdapter,
    customOpenAIAdapter,
  ].map((adapter) => [adapter.kind, adapter]),
);

export function getProviderAdapter(kind: ProviderKind): ProviderAdapter {
  const adapter = adapters.get(kind);
  if (!adapter) throw new Error(`No adapter registered for provider kind ${kind}.`);
  return adapter;
}
