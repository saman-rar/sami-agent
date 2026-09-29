import { ArrowLeftIcon } from 'lucide-react';
import { headers } from 'next/headers';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SignIn } from '@/components/chat/web-chat-auth';
import { auth } from '@/lib/auth';
import { isConfiguredOwner } from '@/lib/persistence/single-owner';
import { SettingsNav } from './_components/settings-nav';

export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (process.env.NODE_ENV !== 'development') {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !isConfiguredOwner(session.user.email)) return <SignIn />;
  }

  return (
    <main className='min-h-dvh bg-background text-foreground'>
      <div className='mx-auto flex min-h-dvh w-full max-w-6xl'>
        <aside className='hidden w-56 shrink-0 border-r px-4 py-5 md:block'>
          <Link
            className='mb-6 flex h-8 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground'
            href='/'
          >
            <ArrowLeftIcon className='size-4' />
            Back to Home
          </Link>
          <div className='px-2 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground'>
            Settings
          </div>
          <SettingsNav />
        </aside>
        <section className='min-w-0 flex-1 px-4 py-6 sm:px-6 md:px-10 md:py-10'>
          {children}
        </section>
      </div>
    </main>
  );
}
