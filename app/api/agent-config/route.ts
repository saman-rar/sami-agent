import { z } from "zod";
import {
  readAgentConfigurationSettings,
  writeAgentConfigurationSettings,
} from "@/lib/agent-config/store";
import { CONTEXT_COMPRESSION_MODES } from "@/lib/agent-config/types";
import { apiErrorResponse, assertSameOrigin, noStoreJson } from "@/lib/server/api";
import { requireCurrentUser } from "@/lib/server/current-user";

const updateSchema = z.object({
  contextCompression: z.enum(CONTEXT_COMPRESSION_MODES),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireCurrentUser();
    return noStoreJson(await readAgentConfigurationSettings());
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    await requireCurrentUser();
    const input = updateSchema.parse(await request.json());
    return noStoreJson(
      await writeAgentConfigurationSettings(input.contextCompression),
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
