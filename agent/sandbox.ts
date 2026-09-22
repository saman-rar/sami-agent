import { defineSandbox } from "eve/sandbox";
import { vercel } from "eve/sandbox/vercel";
import { githubNetworkPolicy } from "@/lib/github/broker";
import { requireGitHubToken } from "@/lib/github/connect";
import { getProjectForUser } from "@/lib/projects/service";
import { shellQuote } from "./lib/shell";

export default defineSandbox({
  backend: vercel(),
  async onSession({ use, ctx }) {
    const currentUser = ctx.session.auth.current;
    const initiatingUser = ctx.session.auth.initiator;
    const principal =
      currentUser?.principalType === "user"
        ? currentUser
        : initiatingUser?.principalType === "user"
          ? initiatingUser
          : undefined;
    const currentProjectId = ctx.session.auth.current?.attributes?.projectId;
    const initiatorProjectId = ctx.session.auth.initiator?.attributes?.projectId;
    const projectId =
      typeof currentProjectId === "string" && currentProjectId
        ? currentProjectId
        : typeof initiatorProjectId === "string" && initiatorProjectId
          ? initiatorProjectId
          : undefined;

    if (!principal || !projectId) {
      await use();
      return;
    }

    const project = await getProjectForUser(principal.principalId, projectId);
    if (!project) throw new Error("The active project is not available to this user.");

    const token = await requireGitHubToken(principal.principalId);
    const sandbox = await use({ networkPolicy: githubNetworkPolicy(token) });
    const remote = `https://github.com/${project.source.owner}/${project.source.name}.git`;
    const branch = project.source.branch;
    const gitName = principal.attributes?.name;
    const gitEmail = principal.attributes?.email;

    const result = await sandbox.run({
      command: [
        "set -eu",
        "cd /workspace",
        "if [ ! -d .git ]; then",
        "  tmpdir=$(mktemp -d)",
        `  GIT_TERMINAL_PROMPT=0 GIT_LFS_SKIP_SMUDGE=1 git clone --single-branch --branch ${shellQuote(branch)} ${shellQuote(remote)} \"$tmpdir/repo\"`,
        "  cp -a \"$tmpdir/repo/.\" /workspace/",
        "  rm -rf \"$tmpdir\"",
        "fi",
        `git remote set-url origin ${shellQuote(remote)}`,
        ...(typeof gitName === "string" && gitName
          ? [`git config user.name ${shellQuote(gitName)}`]
          : []),
        ...(typeof gitEmail === "string" && gitEmail
          ? [`git config user.email ${shellQuote(gitEmail)}`]
          : []),
      ].join("\n"),
    });

    if (result.exitCode !== 0) {
      throw new Error(`Unable to prepare GitHub project workspace: ${result.stderr || result.stdout}`);
    }
  },
});
