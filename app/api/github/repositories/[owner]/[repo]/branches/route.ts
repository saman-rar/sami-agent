import { listGitHubBranches } from "@/lib/github/client";
import { requireGitHubToken } from "@/lib/github/connect";
import { apiErrorResponse, noStoreJson } from "@/lib/server/api";
import { requireCurrentUser } from "@/lib/server/current-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const token = await requireGitHubToken(user.id);
    const { owner, repo } = await params;
    const branches = await listGitHubBranches(token, owner, repo);
    return noStoreJson({ branches });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
