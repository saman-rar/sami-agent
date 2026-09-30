'use client';

import {
  Folder,
  Forward,
  MoreHorizontal,
  PlusIcon,
  Trash2,
  type LucideIcon,
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { ProjectRecord } from '@/lib/projects/types';
import Link from 'next/link';
import { Button } from '../ui/button';

export function NavProjects({ projects }: { projects: ProjectRecord[] }) {
  const { isMobile } = useSidebar();

  return (
    <SidebarGroup className='group-data-[collapsible=icon]:hidden'>
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarMenu>
        {projects.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild>
              <Link href={`/projects/${item.sessionId}`}>
                <span>{item.name}</span>
              </Link>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction showOnHover>
                  <MoreHorizontal />
                  <span className='sr-only'>More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className='w-48 rounded-lg'
                side={isMobile ? 'bottom' : 'right'}
                align={isMobile ? 'end' : 'start'}
              >
                <Link href={`/projects/${item.sessionId}`}>
                  <DropdownMenuItem asChild>
                    <Folder className='text-muted-foreground' />
                    <span>View Project</span>
                  </DropdownMenuItem>
                </Link>

                <DropdownMenuItem>
                  <Trash2 className='text-muted-foreground' />
                  <span>Delete Project</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
        <SidebarMenuItem>
          <SidebarMenuButton className='text-sidebar-foreground/70'>
            <Link
              href={'/projects'}
              className='flex gap-1 text-xs items-center'
            >
              <PlusIcon className='text-sidebar-foreground/70 size-3.5' />
              <span>new</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
