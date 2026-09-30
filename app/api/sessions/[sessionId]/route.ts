import { z } from "zod";
import { updateSessionRecord, deleteSessionRecord } from "@/lib/sessions/store";
import { apiErrorResponse, assertSameOrigin, noStoreJson } from "@/lib/server/api";
import { requireCurrentUser } from "@/lib/server/current-user";

const patchSchema = z.object({
  title: z.string().max(200).optional(),
  agentMode: z.enum(["plan", "ask", "build"]).optional(),
}).strict();

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

export async function DELETE(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try { assertSameOrigin(request); await requireCurrentUser(); await deleteSessionRecord((await params).sessionId); return noStoreJson({ deleted: true }); }
  catch (error) { return apiErrorResponse(error); }
}
