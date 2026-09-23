import { getProviderModels } from "@/lib/providers/service";
import { apiErrorResponse, noStoreJson } from "@/lib/server/api";
import { requireCurrentUser } from "@/lib/server/current-user";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ providerId: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { providerId } = await params;
    const refresh = new URL(request.url).searchParams.get("refresh") === "1";
    return noStoreJson(await getProviderModels(user.id, providerId, { refresh }));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
