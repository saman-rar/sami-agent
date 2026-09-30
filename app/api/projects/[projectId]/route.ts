import { z } from 'zod';
import { deleteProject, renameProject } from '@/lib/projects/store';
import { apiErrorResponse, assertSameOrigin, noStoreJson } from '@/lib/server/api';
import { requireCurrentUser } from '@/lib/server/current-user';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function DELETE(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try { assertSameOrigin(request); await requireCurrentUser(); await deleteProject((await params).projectId); return noStoreJson({ deleted: true }); }
  catch (error) { return apiErrorResponse(error); }
}
export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    assertSameOrigin(request); await requireCurrentUser();
    const { name } = z.object({ name: z.string().trim().min(1).max(200) }).parse(await request.json());
    return noStoreJson({ project: await renameProject((await params).projectId, name) });
  } catch (error) { return apiErrorResponse(error); }
}
