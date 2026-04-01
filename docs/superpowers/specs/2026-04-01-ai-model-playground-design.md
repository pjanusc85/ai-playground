# AI Model Playground — Design Spec

## Overview

A web application that sends a single prompt to three AI models (GPT-4o, Claude Sonnet, Grok) simultaneously and displays their streaming responses side-by-side with performance metrics. Built as a job application deliverable to demonstrate senior full-stack expertise.

**Deploy target**: Vercel
**Live URL**: TBD after deployment

---

## Architecture

### Approach: Server Actions + Streaming (Approach A)

- **Next.js 15** App Router, React Server Components where possible
- **Vercel AI SDK** with AI Gateway for unified provider access
- **Vercel Postgres (Neon)** + Prisma ORM for persistence
- **shadcn/ui + Tailwind CSS** for UI primitives
- **No auth** — anonymous usage, keeps scope tight

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| AI SDK | `ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/xai` |
| Database | Vercel Postgres (Neon) |
| ORM | Prisma |
| UI | shadcn/ui + Tailwind CSS v4 |
| Markdown | `react-markdown` + `rehype-highlight` |
| Deployment | Vercel |

### AI Models

| Display Name | Provider | Gateway Model ID | Pricing (per 1M tokens) |
|---|---|---|---|
| GPT-4o | OpenAI | `openai/gpt-4o` | $2.50 input / $10.00 output |
| Claude Sonnet | Anthropic | `anthropic/claude-sonnet-4-20250514` | $3.00 input / $15.00 output |
| Grok | xAI | `xai/grok-3` | $3.00 input / $15.00 output |

*Pricing stored in `lib/ai/models.ts` and used for cost estimation.*

---

## Project Structure

