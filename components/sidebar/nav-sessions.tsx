'use client';

import { Folder, MoreHorizontal, PlusIcon, Trash2 } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import Link from 'next/link';
import { SessionRecord } from '@/lib/sessions/types';
import { useEffect, useState } from 'react';
import { DeleteDialog, type DeleteTarget } from '@/components/persistence/delete-dialog';

export function NavSessions({
  sessions: initialSessions,
}: {
  sessions: SessionRecord[];
}) {
  const [sessions, setSessions] = useState(initialSessions);
  const { isMobile } = useSidebar();

  const [target, setTarget] = useState<DeleteTarget | null>(null);
  useEffect(() => setSessions(initialSessions), [initialSessions]);

  return (
    <SidebarGroup className='group-data-[collapsible=icon]:hidden'>
      <SidebarGroupLabel>Sessions</SidebarGroupLabel>
      <SidebarMenu>
        {sessions.map((item) => {
          const href = item.projectId
            ? `/projects/${encodeURIComponent(item.projectId)}?session=${encodeURIComponent(item.id)}`
            : `/s/${encodeURIComponent(item.id)}`;
          return (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton asChild>
                <Link href={href}>
                  <span>{item.title}</span>
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
                  <DropdownMenuItem asChild><Link href={href}><Folder /><span>View Session</span></Link></DropdownMenuItem>

                  <DropdownMenuItem onClick={() => setTarget({ kind: 'session', id: item.id, name: item.title })}>
                    <Trash2 className='text-muted-foreground' />
                    <span>Delete Session</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          );
        })}
        <SidebarMenuItem>
          <SidebarMenuButton className='text-sidebar-foreground/70'>
            <Link href={'/s'} className='flex gap-1 text-xs items-center'>
              <PlusIcon className='text-sidebar-foreground/70 size-3.5' />
              <span>new</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <DeleteDialog target={target} onClose={() => setTarget(null)} onDeleted={id => setSessions(items => items.filter(item => item.id !== id))} />
    </SidebarGroup>
  );
}
