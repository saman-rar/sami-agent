import { z } from "zod";
import { AGENT_PERMISSION_MODES } from "@/lib/permissions/types";
import {
  readAgentPermissionSettings,
  writeAgentPermissionMode,
} from "@/lib/permissions/store";
import { apiErrorResponse, assertSameOrigin, noStoreJson } from "@/lib/server/api";
import { requireCurrentUser } from "@/lib/server/current-user";

const updateSchema = z.object({ mode: z.enum(AGENT_PERMISSION_MODES) });

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const settings = await readAgentPermissionSettings(user.id);
    return noStoreJson(settings);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireCurrentUser();
    const input = updateSchema.parse(await request.json());
    const settings = await writeAgentPermissionMode(user.id, input.mode);
    return noStoreJson(settings);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
