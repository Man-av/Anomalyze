# Anomalyze

**Upload any CSV or Excel file and understand it in seconds** — a plain-English
report of what the data is, robustly-detected anomalies, an auto-built chart
dashboard, and a chatbot you can interrogate about the data.

Everything that matters is computed **deterministically in your browser**. The
AI layer is an *enhancement, never a dependency* — the whole product works with
zero LLM quota.

**Live demo:** _deployed on Vercel — link added after promotion_

> **Stack:** Next.js 16 (App Router) · React 19 · TypeScript 6 (strict) ·
> Tailwind CSS v4 · Recharts · Gemini (free tier) · Vitest

---

## Contents

- [What it does](#what-it-does)
- [Screenshots](#screenshots)
- [Why it's built this way](#why-its-built-this-way)
- [Architecture](#architecture)
- [The analysis engine](#the-analysis-engine)
- [The AI layer (and how it degrades)](#the-ai-layer-and-how-it-degrades)
- [Privacy](#privacy)
- [Accessibility](#accessibility)
- [Local development](#local-development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Design decisions](#design-decisions)

---

## What it does

Drop in a dataset and Anomalyze gives you four things:

1. **A plain-English report** — what the data appears to be, its shape, trends,
   and quality, with concrete key findings. Written by the LLM when available,
   or composed deterministically from the profile when it isn't (badged either
   way, so you always know the source).
2. **Robust anomaly detection** — outliers found with methods that *aren't
   fooled by the outliers themselves* (MAD robust-z + Tukey IQR fences, and a
   time-aware rolling variant when a datetime index exists).
3. **An auto-built dashboard** — the *right* chart is chosen per column type
   (histogram, time series, categorical bar, scatter for strong pairs,
   correlation heatmap), ranked by how interesting each column is.
4. **A grounded chatbot** — ask questions in plain English. The model answers
   from pre-computed facts and a small stratified sample, not by eyeballing raw
   rows.

It handles arbitrary data: it infers each column as
`integer · numeric · boolean · datetime · categorical · id · text`, and adapts
the stats, charts, and narrative to what it finds. Client-side caps: ~200k rows
/ ~25MB; files at/above 20k rows are profiled in a Web Worker so the tab stays
responsive.

## Screenshots

> _Screenshots are captured from the running app and live in `docs/screenshots/`._
> _(Add `hero.png`, `dashboard.png`, and `chat.png` — or run the app locally to see it live.)_

## Why it's built this way

This is a rebuild of an earlier vanilla-JS + Python-functions version that was
thin and, in places, wrong. The rebuild fixes the substance, not just the
paint:

| Earlier version | Anomalyze v2 |
|---|---|
| Only looked at numeric columns | Types every column and adapts (numeric / categorical / datetime / boolean / id / text) |
| Naive global 3σ anomalies (mean/σ corrupted by the very outliers they should flag) | **MAD robust-z + Tukey IQR**, plus a time-aware rolling variant; heavy-tail guardrails |
| Every column force-drawn as a line chart (assumes row order = time) | Chart **auto-selected per column type**, ranked by signal |
| Chatbot dumped up to 500 raw rows into the prompt (privacy + quota) and asked the LLM to do arithmetic | Chat sends **grounded, pre-computed facts** + a capped sample; math is done in TypeScript |
| Broke entirely without the LLM | LLM is optional; deterministic fallback + caching + graceful 429 handling |

## Architecture

```
app/
  layout.tsx  page.tsx  globals.css          # shell, theme tokens, FOUC guard
  api/insights/route.ts                       # narrative report (LLM or fallback) — always 200
  api/chat/route.ts                           # grounded streaming chat (SSE)
components/
  analyzer/                                   # AnalyzerApp + Context (FSM), panels, uploader
    chat/                                      # Chat, MessageList, ChatInput, Markdown, bridge
    profile.worker.ts                          # off-main-thread profiling for large files
  charts/                                     # ChartFrame + Histogram, TimeSeries, CategoryBar,
                                              #   ScatterPlot, CorrelationHeatmap, BoxStrip, …
  ui/                                         # Card, Button, Badge, Skeleton, ThemeToggle, states
lib/
  types.ts  config.ts  hash.ts  format.ts  cn.ts
  parse/parseFile.ts                          # PapaParse (CSV) + SheetJS (XLSX), typed
  analysis/                                   # inferType, coerce, stats, anomalies, correlation,
                                              #   quality, profileColumn, profile, summarize
  narrative/fallback.ts                       # deterministic prose from the profile
  charts/{selectCharts,palette}.ts            # profile → ChartSpec[]; validated dataviz palette
  llm/{gemini,reportSchema,grounding}.ts      # raw-fetch client, structured schema, grounding
tests/                                        # Vitest — engine + routes + fallback (83 tests)
public/samples/*.csv                          # seed datasets (generated by scripts/gen-samples.mjs)
```

**Flow:** `Uploader → parseFile → profileDataset(rows)` produces a single
`DatasetProfile` (types, stats, anomalies, correlation, quality) held in React
Context alongside the raw rows. Every panel reads that profile. The report path
hashes the summary → checks a cache → else `POST /api/insights`. Chat builds a
`GroundingContext` from the profile → streams from `POST /api/chat`.

State is a small finite-state machine (`idle → parsing → profiling →
ready | error`) over `useReducer` — no state-management dependency.

## The analysis engine

This is the differentiator, and it's all pure, unit-tested TypeScript in
[`lib/analysis/`](lib/analysis).

- **Type inference** (`inferType.ts`) — first-match heuristics: boolean-set
  match → strict ISO / format-table datetime (≥90% parse) → numeric coercion
  stripping `$ , %` (≥90%, with an integer subtype) → `id` (unique-ratio ≥0.95 +
  id-like name / monotonic) → categorical vs. `text` by cardinality
  (`≤ max(20, 5%·n)`) and average length.
- **Per-type stats** (`stats.ts`) — numeric:
  count/missing/mean/median/std/min/max/quartiles/IQR/skew + a Freedman–Diaconis
  histogram; categorical: top-10 (+ "Other") / mode / cardinality / entropy;
  datetime: min/max/range/granularity/gaps; boolean: true/false counts.
- **Anomalies** (`anomalies.ts`) — **MAD robust-z** (`0.6745·(x−median)/MAD`,
  flag ≥3.5, MAD=0 guarded) as primary, corroborated by **Tukey IQR fences**
  (1.5× / 3×); agreement raises severity. With a datetime index, a **time-aware**
  rolling-median / rolling-MAD variant runs instead. Guardrail: if a column
  flags >10% of its rows, its threshold is raised and it's marked *heavy-tailed*.
- **Correlation** (`correlation.ts`) — Pearson matrix over numeric columns
  (excluding ids / zero-variance), with strong pairs surfaced at |r| ≥ 0.7.
- **Quality** (`quality.ts`) — missing %, duplicate rows, constant / high-null /
  mixed-type columns → a transparent 0–100 score with a per-component breakdown.

Every threshold ("magic number") lives in [`lib/config.ts`](lib/config.ts) with
a one-line justification, so the engine's behavior is auditable in one place.

## The AI layer (and how it degrades)

The central real-world constraint is that the **Gemini free tier is heavily
rate-limited** (HTTP 429 after ~20 requests/day). So the LLM is called **at most
once per upload** (report) and **once per chat message**, and the product is
designed to be fully usable at zero quota.

The client ([`lib/llm/gemini.ts`](lib/llm/gemini.ts)) is a deliberate raw
`fetch` (no SDK): tiny, zero-dep, runs on any runtime, trivial to mock in tests.

- **`/api/insights`** — **always returns HTTP 200** with
  `{ report, source: 'ai' | 'fallback', cached }`. Uses Gemini
  [structured output](lib/llm/reportSchema.ts) (`responseSchema` + `responseMimeType:
  application/json`), then **re-validates with zod** so a drifting model can
  never reach the UI. Results are cached by content hash (module-scope LRU +
  client `sessionStorage`). On quota/parse failure it degrades to the
  deterministic narrative, badged in the UI.
- **`/api/chat`** — streams answers as Server-Sent Events, re-streamed to the
  browser as plain-text deltas. The system prompt is grounded on a
  `GroundingContext`: schema + compact per-column stats + quality + top
  anomalies + strong correlations + a **pre-computed extremes table** (top/bottom
  rows per numeric column, so "which row has the highest X" is answered from data
  we already computed) + a **stratified ≤40-row sample**. On quota exhaustion it
  emits one graceful message; the report and dashboard stay fully available.

Retries are brief (429/503, 2 attempts, 250ms backoff) then surface a
`QuotaError`; a 45s `AbortController` bounds every call. Set `FORCE_LLM_429=1`
locally to exercise the fallback path without touching quota.

## Privacy

Raw data is parsed and analyzed **entirely in the browser** — it never leaves
your device for the analysis. The API calls carry only the minimum needed:

- `/api/insights` receives **aggregate summary stats only** — no raw row arrays.
- `/api/chat` receives the grounded context + a **capped, stratified sample**,
  never the full dataset.

You can verify this in the Network tab: the request bodies contain summaries and
a small sample, not your data.

## Accessibility

- Full **light / dark** theming via CSS custom properties, with an inline
  `<head>` script that sets the theme before first paint (no flash), and a
  toggle whose icon state is CSS-driven (no hydration mismatch).
- Every chart has a **chart ⇄ data-table toggle**, so the information is
  available to screen-reader and keyboard users, not only as pixels.
- Scrollable regions are keyboard-focusable and labelled; the palette meets
  **WCAG AA** contrast in both themes.
- Audited with **axe-core**: 0 violations across the full UI in light and dark.

## Local development

**Prerequisites:** Node ≥ 20.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The app is fully functional without any
configuration — try one of the built-in sample datasets.

**To enable the AI report and chat**, create `.env.local`:

```bash
GEMINI_API_KEY=your_key_here      # from https://aistudio.google.com/apikey
GEMINI_MODEL=gemini-3.6-flash     # optional; this is the default
# FORCE_LLM_429=1                 # optional; forces the deterministic fallback path
```

Without a key, the report falls back to the deterministic narrative and chat
shows a graceful "AI unavailable" notice — everything else works.

Sample datasets are regenerated deterministically with:

```bash
node scripts/gen-samples.mjs
```

## Testing

```bash
npm test           # run once
npm run test:watch # watch mode
npm run test:cov   # with coverage
```

83 tests cover the analysis engine (type inference, stats, anomalies,
correlation, quality, chart selection), the deterministic fallback narrative,
and both API routes. Route tests **mock `fetch`** so they assert the contract
(200 → parsed report; 429 → `source: 'fallback'`, still 200) without spending
live quota.

Type-check with:

```bash
npx tsc --noEmit
```

## Deployment

Deploys to **Vercel** as a standard Next.js app (Node-runtime route handlers).

1. Ensure the Vercel project's **Framework Preset is "Next.js"** (not "Other",
   which would block auto-detection).
2. Set `GEMINI_API_KEY` and `GEMINI_MODEL` for all environments in the project
   settings.
3. **Deploy a preview first**, verify end-to-end, then promote to production.

## Design decisions

A few choices worth calling out (the "why", for the curious):

- **Deterministic-first, LLM-optional.** Every heavy computation is TypeScript
  running client-side. The LLM only writes prose and answers questions — it's
  never on the critical path. This is what makes the free-tier quota a
  non-issue rather than a showstopper.
- **Robust statistics over textbook ones.** Naive 3σ uses a mean and standard
  deviation that the outliers themselves distort. MAD and IQR are resistant to
  contamination, so a single wild value doesn't hide the others.
- **Charts chosen by type, not by default.** Forcing a line chart on unordered
  categorical data is a lie about the data. Selection is driven by the inferred
  column type and relationships.
- **Raw `fetch` for Gemini, no SDK.** The client is a few dozen lines, has zero
  dependencies, and is trivial to mock — which is why the route tests can assert
  real behavior without a network or quota.
- **React Context + `useReducer`, no state library.** The state is a small FSM;
  a dependency would be ceremony.
- **Structured output *and* zod validation.** The schema constrains the model;
  zod guarantees the shape at the trust boundary. Belt and suspenders, because a
  malformed report reaching the UI is worse than a fallback.

---

Built by Manav Sharma · [@man-av](https://github.com/man-av)
