const GITHUB_API = "https://api.github.com";
const API_VERSION = "2022-11-28";

export type GitHubRepository = {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  ownerAvatarUrl?: string;
  private: boolean;
  defaultBranch: string;
  updatedAt: string;
  htmlUrl: string;
};

export type GitHubBranch = {
  name: string;
  protected: boolean;
};

export type GitHubAuthenticatedUser = {
  login: string;
  avatarUrl?: string;
};

type UserPayload = { login: string; avatar_url?: string };

type RepositoryPayload = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  updated_at: string;
  html_url: string;
  owner: { login: string; avatar_url?: string };
};

type BranchPayload = { name: string; protected: boolean };

function headers(token: string): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": API_VERSION,
  };
}

function normalizeRepository(repo: RepositoryPayload): GitHubRepository {
  return {
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    owner: repo.owner.login,
    ownerAvatarUrl: repo.owner.avatar_url,
    private: repo.private,
    defaultBranch: repo.default_branch,
    updatedAt: repo.updated_at,
    htmlUrl: repo.html_url,
  };
}

export async function getAuthenticatedGitHubUser(token: string): Promise<GitHubAuthenticatedUser> {
  const result = await githubJson<UserPayload>(token, "/user");
  return { login: result.login, avatarUrl: result.avatar_url };
}

async function githubJson<T>(token: string, path: string): Promise<T> {
  if (!path.startsWith("/")) throw new Error("GitHub API path must be relative.");
  const response = await fetch(`${GITHUB_API}${path}`, {
    headers: headers(token),
    cache: "no-store",
    redirect: "error",
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("GitHub authorization expired. Reconnect GitHub.");
    if (response.status === 403) throw new Error("GitHub denied access to this resource.");
    if (response.status === 404) throw new Error("GitHub repository or branch not found.");
    throw new Error(`GitHub request failed (HTTP ${response.status}).`);
  }
  return (await response.json()) as T;
}

export async function listGitHubRepositories(
  token: string,
  query = "",
): Promise<GitHubRepository[]> {
  const repositories: GitHubRepository[] = [];
  const normalizedQuery = query.trim().toLowerCase();

  for (let page = 1; page <= 5; page += 1) {
    const batch = await githubJson<RepositoryPayload[]>(
      token,
      `/user/repos?visibility=all&affiliation=owner,collaborator,organization_member&sort=updated&direction=desc&per_page=100&page=${page}`,
    );
    repositories.push(...batch.map(normalizeRepository));
    if (batch.length < 100) break;
  }

  if (!normalizedQuery) return repositories;
  return repositories.filter((repo) =>
    repo.fullName.toLowerCase().includes(normalizedQuery),
  );
}

export async function getGitHubRepository(
  token: string,
  owner: string,
  repo: string,
): Promise<GitHubRepository> {
  const result = await githubJson<RepositoryPayload>(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
  );
  return normalizeRepository(result);
}

export async function getGitHubBranch(
  token: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<GitHubBranch> {
  const result = await githubJson<BranchPayload>(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches/${encodeURIComponent(branch)}`,
  );
  return { name: result.name, protected: result.protected };
}

export async function listGitHubBranches(
  token: string,
  owner: string,
  repo: string,
): Promise<GitHubBranch[]> {
  const branches: GitHubBranch[] = [];
  for (let page = 1; page <= 5; page += 1) {
    const batch = await githubJson<BranchPayload[]>(
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=100&page=${page}`,
    );
    branches.push(...batch.map((branch) => ({ name: branch.name, protected: branch.protected })));
    if (batch.length < 100) break;
  }
  return branches;
}
