'use client';

import {
  CheckIcon,
  Code2Icon,
  MoonIcon,
  SunIcon,
  MoonStarIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';
import { themeOptions, type AppTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import VSCodeBranchIcon from '@/components/icons/vscode-brand-icon';
import ClaudeBrandIcon from '@/components/icons/claude-brand-icon';

const icons: Record<AppTheme, typeof MoonIcon | typeof VSCodeBranchIcon> = {
  'dark-plus': MoonStarIcon,
  'one-dark': Code2Icon,
  light: SunIcon,
  dark: MoonIcon,
  'vs-code-dark': VSCodeBranchIcon,
  'vs-code-light': VSCodeBranchIcon,
  'claude-dark': ClaudeBrandIcon,
  'claude-light': ClaudeBrandIcon,
};

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className='mx-auto w-full max-w-3xl'>
      <div className='mb-8'>
        <h1 className='text-xl font-semibold tracking-tight'>Appearance</h1>
        <p className='mt-1 max-w-2xl text-sm leading-6 text-muted-foreground'>
          Choose the developer theme used across the workspace, settings, menus,
          and dialogs.
        </p>
      </div>

      <div className='grid gap-3 sm:grid-cols-3'>
        {themeOptions.map((option) => {
          const Icon = icons[option.id];
          const active = theme === option.id;
          return (
            <Button
              className={cn(
                'h-auto min-h-32 items-start justify-start whitespace-normal border p-4 text-left',
                active && 'border-primary ring-1 ring-primary/30',
              )}
              key={option.id}
              onClick={() => setTheme(option.id)}
              type='button'
              variant='outline'
            >
              <span className='flex w-full flex-col gap-3'>
                <span className='flex w-full items-center justify-between'>
                  <Icon className='size-4' />
                  {active ? (
                    <CheckIcon className='size-4 text-primary' />
                  ) : null}
                </span>
                <span>
                  <span className='block font-medium text-foreground'>
                    {option.name}
                  </span>
                  <span className='mt-1 block text-xs leading-5 text-muted-foreground'>
                    {option.description}
                  </span>
                </span>
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
