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
import { useEffect, useState } from 'react';
import { DeleteDialog, type DeleteTarget } from '@/components/persistence/delete-dialog';

export function NavProjects({ projects: initialProjects }: { projects: ProjectRecord[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [target, setTarget] = useState<DeleteTarget | null>(null);
  useEffect(() => setProjects(initialProjects), [initialProjects]);
  const { isMobile } = useSidebar();

  return (
    <SidebarGroup className='group-data-[collapsible=icon]:hidden'>
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarMenu>
        {projects.map((item) => (
          <SidebarMenuItem key={item.id}>
            <SidebarMenuButton asChild>
              <Link href={`/projects/${encodeURIComponent(item.id)}`}>
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
                <DropdownMenuItem asChild><Link href={`/projects/${encodeURIComponent(item.id)}`}><Folder /><span>View Project</span></Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href={`/projects/${encodeURIComponent(item.id)}?new=1`}><PlusIcon /><span>Add Session</span></Link></DropdownMenuItem>

                <DropdownMenuItem onClick={() => setTarget({ kind: 'project', id: item.id, name: item.name })}>
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
      <DeleteDialog target={target} onClose={() => setTarget(null)} onDeleted={id => setProjects(items => items.filter(item => item.id !== id))} />
    </SidebarGroup>
  );
}
