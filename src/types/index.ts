export type ModelId = "gpt-4o" | "claude-sonnet" | "grok";
export type Provider = "openai" | "anthropic" | "xai";

export interface ModelConfig {
  id: ModelId;
  gatewayModelId: string;
  displayName: string;
  provider: Provider;
  providerLabel: string;
  accentColor: string;
  pricing: {
    inputPerMillion: number;
    outputPerMillion: number;
  };
}

export interface StreamEvent {
  model: ModelId;
  type: "text-delta" | "finish" | "error";
  content?: string;
  usage?: TokenUsage;
  latencyMs?: number;
  estimatedCost?: number;
  message?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ModelResponse {
  modelId: ModelId;
  text: string;
  isStreaming: boolean;
  error: string | null;
  usage: TokenUsage | null;
  latencyMs: number | null;
  estimatedCost: number | null;
}

export interface ComparisonResult {
  id: string;
  prompt: string;
  system: string | null;
  saved: boolean;
  createdAt: string;
  responses: SavedResponse[];
}

export interface SavedResponse {
  modelId: string;
  provider: string;
  content: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  latencyMs: number;
  error: string | null;
}
