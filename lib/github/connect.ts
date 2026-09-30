import { getAuthenticatedGitHubUser } from "./client";
import {
  deleteGitHubSettings,
  readGitHubSettings,
  readGitHubToken,
  writeGitHubSettings,
} from "./store";

export type GitHubConnectionState =
  | { status: "connected"; login: string; avatarUrl?: string; credentialSource: "user" | "environment" }
  | { status: "needs_auth" }
  | { status: "error"; message: string };

export async function connectGitHubWithPat(userId: string, tokenInput: string) {
  const token = tokenInput.trim();
  if (!token) throw new Error("A GitHub personal access token is required.");
  if (token.length > 512) throw new Error("The GitHub token is invalid.");

  const account = await getAuthenticatedGitHubUser(token);
  await writeGitHubSettings(userId, {
    token,
    login: account.login,
    avatarUrl: account.avatarUrl,
  });
  return account;
}

export async function disconnectGitHub(userId: string): Promise<void> {
  await deleteGitHubSettings(userId);
}

function environmentGitHubToken(): string | undefined {
  const token = process.env.GITHUB_PAT?.trim();
  return token || undefined;
}

export async function getGitHubConnection(userId: string): Promise<GitHubConnectionState> {
  try {
    const settings = await readGitHubSettings(userId);
    if (settings) {
      return {
        status: "connected",
        login: settings.login,
        avatarUrl: settings.avatarUrl,
        credentialSource: "user",
      };
    }

    const environmentToken = environmentGitHubToken();
    if (!environmentToken) return { status: "needs_auth" };

    const account = await getAuthenticatedGitHubUser(environmentToken);
    return {
      status: "connected",
      login: account.login,
      avatarUrl: account.avatarUrl,
      credentialSource: "environment",
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "GitHub connection failed.",
    };
  }
}

export async function requireGitHubToken(userId: string): Promise<string> {
  const token = await readGitHubToken(userId);
  if (token) return token;

  const environmentToken = environmentGitHubToken();
  if (environmentToken) return environmentToken;

  throw new Error(
    "GitHub connection is required. Add a personal access token in Settings → GitHub or configure GITHUB_PAT on the server.",
  );
}
