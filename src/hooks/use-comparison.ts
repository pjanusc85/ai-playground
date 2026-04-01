"use client";

import { useState, useCallback, useRef } from "react";
import { ModelId, ModelResponse, StreamEvent } from "@/types";
import { MODELS } from "@/lib/ai/models";

function createInitialResponse(modelId: ModelId): ModelResponse {
  return {
    modelId,
    text: "",
    isStreaming: false,
    error: null,
    usage: null,
    latencyMs: null,
    estimatedCost: null,
  };
}

function createInitialResponses(): Record<ModelId, ModelResponse> {
  return {
    "gpt-4o": createInitialResponse("gpt-4o"),
    "claude-sonnet": createInitialResponse("claude-sonnet"),
    grok: createInitialResponse("grok"),
  };
}

export function useComparison() {
  const [responses, setResponses] = useState<Record<ModelId, ModelResponse>>(
    createInitialResponses
  );
  const [isRunning, setIsRunning] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const run = useCallback(async (prompt: string, system?: string) => {
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsRunning(true);

    const streamingState: Record<ModelId, ModelResponse> = {
      "gpt-4o": { ...createInitialResponse("gpt-4o"), isStreaming: true },
      "claude-sonnet": {
        ...createInitialResponse("claude-sonnet"),
        isStreaming: true,
      },
      grok: { ...createInitialResponse("grok"), isStreaming: true },
    };
    setResponses({ ...streamingState });

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, system }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          const event: StreamEvent = JSON.parse(line);
          const modelId = event.model;

          if (event.type === "text-delta" && event.content) {
            streamingState[modelId] = {
              ...streamingState[modelId],
              text: streamingState[modelId].text + event.content,
            };
          } else if (event.type === "finish") {
            streamingState[modelId] = {
              ...streamingState[modelId],
              isStreaming: false,
              usage: event.usage || null,
              latencyMs: event.latencyMs || null,
              estimatedCost: event.estimatedCost || null,
            };
          } else if (event.type === "error") {
            streamingState[modelId] = {
              ...streamingState[modelId],
              isStreaming: false,
              error: event.message || "Unknown error",
            };
          }

          setResponses({ ...streamingState });
        }
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;

      for (const model of MODELS) {
        if (streamingState[model.id].isStreaming) {
          streamingState[model.id] = {
            ...streamingState[model.id],
            isStreaming: false,
            error: (error as Error).message,
          };
        }
      }
      setResponses({ ...streamingState });
    } finally {
      setIsRunning(false);
    }
  }, []);

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsRunning(false);
    setResponses(createInitialResponses());
  }, []);

  return { responses, isRunning, run, stop, reset };
}