```
okara/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout, fonts, providers, dark theme
│   │   ├── page.tsx                # Main playground page
│   │   ├── history/
│   │   │   └── page.tsx            # Saved comparisons list
│   │   └── api/
│   │       └── compare/
│   │           └── route.ts        # POST — streams 3 model responses (NDJSON)
│   ├── components/
│   │   ├── prompt-input.tsx        # Prompt textarea + submit button
│   │   ├── model-panel.tsx         # Single model response column
│   │   ├── comparison-grid.tsx     # 3-panel layout orchestrator
│   │   ├── metrics-bar.tsx         # Tokens, cost, latency display
│   │   ├── history-list.tsx        # Saved comparisons browser
│   │   └── ui/                     # shadcn/ui primitives
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── models.ts           # Model configs (ids, pricing, labels, colors)
│   │   │   └── stream-compare.ts   # Parallel streaming logic
│   │   ├── db/
│   │   │   └── queries.ts          # DB read/write helpers
│   │   └── utils.ts                # Cost calculation, token helpers
│   ├── hooks/
│   │   └── use-comparison.ts       # Client hook managing 3 streams
│   └── types/
│       └── index.ts                # Shared TypeScript types
├── prisma/
│   └── schema.prisma
├── .env.local
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

---

## API Design

### POST `/api/compare`

**Request:**
```json
{
  "prompt": "Explain quantum computing in simple terms",
  "system": "You are a helpful assistant" // optional
}
```

**Response:** NDJSON stream (`Content-Type: text/plain; charset=utf-8`)

Each line is a JSON object tagged with the model source:

```json
{"model": "gpt-4o", "type": "text-delta", "content": "Quantum computing"}
{"model": "claude-sonnet", "type": "text-delta", "content": "At its core"}
{"model": "grok", "type": "text-delta", "content": "Imagine"}
{"model": "gpt-4o", "type": "finish", "usage": {"promptTokens": 12, "completionTokens": 245, "totalTokens": 257}, "latencyMs": 1823, "estimatedCost": 0.0027}
{"model": "claude-sonnet", "type": "error", "message": "Rate limit exceeded"}
```

**Event types:**
- `text-delta` — incremental text chunk, carries `content` string
- `finish` — model completed, carries `usage` metrics + `latencyMs` + `estimatedCost`
- `error` — model-specific failure with `message`, other models keep streaming

**Server-side flow:**
1. Validate prompt (non-empty, max 10,000 chars)
2. Fire `streamText()` for all 3 models concurrently
3. Merge chunks into a single `ReadableStream`, each chunk tagged with model ID
4. Each model stream handles its own errors independently
5. After all streams complete, persist comparison + responses to database

### GET `/api/history`

**Query params:** `?page=1&limit=20&saved=true`

**Response:**
```json
{
  "comparisons": [
    {
      "id": "clx...",
      "prompt": "Explain quantum computing...",
      "saved": true,
      "createdAt": "2026-04-01T...",
      "responses": [
        {
          "modelId": "gpt-4o",
          "provider": "openai",
          "content": "...",
          "promptTokens": 12,
          "completionTokens": 245,
          "totalTokens": 257,
          "estimatedCost": 0.0027,
          "latencyMs": 1823,
          "error": null
        }
      ]
    }
  ],
  "total": 42,
  "page": 1
}
```

### PATCH `/api/history/[id]`

Toggle saved flag. Body: `{ "saved": true }`

### DELETE `/api/history/[id]`

Delete a comparison and its responses (cascade).

---

## Database Schema

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

---

## Frontend Design

### Aesthetic: "Observatory" — Dark, Scientific, Precise

Mission-control aesthetic. Dark interface with sharp data visualization. Three panels feel like observation windows.

### Typography

- **Headings / UI chrome**: JetBrains Mono — monospaced, technical authority
- **Response body**: Instrument Serif — elegant readability for long-form AI output
- **Metrics / data**: JetBrains Mono at small sizes — telemetry feel

### Color System

```css
:root {
  --bg-primary:      #0A0A0B;
  --bg-panel:        #111113;
  --bg-elevated:     #1A1A1D;
  --border:          #2A2A2E;
  --text-primary:    #E8E8EC;
  --text-secondary:  #6E6E7A;
  --accent-openai:   #10B981;   /* emerald */
  --accent-anthropic:#F59E0B;   /* amber */
  --accent-xai:      #6366F1;   /* indigo */
}
```

Each model has a signature color used for: panel top border, streaming cursor, metrics highlights, glow effects.

### Layout

```
┌──────────────────────────────────────────────────────┐
│  Logo/Title                    [Sync Scroll] [History]│
├──────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐    │
│  │  Enter your prompt...                  [Run] │    │
│  └──────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │ ● GPT-4o     │ │ ● Claude     │ │ ● Grok       │ │
│  │   OpenAI     │ │   Anthropic  │ │   xAI        │ │
│  │──────────────│ │──────────────│ │──────────────│ │
│  │              │ │              │ │              │ │
│  │  (streaming  │ │  (streaming  │ │  (streaming  │ │
│  │   response)  │ │   response)  │ │   response)  │ │
│  │              │ │              │ │              │ │
│  │──────────────│ │──────────────│ │──────────────│ │
│  │ 1.8s  457tk │ │ 2.1s  512tk │ │ 1.5s  389tk │ │
│  │ $0.003  [*] │ │ $0.004  [*] │ │ $0.002  [*] │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ │
└──────────────────────────────────────────────────────┘
```

- Full viewport height, no page scroll
- Prompt input: generous padding, inset shadow, command-line feel
- Three panels: equal width CSS Grid (`grid-cols-3`), independently scrollable
- Responsive: stacked with tab selector on mobile (<1024px)

### Motion & Interactions

- **Panel entrance**: staggered fade-up on first load (50ms offsets)
- **Streaming pulse**: panel top-border glows in model's accent color while streaming, settles to solid on finish
- **Streaming cursor**: thin vertical bar blinking in accent color
- **Metrics reveal**: numbers tick up from 0 when response completes (counter animation)
- **Save button**: scale + glow on hover
- **Panel hover**: subtle `translateY(-1px)` lift with border glow intensify
- **Synchronized scrolling**: toggle in header, shares `scrollTop` across all three panels via ref

### Component Details

**`prompt-input.tsx`**
- Textarea with auto-resize
- Submit via button or Cmd/Ctrl+Enter
- Disabled during active streaming
- Placeholder cycles through example prompts

**`model-panel.tsx`**
- Model name + colored dot indicator
- Provider label (muted)
- Response area: markdown rendered via `react-markdown` + syntax highlighting
- Independent loading skeleton (shimmer in accent color)
- Error state: red-tinted panel with error message, other panels unaffected

**`comparison-grid.tsx`**
- CSS Grid container
- Manages sync-scroll state and refs
- Passes stream data to each panel

**`metrics-bar.tsx`**
- Horizontal layout within panel footer
- Shows: latency (ms), token count, estimated cost (USD)
- Muted/hidden until model finishes
- Counter animation on reveal

**`history-list.tsx`**
- List view of saved comparisons
- Shows prompt preview + date + model summary
- Click to expand and view full responses
- Delete button with confirmation

### History Page (`/history`)

- Paginated list of saved comparisons
- Filter: all vs saved only
- Each item expandable to show full 3-panel comparison
- Delete with confirmation dialog

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| One model fails | That panel shows error state; other two continue streaming |
| All models fail | Show error banner above panels with retry button |
| Network error | Toast notification + retry button |
| Empty prompt | Client-side validation, button stays disabled |
| Rate limit | Show rate limit message in affected panel |
| DB write fails | Log error server-side, don't block the user — comparison still visible in session |

---

## Testing Strategy

- **Unit tests**: Cost calculation, token helpers, model config
- **Integration tests**: API route — mock AI SDK, verify NDJSON stream format
- **Component tests**: Panel rendering, loading states, error states
- **E2E**: Full flow — enter prompt, see 3 responses, save to history (Playwright optional, time permitting)

---

## Out of Scope

- Authentication / user accounts
- Rate limiting on our API
- Response rating / voting
- Model parameter tuning (temperature, max tokens)
- Export / share via URL

These are documented as "Future Improvements" in the README.

---

## Environment Variables

```env
VERCEL_AI_GATEWAY_KEY=       # Provided via email
DATABASE_URL=                # Vercel Postgres connection string (pooled)
DIRECT_DATABASE_URL=         # Vercel Postgres direct connection (for migrations)
```
