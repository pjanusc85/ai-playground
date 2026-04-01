"use client";

import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import { ComparisonResult } from "@/types";
import { MODELS } from "@/lib/ai/models";
import { formatCost, formatLatency, formatTokens } from "@/lib/utils";

interface HistoryDetailProps {
  comparison: ComparisonResult;
}

export function HistoryDetail({ comparison }: HistoryDetailProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 p-4 border-t border-[var(--border)]">
      {MODELS.map((config) => {
        const response = comparison.responses.find(
          (r) => r.modelId === config.id
        );
        if (!response) return null;

        return (
          <div
            key={config.id}
            className="bg-[var(--bg-elevated)] rounded-md overflow-hidden"
            style={{ borderTop: `2px solid ${config.accentColor}` }}
          >
            <div className="px-3 py-2 flex items-center gap-2 border-b border-[var(--border)]">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: config.accentColor }}
              />
              <span className="text-xs font-semibold">
                {config.displayName}
              </span>
            </div>
            <div className="px-3 py-2 max-h-[300px] overflow-y-auto">
              {response.error ? (
                <p className="text-xs text-red-400">{response.error}</p>
              ) : (
                <div className="response-content text-sm">
                  <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                    {response.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
            <div className="px-3 py-2 border-t border-[var(--border)] flex items-center gap-3 text-[10px] text-[var(--text-secondary)]">
              <span>{formatLatency(response.latencyMs)}</span>
              <span>{formatTokens(response.totalTokens)} tok</span>
              <span>{formatCost(response.estimatedCost)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
