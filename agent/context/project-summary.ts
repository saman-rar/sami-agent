import type { ProjectContextSummary } from "./types";

export function normalizeProjectSummary(input: Partial<ProjectContextSummary>) {
  return {
    framework: input.framework,
    architecture: input.architecture,
    commands: input.commands?.slice(0, 20) ?? [],
    importantFolders: input.importantFolders?.slice(0, 30) ?? [],
    conventions: input.conventions?.slice(0, 30) ?? [],
  } satisfies ProjectContextSummary;
}
