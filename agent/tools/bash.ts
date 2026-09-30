import { defineTool } from "eve/tools";
import { bash } from "eve/tools/bash";
import { requireProjectMutationApproval } from "../lib/approval-policy";

export default defineTool({
  ...bash,
  description:
    "Run a shell command inside the active isolated project sandbox. Use this for builds, tests, package management, scripts, and Git commands. Never assume this runs on the application host. Inspect the project first and avoid destructive commands unless the task clearly requires them.",
  approval: requireProjectMutationApproval,
});
