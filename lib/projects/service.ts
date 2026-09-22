import { nanoid } from "nanoid";
import { getGitHubBranch, getGitHubRepository } from "@/lib/github/client";
import { requireGitHubToken } from "@/lib/github/connect";
import { readProjects, writeProjects } from "./store";
import type { ProjectRecord } from "./types";

export async function listProjects(userId: string): Promise<ProjectRecord[]> {
  const projects = await readProjects(userId);
  return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProjectForUser(
  userId: string,
  projectId: string,
): Promise<ProjectRecord | undefined> {
  const projects = await readProjects(userId);
  return projects.find((project) => project.id === projectId);
}

export async function createGitHubProject(
  userId: string,
  input: { owner: string; repo: string; branch: string },
): Promise<ProjectRecord> {
  const token = await requireGitHubToken(userId);
  const repository = await getGitHubRepository(token, input.owner, input.repo);
  const branch = input.branch.trim();
  if (!branch) throw new Error("A Git branch is required.");
  await getGitHubBranch(token, repository.owner, repository.name, branch);

  const now = new Date().toISOString();
  const project: ProjectRecord = {
    id: nanoid(14),
    name: repository.name,
    source: {
      type: "github",
      repositoryId: repository.id,
      owner: repository.owner,
      name: repository.name,
      fullName: repository.fullName,
      private: repository.private,
      htmlUrl: repository.htmlUrl,
      defaultBranch: repository.defaultBranch,
      branch,
    },
    createdAt: now,
    updatedAt: now,
  };

  const projects = await readProjects(userId);
  projects.unshift(project);
  await writeProjects(userId, projects);
  return project;
}

export async function setProjectSession(
  userId: string,
  projectId: string,
  sessionId: string | undefined,
): Promise<ProjectRecord> {
  const projects = await readProjects(userId);
  const index = projects.findIndex((project) => project.id === projectId);
  if (index < 0) throw new Error("Project not found.");

  const current = projects[index];
  const updated: ProjectRecord = {
    ...current,
    sessionId,
    updatedAt: new Date().toISOString(),
  };
  projects[index] = updated;
  await writeProjects(userId, projects);
  return updated;
}
