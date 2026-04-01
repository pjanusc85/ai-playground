"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  syncScroll: boolean;
  onSyncScrollChange: (enabled: boolean) => void;
}

export function Header({ syncScroll, onSyncScrollChange }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-[var(--accent-openai)]" />
        <div className="w-2 h-2 rounded-full bg-[var(--accent-anthropic)]" />
        <div className="w-2 h-2 rounded-full bg-[var(--accent-xai)]" />
        <h1 className="text-lg font-semibold tracking-tight ml-2">
          AI Playground
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSyncScrollChange(!syncScroll)}
          className={`text-xs hidden lg:inline-flex ${syncScroll ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
        >
          {syncScroll ? "Sync Scroll: On" : "Sync Scroll: Off"}
        </Button>
        <Link href="/history">
          <Button variant="ghost" size="sm" className="text-xs">
            History
          </Button>
        </Link>
      </div>
    </header>
  );
}
