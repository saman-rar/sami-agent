"use client";

import { CheckIcon, Loader2Icon, LockKeyholeIcon, ShieldQuestionIcon, ZapIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { AgentPermissionMode, AgentPermissionSettings } from "@/lib/permissions/types";
import { cn } from "@/lib/utils";

const modes = [
  {
    id: "no-access",
    title: "No Access",
    description:
      "Protected mutations are denied. The agent can still inspect, search, reason, and read project files.",
    icon: LockKeyholeIcon,
  },
  {
    id: "ask-before",
    title: "Ask Before",
    description:
      "Protected actions pause the durable Eve workflow until you approve or reject the actual tool call.",
    icon: ShieldQuestionIcon,
  },
  {
    id: "full-access",
    title: "Full Access",
    description:
      "Protected project operations may run without per-action confirmation, but remain confined to the project sandbox and platform security boundaries.",
    icon: ZapIcon,
  },
] satisfies Array<{
  id: AgentPermissionMode;
  title: string;
  description: string;
  icon: typeof LockKeyholeIcon;
}>;

export function AgentPermissionsSettings() {
  const [settings, setSettings] = useState<AgentPermissionSettings>();
  const [selected, setSelected] = useState<AgentPermissionMode>("ask-before");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch("/api/permissions", { cache: "no-store" });
      const payload = (await response.json()) as AgentPermissionSettings & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load agent permissions.");
      setSettings(payload);
      setSelected(payload.mode);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load agent permissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(undefined);
    try {
      const response = await fetch("/api/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: selected }),
      });
      const payload = (await response.json()) as AgentPermissionSettings & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to update agent permissions.");
      setSettings(payload);
      setSelected(payload.mode);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update agent permissions.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-y">
      <div className="flex items-center justify-between gap-4 py-4">
        <div>
          <h2 className="font-medium">Global permission mode</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Applies to shell execution, file writes, deletions, dependency installs, and other
            protected tools as they are added.
          </p>
        </div>
        <Badge variant="outline">Server enforced</Badge>
      </div>
      <Separator />

      <div className="grid gap-2 py-5">
        {modes.map(({ id, title, description, icon: Icon }) => {
          const active = selected === id;
          return (
            <button
              aria-pressed={active}
              className={cn(
                "flex w-full items-start gap-3 rounded-md border p-4 text-left transition-colors",
                active ? "border-foreground/30 bg-accent" : "hover:bg-accent/50",
              )}
              disabled={loading || saving}
              key={id}
              onClick={() => {
                setSelected(id);
                setSaved(false);
              }}
              type="button"
            >
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-medium">
                  {title}
                  {active ? <CheckIcon className="size-4" /> : null}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
              </span>
            </button>
          );
        })}
      </div>

      {error ? <p className="pb-4 text-sm text-destructive">{error}</p> : null}
      <Separator />
      <div className="flex items-center justify-between gap-3 py-4">
        <p className="text-xs text-muted-foreground">
          {settings?.updatedAt
            ? `Last updated ${new Date(settings.updatedAt).toLocaleString()}`
            : "Ask Before is the default for new users."}
        </p>
        <div className="flex items-center gap-3">
          {saved ? <span className="text-sm text-muted-foreground">Saved</span> : null}
          <Button disabled={loading || saving || selected === settings?.mode} onClick={() => void save()}>
            {saving ? <Loader2Icon className="animate-spin" /> : null}
            Save permissions
          </Button>
        </div>
      </div>
    </div>
  );
}
