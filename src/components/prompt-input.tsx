"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  isRunning: boolean;
  onStop: () => void;
}

const PLACEHOLDERS = [
  "Compare how each model explains quantum computing...",
  "Ask all three to write a haiku about programming...",
  "Test which model gives the best coding advice...",
  "See how each model handles creative writing...",
];

export function PromptInput({ onSubmit, isRunning, onStop }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = () => {
    const trimmed = prompt.trim();
    if (!trimmed || isRunning) return;
    onSubmit(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="px-6 py-4">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDERS[placeholderIndex]}
          disabled={isRunning}
          className="min-h-[100px] resize-none bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] pr-24 text-sm"
          rows={3}
        />
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          {isRunning ? (
            <Button
              onClick={onStop}
              variant="destructive"
              size="sm"
              className="text-xs"
            >
              Stop
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!prompt.trim()}
              size="sm"
              className="text-xs bg-[var(--accent-openai)] hover:bg-[var(--accent-openai)]/90 text-black"
            >
              Compare
            </Button>
          )}
        </div>
      </div>
      <p className="text-[10px] text-[var(--text-secondary)] mt-2">
        {isRunning ? "Streaming responses..." : "Cmd+Enter to send"}
      </p>
    </div>
  );
}
