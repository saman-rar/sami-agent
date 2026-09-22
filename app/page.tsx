import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthenticatedAgentChat } from "./_components/authenticated-agent-chat";
import { SignIn } from "./_components/web-chat-auth";
import { auth } from "@/lib/auth";
import { isConfiguredOwner } from "@/lib/persistence/single-owner";
import { restoreWorkspaceState } from "@/lib/sessions/service";

export default async function Page() {
  let userId = "local-dev";
  if (process.env.NODE_ENV !== "development") {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !isConfiguredOwner(session.user.email)) return <SignIn />;
    userId = session.user.id;
  }

  const workspace = await restoreWorkspaceState(userId);
  if (workspace.lastPath) redirect(workspace.lastPath);
  return <AuthenticatedAgentChat />;
}
