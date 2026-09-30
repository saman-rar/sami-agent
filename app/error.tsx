'use client';
import { Button } from '@/components/ui/button';
export default function WorkspaceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className='flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-foreground'>
    <h1 className='text-lg font-semibold'>Unable to load this page</h1>
    <p className='max-w-lg text-center text-sm text-muted-foreground'>Please retry. If this continues after deployment, check the PostgreSQL connection, database migrations, and server environment configuration.</p>
    <Button onClick={reset}>Retry</Button>
  </main>;
}
