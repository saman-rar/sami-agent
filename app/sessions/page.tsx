import { headers } from "next/headers";
import { SignIn } from "@/app/_components/web-chat-auth";
import { auth } from "@/lib/auth";
import { isConfiguredOwner } from "@/lib/persistence/single-owner";
import { listSavedSessions } from "@/lib/sessions/service";
import { SessionDashboard } from "./session-dashboard";

export default async function SessionsPage() {
  let userId = "local-dev";
  if (process.env.NODE_ENV !== "development") {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !isConfiguredOwner(session.user.email)) return <SignIn />;
    userId = session.user.id;
  }

  return <SessionDashboard initialSessions={await listSavedSessions(userId)} />;
}
