import { listProjects } from "@/lib/projects/service";
import {
  getSessionRecord,
  listSessions,
  readWorkspaceState,
  upsertSessionRecord,
} from "./store";

export async function listSavedSessions(userId: string) {
  const projects = await listProjects(userId);
  for (const project of projects) {
    if (!project.sessionId) continue;
    const existing = await getSessionRecord(project.sessionId);
    if (!existing) {
      await upsertSessionRecord({
        sessionId: project.sessionId,
        projectId: project.id,
        projectName: project.name,
        title: project.name,
        activate: false,
      });
    }
  }
  return listSessions();
}

export async function restoreWorkspaceState(userId: string) {
  const existing = await readWorkspaceState();
  if (existing.lastPath) return existing;

  const projects = await listProjects(userId);
  const recentProject = projects.find((project) => Boolean(project.sessionId));
  if (!recentProject?.sessionId) return existing;

  await upsertSessionRecord({
    sessionId: recentProject.sessionId,
    projectId: recentProject.id,
    projectName: recentProject.name,
    title: recentProject.name,
    activate: true,
  });
  return readWorkspaceState();
}
