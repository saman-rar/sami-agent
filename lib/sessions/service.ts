import { listSessions, readWorkspaceState } from './store';
export async function listSavedSessions(_userId: string) { return listSessions(); }
export async function restoreWorkspaceState(_userId: string) { return readWorkspaceState(); }
