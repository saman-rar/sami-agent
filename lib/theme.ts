export const APP_THEMES = [
  'dark-plus',
  'one-dark',
  'light',
  'dark',
  'vs-code-dark',
  'vs-code-light',
  'claude-dark',
  'claude-light',
] as const;
export type AppTheme = (typeof APP_THEMES)[number];
export const DEFAULT_THEME: AppTheme = 'dark-plus';
export const THEME_STORAGE_KEY = 'sami-theme';

export function isAppTheme(
  value: string | null | undefined,
): value is AppTheme {
  return APP_THEMES.includes(value as AppTheme);
}

export const themeOptions: ReadonlyArray<{
  id: AppTheme;
  name: string;
  description: string;
}> = [
  { id: 'dark', name: 'Dark', description: 'default dark theme.' },
  {
    id: 'light',
    name: 'Light',
    description: 'Clean neutral theme for bright environments.',
  },
  { id: 'dark-plus', name: 'Dark+', description: 'developer soft dark theme.' },
  {
    id: 'one-dark',
    name: 'One Dark',
    description: 'Balanced charcoal theme inspired by modern editors.',
  },
  {
    id: 'vs-code-dark',
    name: 'VS Code Dark',
    description: 'VS Code dark theme for night manual coders.',
  },
  {
    id: 'vs-code-light',
    name: 'VS Code Light',
    description: 'VS Code light theme for day manual coders.',
  },
  {
    id: 'claude-dark',
    name: 'Claude Dark',
    description: 'Cluade dark theme for night vibe coders.',
  },
  {
    id: 'claude-light',
    name: 'Claude Light',
    description: 'Cluade light theme for night vibe coders.',
  },
];
