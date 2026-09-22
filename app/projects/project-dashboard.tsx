"use client";

import {
  ArrowRightIcon,
  GitBranchIcon,
  GitForkIcon,
  LockIcon,
  PlusIcon,
  RefreshCwIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { GitHubConnectForm } from "@/components/github-connect-form";
import { GitHubBrandIcon } from "@/components/icons/github-brand-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import type { GitHubBranch, GitHubRepository } from "@/lib/github/client";
import type { ProjectRecord } from "@/lib/projects/types";

export function ProjectDashboard({ initialProjects }: { readonly initialProjects: ProjectRecord[] }) {
  const [projects] = useState(initialProjects);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("github") || params.has("githubError")) {
      setOpen(true);
      History.prototype.replaceState.call(window.history, window.history.state, "", "/projects");
    }
  }, []);

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="mb-10 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 font-mono text-xs text-muted-foreground">SAMI / PROJECTS</div>
            <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Import a GitHub repository into an isolated Eve workspace and continue working on the
              same branch across agent turns.
            </p>
          </div>
          <Button onClick={() => setOpen(true)} type="button">
            <PlusIcon className="size-4" />
            Import GitHub repo
          </Button>
        </div>

        <div className="overflow-hidden rounded-md border bg-panel">
          <div className="flex h-10 items-center border-b px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Recent projects
          </div>
          {projects.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-6 text-center">
              <GitForkIcon className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">No projects yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Connect GitHub and import a repository to start coding.
                </p>
              </div>
              <Button onClick={() => setOpen(true)} size="sm" type="button" variant="outline">
                Import repository
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {projects.map((project) => (
                <button
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60"
                  key={project.id}
                  onClick={() => window.location.assign(`/projects/${encodeURIComponent(project.id)}`)}
                  type="button"
                >
                  <GitHubBrandIcon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-medium">{project.source.fullName}</span>
                      {project.source.private ? (
                        <Badge className="gap-1" variant="outline">
                          <LockIcon className="size-3" /> Private
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <GitBranchIcon className="size-3" />
                      <span>{project.source.branch}</span>
                      <span aria-hidden="true">·</span>
                      <span>Updated {formatDate(project.updatedAt)}</span>
                    </div>
                  </div>
                  <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
          <Button
            onClick={() => window.location.assign("/sessions")}
            size="sm"
            type="button"
            variant="ghost"
          >
            All chats
          </Button>
          <span aria-hidden="true">·</span>
          <Button
            onClick={() => window.location.assign("/s")}
            size="sm"
            type="button"
            variant="ghost"
          >
            New standalone chat
          </Button>
          <span aria-hidden="true">·</span>
          <Button
            onClick={() => window.location.assign("/settings/github")}
            size="sm"
            type="button"
            variant="ghost"
          >
            GitHub settings
          </Button>
        </div>
      </div>

      <ImportRepositoryDialog onOpenChange={setOpen} open={open} />
    </main>
  );
}

function ImportRepositoryDialog({
  open,
  onOpenChange,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const [connection, setConnection] = useState<
    | { status: "loading" }
    | { status: "connected"; login?: string }
    | { status: "needs_auth" }
    | { status: "error"; message: string }
  >({ status: "loading" });
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [selectedRepository, setSelectedRepository] = useState<GitHubRepository>();
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [branch, setBranch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!open) return;
    setSelectedRepository(undefined);
    setBranches([]);
    setBranch("");
    setError(undefined);
    void loadConnectionAndRepositories();
  }, [open]);

  async function loadConnectionAndRepositories() {
    setConnection({ status: "loading" });
    try {
      const statusResponse = await fetch("/api/github/status", { cache: "no-store" });
      const status = (await statusResponse.json()) as {
        status?: string;
        message?: string;
        error?: string;
        login?: string;
      };
      if (!statusResponse.ok) throw new Error(status.error ?? "Unable to read GitHub connection.");
      if (status.status !== "connected") {
        if (status.status === "needs_auth") setConnection({ status: "needs_auth" });
        else setConnection({ status: "error", message: status.message ?? "GitHub is unavailable." });
        return;
      }
      setConnection({ status: "connected", login: status.login });
      const repositoriesResponse = await fetch("/api/github/repositories", { cache: "no-store" });
      const repositoriesBody = (await repositoriesResponse.json()) as {
        repositories?: GitHubRepository[];
        error?: string;
      };
      if (!repositoriesResponse.ok) {
        throw new Error(repositoriesBody.error ?? "Unable to list GitHub repositories.");
      }
      setRepositories(repositoriesBody.repositories ?? []);
    } catch (cause) {
      setConnection({
        status: "error",
        message: cause instanceof Error ? cause.message : "GitHub is unavailable.",
      });
    }
  }

  async function chooseRepository(repository: GitHubRepository) {
    setSelectedRepository(repository);
    setBranches([]);
    setBranch(repository.defaultBranch);
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch(
        `/api/github/repositories/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}/branches`,
        { cache: "no-store" },
      );
      const body = (await response.json()) as { branches?: GitHubBranch[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to list repository branches.");
      setBranches(body.branches ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to list branches.");
    } finally {
      setBusy(false);
    }
  }

  async function importProject() {
    if (!selectedRepository || !branch) return;
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: selectedRepository.owner,
          repo: selectedRepository.name,
          branch,
        }),
      });
      const body = (await response.json()) as { project?: ProjectRecord; error?: string };
      if (!response.ok || !body.project) {
        throw new Error(body.error ?? "Unable to create project.");
      }
      window.location.assign(`/projects/${encodeURIComponent(body.project.id)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create project.");
      setBusy(false);
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>Import from GitHub</DialogTitle>
          <DialogDescription>
            Choose a repository and branch. Sami will clone it into an isolated project sandbox.
          </DialogDescription>
        </DialogHeader>

        {connection.status === "loading" ? (
          <div className="flex min-h-80 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Spinner /> Checking GitHub connection…
          </div>
        ) : connection.status === "needs_auth" ? (
          <div className="flex min-h-80 items-center justify-center px-8 py-8">
            <GitHubConnectForm compact onConnected={() => loadConnectionAndRepositories()} />
          </div>
        ) : connection.status === "error" ? (
          <div className="flex min-h-80 flex-col items-center justify-center gap-4 px-8 text-center">
            <p className="font-medium">GitHub connection unavailable</p>
            <p className="max-w-lg text-sm leading-6 text-muted-foreground">{connection.message}</p>
            <Button onClick={() => void loadConnectionAndRepositories()} variant="outline">
              <RefreshCwIcon data-icon="inline-start" /> Retry
            </Button>
          </div>
        ) : selectedRepository ? (
          <div className="space-y-6 p-5">
            <div className="flex items-center gap-3 rounded-md border bg-panel-muted/50 p-3">
              <GitHubBrandIcon className="size-4" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{selectedRepository.fullName}</span>
                  {selectedRepository.private ? <LockIcon className="size-3 text-muted-foreground" /> : null}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">Select the branch to work on.</p>
              </div>
              <Button onClick={() => setSelectedRepository(undefined)} size="sm" variant="ghost">
                Change
              </Button>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="github-branch">
                Branch
              </label>
              <Select disabled={busy || branches.length === 0} onValueChange={setBranch} value={branch}>
                <SelectTrigger className="w-full" id="github-branch">
                  <SelectValue placeholder={busy ? "Loading branches…" : "Select branch"} />
                </SelectTrigger>
                <SelectContent position="popper">
                  {branches.map((item) => (
                    <SelectItem key={item.name} value={item.name}>
                      <GitBranchIcon className="size-3" /> {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button disabled={busy || !branch} onClick={() => void importProject()}>
                {busy ? <Spinner /> : null}
                Create project
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <Command className="rounded-none">
            <CommandInput placeholder="Search repositories…" />
            <CommandList className="max-h-[430px] min-h-80 p-2">
              <CommandEmpty>No repositories found.</CommandEmpty>
              {repositories.map((repository) => (
                <CommandItem
                  className="min-h-12"
                  key={repository.id}
                  onSelect={() => void chooseRepository(repository)}
                  value={`${repository.fullName} ${repository.private ? "private" : "public"}`}
                >
                  <GitHubBrandIcon className="size-4" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{repository.fullName}</span>
                      {repository.private ? <LockIcon className="size-3" /> : null}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <GitBranchIcon className="size-3" /> {repository.defaultBranch}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        )}
      </DialogContent>
    </Dialog>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "recently"
    : new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}
