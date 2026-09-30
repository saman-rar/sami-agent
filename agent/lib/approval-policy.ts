import type { ApprovalContext, ApprovalStatus } from 'eve/tools/approval';
import { normalizeAgentMode } from '@/lib/agent-mode';
import { readAgentPermissionSettings } from '@/lib/permissions/store';

function permissionUserId(ctx: ApprovalContext): string | undefined {
  const current = ctx.session.auth.current;
  if (current?.principalType === 'user') return current.principalId;

  const initiator = ctx.session.auth.initiator;
  if (initiator?.principalType === 'user') return initiator.principalId;

  if (process.env.NODE_ENV === 'development') return 'local-dev';
  return undefined;
}

function requestedAgentMode(ctx: ApprovalContext) {
  const current = ctx.session.auth.current?.attributes?.agentMode;
  if (typeof current === 'string') return normalizeAgentMode(current);

  const initiator = ctx.session.auth.initiator?.attributes?.agentMode;
  return normalizeAgentMode(initiator);
}

function isReadOnlyCommand(command: string) {
  const normalized = command.trim().replace(/\s+/g, ' ');

  if (/[;&|><`$(){}[\]\\]/.test(normalized)) {
    return false;
  }

  return (
    normalized === 'ls' ||
    normalized.startsWith('ls ') ||
    normalized === 'pwd' ||
    normalized.startsWith('find ') ||
    normalized === 'git status' ||
    normalized.startsWith('git status ') ||
    normalized === 'git diff' ||
    normalized.startsWith('git diff ') ||
    normalized === 'git log' ||
    normalized.startsWith('git log ')
  );
}

/**
 * Approval policy for project mutations.
 *
 * Safe/read-only tools intentionally do not use this callback. Protected tools
 * use it at runtime so UI state can never bypass the user's permission mode.
 */
export async function requireProjectMutationApproval(
  ctx: ApprovalContext,
): Promise<ApprovalStatus> {
  const command = String(
    (ctx.toolInput as { command?: unknown } | undefined)?.command ?? '',
  );

  const mode = requestedAgentMode(ctx);
  if (mode === 'plan' || mode === 'ask') {
    if (isReadOnlyCommand(command)) {
      return { type: 'approved' };
    }

    return {
      type: 'denied',
      reason:
        mode === 'plan'
          ? 'Plan mode may inspect the project and manage the internal todo plan, but project mutations require Build mode.'
          : 'Ask mode is read-only. Switch to Build mode to modify files or run protected actions.',
    };
  }

  const userId = permissionUserId(ctx);
  if (!userId) {
    return {
      type: 'denied',
      reason: 'A signed-in user is required for protected actions.',
    };
  }

  const { mode: permissionMode } = await readAgentPermissionSettings(userId);
  switch (permissionMode) {
    case 'no-access':
      return {
        type: 'denied',
        reason: 'Agent Permissions is set to No Access for protected actions.',
      };
    case 'ask-before':
      return 'user-approval';
    case 'full-access':
      return { type: 'approved' };
  }
}
