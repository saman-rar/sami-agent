"use client";

import { HammerIcon, ListTreeIcon } from "lucide-react";
import type { AgentMode } from "@/lib/agent-mode";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MODE_LABELS: Record<AgentMode, string> = {
  plan: "Plan",
  build: "Build",
};

export function AgentModeSelector({
  value,
  onValueChange,
  disabled = false,
}: {
  readonly value: AgentMode;
  readonly onValueChange: (mode: AgentMode) => void;
  readonly disabled?: boolean;
}) {
  return (
    <Select
      disabled={disabled}
      onValueChange={(next) => onValueChange(next as AgentMode)}
      value={value}
    >
      <SelectTrigger
        aria-label="Agent mode"
        className="h-7 border-0 bg-transparent px-2 shadow-none hover:bg-accent focus-visible:ring-1"
        size="sm"
      >
        <SelectValue>{MODE_LABELS[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start" position="popper">
        <SelectItem value="plan">
          <ListTreeIcon />
          <span className="flex flex-col items-start">
            <span>Plan</span>
            <span className="text-muted-foreground text-xs">Inspect and propose without changes</span>
          </span>
        </SelectItem>
        <SelectItem value="build">
          <HammerIcon />
          <span className="flex flex-col items-start">
            <span>Build</span>
            <span className="text-muted-foreground text-xs">Edit and run tools with permissions</span>
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
