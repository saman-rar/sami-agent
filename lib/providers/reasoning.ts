import type { LanguageModelV4, LanguageModelV4CallOptions } from '@ai-sdk/provider';
import type { ProviderModel } from './types';
function supportedEffort(value: string | undefined): LanguageModelV4CallOptions['reasoning'] {
  switch (value) {
    case 'provider-default': case 'none': case 'minimal': case 'low': case 'medium': case 'high': case 'xhigh': return value;
    default: return undefined;
  }
}
export function applyThinkingLevel(model: LanguageModelV4, metadata: ProviderModel | undefined, level: string | undefined): LanguageModelV4 {
  const reasoning = metadata?.capabilities.supportsThinking && metadata.capabilities.thinkingLevels?.includes(level ?? '') ? supportedEffort(level) : undefined;
  if (!reasoning) return model;
  return {
    specificationVersion: model.specificationVersion, provider: model.provider, modelId: model.modelId, supportedUrls: model.supportedUrls,
    doGenerate: options => model.doGenerate({ ...options, reasoning }),
    doStream: options => model.doStream({ ...options, reasoning }),
  };
}
