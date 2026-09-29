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
  teams: [
    {
      name: 'Acme Inc',
      logo: GalleryVerticalEnd,
      plan: 'Enterprise',
    },
    {
      name: 'Acme Corp.',
      logo: AudioWaveform,
      plan: 'Startup',
    },
    {
      name: 'Evil Corp.',
      logo: Command,
      plan: 'Free',
    },
  ],
  navMain: [
    {
      title: 'Providers',
      url: 'settings/providers',
      icon: KeyIcon,
      isActive: true,
    },
    {
      title: 'Models',
      url: 'settings/models',
      icon: Bot,
    },
    {
      title: 'Settings',
      url: '#',
      icon: Settings2,
      items: [
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
  projects,
  sessions,
  ...props
}: React.ComponentProps<typeof Sidebar> & AppSideBarProps) {
  return (
    <Sidebar collapsible='icon' {...props}>
      <SidebarHeader>
        <SidebarLogo />
      </SidebarHeader>
      <SidebarContent>
        <NavActions />
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
