"use client";

import { RefreshCwIcon, UnplugIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { GitHubConnectForm } from "@/components/github-connect-form";
import { GitHubBrandIcon } from "@/components/icons/github-brand-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type ConnectionState =
  | { status: "loading" }
  | { status: "connected"; login: string; avatarUrl?: string; credentialSource: "user" | "environment" }
  | { status: "needs_auth" }
  | { status: "error"; message: string };

export function GitHubSettings() {
  const [state, setState] = useState<ConnectionState>({ status: "loading" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/github/status", { cache: "no-store" });
      const body = (await response.json()) as {
        status?: string;
        login?: string;
        avatarUrl?: string;
        credentialSource?: "user" | "environment";
        message?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "Unable to check GitHub.");
      if (body.status === "connected" && body.login) {
        setState({
          status: "connected",
          login: body.login,
          avatarUrl: body.avatarUrl,
          credentialSource: body.credentialSource === "environment" ? "environment" : "user",
        });
      } else if (body.status === "needs_auth") {
        setState({ status: "needs_auth" });
      } else {
        setState({ status: "error", message: body.message ?? "GitHub is unavailable." });
      }
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "GitHub is unavailable." });
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      const response = await fetch("/api/github/disconnect", { method: "POST" });
      if (!response.ok) throw new Error("Unable to disconnect GitHub.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">GitHub</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          Connect GitHub to browse repositories, clone private projects into Eve sandboxes, and
          expose the official GitHub MCP tools to the coding agent.
        </p>
      </div>

      {state.status === "loading" ? (
        <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Checking GitHub connection…
        </div>
      ) : state.status === "connected" ? (
        <div className="flex items-center gap-4 border-y py-5">
          <div className="flex size-10 items-center justify-center rounded-md border bg-panel">
            <GitHubBrandIcon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{state.login}</span>
              <Badge variant="secondary">{state.credentialSource === "environment" ? "Environment" : "Connected"}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {state.credentialSource === "environment"
                ? "Using the server-side GITHUB_PAT environment variable for REST, Git, and GitHub MCP."
                : "Repository REST/Git access and the GitHub MCP connection use this encrypted server-side credential."}
            </p>
          </div>
          {state.credentialSource === "user" ? (
            <Button disabled={busy} onClick={() => void disconnect()} size="sm" variant="outline">
              <UnplugIcon data-icon="inline-start" /> Disconnect
            </Button>
          ) : null}
        </div>
      ) : state.status === "needs_auth" ? (
        <div className="border-y py-6">
          <GitHubConnectForm onConnected={() => refresh()} />
        </div>
      ) : (
        <div className="border-y py-6">
          <p className="text-sm font-medium">GitHub connection unavailable</p>
          <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>
          <Button className="mt-4" onClick={() => void refresh()} size="sm" variant="outline">
            <RefreshCwIcon data-icon="inline-start" /> Retry
          </Button>
        </div>
      )}

      <div className="mt-6 text-sm leading-6 text-muted-foreground">
        <p>
          For a fine-grained PAT, grant access only to the repositories Sami should use. Add write
          permissions only if you want Git push or GitHub write tools; those actions still respect
          Sami&apos;s approval policy. You can either enter the workspace PAT here or configure the optional
          server-side GITHUB_PAT environment variable for a shared/single-user deployment.
        </p>
      </div>
    </div>
  );
}
