import { z } from "zod";
import { createGitHubProject, listProjects } from "@/lib/projects/service";
import { apiErrorResponse, assertSameOrigin, noStoreJson } from "@/lib/server/api";
import { requireCurrentUser } from "@/lib/server/current-user";

const createProjectSchema = z.object({
  owner: z.string().min(1).max(100),
  repo: z.string().min(1).max(100),
  branch: z.string().min(1).max(255),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    return noStoreJson({ projects: await listProjects(user.id) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireCurrentUser();
    const input = createProjectSchema.parse(await request.json());
    const project = await createGitHubProject(user.id, input);
    return noStoreJson({ project }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
