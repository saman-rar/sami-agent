import { listAvailableModels } from "@/lib/providers/service";
import { apiErrorResponse, noStoreJson } from "@/lib/server/api";
import { requireCurrentUser } from "@/lib/server/current-user";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    return noStoreJson(await listAvailableModels(user.id));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
