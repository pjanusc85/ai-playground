"use client";

import { useState } from "react";
import { ModelId, ModelResponse } from "@/types";
import { MODELS } from "@/lib/ai/models";
import { ModelPanel } from "./model-panel";

interface ComparisonGridProps {
  responses: Record<ModelId, ModelResponse>;
  setScrollRef: (index: number) => (el: HTMLDivElement | null) => void;
}

export function ComparisonGrid({
  responses,
  setScrollRef,
}: ComparisonGridProps) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <>
      {/* Mobile tab selector */}
      <div className="flex lg:hidden px-6 pb-3 gap-2">
        {MODELS.map((config, index) => (
          <button
            key={config.id}
            onClick={() => setActiveTab(index)}
            className="flex-1 py-2 text-xs rounded-md transition-colors border"
            style={{
              borderColor:
                activeTab === index ? config.accentColor : "var(--border)",
              color:
                activeTab === index
                  ? config.accentColor
                  : "var(--text-secondary)",
              backgroundColor:
                activeTab === index ? "var(--bg-elevated)" : "transparent",
            }}
          >
            {config.displayName}
          </button>
        ))}
      </div>

      {/* Desktop: 3-column grid */}
      <div className="hidden lg:grid flex-1 grid-cols-3 gap-4 px-6 pb-6 min-h-0">
        {MODELS.map((config, index) => (
          <ModelPanel
            key={config.id}
            config={config}
            response={responses[config.id]}
            scrollRef={setScrollRef(index)}
          />
        ))}
      </div>

      {/* Mobile: single panel */}
      <div className="flex lg:hidden flex-1 px-6 pb-6 min-h-0">
        <ModelPanel
          config={MODELS[activeTab]}
          response={responses[MODELS[activeTab].id]}
          scrollRef={setScrollRef(activeTab)}
        />
      </div>
    </>
  );
}
