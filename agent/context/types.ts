export type ContextBudget = {
  maxTokens: number;
  systemTokens: number;
  projectTokens: number;
  conversationTokens: number;
  toolTokens: number;
};

export type ProjectContextSummary = {
  framework?: string;
  architecture?: string;
  commands?: string[];
  importantFolders?: string[];
  conventions?: string[];
};
