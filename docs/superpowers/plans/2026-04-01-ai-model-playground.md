# AI Model Playground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a streaming AI model comparison playground that sends prompts to GPT-4o, Claude Sonnet, and Grok simultaneously, displaying responses side-by-side with performance metrics.

**Architecture:** Next.js 15 App Router with Vercel AI SDK + AI Gateway for unified provider access. NDJSON streaming protocol merges 3 concurrent model streams over a single HTTP response. Vercel Postgres (Neon) + Prisma for history persistence. Dark "Observatory" UI theme with shadcn/ui + Tailwind.

**Tech Stack:** Next.js 15, TypeScript, Vercel AI SDK (`ai`, `@ai-sdk/gateway`), Prisma, Vercel Postgres, shadcn/ui, Tailwind CSS, react-markdown, JetBrains Mono + Instrument Serif fonts

---

## File Structure

```
okara/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout, fonts, theme, global styles
│   │   ├── page.tsx                # Main playground page (server component shell)
│   │   ├── globals.css             # Tailwind directives + CSS variables + custom styles
│   │   ├── history/
│   │   │   └── page.tsx            # Saved comparisons list page
│   │   └── api/
│   │       ├── compare/
│   │       │   └── route.ts        # POST — parallel stream 3 models (NDJSON)
│   │       └── history/
│   │           ├── route.ts        # GET (list) + POST (save comparison)
│   │           └── [id]/
│   │               └── route.ts    # PATCH (toggle saved) + DELETE
│   ├── components/
│   │   ├── playground.tsx          # Client component: full playground orchestrator
│   │   ├── prompt-input.tsx        # Prompt textarea + submit button
│   │   ├── comparison-grid.tsx     # 3-panel grid layout
│   │   ├── model-panel.tsx         # Single model response column
│   │   ├── metrics-bar.tsx         # Tokens, cost, latency display
│   │   ├── header.tsx              # App header with sync-scroll toggle + history link
│   │   ├── history-list.tsx        # Saved comparisons browser
│   │   ├── history-detail.tsx      # Expanded comparison view
│   │   └── ui/                     # shadcn/ui primitives (button, card, textarea, etc.)
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── gateway.ts          # AI Gateway client setup (createGateway)
│   │   │   ├── models.ts           # Model configs: ids, pricing, labels, colors
│   │   │   └── stream-compare.ts   # Parallel streaming logic → NDJSON ReadableStream
│   │   ├── db.ts                   # Prisma client singleton
│   │   ├── queries.ts              # DB read/write helpers
│   │   └── utils.ts                # Cost calculation, formatters
│   ├── hooks/
│   │   ├── use-comparison.ts       # Client hook: manages 3 streams from NDJSON
│   │   └── use-sync-scroll.ts      # Synchronized scrolling across panels
│   └── types/
│       └── index.ts                # Shared TypeScript types
├── prisma/
│   └── schema.prisma               # Comparison + Response models
├── .env.local                       # AI_GATEWAY_API_KEY, DATABASE_URL, DIRECT_DATABASE_URL
├── tailwind.config.ts
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
└── package.json
```

---

## Task 1: Project Scaffolding & Dependencies

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `.env.local`, `.gitignore`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /Users/Paulcalinawa/Documents/okara
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --skip-install
```

Select defaults: yes to all prompts. This creates the base Next.js 15 project.

- [ ] **Step 2: Install core dependencies**

```bash
npm install ai @ai-sdk/gateway prisma @prisma/client react-markdown rehype-highlight
npm install -D @types/node
```

- [ ] **Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init -d
```

Then install the specific components we need:

```bash
npx shadcn@latest add button card textarea scroll-area badge separator skeleton dialog
```

- [ ] **Step 4: Create `.env.local`**

Create file at `okara/.env.local`:

```env
AI_GATEWAY_API_KEY=
DATABASE_URL=
DIRECT_DATABASE_URL=
```

Leave values empty — they'll be filled from the email credentials.

- [ ] **Step 5: Update `.gitignore`**

Ensure `.env.local` is in `.gitignore` (create-next-app should handle this, but verify).

- [ ] **Step 6: Verify the app runs**

```bash
npm run dev
```

Expected: Next.js dev server starts on http://localhost:3000 with default page.

- [ ] **Step 7: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold Next.js 15 project with dependencies"
```

---

## Task 2: TypeScript Types & Model Configuration

**Files:**
- Create: `src/types/index.ts`
- Create: `src/lib/ai/models.ts`
- Create: `src/lib/utils.ts`

- [ ] **Step 1: Define shared types**

Create `src/types/index.ts`:

```typescript
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
```

- [ ] **Step 2: Define model configurations**

Create `src/lib/ai/models.ts`:

```typescript
import { ModelConfig, ModelId, TokenUsage } from "@/types";

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
```

- [ ] **Step 3: Create utility functions**

Create `src/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ModelConfig, TokenUsage } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
```

Note: `cn()` may already exist if shadcn init created `src/lib/utils.ts`. If so, add the new functions to the existing file rather than overwriting.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/lib/ai/models.ts src/lib/utils.ts
git commit -m "feat: add TypeScript types, model configs, and utility functions"
```

