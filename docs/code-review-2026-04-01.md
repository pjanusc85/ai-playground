# Code Review — AI Model Playground

**Date:** 2026-04-01
**Reviewer:** Claude Code (automated)

## Critical (Must Fix Before Production)

### C1. Race condition in parallel stream writes
**File:** `src/lib/ai/stream-compare.ts:41-121`
Three concurrent async functions call `controller.enqueue()` simultaneously. NDJSON lines could interleave mid-write, producing corrupt JSON on the client.
**Fix:** Serialize enqueue calls through a queue or mutex.

### C2. No validation on `system` parameter
**File:** `src/app/api/compare/route.ts:7-8`
`system` is passed to AI models without type/length validation. Arbitrarily long system prompts inflate API costs.
**Fix:** Add type check and 5,000 char limit.

### C3. No rate limiting on API endpoints
**Files:** `src/app/api/compare/route.ts`, `src/app/api/history/route.ts`
`/api/compare` triggers three paid AI calls per request with no throttling.
**Fix:** Add IP-based rate limiting or authentication.

### C4. No authentication on history CRUD
**File:** `src/app/api/history/[id]/route.ts:4-29`
DELETE/PATCH endpoints accept any ID with no authorization.
**Fix:** Add auth or document single-user assumption.

### C5. Unhandled JSON.parse in NDJSON reader
**File:** `src/hooks/use-comparison.ts:78`
Corrupted NDJSON line throws and terminates all stream processing, leaving UI stuck with `isStreaming: true`.
**Fix:** Wrap in try/catch, skip malformed lines.

---

## Important (Should Fix for Production Quality)

### I1. Falsy check loses zero-cost responses
**File:** `src/hooks/use-comparison.ts:91-92`
`event.estimatedCost || null` — `||` treats `0` as falsy. Use `??` instead.

### I2. `stop()` doesn't clear per-model streaming state
**File:** `src/hooks/use-comparison.ts:123-126`
Clicking Stop sets `isRunning: false` but leaves individual models with `isStreaming: true`. Streaming cursors persist in UI.

### I3. Non-null assertions on metrics values
**File:** `src/components/metrics-bar.tsx:36-41`
`response.latencyMs!` and `response.usage!.totalTokens` — non-null assertions hide potential bugs if guard logic changes.

### I4. No try/catch on history API routes
**File:** `src/app/api/history/route.ts:4-27`
DB errors propagate as unhandled 500s with stack traces. Same for `api/history/[id]/route.ts`.

### I5. No validation on POST `/api/history` response body
**File:** `src/app/api/history/route.ts:14-26`
Only checks `prompt` and `responses` exist, not their structure. Malicious input can inject arbitrary DB data.

### I6. `res.body!` non-null assertion
**File:** `src/hooks/use-comparison.ts:63`
`res.body` could theoretically be null. Add explicit check.

### I7. No error handling on client fetch in HistoryList
**File:** `src/components/history-list.tsx:15-23`
No `res.ok` check, no try/catch. API errors will break the component. Same for `handleDelete` and `handleToggleSaved`.

### I8. `prisma db push` in `start` script is dangerous for prod
**File:** `package.json:8`
Can drop data if schema changed. Use `prisma migrate deploy` for production.

### I9. `DATABASE_URL!` assertion without guard
**File:** `src/lib/db.ts:10`
If `DATABASE_URL` is unset, passes `undefined` to `PrismaPg` with a cryptic error. Add explicit throw.

---

## Minor (Nice to Have)

- **M1.** Duplicate `saveComparison` and `saveComparisonFromStream` in `queries.ts` — consolidate
- **M2.** Content-Type should be `application/x-ndjson` not `text/plain` (`api/compare/route.ts:38`)
- **M3.** Hardcoded model IDs in `createInitialResponses` — derive from `MODELS` config
- **M4.** Keyboard hint says "Cmd+Enter" but also handles Ctrl+Enter — show both
- **M5.** Missing `aria-hidden` on decorative dots, `aria-pressed` on sync toggle
- **M6.** Instrument Serif loaded via `<link>` tag bypasses Next.js font optimization
- **M7.** Unnecessary `Connection: keep-alive` header (HTTP/2 ignores it)
- **M8.** Unbounded `limit` param in history GET — clamp to max 100
- **M9.** `useSyncScroll` won't re-attach listeners if refs change while enabled
- **M10.** `prisma` package should be in `devDependencies`

---

## What Was Done Well

- Clean type separation: `StreamEvent`, `ModelResponse`, `ComparisonResult`
- `Promise.allSettled` for parallel streams — one failure doesn't block others
- Proper abort controller pattern for cancellation
- Solid Prisma schema with cascade deletes and indexes
- Fire-and-forget auto-persist avoids blocking the response stream
- Clean responsive design with mobile tabs / desktop grid
