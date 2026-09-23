import { apiErrorResponse, noStoreJson } from "@/lib/server/api";
import { getTodos, saveTodos } from "@/lib/todo/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return noStoreJson({ todos: await getTodos() });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    await saveTodos(body.todos ?? []);
    return noStoreJson({ ok: true, todos: await getTodos() });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
