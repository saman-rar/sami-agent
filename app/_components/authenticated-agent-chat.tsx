import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { isConfiguredOwner } from "@/lib/persistence/single-owner";
import { AgentChat } from "./agent-chat";
import type { AgentMode } from "@/lib/agent-mode";
import type { ProjectRecord } from "@/lib/projects/types";
import { AccountControl, SignIn } from "./web-chat-auth";

export async function AuthenticatedAgentChat({
  sessionId,
  sessionless,
  project,
  initialAgentMode,
}: {
  readonly sessionId?: string;
  readonly sessionless?: boolean;
  readonly project?: ProjectRecord;
  readonly initialAgentMode?: AgentMode;
}) {
  if (process.env.NODE_ENV === "development") {
    return <AgentChat initialAgentMode={initialAgentMode} project={project} sessionId={sessionId} sessionless={sessionless} />;
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !isConfiguredOwner(session.user.email)) return <SignIn />;

  return (
    <>
      <AgentChat initialAgentMode={initialAgentMode} project={project} sessionId={sessionId} sessionless={sessionless} />
      <AccountControl
        email={session.user.email}
        image={session.user.image}
        name={session.user.name}
      />
    </>
  );
}
