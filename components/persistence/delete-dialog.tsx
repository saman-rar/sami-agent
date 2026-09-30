'use client';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
export type DeleteTarget = { kind: 'project' | 'session'; id: string; name: string };
export function DeleteDialog({ target, onClose, onDeleted }: { target: DeleteTarget | null; onClose: () => void; onDeleted: (id: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const router = useRouter();
  const pathname = usePathname();
  async function remove() {
    if (!target || busy) return;
    setBusy(true); setError(undefined);
    try {
      const response = await fetch(`/api/${target.kind}s/${encodeURIComponent(target.id)}`, { method: 'DELETE' });
      if (!response.ok) { const body: { error?: string } = await response.json(); throw new Error(body.error ?? `Unable to delete ${target.kind}.`); }
      onDeleted(target.id);
      window.dispatchEvent(new Event('sami:metadata-changed'));
      const encoded = encodeURIComponent(target.id);
      const active = target.kind === 'project' ? pathname === `/projects/${encoded}`
        : pathname === `/s/${encoded}` || new URLSearchParams(window.location.search).get('session') === target.id || document.documentElement.dataset.samiSessionId === target.id;
      onClose();
      if (active) router.replace(target.kind === 'project' ? '/projects' : '/sessions');
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to delete. Please retry.'); }
    finally { setBusy(false); }
  }
  return <Dialog open={Boolean(target)} onOpenChange={open => { if (!open && !busy) { setError(undefined); onClose(); } }}>
    <DialogContent showCloseButton={!busy}>
      <DialogHeader><DialogTitle>Delete {target?.kind}?</DialogTitle>
        <DialogDescription>{target?.kind === 'project'
          ? `Permanently delete “${target.name}” and its Sami sessions, plans, and metadata? GitHub repositories and Vercel projects will remain.`
          : `Permanently remove “${target?.name}” from Sami? Eve's retained conversation is not erased by this action.`}</DialogDescription>
      </DialogHeader>
      {error ? <p role='alert' className='text-sm text-destructive'>{error}</p> : null}
      <DialogFooter><Button variant='outline' disabled={busy} onClick={() => { setError(undefined); onClose(); }}>Cancel</Button>
        <Button variant='destructive' disabled={busy} onClick={() => void remove()}>{busy ? <Spinner /> : null}Delete</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