---

## Task 3: AI Gateway & Parallel Streaming Logic

**Files:**
- Create: `src/lib/ai/gateway.ts`
- Create: `src/lib/ai/stream-compare.ts`

- [ ] **Step 1: Set up AI Gateway client**

Create `src/lib/ai/gateway.ts`:

```typescript
import { createGateway } from "@ai-sdk/gateway";

export const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
  baseURL: "https://ai-gateway.vercel.sh/v1/ai",
});
```

- [ ] **Step 2: Build parallel streaming function**

Create `src/lib/ai/stream-compare.ts`:

```typescript
import { streamText } from "ai";
import { gateway } from "./gateway";
import { MODELS } from "./models";
import { calculateCost } from "../utils";
import { ModelId, StreamEvent } from "@/types";

export function createCompareStream(
  prompt: string,
  system?: string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const streamPromises = MODELS.map(async (modelConfig) => {
        const startTime = Date.now();

        try {
          const result = streamText({
            model: gateway(modelConfig.gatewayModelId),
            prompt,
            ...(system ? { system } : {}),
          });

          for await (const textPart of result.textStream) {
            const event: StreamEvent = {
              model: modelConfig.id,
              type: "text-delta",
              content: textPart,
            };
            controller.enqueue(
              encoder.encode(JSON.stringify(event) + "\n")
            );
          }

          const { usage } = await result;
          const latencyMs = Date.now() - startTime;
          const tokenUsage = {
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
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
        } catch (error) {
          const errorEvent: StreamEvent = {
            model: modelConfig.id,
            type: "error",
            message:
              error instanceof Error ? error.message : "Unknown error",
          };
          controller.enqueue(
            encoder.encode(JSON.stringify(errorEvent) + "\n")
          );
        }
      });

      await Promise.allSettled(streamPromises);
      controller.close();
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/gateway.ts src/lib/ai/stream-compare.ts
git commit -m "feat: add AI Gateway client and parallel streaming logic"
```

---

## Task 4: Compare API Route

**Files:**
- Create: `src/app/api/compare/route.ts`

- [ ] **Step 1: Create the compare endpoint**

Create `src/app/api/compare/route.ts`:

```typescript
import { createCompareStream } from "@/lib/ai/stream-compare";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { prompt, system } = body;

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json(
      { error: "Prompt is required" },
      { status: 400 }
    );
  }

  if (prompt.length > 10000) {
    return NextResponse.json(
      { error: "Prompt must be under 10,000 characters" },
      { status: 400 }
    );
  }

  const stream = createCompareStream(prompt, system);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

- [ ] **Step 2: Verify the endpoint works**

Start the dev server and test with curl (requires a valid `AI_GATEWAY_API_KEY` in `.env.local`):

```bash
curl -X POST http://localhost:3000/api/compare \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Say hello in one sentence"}' \
  --no-buffer
```

Expected: NDJSON lines streaming in, tagged with `gpt-4o`, `claude-sonnet`, `grok`. Each model produces `text-delta` events followed by a `finish` event.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/compare/route.ts
git commit -m "feat: add /api/compare endpoint with parallel NDJSON streaming"
```

---

## Task 5: Client-Side Hooks

**Files:**
- Create: `src/hooks/use-comparison.ts`
- Create: `src/hooks/use-sync-scroll.ts`

- [ ] **Step 1: Build the comparison hook**

Create `src/hooks/use-comparison.ts`:

```typescript
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
```

- [ ] **Step 2: Build the sync-scroll hook**

Create `src/hooks/use-sync-scroll.ts`:

```typescript
"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export function useSyncScroll(panelCount: number) {
  const [enabled, setEnabled] = useState(false);
  const scrollRefs = useRef<(HTMLDivElement | null)[]>(
    Array(panelCount).fill(null)
  );
  const isScrollingRef = useRef(false);

  const setRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      scrollRefs.current[index] = el;
    },
    []
  );

  useEffect(() => {
    if (!enabled) return;

    const handleScroll = (sourceIndex: number) => () => {
      if (isScrollingRef.current) return;
      isScrollingRef.current = true;

      const source = scrollRefs.current[sourceIndex];
      if (!source) {
        isScrollingRef.current = false;
        return;
      }

      const scrollTop = source.scrollTop;

      scrollRefs.current.forEach((ref, i) => {
        if (i !== sourceIndex && ref) {
          ref.scrollTop = scrollTop;
        }
      });

      requestAnimationFrame(() => {
        isScrollingRef.current = false;
      });
    };

    const handlers = scrollRefs.current.map((ref, i) => {
      const handler = handleScroll(i);
      ref?.addEventListener("scroll", handler, { passive: true });
      return { ref, handler };
    });

    return () => {
      handlers.forEach(({ ref, handler }) => {
        ref?.removeEventListener("scroll", handler);
      });
    };
  }, [enabled]);

  return { enabled, setEnabled, setRef };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-comparison.ts src/hooks/use-sync-scroll.ts
git commit -m "feat: add useComparison and useSyncScroll hooks"
```

