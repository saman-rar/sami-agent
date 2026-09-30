'use client';

import * as React from 'react';
import {
  AudioWaveform,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  KeyIcon,
  Map,
  PieChart,
  Settings2,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { ProjectRecord } from '@/lib/projects/types';
import { SessionRecord } from '@/lib/sessions/types';
import { SidebarLogo } from './logo';
import { NavMain } from './nav-main';
import { NavProjects } from './nav-projects';
import { NavSessions } from './nav-sessions';
import { NavUser } from './nav-user';
import { NavActions } from './nav-actions';

// This is sample data.
const data = {
  user: {
    name: 'shadcn',
    email: 'm@example.com',
    avatar: '/avatars/shadcn.jpg',
  },
  navMain: [
    {
      title: 'Providers',
      url: '/settings/providers',
      icon: KeyIcon,
      isActive: true,
    },
    {
      title: 'Models',
      url: '/settings/models',
      icon: Bot,
    },
    {
      title: 'Settings',
      url: '#',
      icon: Settings2,
      items: [
        {
          title: 'Agent Configuration',
          url: '/settings/agent-configuration',
        },
        {
          title: 'General',
          url: 'settings',
        },
        {
          title: 'Permissions',
          url: 'settings/agent-permissions',
        },
        {
          title: 'Github',
          url: 'setings/github',
        },
      ],
    },
  ],
  projects: [
    {
      name: 'Design Engineering',
      url: '#',
      icon: Frame,
    },
    {
      name: 'Sales & Marketing',
      url: '#',
      icon: PieChart,
    },
    {
      name: 'Travel',
      url: '#',
      icon: Map,
    },
  ],
};

interface AppSideBarProps {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
  projects: ProjectRecord[];
  sessions: SessionRecord[];
}

export function AppSidebar({
  user,
  projects: initialProjects,
  sessions: initialSessions,
  ...props
}: React.ComponentProps<typeof Sidebar> & AppSideBarProps) {
  const [projects, setProjects] = React.useState(initialProjects);
  const [sessions, setSessions] = React.useState(initialSessions);
  const [loadError, setLoadError] = React.useState<string>();
  React.useEffect(() => setProjects(initialProjects), [initialProjects]);
  React.useEffect(() => setSessions(initialSessions), [initialSessions]);
  React.useEffect(() => {
    let controller: AbortController | undefined;
    const refresh = () => {
      controller?.abort(); controller = new AbortController(); const signal = controller.signal;
      void Promise.all([fetch('/api/projects', { signal, cache: 'no-store' }), fetch('/api/sessions', { signal, cache: 'no-store' })])
        .then(async ([p, s]) => {
          if (!p.ok || !s.ok) throw new Error('Unable to refresh sidebar. Focus this window to retry.');
          const projectData: { projects: ProjectRecord[] } = await p.json();
          const sessionData: { sessions: SessionRecord[] } = await s.json();
          if (!signal.aborted) { setProjects(projectData.projects); setSessions(sessionData.sessions); setLoadError(undefined); }
        }).catch((error: unknown) => { if (!signal.aborted) setLoadError(error instanceof Error ? error.message : 'Unable to refresh sidebar.'); });
    };
    window.addEventListener('sami:metadata-changed', refresh); window.addEventListener('focus', refresh);
    return () => { controller?.abort(); window.removeEventListener('sami:metadata-changed', refresh); window.removeEventListener('focus', refresh); };
  }, []);
  return (
    <Sidebar collapsible='icon' {...props}>
      <SidebarHeader>
        <SidebarLogo />
      </SidebarHeader>
      <SidebarContent>
        <NavActions />
        {loadError ? <p role='alert' className='px-3 text-xs text-destructive'>{loadError}</p> : null}
        <NavMain items={data.navMain} />
        <NavProjects projects={projects} />
        <NavSessions sessions={sessions} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
