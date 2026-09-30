"use client";

import { KeyRoundIcon } from "lucide-react";
import { useState } from "react";
import { GitHubBrandIcon } from "@/components/icons/github-brand-icon";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function GitHubConnectForm({
  compact = false,
  onConnected,
}: {
  readonly compact?: boolean;
  readonly onConnected: (account: { login: string; avatarUrl?: string }) => void | Promise<void>;
}) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function connect() {
    if (!token.trim()) {
      setError("Enter a GitHub personal access token.");
      return;
    }

    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch("/api/github/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = (await response.json()) as {
        login?: string;
        avatarUrl?: string;
        error?: string;
      };
      if (!response.ok || !body.login) {
        throw new Error(body.error ?? "Unable to connect GitHub.");
      }
      setToken("");
      await onConnected({ login: body.login, avatarUrl: body.avatarUrl });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to connect GitHub.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={compact ? "w-full max-w-md" : "w-full"}>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-md border bg-panel">
          <GitHubBrandIcon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">Connect with a personal access token</p>
          <p className="text-xs text-muted-foreground">The token is encrypted and stored only on the server.</p>
        </div>
      </div>

      <FieldGroup>
        <Field data-invalid={Boolean(error) || undefined}>
          <FieldLabel htmlFor="github-personal-access-token">Personal access token</FieldLabel>
          <Input
            aria-invalid={Boolean(error) || undefined}
            autoComplete="off"
            id="github-personal-access-token"
            onChange={(event) => setToken(event.target.value)}
            placeholder="github_pat_… or ghp_…"
            spellCheck={false}
            type="password"
            value={token}
          />
          <FieldDescription>
            Use a least-privilege token with access to the repositories you want Sami to work on.
            The same token can authenticate the official GitHub MCP server.
          </FieldDescription>
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
      </FieldGroup>

      <Button className="mt-4" disabled={busy || !token.trim()} onClick={() => void connect()} type="button">
        {busy ? <Spinner /> : <KeyRoundIcon data-icon="inline-start" />}
        Connect GitHub
      </Button>
    </div>
  );
}