---

## Task 6: Database Schema & Queries

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`
- Create: `src/lib/queries.ts`

- [ ] **Step 1: Write the Prisma schema**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
}

model Comparison {
  id        String   @id @default(cuid())
  prompt    String
  system    String?
  saved     Boolean  @default(false)
  createdAt DateTime @default(now())

  responses Response[]
}

model Response {
  id               String   @id @default(cuid())
  comparisonId     String
  modelId          String
  provider         String
  content          String
  promptTokens     Int      @default(0)
  completionTokens Int      @default(0)
  totalTokens      Int      @default(0)
  estimatedCost    Float    @default(0)
  latencyMs        Int      @default(0)
  error            String?
  createdAt        DateTime @default(now())

  comparison Comparison @relation(fields: [comparisonId], references: [id], onDelete: Cascade)

  @@index([comparisonId])
}
```

- [ ] **Step 2: Create Prisma client singleton**

Create `src/lib/db.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 3: Create database query helpers**

Create `src/lib/queries.ts`:

```typescript
import { prisma } from "./db";
import { ModelResponse, ModelId } from "@/types";
import { getModelConfig } from "./ai/models";

export async function saveComparison(
  prompt: string,
  system: string | null,
  responses: Record<ModelId, ModelResponse>
) {
  return prisma.comparison.create({
    data: {
      prompt,
      system,
      saved: false,
      responses: {
        create: Object.values(responses).map((r) => ({
          modelId: r.modelId,
          provider: getModelConfig(r.modelId).provider,
          content: r.text,
          promptTokens: r.usage?.promptTokens ?? 0,
          completionTokens: r.usage?.completionTokens ?? 0,
          totalTokens: r.usage?.totalTokens ?? 0,
          estimatedCost: r.estimatedCost ?? 0,
          latencyMs: r.latencyMs ?? 0,
          error: r.error,
        })),
      },
    },
    include: { responses: true },
  });
}

