"use client";

import {
  BotIcon,
  CheckCircle2Icon,
  CloudIcon,
  Code2Icon,
  KeyRoundIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  RouteIcon,
  ServerIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UnplugIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type {
  ProviderDescriptor,
  ProviderListItem,
  PublicProviderConnection,
} from "@/lib/providers/types";

const PROVIDER_ICONS = {
  openrouter: RouteIcon,
  "opencode-zen": Code2Icon,
  "kilo-gateway": ServerIcon,
  "vercel-ai-gateway": CloudIcon,
  openai: BotIcon,
  anthropic: BotIcon,
  google: BotIcon,
  "custom-openai": KeyRoundIcon,
} as const;

type ProviderDialogState = {
  descriptor: ProviderDescriptor;
  connection?: PublicProviderConnection;
};

type ProviderMutationResponse = {
  connection: PublicProviderConnection;
  testMessage: string;
  error?: string;
};

export function ProviderSettings() {
  const [providers, setProviders] = useState<ProviderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [dialog, setDialog] = useState<ProviderDialogState>();
  const [removeTarget, setRemoveTarget] = useState<PublicProviderConnection>();
  const [busyAction, setBusyAction] = useState<string>();

  const loadProviders = useCallback(async () => {
    setLoading(true);
    setPageError(undefined);
    try {
      const response = await fetch("/api/providers", { cache: "no-store" });
      const payload = (await response.json()) as { providers?: ProviderListItem[]; error?: string };
      if (!response.ok || !payload.providers) {
        throw new Error(payload.error ?? "Unable to load provider settings.");
      }
      setProviders(payload.providers);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Unable to load provider settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

  async function runConnectionAction(
    connection: PublicProviderConnection,
    action: "test" | "refresh",
  ) {
    const key = `${action}:${connection.id}`;
    setBusyAction(key);
    setPageError(undefined);
    setNotice(undefined);
    try {
      const endpoint =
        action === "test"
          ? `/api/providers/${encodeURIComponent(connection.id)}/test`
          : `/api/providers/${encodeURIComponent(connection.id)}/models?refresh=1`;
      const response = await fetch(endpoint, { method: action === "test" ? "POST" : "GET" });
      const payload = (await response.json()) as { message?: string; models?: unknown[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? `Unable to ${action} provider.`);
      setNotice(
        action === "test"
          ? payload.message ?? "Connection test succeeded."
          : `Model catalog refreshed (${payload.models?.length ?? 0} models).`,
      );
      if (action === "refresh") await loadProviders();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : `Unable to ${action} provider.`);
    } finally {
      setBusyAction(undefined);
    }
  }

  async function removeConnection() {
    if (!removeTarget) return;
    setBusyAction(`remove:${removeTarget.id}`);
    setPageError(undefined);
    setNotice(undefined);
    try {
      const response = await fetch(`/api/providers/${encodeURIComponent(removeTarget.id)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Unable to remove provider.");
      }
      setRemoveTarget(undefined);
      setNotice(`${removeTarget.name} was removed.`);
      await loadProviders();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Unable to remove provider.");
    } finally {
      setBusyAction(undefined);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">Providers</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          Connect model providers and discover their live model catalogs. Saved API keys remain
          server-side and are never returned by these settings APIs.
        </p>
      </div>

      {pageError ? (
        <div className="mb-5 border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {pageError}
        </div>
      ) : null}
      {notice ? (
        <div className="mb-5 flex items-center gap-2 border border-border bg-muted/40 px-3 py-2 text-sm">
          <CheckCircle2Icon className="size-4" />
          {notice}
        </div>
      ) : null}

      <div className="flex items-start gap-3 border-y py-4 text-sm">
        <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div>
          <div className="font-medium">Secret handling</div>
          <p className="mt-1 leading-5 text-muted-foreground">
            Production credentials are encrypted before private server-side persistence. Editing a
            connection never pre-fills the stored key; entering a new key replaces it.
          </p>
        </div>
      </div>

      <div className="divide-y">
        {loading && providers.length === 0 ? (
          <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Loading providers…
          </div>
        ) : null}

        {providers.map((provider) => {
          const Icon = PROVIDER_ICONS[provider.kind];
          const supportsMany = provider.kind === "custom-openai";
          const canConnect = supportsMany || provider.connections.length === 0;
          return (
            <section className="py-5" key={provider.kind}>
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted/30">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-medium">{provider.name}</h2>
                      <p className="mt-0.5 max-w-xl text-xs leading-5 text-muted-foreground">
                        {provider.description}
                      </p>
                    </div>
                    {canConnect ? (
                      <Button
                        onClick={() => setDialog({ descriptor: provider })}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {supportsMany ? <PlusIcon /> : null}
                        {supportsMany ? "Add provider" : "Configure"}
                      </Button>
                    ) : null}
                  </div>

                  {provider.connections.length === 0 ? (
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <UnplugIcon className="size-3.5" />
                      Not connected
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-3">
                      {provider.connections.map((connection) => (
                        <ConnectionRow
                          busyAction={busyAction}
                          connection={connection}
                          key={connection.id}
                          onEdit={() => setDialog({ descriptor: provider, connection })}
                          onRefresh={() => void runConnectionAction(connection, "refresh")}
                          onRemove={() => setRemoveTarget(connection)}
                          onTest={() => void runConnectionAction(connection, "test")}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <ProviderConnectionDialog
        key={`${dialog?.descriptor.kind ?? "closed"}:${dialog?.connection?.id ?? "new"}`}
        onOpenChange={(open) => {
          if (!open) setDialog(undefined);
        }}
        onSaved={async (message) => {
          setDialog(undefined);
          setNotice(message);
          await loadProviders();
        }}
        state={dialog}
      />

      <Dialog onOpenChange={(open) => !open && setRemoveTarget(undefined)} open={Boolean(removeTarget)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove provider?</DialogTitle>
            <DialogDescription>
              This removes the saved credential, cached model catalog, and active model selection
              if it uses this provider.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/30 px-3 py-2 font-mono text-sm">
            {removeTarget?.name}
          </div>
          <DialogFooter>
            <Button onClick={() => setRemoveTarget(undefined)} type="button" variant="outline">
              Cancel
            </Button>
            <Button
              disabled={busyAction?.startsWith("remove:")}
              onClick={() => void removeConnection()}
              type="button"
              variant="destructive"
            >
              {busyAction?.startsWith("remove:") ? <Loader2Icon className="animate-spin" /> : null}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConnectionRow({
  connection,
  busyAction,
  onEdit,
  onRefresh,
  onRemove,
  onTest,
}: {
  connection: PublicProviderConnection;
  busyAction?: string;
  onEdit: () => void;
  onRefresh: () => void;
  onRemove: () => void;
  onTest: () => void;
}) {
  return (
    <div className="border-l pl-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium">{connection.name}</span>
            <Badge className="rounded-sm font-normal" variant="outline">
              Connected
            </Badge>
            <span className="text-xs text-muted-foreground">
              {connection.modelCount} model{connection.modelCount === 1 ? "" : "s"}
            </span>
          </div>
          {connection.baseUrl ? (
            <div className="mt-1 truncate font-mono text-xs text-muted-foreground">
              {connection.baseUrl}
            </div>
          ) : null}
          {connection.modelsFetchedAt ? (
            <div className="mt-1 text-xs text-muted-foreground">
              Catalog updated {formatRelativeDate(connection.modelsFetchedAt)}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            disabled={Boolean(busyAction)}
            onClick={onTest}
            size="sm"
            type="button"
            variant="ghost"
          >
            {busyAction === `test:${connection.id}` ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <CheckCircle2Icon />
            )}
            Test
          </Button>
          <Button
            disabled={Boolean(busyAction)}
            onClick={onRefresh}
            size="sm"
            type="button"
            variant="ghost"
          >
            {busyAction === `refresh:${connection.id}` ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <RefreshCwIcon />
            )}
            Models
          </Button>
          <Button onClick={onEdit} size="icon-sm" type="button" variant="ghost">
            <PencilIcon />
            <span className="sr-only">Edit {connection.name}</span>
          </Button>
          <Button onClick={onRemove} size="icon-sm" type="button" variant="ghost">
            <Trash2Icon />
            <span className="sr-only">Remove {connection.name}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProviderConnectionDialog({
  state,
  onOpenChange,
  onSaved,
}: {
  state?: ProviderDialogState;
  onOpenChange: (open: boolean) => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const descriptor = state?.descriptor;
  const connection = state?.connection;
  const [apiKey, setApiKey] = useState("");
  const [name, setName] = useState(connection?.name ?? "");
  const [baseUrl, setBaseUrl] = useState(connection?.baseUrl ?? descriptor?.defaultBaseUrl ?? "");
  const [organization, setOrganization] = useState(connection?.organization ?? "");
  const [project, setProject] = useState(connection?.project ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const visibleFields = useMemo(() => descriptor?.fields ?? [], [descriptor]);
  if (!descriptor) return null;
  const descriptorKind = descriptor.kind;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    try {
      const body: Record<string, string> = {};
      if (!connection) body.kind = descriptorKind;
      if (apiKey.trim()) body.apiKey = apiKey.trim();
      if (visibleFields.some((field) => field.key === "name")) body.name = name.trim();
      if (visibleFields.some((field) => field.key === "baseUrl")) body.baseUrl = baseUrl.trim();
      if (visibleFields.some((field) => field.key === "organization")) {
        body.organization = organization.trim();
      }
      if (visibleFields.some((field) => field.key === "project")) body.project = project.trim();

      const response = await fetch(
        connection ? `/api/providers/${encodeURIComponent(connection.id)}` : "/api/providers",
        {
          method: connection ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const payload = (await response.json()) as ProviderMutationResponse;
      if (!response.ok) throw new Error(payload.error ?? "Unable to save provider.");
      await onSaved(
        `${payload.connection.name} connected. ${payload.connection.modelCount} models discovered. ${payload.testMessage}`,
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save provider.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={Boolean(state)}>
      <DialogContent className="sm:max-w-xl">
        <form className="grid gap-5" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{connection ? `Edit ${connection.name}` : `Connect ${descriptor.name}`}</DialogTitle>
            <DialogDescription>
              The connection is tested and its model catalog is fetched before the configuration is
              saved.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            {visibleFields.map((field) => {
              const id = `provider-${descriptor.kind}-${field.key}`;
              const value =
                field.key === "apiKey"
                  ? apiKey
                  : field.key === "name"
                    ? name
                    : field.key === "baseUrl"
                      ? baseUrl
                      : field.key === "organization"
                        ? organization
                        : project;
              const setValue =
                field.key === "apiKey"
                  ? setApiKey
                  : field.key === "name"
                    ? setName
                    : field.key === "baseUrl"
                      ? setBaseUrl
                      : field.key === "organization"
                        ? setOrganization
                        : setProject;
              return (
                <Field key={field.key}>
                  <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
                  <Input
                    autoComplete={field.secret ? "off" : undefined}
                    id={id}
                    onChange={(event) => setValue(event.currentTarget.value)}
                    placeholder={
                      field.key === "apiKey" && connection
                        ? "Leave blank to keep the stored key"
                        : field.placeholder
                    }
                    required={field.required && !(field.key === "apiKey" && connection)}
                    type={field.secret ? "password" : field.key === "baseUrl" ? "url" : "text"}
                    value={value}
                  />
                  {field.key === "apiKey" && connection ? (
                    <FieldDescription>A key is already stored. It is never loaded back into this form.</FieldDescription>
                  ) : field.description ? (
                    <FieldDescription>{field.description}</FieldDescription>
                  ) : null}
                </Field>
              );
            })}
          </FieldGroup>

          {error ? <FieldError>{error}</FieldError> : null}
          <Separator />
          <DialogFooter>
            <Button disabled={saving} onClick={() => onOpenChange(false)} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={saving} type="submit">
              {saving ? <Loader2Icon className="animate-spin" /> : null}
              {saving ? "Connecting…" : connection ? "Save and test" : "Connect and discover"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function formatRelativeDate(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "recently";
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
