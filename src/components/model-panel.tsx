"use client";

import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import { ModelConfig, ModelResponse } from "@/types";
import { MetricsBar } from "./metrics-bar";
import { Skeleton } from "@/components/ui/skeleton";

interface ModelPanelProps {
  config: ModelConfig;
  response: ModelResponse;
  scrollRef: (el: HTMLDivElement | null) => void;
  onSave?: () => void;
  isSaved?: boolean;
}

export function ModelPanel({
  config,
  response,
  scrollRef,
  onSave,
  isSaved,
}: ModelPanelProps) {
  const isIdle = !response.isStreaming && !response.text && !response.error;

  const panelClass = response.isStreaming
    ? `panel-streaming-${config.provider}`
    : response.text || response.error
      ? `panel-done-${config.provider}`
      : "";

  return (
    <div
      className={`flex flex-col bg-[var(--bg-panel)] rounded-lg overflow-hidden transition-all duration-300 ${panelClass}`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: config.accentColor }}
        />
        <span className="text-sm font-semibold">{config.displayName}</span>
        <span className="text-[11px] text-[var(--text-secondary)]">
          {config.providerLabel}
        </span>
      </div>

      {/* Response body */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 min-h-[300px] max-h-[calc(100vh-320px)]"
      >
        {isIdle && (
          <p className="text-sm text-[var(--text-secondary)] italic">
            Waiting for prompt...
          </p>
        )}

        {response.isStreaming && !response.text && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4 bg-[var(--bg-elevated)]" />
            <Skeleton className="h-4 w-full bg-[var(--bg-elevated)]" />
            <Skeleton className="h-4 w-2/3 bg-[var(--bg-elevated)]" />
          </div>
        )}

        {response.text && (
          <div className="response-content">
            <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
              {response.text}
            </ReactMarkdown>
            {response.isStreaming && (
              <span
                className="streaming-cursor"
                style={{ backgroundColor: config.accentColor }}
              />
            )}
          </div>
        )}

        {response.error && !response.text && (
          <div className="text-sm text-red-400 bg-red-950/20 rounded-md p-3">
            <p className="font-semibold mb-1">Error</p>
            <p>{response.error}</p>
          </div>
        )}
      </div>

      {/* Metrics */}
      <MetricsBar
        response={response}
        accentColor={config.accentColor}
        onSave={onSave}
        isSaved={isSaved}
      />
    </div>
  );
}
