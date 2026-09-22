import type { ToolContext } from "eve/tools";
import { githubNetworkPolicy } from "@/lib/github/broker";
import { requireGitHubToken } from "@/lib/github/connect";
import { getProjectForUser } from "@/lib/projects/service";

function userPrincipal(ctx: ToolContext) {
  const current = ctx.session.auth.current;
  if (current?.principalType === "user") return current;
  const initiator = ctx.session.auth.initiator;
  return initiator?.principalType === "user" ? initiator : undefined;
}

function projectIdFrom(ctx: ToolContext): string | undefined {
  const current = ctx.session.auth.current?.attributes?.projectId;
  if (typeof current === "string" && current) return current;
  const initiator = ctx.session.auth.initiator?.attributes?.projectId;
  return typeof initiator === "string" && initiator ? initiator : undefined;
}

/** Refresh GitHub credential brokering before a remote Git operation. */
export async function refreshGitHubCredentialBroker(ctx: ToolContext): Promise<void> {
  const principal = userPrincipal(ctx);
  const projectId = projectIdFrom(ctx);
  if (!principal || !projectId) return;

  const project = await getProjectForUser(principal.principalId, projectId);
  if (!project || project.source.type !== "github") return;

  const token = await requireGitHubToken(principal.principalId);
  const sandbox = await ctx.getSandbox();
  await sandbox.setNetworkPolicy(githubNetworkPolicy(token));
}
