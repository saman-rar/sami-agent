import { listGitHubRepositories } from "@/lib/github/client";
import { requireGitHubToken } from "@/lib/github/connect";
import { apiErrorResponse, noStoreJson } from "@/lib/server/api";
import { requireCurrentUser } from "@/lib/server/current-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser();
    const token = await requireGitHubToken(user.id);
    const query = new URL(request.url).searchParams.get("q") ?? "";
    const repositories = await listGitHubRepositories(token, query);
    return noStoreJson({ repositories });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
