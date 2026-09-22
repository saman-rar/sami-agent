import { testProviderConnection } from "@/lib/providers/service";
import { apiErrorResponse, assertSameOrigin, noStoreJson } from "@/lib/server/api";
import { requireCurrentUser } from "@/lib/server/current-user";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ providerId: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireCurrentUser();
    const { providerId } = await params;
    return noStoreJson(await testProviderConnection(user.id, providerId));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
