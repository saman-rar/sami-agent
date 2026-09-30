'use client';

import { FolderOpen, MessageCircle } from 'lucide-react';

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import Link from 'next/link';

export function NavActions() {
  return (
    <SidebarGroup>
      <SidebarMenu>
        <Link href={'/s'} className='cursor-pointer'>
          <SidebarMenuButton tooltip={'new chat'}>
            <MessageCircle />
            <span>New Chat</span>
          </SidebarMenuButton>
        </Link>
        <Link href={'/projects'} className='cursor-pointer'>
          <SidebarMenuButton tooltip={'new project'}>
            <FolderOpen />
            <span>New Project</span>
          </SidebarMenuButton>
        </Link>
      </SidebarMenu>
    </SidebarGroup>
  );
}
