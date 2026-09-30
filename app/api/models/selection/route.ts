import { modelSelectionSchema } from "@/lib/providers/schemas";
import { setModelSelection } from "@/lib/providers/service";
import { apiErrorResponse, assertSameOrigin, noStoreJson } from "@/lib/server/api";
import { requireCurrentUser } from "@/lib/server/current-user";

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireCurrentUser();
    const body = await request.json();
    const selection = body === null ? undefined : modelSelectionSchema.parse(body);
    return noStoreJson({ selection: await setModelSelection(user.id, selection) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
