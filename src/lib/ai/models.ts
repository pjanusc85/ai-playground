import { ModelConfig, ModelId } from "@/types";

export const MODELS: ModelConfig[] = [
  {
    id: "gpt-4o",
    gatewayModelId: "openai/gpt-4o",
    displayName: "GPT-4o",
    provider: "openai",
    providerLabel: "OpenAI",
    accentColor: "#10B981",
    pricing: {
      inputPerMillion: 2.5,
      outputPerMillion: 10.0,
    },
  },
  {
    id: "claude-sonnet",
    gatewayModelId: "anthropic/claude-sonnet-4-20250514",
    displayName: "Claude Sonnet",
    provider: "anthropic",
    providerLabel: "Anthropic",
    accentColor: "#F59E0B",
    pricing: {
      inputPerMillion: 3.0,
      outputPerMillion: 15.0,
    },
  },
  {
    id: "grok",
    gatewayModelId: "xai/grok-3",
    displayName: "Grok",
    provider: "xai",
    providerLabel: "xAI",
    accentColor: "#6366F1",
    pricing: {
      inputPerMillion: 3.0,
      outputPerMillion: 15.0,
    },
  },
];

export function getModelConfig(id: ModelId): ModelConfig {
  const config = MODELS.find((m) => m.id === id);
  if (!config) throw new Error(`Unknown model: ${id}`);
  return config;
}
