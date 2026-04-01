"use client";

import { useCallback } from "react";
import { Header } from "./header";
import { PromptInput } from "./prompt-input";
import { ComparisonGrid } from "./comparison-grid";
import { useComparison } from "@/hooks/use-comparison";
import { useSyncScroll } from "@/hooks/use-sync-scroll";

export function Playground() {
  const { responses, isRunning, run, stop } = useComparison();
  const { enabled: syncScroll, setEnabled: setSyncScroll, setRef } =
    useSyncScroll(3);

  const handleSubmit = useCallback(
    (prompt: string) => {
      run(prompt);
    },
    [run]
  );

  return (
    <div className="flex flex-col h-screen">
      <Header syncScroll={syncScroll} onSyncScrollChange={setSyncScroll} />
      <PromptInput
        onSubmit={handleSubmit}
        isRunning={isRunning}
        onStop={stop}
      />
      <ComparisonGrid responses={responses} setScrollRef={setRef} />
    </div>
  );
}
