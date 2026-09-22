"use client";

import { BotIcon, CheckIcon, ChevronsUpDownIcon, SettingsIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import type { ModelSelection, ProviderModel } from "@/lib/providers/types";
import { cn } from "@/lib/utils";

type ModelsResponse = {
  models: ProviderModel[];
  selection?: ModelSelection;
};

export function ModelSelector({
  className,
  compact = true,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<ProviderModel[]>([]);
  const [selection, setSelection] = useState<ModelSelection>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const loadModels = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch("/api/models", { cache: "no-store" });
      const payload = (await response.json()) as ModelsResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load models.");
      setModels(payload.models);
      setSelection(payload.selection);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load models.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  const selectedModel = useMemo(
    () =>
      selection
        ? models.find(
            (model) => model.providerId === selection.providerId && model.id === selection.modelId,
          )
        : undefined,
    [models, selection],
  );

  const groupedModels = useMemo(() => {
    const groups = new Map<string, ProviderModel[]>();
    for (const model of models) {
      const group = groups.get(model.providerName) ?? [];
      group.push(model);
      groups.set(model.providerName, group);
    }
    return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
  }, [models]);

  async function selectModel(model: ProviderModel) {
    setSaving(true);
    setError(undefined);
    try {
      const response = await fetch("/api/models/selection", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: model.providerId, modelId: model.id }),
      });
      const payload = (await response.json()) as { selection?: ModelSelection; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to select model.");
      setSelection(payload.selection);
      setOpen(false);
    } catch (selectionError) {
      setError(selectionError instanceof Error ? selectionError.message : "Unable to select model.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        className={cn(
          "min-w-0 justify-start gap-1.5 font-normal text-muted-foreground",
          compact ? "h-7 max-w-56 px-2 text-xs" : "w-full max-w-md justify-between",
          className,
        )}
        disabled={saving}
        onClick={() => {
          setOpen(true);
          void loadModels();
        }}
        size={compact ? "sm" : "default"}
        type="button"
        variant="ghost"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <BotIcon className="size-3.5 shrink-0" />
          <span className="truncate">
            {loading
              ? "Loading models…"
              : selectedModel
                ? `${selectedModel.providerName} · ${selectedModel.name}`
                : "Default Eve model"}
          </span>
        </span>
        <ChevronsUpDownIcon className="size-3.5 shrink-0" />
      </Button>

      <CommandDialog
        className="sm:max-w-2xl"
        description="Search connected provider models and choose the model used by new agent steps."
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (nextOpen) void loadModels();
        }}
        open={open}
        title="Select model"
      >
        <CommandInput placeholder="Search models by name, ID, or provider…" />
        <CommandList className="max-h-[min(60vh,32rem)]">
          <CommandEmpty>
            <div className="flex flex-col items-center gap-3 px-6">
              <span>{error ?? "No connected provider models match your search."}</span>
              <Button
                onClick={() => window.location.assign("/settings/providers")}
                size="sm"
                type="button"
                variant="outline"
              >
                <SettingsIcon />
                Manage providers
              </Button>
            </div>
          </CommandEmpty>

          <CommandGroup heading="Built-in fallback">
            <CommandItem
              disabled={saving}
              onSelect={async () => {
                setSaving(true);
                try {
                  const response = await fetch("/api/models/selection", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: "null",
                  });
                  if (!response.ok) throw new Error("Unable to restore the default model.");
                  setSelection(undefined);
                  setOpen(false);
                } catch (selectionError) {
                  setError(
                    selectionError instanceof Error
                      ? selectionError.message
                      : "Unable to restore the default model.",
                  );
                } finally {
                  setSaving(false);
                }
              }}
              value="default eve openai gpt-5.6-luna-fast"
            >
              <BotIcon />
              <div className="min-w-0 flex-1">
                <div className="font-medium">Default Eve model</div>
                <div className="truncate text-xs text-muted-foreground">
                  openai/gpt-5.6-luna-fast
                </div>
              </div>
              {!selection ? <CheckIcon className="size-4" /> : null}
            </CommandItem>
          </CommandGroup>

          {groupedModels.length > 0 ? <CommandSeparator /> : null}
          {groupedModels.map(([providerName, providerModels]) => (
            <CommandGroup heading={providerName} key={providerName}>
              {providerModels.map((model) => {
                const selected =
                  model.providerId === selection?.providerId && model.id === selection.modelId;
                return (
                  <CommandItem
                    disabled={saving}
                    key={`${model.providerId}:${model.id}`}
                    onSelect={() => void selectModel(model)}
                    value={`${model.name} ${model.id} ${model.providerName}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium">{model.name}</span>
                        {model.supportsReasoning ? (
                          <Badge className="rounded-sm px-1 py-0 font-normal" variant="outline">
                            Reasoning
                          </Badge>
                        ) : null}
                        {model.supportsVision ? (
                          <Badge className="rounded-sm px-1 py-0 font-normal" variant="outline">
                            Vision
                          </Badge>
                        ) : null}
                        {model.supportsTools ? (
                          <Badge className="rounded-sm px-1 py-0 font-normal" variant="outline">
                            Tools
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate font-mono">{model.id}</span>
                        {model.contextWindow ? (
                          <span className="shrink-0">{formatContextWindow(model.contextWindow)}</span>
                        ) : null}
                      </div>
                    </div>
                    {selected ? <CheckIcon className="size-4" /> : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
        <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
          <span>{models.length} connected models</span>
          <button
            className="inline-flex items-center gap-1.5 hover:text-foreground"
            onClick={() => window.location.assign("/settings/providers")}
            type="button"
          >
            <SettingsIcon className="size-3.5" />
            Providers
          </button>
        </div>
      </CommandDialog>
    </>
  );
}

function formatContextWindow(tokens: number): string {
  if (tokens >= 1_000_000) return `${Number((tokens / 1_000_000).toFixed(1))}M ctx`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K ctx`;
  return `${tokens} ctx`;
}
