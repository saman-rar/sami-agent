'use client';

import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  LogOutIcon,
  Sparkles,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  const { isMobile } = useSidebar();

  async function signOut() {
    setPending(true);
    try {
      await authClient.signOut({
        fetchOptions: {
          onError: () => setPending(false),
          onSuccess: () => window.location.assign('/'),
        },
      });
    } catch {
      setPending(false);
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              <Avatar className='h-8 w-8 rounded-lg'>
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className='rounded-lg'>CN</AvatarFallback>
              </Avatar>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-medium'>{user.name}</span>
                <span className='truncate text-xs'>{user.email}</span>
              </div>
              <ChevronsUpDown className='ml-auto size-4' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='start' className='w-64'>
            <div className='min-w-0 px-2 py-1.5 text-sm'>
              <span
                className='block truncate font-medium leading-5'
                title={user.name}
              >
                {user.name}
              </span>
              <span
                className='block truncate text-muted-foreground leading-5'
                title={user.email}
              >
                {user.email}
              </span>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className='cursor-pointer justify-between'
              disabled={pending}
              onSelect={signOut}
            >
              {pending ? 'Logging out…' : 'Log out'}
              <LogOutIcon aria-hidden='true' />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
