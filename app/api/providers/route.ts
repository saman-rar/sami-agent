import { createProviderConnection, listProviders } from "@/lib/providers/service";
import { createProviderConnectionSchema } from "@/lib/providers/schemas";
import { apiErrorResponse, assertSameOrigin, noStoreJson } from "@/lib/server/api";
import { requireCurrentUser } from "@/lib/server/current-user";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    return noStoreJson({ providers: await listProviders(user.id) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireCurrentUser();
    const input = createProviderConnectionSchema.parse(await request.json());
    const result = await createProviderConnection(user.id, input);
    return noStoreJson(result, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
