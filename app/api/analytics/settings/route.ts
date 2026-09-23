import { z } from "zod";
import {
  readAnalyticsSettings,
  writeAnalyticsSettings,
} from "@/lib/analytics/settings";
import { apiErrorResponse, assertSameOrigin, noStoreJson } from "@/lib/server/api";
import { requireCurrentUser } from "@/lib/server/current-user";

const schema = z.object({
  tokenMode: z.enum(["full", "medium", "maximum"]),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireCurrentUser();
    return noStoreJson(await readAnalyticsSettings());
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    await requireCurrentUser();
    const input = schema.parse(await request.json());
    return noStoreJson(await writeAnalyticsSettings(input));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