export async function listComparisons(
  page: number = 1,
  limit: number = 20,
  savedOnly: boolean = false
) {
  const where = savedOnly ? { saved: true } : {};

  const [comparisons, total] = await Promise.all([
    prisma.comparison.findMany({
      where,
      include: { responses: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.comparison.count({ where }),
  ]);

  return { comparisons, total, page };
}

export async function toggleSaved(id: string, saved: boolean) {
  return prisma.comparison.update({
    where: { id },
    data: { saved },
  });
}

export async function deleteComparison(id: string) {
  return prisma.comparison.delete({
    where: { id },
  });
}
```

- [ ] **Step 4: Generate Prisma client and run migration**

This requires `DATABASE_URL` and `DIRECT_DATABASE_URL` to be set in `.env.local`. If not yet available, skip the migration and come back after credentials are provided.

```bash
npx prisma generate
npx prisma db push
```

Expected: Prisma client generated, schema pushed to database.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma src/lib/db.ts src/lib/queries.ts
git commit -m "feat: add Prisma schema and database query helpers"
```

---

## Task 7: History API Routes

**Files:**
- Create: `src/app/api/history/route.ts`
- Create: `src/app/api/history/[id]/route.ts`

- [ ] **Step 1: Create history list + save endpoint**

Create `src/app/api/history/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { listComparisons, saveComparison } from "@/lib/queries";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const savedOnly = searchParams.get("saved") === "true";

  const result = await listComparisons(page, limit, savedOnly);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { prompt, system, responses } = body;

  if (!prompt || !responses) {
    return NextResponse.json(
      { error: "prompt and responses are required" },
      { status: 400 }
    );
  }

  const comparison = await saveComparison(prompt, system || null, responses);
  return NextResponse.json(comparison, { status: 201 });
}
```

- [ ] **Step 2: Create single comparison endpoint**

Create `src/app/api/history/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { toggleSaved, deleteComparison } from "@/lib/queries";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  if (typeof body.saved !== "boolean") {
    return NextResponse.json(
      { error: "saved (boolean) is required" },
      { status: 400 }
    );
  }

  const comparison = await toggleSaved(id, body.saved);
  return NextResponse.json(comparison);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deleteComparison(id);
  return new Response(null, { status: 204 });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/history/route.ts src/app/api/history/\[id\]/route.ts
git commit -m "feat: add history API routes (list, save, toggle, delete)"
```

---

## Task 8: Global Layout, Fonts & Theme

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Update the root layout with fonts and metadata**

Replace `src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Playground — Compare Models Side by Side",
  description:
    "Send a prompt to GPT-4o, Claude Sonnet, and Grok simultaneously. Compare responses, latency, tokens, and cost.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${jetbrainsMono.variable} font-mono antialiased bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Write the global CSS with Observatory theme**

Replace `src/app/globals.css` with:

```css
@import "tailwindcss";

:root {
  --bg-primary: #0a0a0b;
  --bg-panel: #111113;
  --bg-elevated: #1a1a1d;
  --border: #2a2a2e;
  --text-primary: #e8e8ec;
  --text-secondary: #6e6e7a;
  --accent-openai: #10b981;
  --accent-anthropic: #f59e0b;
  --accent-xai: #6366f1;
  --font-serif: "Instrument Serif", Georgia, serif;
}

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

/* Panel glow effect for streaming state */
@keyframes pulse-glow {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}

.panel-streaming-openai {
  border-top: 2px solid var(--accent-openai);
  box-shadow: 0 -4px 20px rgba(16, 185, 129, 0.15);
  animation: pulse-glow 2s ease-in-out infinite;
}

.panel-streaming-anthropic {
  border-top: 2px solid var(--accent-anthropic);
  box-shadow: 0 -4px 20px rgba(245, 158, 11, 0.15);
  animation: pulse-glow 2s ease-in-out infinite;
}

.panel-streaming-xai {
  border-top: 2px solid var(--accent-xai);
  box-shadow: 0 -4px 20px rgba(99, 102, 241, 0.15);
  animation: pulse-glow 2s ease-in-out infinite;
}

.panel-done-openai {
  border-top: 2px solid var(--accent-openai);
}

.panel-done-anthropic {
  border-top: 2px solid var(--accent-anthropic);
}

.panel-done-xai {
  border-top: 2px solid var(--accent-xai);
}

/* Streaming cursor blink */
@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 1.1em;
  vertical-align: text-bottom;
  animation: blink 0.8s step-end infinite;
}

/* Markdown response styling */
.response-content {
  font-family: var(--font-serif);
  font-size: 1.05rem;
  line-height: 1.7;
}

.response-content h1,
.response-content h2,
.response-content h3 {
  font-family: var(--font-mono);
  margin-top: 1.2em;
  margin-bottom: 0.5em;
}

.response-content p {
  margin-bottom: 0.8em;
}

.response-content code {
  font-family: var(--font-mono);
  font-size: 0.9em;
  background: var(--bg-elevated);
  padding: 0.15em 0.4em;
  border-radius: 4px;
}

.response-content pre {
  background: var(--bg-elevated);
  padding: 1em;
  border-radius: 8px;
  overflow-x: auto;
  margin-bottom: 1em;
}

.response-content pre code {
  background: transparent;
  padding: 0;
}

/* Metrics counter animation */
@keyframes count-up {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.metric-reveal {
  animation: count-up 0.3s ease-out forwards;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: var(--bg-panel);
}

::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}
```

- [ ] **Step 3: Verify the theme renders**

```bash
npm run dev
```

Visit http://localhost:3000. Expected: dark background (#0A0A0B), no errors, JetBrains Mono font loads.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat: add Observatory dark theme with fonts and animations"
```

---

## Task 9: UI Components — Header, Prompt Input, Metrics Bar

**Files:**
- Create: `src/components/header.tsx`
- Create: `src/components/prompt-input.tsx`
- Create: `src/components/metrics-bar.tsx`

- [ ] **Step 1: Build the header component**

Create `src/components/header.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  syncScroll: boolean;
  onSyncScrollChange: (enabled: boolean) => void;
}

export function Header({ syncScroll, onSyncScrollChange }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-[var(--accent-openai)]" />
        <div className="w-2 h-2 rounded-full bg-[var(--accent-anthropic)]" />
        <div className="w-2 h-2 rounded-full bg-[var(--accent-xai)]" />
        <h1 className="text-lg font-semibold tracking-tight ml-2">
          AI Playground
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSyncScrollChange(!syncScroll)}
          className={`text-xs ${syncScroll ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
        >
          {syncScroll ? "Sync Scroll: On" : "Sync Scroll: Off"}
        </Button>
        <Link href="/history">
          <Button variant="ghost" size="sm" className="text-xs">
            History
          </Button>
        </Link>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Build the prompt input component**

Create `src/components/prompt-input.tsx`:

```tsx
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
```

- [ ] **Step 3: Build the metrics bar component**

Create `src/components/metrics-bar.tsx`:

```tsx
"use client";

import { ModelResponse } from "@/types";
import { formatCost, formatLatency, formatTokens } from "@/lib/utils";

interface MetricsBarProps {
  response: ModelResponse;
  accentColor: string;
  onSave?: () => void;
  isSaved?: boolean;
}

export function MetricsBar({
  response,
  accentColor,
  onSave,
  isSaved,
}: MetricsBarProps) {
  const hasMetrics =
    response.usage !== null && response.latencyMs !== null;

  if (!hasMetrics && !response.error) return null;

  if (response.error) {
    return (
      <div className="px-4 py-2 border-t border-[var(--border)] bg-red-950/20">
        <p className="text-xs text-red-400 truncate">{response.error}</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-2 border-t border-[var(--border)] flex items-center justify-between">
      <div className="flex items-center gap-4 text-[11px] text-[var(--text-secondary)]">
        <span className="metric-reveal">
          {formatLatency(response.latencyMs!)}
        </span>
        <span className="metric-reveal" style={{ animationDelay: "0.1s" }}>
          {formatTokens(response.usage!.totalTokens)} tok
        </span>
        <span className="metric-reveal" style={{ animationDelay: "0.2s" }}>
          {formatCost(response.estimatedCost!)}
        </span>
      </div>
      {onSave && (
        <button
          onClick={onSave}
          className="text-[11px] transition-colors hover:text-[var(--text-primary)]"
          style={{ color: isSaved ? accentColor : "var(--text-secondary)" }}
        >
          {isSaved ? "Saved" : "Save"}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/header.tsx src/components/prompt-input.tsx src/components/metrics-bar.tsx
git commit -m "feat: add header, prompt input, and metrics bar components"
```

---

## Task 10: UI Components — Model Panel & Comparison Grid

**Files:**
- Create: `src/components/model-panel.tsx`
- Create: `src/components/comparison-grid.tsx`

- [ ] **Step 1: Build the model panel component**

Create `src/components/model-panel.tsx`:

```tsx
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
```

- [ ] **Step 2: Build the comparison grid component**

Create `src/components/comparison-grid.tsx`:

```tsx
"use client";

import { ModelId, ModelResponse } from "@/types";
import { MODELS } from "@/lib/ai/models";
import { ModelPanel } from "./model-panel";

interface ComparisonGridProps {
  responses: Record<ModelId, ModelResponse>;
  setScrollRef: (index: number) => (el: HTMLDivElement | null) => void;
  onSave?: (modelId: ModelId) => void;
  savedModels?: Set<string>;
}

export function ComparisonGrid({
  responses,
  setScrollRef,
  onSave,
  savedModels,
}: ComparisonGridProps) {
  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 px-6 pb-6 min-h-0">
      {MODELS.map((config, index) => (
        <ModelPanel
          key={config.id}
          config={config}
          response={responses[config.id]}
          scrollRef={setScrollRef(index)}
          onSave={onSave ? () => onSave(config.id) : undefined}
          isSaved={savedModels?.has(config.id)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/model-panel.tsx src/components/comparison-grid.tsx
git commit -m "feat: add model panel and comparison grid components"
```

---

## Task 11: Playground Orchestrator & Main Page

**Files:**
- Create: `src/components/playground.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Build the playground orchestrator**

Create `src/components/playground.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import { Header } from "./header";
import { PromptInput } from "./prompt-input";
import { ComparisonGrid } from "./comparison-grid";
import { useComparison } from "@/hooks/use-comparison";
import { useSyncScroll } from "@/hooks/use-sync-scroll";
import { ModelId } from "@/types";

export function Playground() {
  const { responses, isRunning, run, stop } = useComparison();
  const { enabled: syncScroll, setEnabled: setSyncScroll, setRef } =
    useSyncScroll(3);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedComparison, setSavedComparison] = useState(false);

  const handleSubmit = useCallback(
    (prompt: string) => {
      setLastPrompt(prompt);
      setSavedComparison(false);
      run(prompt);
    },
    [run]
  );

  const handleSave = useCallback(async () => {
    if (!lastPrompt || isSaving || savedComparison) return;

    const allDone = Object.values(responses).every((r) => !r.isStreaming);
    if (!allDone) return;

    setIsSaving(true);
    try {
      await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: lastPrompt,
          system: null,
          responses,
        }),
      });
      setSavedComparison(true);
    } finally {
      setIsSaving(false);
    }
  }, [lastPrompt, responses, isSaving, savedComparison]);

  const allDone =
    lastPrompt !== null &&
    Object.values(responses).every((r) => !r.isStreaming);

  return (
    <div className="flex flex-col h-screen">
      <Header syncScroll={syncScroll} onSyncScrollChange={setSyncScroll} />
      <PromptInput
        onSubmit={handleSubmit}
        isRunning={isRunning}
        onStop={stop}
      />
      {allDone && !savedComparison && (
        <div className="px-6 pb-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            {isSaving ? "Saving..." : "Save this comparison"}
          </button>
        </div>
      )}
      {savedComparison && (
        <div className="px-6 pb-2">
          <span className="text-xs text-[var(--accent-openai)]">
            Comparison saved
          </span>
        </div>
      )}
      <ComparisonGrid responses={responses} setScrollRef={setRef} />
    </div>
  );
}
```

- [ ] **Step 2: Update the main page**

Replace `src/app/page.tsx` with:

```tsx
import { Playground } from "@/components/playground";

