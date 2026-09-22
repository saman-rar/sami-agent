import { z } from "zod";
import { setProjectSession } from "@/lib/projects/service";
import { apiErrorResponse, assertSameOrigin, noStoreJson } from "@/lib/server/api";
import { requireCurrentUser } from "@/lib/server/current-user";

const schema = z.object({ sessionId: z.string().min(1).max(200).nullable() });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireCurrentUser();
    const { projectId } = await params;
    const { sessionId } = schema.parse(await request.json());
    const project = await setProjectSession(user.id, projectId, sessionId ?? undefined);
    return noStoreJson({ project });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
