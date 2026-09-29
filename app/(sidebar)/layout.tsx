import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DEFAULT_THEME, THEME_STORAGE_KEY } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/sidebar/app-sidebar';
import { auth } from '@/lib/auth';
import { isConfiguredOwner } from '@/lib/persistence/single-owner';
import { headers } from 'next/headers';
import { SignIn } from '@/components/chat/web-chat-auth';
import {
  listSavedSessions,
  restoreWorkspaceState,
} from '@/lib/sessions/service';
import { redirect } from 'next/navigation';
import { listProjects } from '@/lib/projects/service';
import '../globals.css';

const sans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: 'variable',
  display: 'swap',
});

const mono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: 'variable',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sami',
  description:
    'A browser-based AI coding agent for isolated GitHub project workspaces.',
};

const themeScript = `(() => {
  try {
    const stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    const allowed = ["dark-plus", "one-dark", "light", "dark", "vs-code-dark", "vs-code-light", "claude-dark", "claude-light"];
    const theme = allowed.includes(stored) ? stored : ${JSON.stringify(DEFAULT_THEME)};
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme !== "light");
  } catch {
    document.documentElement.dataset.theme = ${JSON.stringify(DEFAULT_THEME)};
    document.documentElement.classList.add("dark");
  }
})();`;

// The page and Eve routes validate the generated app's Better Auth session.
export default async function RootLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  let userId = 'local-dev';
  let user = {
    name: 'Developer',
    email: 'test@test.dev',
    avatar: '',
  };

  if (process.env.NODE_ENV !== 'development') {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !isConfiguredOwner(session.user.email)) return <SignIn />;
    userId = session.user.id;
    user = {
      name: session.user.name,
      email: session.user.email,
      avatar: session.user.image ?? '',
    };
  }

  // const workspace = await restoreWorkspaceState(userId);
  // if (workspace.lastPath) redirect(workspace.lastPath);
  return (
    <html
      className={cn(sans.variable, mono.variable)}
      lang='en'
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <TooltipProvider>
            <SidebarProvider defaultOpen={true}>
              <AppSidebar
                user={user}
                projects={await listProjects(userId)}
                sessions={await listSavedSessions(userId)}
              />
              <SidebarInset>{children}</SidebarInset>
            </SidebarProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
