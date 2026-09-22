import { AgentPermissionsSettings } from "./permissions-settings";

export default function AgentPermissionsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <p className="text-sm text-muted-foreground">Settings</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Agent Permissions</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Control whether protected project mutations are denied, paused for approval, or allowed
          automatically. These rules are enforced by the agent runtime, not only by the UI.
        </p>
      </header>
      <AgentPermissionsSettings />
    </div>
  );
}
