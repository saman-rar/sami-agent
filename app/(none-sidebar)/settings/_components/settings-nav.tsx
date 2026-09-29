"use client";

import {
  BoxesIcon,
  KeyRoundIcon,
  PaletteIcon,
  ShieldCheckIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitHubBrandIcon } from "@/components/icons/github-brand-icon";
import { cn } from "@/lib/utils";

const implementedSections = [
  { href: "/settings/providers", label: "Providers", icon: KeyRoundIcon },
  { href: "/settings/models", label: "Models", icon: BoxesIcon },
  { href: "/settings/agent-permissions", label: "Agent Permissions", icon: ShieldCheckIcon },
  { href: "/settings/github", label: "GitHub", icon: GitHubBrandIcon },
  { href: "/settings/appearance", label: "Appearance", icon: PaletteIcon },
] as const;

const futureSections = ["General", "MCP Servers", "Skills", "Advanced"];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="grid gap-1" aria-label="Settings">
      {implementedSections.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-9 items-center gap-2 rounded-md px-2 text-sm",
              active
                ? "bg-accent font-medium text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            href={href}
            key={href}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
      {futureSections.map((section) => (
        <span
          aria-disabled="true"
          className="flex h-9 items-center justify-between rounded-md px-2 text-sm text-muted-foreground/60"
          key={section}
        >
          {section}
          <span className="text-[10px] uppercase tracking-wide">Next</span>
        </span>
      ))}
    </nav>
  );
}
