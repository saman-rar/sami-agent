import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { LanguageModelV4, LanguageModelV4CallOptions } from '@ai-sdk/provider';
import { applyThinkingLevel } from '../lib/providers/reasoning';
test('stored supported thinking effort reaches both real model boundaries', async () => {
  const calls: LanguageModelV4CallOptions[] = [];
  const model: LanguageModelV4 = { specificationVersion: 'v4', provider: 'test', modelId: 'test', supportedUrls: {},
    doGenerate: async options => { calls.push(options); throw new Error('boundary reached'); },
    doStream: async options => { calls.push(options); throw new Error('boundary reached'); } };
  const metadata = { id: 'test', name: 'test', providerId: 'test', providerName: 'test', contextWindow: 1000, capabilities: { supportsTools: true, supportsVision: false, supportsThinking: true, thinkingLevels: ['low', 'high'] } };
  const wrapped = applyThinkingLevel(model, metadata, 'high');
  await assert.rejects(Promise.resolve(wrapped.doGenerate({ prompt: [] })), /boundary reached/);
  await assert.rejects(Promise.resolve(wrapped.doStream({ prompt: [] })), /boundary reached/);
  assert.deepEqual(calls.map(call => call.reasoning), ['high', 'high']);
  assert.equal(applyThinkingLevel(model, metadata, 'unsupported'), model);
});
