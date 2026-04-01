import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ModelConfig, TokenUsage } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateCost(
  usage: TokenUsage,
  config: ModelConfig
): number {
  const inputCost =
    (usage.promptTokens / 1_000_000) * config.pricing.inputPerMillion;
  const outputCost =
    (usage.completionTokens / 1_000_000) * config.pricing.outputPerMillion;
  return inputCost + outputCost;
}

export function formatCost(cost: number): string {
  if (cost < 0.001) return "<$0.001";
  return `$${cost.toFixed(4)}`;
}

export function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatTokens(count: number): string {
  if (count < 1000) return `${count}`;
  return `${(count / 1000).toFixed(1)}k`;
}
