"use client";

import { HammerIcon, ListTreeIcon, SearchIcon } from "lucide-react";
import {
  AGENT_MODE_DESCRIPTIONS,
  AGENT_MODE_LABELS,
  type AgentMode,
} from "@/lib/agent-mode";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
        <SelectValue>{AGENT_MODE_LABELS[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start" position="popper">
        <SelectItem value="plan">
          <ListTreeIcon />
          <span className="flex flex-col items-start">
            <span>Plan</span>
            <span className="text-muted-foreground text-xs">
              {AGENT_MODE_DESCRIPTIONS.plan}
            </span>
          </span>
        </SelectItem>
        <SelectItem value="ask">
          <SearchIcon />
          <span className="flex flex-col items-start">
            <span>Ask</span>
            <span className="text-muted-foreground text-xs">
              {AGENT_MODE_DESCRIPTIONS.ask}
            </span>
          </span>
        </SelectItem>
        <SelectItem value="build">
          <HammerIcon />
          <span className="flex flex-col items-start">
            <span>Build</span>
            <span className="text-muted-foreground text-xs">
              {AGENT_MODE_DESCRIPTIONS.build}
            </span>
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
