import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { isUserAllowed } from "@/lib/server-config";
import { AgentChat } from "./agent-chat";
import { AccountControl, AccessDenied, SignIn } from "./web-chat-auth";

export async function AuthenticatedAgentChat({
  sessionId,
  sessionless,
}: {
  readonly sessionId?: string;
  readonly sessionless?: boolean;
}) {
  if (process.env.NODE_ENV === "development") {
    return <AgentChat historyOwnerKey="dev" sessionId={sessionId} sessionless={sessionless} />;
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return <SignIn />;
  if (!isUserAllowed(session.user.email)) return <AccessDenied email={session.user.email} />;

  return (
    <>
      <AgentChat historyOwnerKey={session.user.id} sessionId={sessionId} sessionless={sessionless} />
      <AccountControl
        email={session.user.email}
        image={session.user.image}
        name={session.user.name}
      />
    </>
  );
}
