'use client';

import { type LucideIcon } from 'lucide-react';

import { SidebarGroup, SidebarMenu } from '@/components/ui/sidebar';
import NavButtons from './nav-buttons';

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}) {
  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => (
          <NavButtons item={item} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
