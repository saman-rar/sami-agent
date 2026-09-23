export type ContextBreakdownMetric = {
  systemTokens: number;
  projectTokens: number;
  conversationTokens: number;
  fileTokens: number;
  toolTokens: number;
  cachedTokens?: number;
};

export function estimateContextTokens(text: string) {
  return Math.ceil(text.length / 4);
}

export function createContextBreakdown(parts: {
  system?: string;
  project?: string;
  conversation?: string;
  files?: string;
  tools?: string;
}): ContextBreakdownMetric {
  return {
    systemTokens: estimateContextTokens(parts.system ?? ""),
    projectTokens: estimateContextTokens(parts.project ?? ""),
    conversationTokens: estimateContextTokens(parts.conversation ?? ""),
    fileTokens: estimateContextTokens(parts.files ?? ""),
    toolTokens: estimateContextTokens(parts.tools ?? ""),
  };
}
