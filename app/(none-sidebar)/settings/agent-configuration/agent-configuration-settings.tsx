"use client";

import { CheckIcon, GaugeIcon, Loader2Icon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CONTEXT_COMPRESSION_DESCRIPTIONS,
  CONTEXT_COMPRESSION_MODES,
  DEFAULT_CONTEXT_COMPRESSION,
  type AgentConfigurationSettings as AgentConfigurationSettingsState,
  type ContextCompressionMode,
} from "@/lib/agent-config/types";
import { cn } from "@/lib/utils";

const modeIcons: Record<ContextCompressionMode, typeof GaugeIcon> = {
  full: GaugeIcon,
  medium: GaugeIcon,
  maximum: GaugeIcon,
};

export function AgentConfigurationSettings() {
  const [settings, setSettings] = useState<AgentConfigurationSettingsState>();
  const [selected, setSelected] = useState<ContextCompressionMode>(
    DEFAULT_CONTEXT_COMPRESSION,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch("/api/agent-config", { cache: "no-store" });
      const payload = (await response.json()) as AgentConfigurationSettingsState & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load agent configuration.");
      }
      setSettings(payload);
      setSelected(payload.contextCompression);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load agent configuration.",
      );
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
      const response = await fetch("/api/agent-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contextCompression: selected }),
      });
      const payload = (await response.json()) as AgentConfigurationSettingsState & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save agent configuration.");
      }
      setSettings(payload);
      setSelected(payload.contextCompression);
      setSaved(true);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save agent configuration.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-8">
        <p className="text-sm text-muted-foreground">Settings</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Agent Configuration
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Control how aggressively the coding agent minimizes context sent during work.
          This setting is shared across devices for this deployment.
        </p>
      </header>

      <div className="border-y">
        <div className="flex items-center justify-between gap-4 py-4">
          <div>
            <h2 className="font-medium">Context compression</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose between context completeness and lower token usage.
            </p>
          </div>
          <Badge variant="outline">Agent behavior</Badge>
        </div>
        <Separator />

        <div className="grid gap-2 py-5">
          {CONTEXT_COMPRESSION_MODES.map((mode) => {
            const active = selected === mode;
            const config = CONTEXT_COMPRESSION_DESCRIPTIONS[mode];
            const Icon = modeIcons[mode];
            return (
              <button
                aria-pressed={active}
                className={cn(
                  "flex w-full items-start gap-3 rounded-md border p-4 text-left transition-colors",
                  active ? "border-foreground/30 bg-accent" : "hover:bg-accent/50",
                )}
                disabled={loading || saving}
                key={mode}
                onClick={() => {
                  setSelected(mode);
                  setSaved(false);
                }}
                type="button"
              >
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-medium">
                    {config.title}
                    {active ? <CheckIcon className="size-4" /> : null}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {config.description}
                  </span>
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
              : "Medium compression is the default."}
          </p>
          <div className="flex items-center gap-3">
            {saved ? <span className="text-sm text-muted-foreground">Saved</span> : null}
            <Button
              disabled={loading || saving || selected === settings?.contextCompression}
              onClick={() => void save()}
            >
              {saving ? <Loader2Icon className="animate-spin" /> : null}
              Save configuration
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
