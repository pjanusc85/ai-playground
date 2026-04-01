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
| Framework | Next.js (App Router) |
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
npx vercel link
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
