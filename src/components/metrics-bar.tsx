"use client";

import { ModelResponse } from "@/types";
import { formatCost, formatLatency, formatTokens } from "@/lib/utils";

interface MetricsBarProps {
  response: ModelResponse;
  accentColor: string;
  onSave?: () => void;
  isSaved?: boolean;
}

export function MetricsBar({
  response,
  accentColor,
  onSave,
  isSaved,
}: MetricsBarProps) {
  const hasMetrics =
    response.usage !== null && response.latencyMs !== null;

  if (!hasMetrics && !response.error) return null;

  if (response.error) {
    return (
      <div className="px-4 py-2 border-t border-[var(--border)] bg-red-950/20">
        <p className="text-xs text-red-400 truncate">{response.error}</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-2 border-t border-[var(--border)] flex items-center justify-between">
      <div className="flex items-center gap-4 text-[11px] text-[var(--text-secondary)]">
        <span className="metric-reveal">
          {formatLatency(response.latencyMs!)}
        </span>
        <span className="metric-reveal" style={{ animationDelay: "0.1s" }}>
          {formatTokens(response.usage!.totalTokens)} tok
        </span>
        <span className="metric-reveal" style={{ animationDelay: "0.2s" }}>
          {formatCost(response.estimatedCost!)}
        </span>
      </div>
      {onSave && (
        <button
          onClick={onSave}
          className="text-[11px] transition-colors hover:text-[var(--text-primary)]"
          style={{ color: isSaved ? accentColor : "var(--text-secondary)" }}
        >
          {isSaved ? "Saved" : "Save"}
        </button>
      )}
    </div>
  );
}
