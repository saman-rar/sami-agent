export type GitHubProjectSource = {
  type: "github";
  repositoryId: number;
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  htmlUrl: string;
  defaultBranch: string;
  branch: string;
};

export type ProjectRecord = {
  id: string;
  name: string;
  source: GitHubProjectSource;
  sessionId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectSummary = ProjectRecord;
