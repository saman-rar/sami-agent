import { getGitHubConnection } from "@/lib/github/connect";
import { apiErrorResponse, noStoreJson } from "@/lib/server/api";
import { requireCurrentUser } from "@/lib/server/current-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const connection = await getGitHubConnection(user.id);
    return noStoreJson(connection);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
