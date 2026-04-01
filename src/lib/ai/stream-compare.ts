import { streamText } from "ai";
import { gateway } from "./gateway";
import { MODELS } from "./models";
import { calculateCost } from "../utils";
import { ModelId, StreamEvent, TokenUsage } from "@/types";

export interface CollectedResponse {
  modelId: ModelId;
  provider: string;
  content: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  latencyMs: number;
  error: string | null;
}

export function createCompareStream(
  prompt: string,
  system?: string
): {
  stream: ReadableStream<Uint8Array>;
  completionPromise: Promise<CollectedResponse[]>;
} {
  const encoder = new TextEncoder();
  const collected: CollectedResponse[] = [];
  let resolveCompletion: (responses: CollectedResponse[]) => void;

  const completionPromise = new Promise<CollectedResponse[]>((resolve) => {
    resolveCompletion = resolve;
  });

  const stream = new ReadableStream({
    async start(controller) {
      const streamPromises = MODELS.map(async (modelConfig) => {
        const startTime = Date.now();
        let fullText = "";

        try {
          const result = streamText({
            model: gateway(modelConfig.gatewayModelId),
            prompt,
            ...(system ? { system } : {}),
          });

          for await (const textPart of result.textStream) {
            fullText += textPart;
            const event: StreamEvent = {
              model: modelConfig.id,
              type: "text-delta",
              content: textPart,
            };
            controller.enqueue(
              encoder.encode(JSON.stringify(event) + "\n")
            );
          }

          const usage = await result.usage;
          const latencyMs = Date.now() - startTime;
          const inputTokens = usage.inputTokens ?? 0;
          const outputTokens = usage.outputTokens ?? 0;
          const tokenUsage: TokenUsage = {
            promptTokens: inputTokens,
            completionTokens: outputTokens,
            totalTokens: inputTokens + outputTokens,
          };
          const estimatedCost = calculateCost(tokenUsage, modelConfig);

          const finishEvent: StreamEvent = {
            model: modelConfig.id,
            type: "finish",
            usage: tokenUsage,
            latencyMs,
            estimatedCost,
          };
          controller.enqueue(
            encoder.encode(JSON.stringify(finishEvent) + "\n")
          );

          collected.push({
            modelId: modelConfig.id,
            provider: modelConfig.provider,
            content: fullText,
            promptTokens: tokenUsage.promptTokens,
            completionTokens: tokenUsage.completionTokens,
            totalTokens: tokenUsage.totalTokens,
            estimatedCost,
            latencyMs,
            error: null,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          const errorEvent: StreamEvent = {
            model: modelConfig.id,
            type: "error",
            message: errorMessage,
          };
          controller.enqueue(
            encoder.encode(JSON.stringify(errorEvent) + "\n")
          );

          collected.push({
            modelId: modelConfig.id,
            provider: modelConfig.provider,
            content: fullText,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            estimatedCost: 0,
            latencyMs: Date.now() - startTime,
            error: errorMessage,
          });
        }
      });

      await Promise.allSettled(streamPromises);
      controller.close();
      resolveCompletion!(collected);
    },
  });

  return { stream, completionPromise };
}