export default function Home() {
  return <Playground />;
}
```

- [ ] **Step 3: Verify the full playground renders**

```bash
npm run dev
```

Visit http://localhost:3000. Expected: dark theme, header with sync-scroll toggle and history link, prompt input area, three empty model panels labeled GPT-4o / Claude Sonnet / Grok with their respective accent colors. Typing a prompt and clicking Compare should trigger streaming (if API key is configured).

- [ ] **Step 4: Commit**

```bash
git add src/components/playground.tsx src/app/page.tsx
git commit -m "feat: add playground orchestrator and wire up main page"
```

---

## Task 12: History Page

**Files:**
- Create: `src/components/history-list.tsx`
- Create: `src/components/history-detail.tsx`
- Create: `src/app/history/page.tsx`

- [ ] **Step 1: Build the history list component**

Create `src/components/history-list.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { ComparisonResult } from "@/types";
import { HistoryDetail } from "./history-detail";
import { Button } from "@/components/ui/button";

export function HistoryList() {
  const [comparisons, setComparisons] = useState<ComparisonResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async (p: number) => {
    setLoading(true);
    const res = await fetch(`/api/history?page=${p}&limit=10`);
    const data = await res.json();
    setComparisons(data.comparisons);
    setTotal(data.total);
    setPage(p);
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory(1);
  }, []);

  const handleDelete = async (id: string) => {
    await fetch(`/api/history/${id}`, { method: "DELETE" });
    setComparisons((prev) => prev.filter((c) => c.id !== id));
    setTotal((prev) => prev - 1);
    if (expandedId === id) setExpandedId(null);
  };

  const handleToggleSaved = async (id: string, saved: boolean) => {
    await fetch(`/api/history/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saved: !saved }),
    });
    setComparisons((prev) =>
      prev.map((c) => (c.id === id ? { ...c, saved: !saved } : c))
    );
  };

  const totalPages = Math.ceil(total / 10);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--text-secondary)] text-sm">
        Loading history...
      </div>
    );
  }

  if (comparisons.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--text-secondary)] text-sm">
        No comparisons yet. Go make some!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {comparisons.map((comparison) => (
        <div
          key={comparison.id}
          className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg overflow-hidden"
        >
          <button
            onClick={() =>
              setExpandedId(
                expandedId === comparison.id ? null : comparison.id
              )
            }
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{comparison.prompt}</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                {new Date(comparison.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleSaved(comparison.id, comparison.saved);
                }}
                className="text-[11px] px-2 py-1 rounded transition-colors"
                style={{
                  color: comparison.saved
                    ? "var(--accent-openai)"
                    : "var(--text-secondary)",
                }}
              >
                {comparison.saved ? "Saved" : "Save"}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(comparison.id);
                }}
                className="text-[11px] text-[var(--text-secondary)] hover:text-red-400 px-2 py-1 rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </button>

          {expandedId === comparison.id && (
            <HistoryDetail comparison={comparison} />
          )}
        </div>
      ))}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchHistory(page - 1)}
            disabled={page <= 1}
            className="text-xs"
          >
            Previous
          </Button>
          <span className="text-xs text-[var(--text-secondary)]">
            {page} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchHistory(page + 1)}
            disabled={page >= totalPages}
            className="text-xs"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build the history detail component**

Create `src/components/history-detail.tsx`:

```tsx
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
```

- [ ] **Step 3: Create the history page**

Create `src/app/history/page.tsx`:

```tsx
import Link from "next/link";
import { HistoryList } from "@/components/history-list";

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
        <h1 className="text-lg font-semibold tracking-tight">
          Comparison History
        </h1>
        <Link
          href="/"
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          Back to Playground
        </Link>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-6">
        <HistoryList />
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/history-list.tsx src/components/history-detail.tsx src/app/history/page.tsx
git commit -m "feat: add history page with list, detail, pagination, and CRUD"
```

---

## Task 13: Persist Comparisons After Streaming

**Files:**
- Modify: `src/app/api/compare/route.ts`

- [ ] **Step 1: Add auto-save after streaming completes**

Update `src/app/api/compare/route.ts` to collect responses and save after all streams finish:

```typescript
import { createCompareStream } from "@/lib/ai/stream-compare";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { prompt, system } = body;

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json(
      { error: "Prompt is required" },
      { status: 400 }
    );
  }

  if (prompt.length > 10000) {
    return NextResponse.json(
      { error: "Prompt must be under 10,000 characters" },
      { status: 400 }
    );
  }

  const { stream, completionPromise } = createCompareStream(
    prompt,
    system
  );

  // Fire-and-forget: save to DB after all streams finish
  completionPromise.then(async (collectedResponses) => {
    try {
      const { saveComparisonFromStream } = await import("@/lib/queries");
      await saveComparisonFromStream(prompt, system || null, collectedResponses);
    } catch (e) {
      console.error("Failed to save comparison:", e);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

- [ ] **Step 2: Update stream-compare to collect results**

Update `src/lib/ai/stream-compare.ts` — modify `createCompareStream` to return both the stream and a promise that resolves with collected data:

```typescript
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

          const { usage } = await result;
          const latencyMs = Date.now() - startTime;
          const tokenUsage: TokenUsage = {
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
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
```

- [ ] **Step 3: Add saveComparisonFromStream to queries**

Add to `src/lib/queries.ts`:

```typescript
import { CollectedResponse } from "./ai/stream-compare";

export async function saveComparisonFromStream(
  prompt: string,
  system: string | null,
  responses: CollectedResponse[]
) {
  return prisma.comparison.create({
    data: {
      prompt,
      system,
      saved: false,
      responses: {
        create: responses.map((r) => ({
          modelId: r.modelId,
          provider: r.provider,
          content: r.content,
          promptTokens: r.promptTokens,
          completionTokens: r.completionTokens,
          totalTokens: r.totalTokens,
          estimatedCost: r.estimatedCost,
          latencyMs: r.latencyMs,
          error: r.error,
        })),
      },
    },
  });
}
```

- [ ] **Step 4: Remove the client-side save from playground**

Update `src/components/playground.tsx` — remove the manual save button and related state, since comparisons now auto-persist. Replace the save button area with a simpler "saved" indicator:

```tsx
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
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/compare/route.ts src/lib/ai/stream-compare.ts src/lib/queries.ts src/components/playground.tsx
git commit -m "feat: auto-persist comparisons after streaming completes"
```

---

## Task 14: Mobile Responsive Layout

**Files:**
- Modify: `src/components/comparison-grid.tsx`
- Modify: `src/components/header.tsx`

- [ ] **Step 1: Add tab-based mobile layout to comparison grid**

Update `src/components/comparison-grid.tsx`:

```tsx
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
```

- [ ] **Step 2: Make header responsive**

Update `src/components/header.tsx` — hide sync scroll on mobile (it only applies to 3-column view):

```tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  syncScroll: boolean;
  onSyncScrollChange: (enabled: boolean) => void;
}

export function Header({ syncScroll, onSyncScrollChange }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-[var(--accent-openai)]" />
        <div className="w-2 h-2 rounded-full bg-[var(--accent-anthropic)]" />
        <div className="w-2 h-2 rounded-full bg-[var(--accent-xai)]" />
        <h1 className="text-lg font-semibold tracking-tight ml-2">
          AI Playground
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSyncScrollChange(!syncScroll)}
          className={`text-xs hidden lg:inline-flex ${syncScroll ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
        >
          {syncScroll ? "Sync Scroll: On" : "Sync Scroll: Off"}
        </Button>
        <Link href="/history">
          <Button variant="ghost" size="sm" className="text-xs">
            History
          </Button>
        </Link>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/comparison-grid.tsx src/components/header.tsx
git commit -m "feat: add mobile responsive layout with tab-based panel switching"
```

---

## Task 15: Build Verification & Deployment Prep

**Files:**
- Modify: `next.config.ts`
- Modify: `package.json` (verify scripts)

- [ ] **Step 1: Verify the build passes**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors. Fix any type errors that arise.

- [ ] **Step 2: Run the production build locally**

```bash
npm run start
```

Visit http://localhost:3000. Expected: Full playground renders, dark theme, all three panels visible.

- [ ] **Step 3: Test the complete flow** (requires API key)

1. Enter a prompt and click Compare
2. Verify all 3 models stream responses with accent-colored glow
3. Verify metrics appear after each model finishes
4. Navigate to /history and verify the comparison was auto-saved
5. Test save/delete/pagination on history page
6. Test on mobile viewport (Chrome DevTools responsive mode)

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build issues and verify production readiness"
```

---

## Task 16: README & Documentation

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the README**

Create `README.md`:

````markdown
# AI Model Playground

Compare responses from GPT-4o, Claude Sonnet, and Grok side-by-side. Send a single prompt to all three models simultaneously and evaluate their outputs, response times, token usage, and estimated costs.

## Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Browser    │────▶│  Next.js API     │────▶│  Vercel AI       │
│   (React)    │◀────│  /api/compare    │◀────│  Gateway         │
│              │NDJSON│                  │     │  (OpenAI,        │
│  3-panel UI  │     │  Parallel        │     │   Anthropic,     │
│  streaming   │     │  streamText()    │     │   xAI)           │
└─────────────┘     └────────┬─────────┘     └──────────────────┘
                             │
                    ┌────────▼─────────┐
                    │  Vercel Postgres  │
                    │  (Neon)           │
                    │  via Prisma       │
                    └──────────────────┘
```

### Key Design Decisions

- **NDJSON streaming protocol**: A single HTTP response carries tagged chunks from all 3 models, demuxed on the client. This avoids 3 separate connections and simplifies error handling.
- **Vercel AI Gateway**: Single API key routes to all providers. Uses `@ai-sdk/gateway` with `createGateway()` for unified access.
- **Auto-persist**: Every comparison is saved after streaming completes (fire-and-forget). Users can star/delete from history.
- **Observatory UI theme**: Dark, scientific aesthetic with model-specific accent colors and streaming glow effects.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| AI SDK | `ai` + `@ai-sdk/gateway` |
| Database | Vercel Postgres (Neon) + Prisma |
| UI | shadcn/ui + Tailwind CSS |
| Markdown | react-markdown + rehype-highlight |
| Deployment | Vercel |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/compare/        # POST — parallel NDJSON streaming
│   ├── api/history/        # CRUD for saved comparisons
│   ├── history/            # History page
│   └── page.tsx            # Main playground
├── components/             # React components
│   ├── playground.tsx      # Orchestrator (hooks + layout)
│   ├── prompt-input.tsx    # Textarea + submit
│   ├── comparison-grid.tsx # 3-panel layout (desktop) / tabs (mobile)
│   ├── model-panel.tsx     # Single model column
│   └── metrics-bar.tsx     # Latency, tokens, cost display
├── hooks/                  # Custom React hooks
│   ├── use-comparison.ts   # Manages 3 concurrent streams
│   └── use-sync-scroll.ts  # Synchronized panel scrolling
├── lib/                    # Server utilities
│   ├── ai/                 # Gateway client, model configs, streaming
│   ├── db.ts               # Prisma client singleton
│   └── queries.ts          # Database operations
└── types/                  # Shared TypeScript types
```

## Setup

### Prerequisites

- Node.js 18+
- A Vercel account (for Postgres + deployment)
- Vercel AI Gateway API key

### Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Fill in AI_GATEWAY_API_KEY, DATABASE_URL, DIRECT_DATABASE_URL

# Push database schema
npx prisma db push

# Start dev server
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway key (routes to OpenAI, Anthropic, xAI) |
| `DATABASE_URL` | Vercel Postgres pooled connection string |
| `DIRECT_DATABASE_URL` | Vercel Postgres direct connection (for migrations) |

### Deploy to Vercel

```bash
# Link to Vercel project
npx vercel link

# Deploy
npx vercel --prod
```

Or push to GitHub and connect the repo to Vercel for automatic deploys.

## Future Improvements

- **Authentication**: User accounts to keep history private
- **Model parameter tuning**: Temperature, max tokens, system prompt per-model
- **Response rating**: Thumbs up/down on individual responses
- **Export**: Share comparisons via URL or export as JSON/PDF
- **More models**: Add Gemini, Llama, Mistral via gateway
- **Rate limiting**: Protect against abuse on the public endpoint
````

- [ ] **Step 2: Create .env.local.example**

Create `.env.local.example`:

```env
# Vercel AI Gateway — routes to OpenAI, Anthropic, xAI
AI_GATEWAY_API_KEY=

# Vercel Postgres (Neon)
DATABASE_URL=
DIRECT_DATABASE_URL=
```

- [ ] **Step 3: Commit**

```bash
git add README.md .env.local.example
git commit -m "docs: add README with architecture, setup, and project documentation"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Project scaffolding & deps | package.json, next.config.ts |
| 2 | Types & model config | types/index.ts, lib/ai/models.ts, lib/utils.ts |
| 3 | AI Gateway & streaming | lib/ai/gateway.ts, lib/ai/stream-compare.ts |
| 4 | Compare API route | api/compare/route.ts |
| 5 | Client-side hooks | hooks/use-comparison.ts, hooks/use-sync-scroll.ts |
| 6 | Database schema & queries | prisma/schema.prisma, lib/db.ts, lib/queries.ts |
| 7 | History API routes | api/history/route.ts, api/history/[id]/route.ts |
| 8 | Layout, fonts & theme | app/layout.tsx, app/globals.css |
| 9 | Header, prompt, metrics | components/header.tsx, prompt-input.tsx, metrics-bar.tsx |
| 10 | Model panel & grid | components/model-panel.tsx, comparison-grid.tsx |
| 11 | Playground orchestrator | components/playground.tsx, app/page.tsx |
| 12 | History page | history-list.tsx, history-detail.tsx, history/page.tsx |
| 13 | Auto-persist comparisons | stream-compare.ts (update), queries.ts (update) |
| 14 | Mobile responsive | comparison-grid.tsx (update), header.tsx (update) |
| 15 | Build verification | Build + manual testing |
| 16 | README & docs | README.md, .env.local.example |
