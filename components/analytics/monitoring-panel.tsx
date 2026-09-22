"use client";

import {
  ActivityIcon,
  BarChart3Icon,
  CheckCircle2Icon,
  CircleIcon,
  GaugeIcon,
  ListTodoIcon,
  PanelRightIcon,
  RefreshCwIcon,
  ServerIcon,
  WrenchIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { AnalyticsTokenMode } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

type AnalyticsResponse = {
  requests: number;
  tokens: {
    input: number;
    output: number;
    reasoning: number;
    cached: number;
  };
  tools: Array<{
    toolName: string;
    durationMs: number;
    success: boolean;
  }>;
  mcp: Array<{
    server: string;
    tool: string;
    durationMs: number;
    success: boolean;
  }>;
  skills: Array<{
    skill: string;
  }>;
};

type MonitoringTab = "todo" | "dashboard";

const EMPTY_ANALYTICS: AnalyticsResponse = {
  requests: 0,
  tokens: { input: 0, output: 0, reasoning: 0, cached: 0 },
  tools: [],
  mcp: [],
  skills: [],
};

export function MonitoringPanel() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-80 flex-col border-l bg-panel lg:flex">
        <MonitoringPanelContent />
      </aside>

      <div className="fixed bottom-24 right-4 z-40 lg:hidden">
        <Sheet onOpenChange={setMobileOpen} open={mobileOpen}>
          <SheetTrigger asChild>
            <Button aria-label="Open monitoring" size="icon" variant="secondary">
              <PanelRightIcon className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Agent monitoring</SheetTitle>
              <SheetDescription>Todo state and live runtime analytics.</SheetDescription>
            </SheetHeader>
            <MonitoringPanelContent compact />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

function MonitoringPanelContent({ compact = false }: { readonly compact?: boolean }) {
  const [tab, setTab] = useState<MonitoringTab>("dashboard");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!compact ? (
        <div className="flex h-14 shrink-0 items-center border-b px-4">
          <div>
            <div className="text-sm font-medium">Monitoring</div>
            <div className="text-[11px] text-muted-foreground">Live session telemetry</div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-1 border-b p-2">
        <Button
          className="justify-start"
          onClick={() => setTab("todo")}
          size="sm"
          type="button"
          variant={tab === "todo" ? "secondary" : "ghost"}
        >
          <ListTodoIcon className="size-4" /> Todo
        </Button>
        <Button
          className="justify-start"
          onClick={() => setTab("dashboard")}
          size="sm"
          type="button"
          variant={tab === "dashboard" ? "secondary" : "ghost"}
        >
          <BarChart3Icon className="size-4" /> Dashboard
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "todo" ? <TodoTab /> : <DashboardTab />}
      </div>
    </div>
  );
}

