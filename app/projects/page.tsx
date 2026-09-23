import { headers } from "next/headers";
import { SignIn } from "@/app/_components/web-chat-auth";
import { auth } from "@/lib/auth";
import { isConfiguredOwner } from "@/lib/persistence/single-owner";
import { listProjects } from "@/lib/projects/service";
import { ProjectDashboard } from "./project-dashboard";

export default async function ProjectsPage() {
  let userId = "local-dev";
  if (process.env.NODE_ENV !== "development") {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !isConfiguredOwner(session.user.email)) return <SignIn />;
    userId = session.user.id;
  }

  return <ProjectDashboard initialProjects={await listProjects(userId)} />;
}
