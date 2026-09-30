import { removeProviderConnection, updateProviderConnection } from "@/lib/providers/service";
import { updateProviderConnectionSchema } from "@/lib/providers/schemas";
import { apiErrorResponse, assertSameOrigin, noStoreJson } from "@/lib/server/api";
import { requireCurrentUser } from "@/lib/server/current-user";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ providerId: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireCurrentUser();
    const { providerId } = await params;
    const patch = updateProviderConnectionSchema.parse(await request.json());
    return noStoreJson(await updateProviderConnection(user.id, providerId, patch));
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ providerId: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireCurrentUser();
    const { providerId } = await params;
    await removeProviderConnection(user.id, providerId);
    return new Response(null, { status: 204, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
