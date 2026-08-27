/**
 * POST /api/insights — turn a dataset summary into a narrative report.
 *
 * Contract: ALWAYS responds 200 with `{ report, source, cached }`.
 *   - success        → report: Report(source:"ai"),  source:"ai"
 *   - quota/failure  → report: null,                  source:"fallback"
 * On fallback the client renders its own deterministic report (it holds the
 * full profile), so the narrative always appears — the LLM is a pure upgrade.
 *
 * Privacy: the request body carries only the compact summary (aggregates), so
 * this route never sees raw rows. See `lib/analysis/summarize.ts`.
 *
 * Caching: a small module-scope LRU keyed by the client's summary hash avoids
 * re-spending the (tiny) free-tier quota when the same dataset is re-analyzed.
 */

import { generateReportContent, QuotaError } from "@/lib/llm/gemini";
import type { DatasetSummary } from "@/lib/analysis/summarize";
import type { Report } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface InsightsRequest {
  summary?: DatasetSummary;
  hash?: string;
}

interface InsightsResponse {
  report: Report | null;
  source: "ai" | "fallback";
  cached: boolean;
  /** why we degraded, for the client/telemetry — omitted on success */
  reason?: "quota" | "error" | "bad-request";
}

// --- Module-scope LRU cache (per serverless instance) ---------------------
const CACHE_MAX = 50;
const cache = new Map<string, Report>();

function cacheGet(hash: string): Report | undefined {
  const hit = cache.get(hash);
  if (hit) {
    cache.delete(hash); // re-insert to mark most-recently-used
    cache.set(hash, hit);
  }
  return hit;
}

function cacheSet(hash: string, report: Report): void {
  cache.set(hash, report);
  if (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

function json(body: InsightsResponse): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: Request): Promise<Response> {
  let payload: InsightsRequest;
  try {
    payload = (await req.json()) as InsightsRequest;
  } catch {
    return json({ report: null, source: "fallback", cached: false, reason: "bad-request" });
  }

  const { summary, hash } = payload;
  if (!summary || typeof hash !== "string" || hash.length === 0) {
    return json({ report: null, source: "fallback", cached: false, reason: "bad-request" });
  }

  const cached = cacheGet(hash);
  if (cached) {
    return json({ report: cached, source: "ai", cached: true });
  }

  try {
    const content = await generateReportContent(summary);
    const report: Report = { ...content, source: "ai" };
    cacheSet(hash, report);
    return json({ report, source: "ai", cached: false });
  } catch (e) {
    // Degrade gracefully — the client will render its deterministic fallback.
    const reason = e instanceof QuotaError ? "quota" : "error";
    return json({ report: null, source: "fallback", cached: false, reason });
  }
}
