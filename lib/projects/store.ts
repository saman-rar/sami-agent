import { readLatestPrivateJsonUnderPrefix, readPrivateJson, writePrivateJson } from "@/lib/persistence/blob";
import { legacyUserHash, ownerStoragePath } from "@/lib/persistence/single-owner";
import type { ProjectRecord } from "./types";

const DOCUMENT_VERSION = 1 as const;

type ProjectDocument = {
  version: typeof DOCUMENT_VERSION;
  projects: ProjectRecord[];
};

const STORAGE_PATH = ownerStoragePath("projects", DOCUMENT_VERSION);

function emptyDocument(): ProjectDocument {
  return { version: DOCUMENT_VERSION, projects: [] };
}

function legacyStoragePath(userId: string): string {
  return `projects/v1/${legacyUserHash(userId)}.json`;
}

export async function readProjects(userId: string): Promise<ProjectRecord[]> {
  let document = await readPrivateJson<ProjectDocument>(STORAGE_PATH);
  if (!document) {
    document = await readPrivateJson<ProjectDocument>(legacyStoragePath(userId));
    document ??= await readLatestPrivateJsonUnderPrefix<ProjectDocument>("projects/v1/");
    if (document) await writePrivateJson(STORAGE_PATH, document);
  }
  if (!document) return [];
  if (document.version !== DOCUMENT_VERSION || !Array.isArray(document.projects)) {
    throw new Error("Project settings have an unsupported format.");
  }
  return document.projects;
}

export async function writeProjects(_userId: string, projects: ProjectRecord[]): Promise<void> {
  const document: ProjectDocument = { version: DOCUMENT_VERSION, projects };
  await writePrivateJson(STORAGE_PATH, document);
}
