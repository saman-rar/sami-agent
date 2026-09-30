import { connectGitHubWithPat } from "@/lib/github/connect";
import { apiErrorResponse, assertSameOrigin, noStoreJson } from "@/lib/server/api";
import { requireCurrentUser } from "@/lib/server/current-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireCurrentUser();
    const body = (await request.json()) as { token?: unknown };
    if (typeof body.token !== "string") throw new Error("A GitHub personal access token is required.");
    const account = await connectGitHubWithPat(user.id, body.token);
    return noStoreJson({ ok: true, login: account.login, avatarUrl: account.avatarUrl });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