function TodoTab() {
  const [todos, setTodos] = useState<Array<{
    id: string;
    title: string;
    status: "pending" | "in_progress" | "completed";
  }>>([]);

  const load = useCallback(async () => {
    const response = await fetch("/api/todos", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    setTodos(data.todos ?? []);
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 3000);
    return () => window.clearInterval(id);
  }, [load]);

  const update = async (items: typeof todos) => {
    setTodos(items);
    await fetch("/api/todos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ todos: items }),
    });
  };

  return (
    <div className="space-y-4 p-4">
      <SectionHeading icon={ListTodoIcon} title="Todo" />
      <div className="space-y-2">
        {todos.map((item) => (
          <div key={item.id} className="flex items-center gap-2 rounded-md border p-3">
            <button
              onClick={() =>
                void update(todos.map((x) =>
                  x.id === item.id
                    ? { ...x, status: x.status === "completed" ? "pending" : "completed" }
                    : x
                ))
              }
            >
              {item.status === "completed"
                ? <CheckCircle2Icon className="size-4 text-green-500" />
                : <CircleIcon className="size-4 text-muted-foreground" />}
            </button>
            <input
              className="flex-1 bg-transparent text-sm outline-none"
              value={item.title}
              onChange={(e) =>
                setTodos(todos.map((x) =>
                  x.id === item.id ? { ...x, title: e.target.value } : x
                ))
              }
              onBlur={() => void update(todos)}
            />
            <Badge variant="outline">{item.status}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
function DashboardTab() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse>(EMPTY_ANALYTICS);
  const [tokenMode, setTokenMode] = useState<AnalyticsTokenMode>("medium");
  const [loading, setLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/analytics/session", { cache: "no-store" });
      const body = (await response.json()) as AnalyticsResponse & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to load analytics.");
      setAnalytics(body);
      setError(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 4000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    void fetch("/api/analytics/settings", { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as { tokenMode?: AnalyticsTokenMode; error?: string };
        if (!response.ok) throw new Error(body.error ?? "Unable to load analytics settings.");
        if (body.tokenMode) setTokenMode(body.tokenMode);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Unable to load analytics settings.");
      })
      .finally(() => setSettingsLoading(false));
  }, []);

  const changeTokenMode = async (next: AnalyticsTokenMode) => {
    const previous = tokenMode;
    setTokenMode(next);
    try {
      const response = await fetch("/api/analytics/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenMode: next }),
      });
      if (!response.ok) throw new Error("Unable to save token mode.");
    } catch (cause) {
      setTokenMode(previous);
      setError(cause instanceof Error ? cause.message : "Unable to save token mode.");
    }
  };

  const averageToolDuration = useMemo(() => {
    if (analytics.tools.length === 0) return 0;
    return Math.round(
      analytics.tools.reduce((sum, item) => sum + item.durationMs, 0) / analytics.tools.length,
    );
  }, [analytics.tools]);

  const toolGroups = useMemo(() => groupByName(analytics.tools, (item) => item.toolName), [analytics.tools]);
  const mcpGroups = useMemo(() => groupByName(analytics.mcp, (item) => item.server), [analytics.mcp]);
  const skillGroups = useMemo(() => groupByName(analytics.skills, (item) => item.skill), [analytics.skills]);
  const totalTokens =
    analytics.tokens.input +
    analytics.tokens.output +
    analytics.tokens.reasoning;
  const uncachedInput = Math.max(0, analytics.tokens.input - analytics.tokens.cached);

  return (
    <div className="space-y-5 p-4">
      <div className="flex items-center justify-between gap-2">
        <SectionHeading icon={ActivityIcon} title="Live session" />
        <Button aria-label="Refresh analytics" disabled={loading} onClick={() => void refresh()} size="icon-xs" variant="ghost">
          <RefreshCwIcon className={cn("size-3.5", loading && "animate-spin")} />
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          Analytics API error: {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          Loading live session metrics...
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <Metric label="LLM requests" value={formatNumber(analytics.requests)} />
        <Metric label="Tool calls" value={formatNumber(analytics.tools.length)} />
        <Metric label="Total tokens" value={formatCompact(totalTokens)} />
        <Metric label="Avg tool latency" value={formatDuration(averageToolDuration)} />
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <SectionHeading icon={GaugeIcon} title="Token usage" />
          <Badge variant="outline">{formatPercent(analytics.tokens.input === 0 ? 0 : analytics.tokens.cached / analytics.tokens.input)} cached</Badge>
        </div>

        <Select
          disabled={settingsLoading}
          onValueChange={(value) => void changeTokenMode(value as AnalyticsTokenMode)}
          value={tokenMode}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="full">Full usage</SelectItem>
            <SelectItem value="medium">Medium compression</SelectItem>
            <SelectItem value="maximum">Maximum compression</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[11px] leading-4 text-muted-foreground">
          This preference is persisted server-side. Runtime compression hooks are introduced in the
          next context-routing phase; this panel does not claim savings that have not happened yet.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <Metric label="Input" value={formatCompact(analytics.tokens.input)} />
          <Metric label="Cached" value={formatCompact(analytics.tokens.cached)} />
          <Metric label="Uncached input" value={formatCompact(uncachedInput)} />
          <Metric label="Output" value={formatCompact(analytics.tokens.output)} />
          <Metric label="Reasoning" value={formatCompact(analytics.tokens.reasoning)} />
          <Metric label="Total" value={formatCompact(totalTokens)} />
        </div>
      </section>

      <UsageList
        empty="No tool metrics recorded yet."
        icon={WrenchIcon}
        items={toolGroups}
        title="Tools"
      />
      <UsageList
        empty="No MCP metrics recorded yet."
        icon={ServerIcon}
        items={mcpGroups}
        title="MCP"
      />
      <UsageList
        empty="No skill metrics recorded yet."
        icon={CheckCircle2Icon}
        items={skillGroups}
        title="Skills"
      />

      {analytics.requests === 0 && analytics.tools.length === 0 ? (
        <div className="rounded-md border border-dashed p-3 text-xs leading-5 text-muted-foreground">
          The monitoring UI is connected. Metrics stay at zero until the runtime instrumentation
          hooks record real LLM/tool/MCP/skill events; no placeholder values are generated.
        </div>
      ) : null}
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
}: {
  readonly icon: typeof ActivityIcon;
  readonly title: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      <Icon className="size-3.5" />
      <span>{title}</span>
    </div>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-md border bg-background/40 px-3 py-2.5">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function UsageList({
  empty,
  icon,
  items,
  title,
}: {
  readonly empty: string;
  readonly icon: typeof ActivityIcon;
  readonly items: Array<{ name: string; count: number }>;
  readonly title: string;
}) {
  return (
    <section className="space-y-2">
      <SectionHeading icon={icon} title={title} />
      {items.length === 0 ? (
        <div className="rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground">
          {empty}
        </div>
      ) : (
        <div className="divide-y rounded-md border bg-background/40">
          {items.slice(0, 8).map((item) => (
            <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs" key={item.name}>
              <span className="min-w-0 truncate font-mono">{item.name}</span>
              <Badge variant="secondary">{item.count}</Badge>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function groupByName<T>(items: T[], getName: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const name = getName(item);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDuration(value: number) {
  if (value <= 0) return "—";
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(1)} s`;
}
