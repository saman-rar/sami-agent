import { z } from "zod";
import { listSessions, upsertSessionRecord } from "@/lib/sessions/store";
import { apiErrorResponse, assertSameOrigin, noStoreJson } from "@/lib/server/api";
import { requireCurrentUser } from "@/lib/server/current-user";

const createSchema = z.object({
  sessionId: z.string().min(1).max(200),
  projectId: z.string().min(1).max(100).optional(),
  projectName: z.string().min(1).max(200).optional(),
  title: z.string().max(200).optional(),
  agentMode: z.enum(["plan", "ask", "build"]).optional(),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireCurrentUser();
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId") || undefined;
    const { limit, offset } = z.object({ limit: z.coerce.number().int().min(1).max(200).default(100), offset: z.coerce.number().int().min(0).default(0) }).parse({ limit: url.searchParams.get('limit') ?? undefined, offset: url.searchParams.get('offset') ?? undefined });
    return noStoreJson({ sessions: await listSessions({ projectId, limit, offset }) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireCurrentUser();
    const input = createSchema.parse(await request.json());
    const session = await upsertSessionRecord(input);
    return noStoreJson({ session }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
