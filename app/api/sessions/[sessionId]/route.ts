import { z } from "zod";
import { updateSessionRecord } from "@/lib/sessions/store";
import { apiErrorResponse, assertSameOrigin, noStoreJson } from "@/lib/server/api";
import { requireCurrentUser } from "@/lib/server/current-user";

const patchSchema = z.object({
  title: z.string().max(200).optional(),
  archived: z.boolean().optional(),
  agentMode: z.enum(["plan", "ask", "build"]).optional(),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    assertSameOrigin(request);
    await requireCurrentUser();
    const { sessionId } = await params;
    const patch = patchSchema.parse(await request.json());
    return noStoreJson({ session: await updateSessionRecord(sessionId, patch) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
