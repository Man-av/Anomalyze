/**
 * Minimal Gemini client for structured report generation.
 *
 * Deliberately a raw `fetch` (no SDK): it's tiny, has zero deps, runs on any
 * runtime, and is trivial to mock in tests. It reads env at call time so tests
 * and serverless cold-starts see the right values.
 *
 * Failure philosophy (the product must work on zero quota):
 *   - No key, or `FORCE_LLM_429=1`  → throw QuotaError immediately.
 *   - HTTP 429/503                  → retry briefly, then throw QuotaError.
 *   - Anything else (parse, schema, block, other HTTP) → throw a plain Error.
 * The route treats QuotaError and Error the same way — degrade to the
 * deterministic fallback — but the distinction is useful for logging/telemetry.
 */

import {
  buildReportPrompt,
  GEMINI_RESPONSE_SCHEMA,
  REPORT_SYSTEM_PROMPT,
  reportContentSchema,
  type ReportContent,
} from "@/lib/llm/reportSchema";
import {
  CHAT_SYSTEM_PROMPT,
  serializeGrounding,
  type ChatMessage,
  type GroundingContext,
} from "@/lib/llm/grounding";
import type { DatasetSummary } from "@/lib/analysis/summarize";

/** Thrown when the model is unavailable for capacity/quota reasons. */
export class QuotaError extends Error {
  constructor(message = "LLM quota or capacity limit reached") {
    super(message);
    this.name = "QuotaError";
  }
}

const DEFAULT_MODEL = "gemini-3.6-flash";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 45_000;
const RETRYABLE = new Set([429, 503]);
/** total attempts on retryable statuses (kept low so fallback is snappy) */
const MAX_ATTEMPTS = 2;
const BACKOFF_MS = 250;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function model(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

/** True when a live call is even possible (key present, not force-degraded). */
export function geminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY) && process.env.FORCE_LLM_429 !== "1";
}

interface GeminiCandidate {
  content?: { parts?: { text?: string }[] };
  finishReason?: string;
}
interface GeminiResponse {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string };
}

/** Extract the model's text payload, or throw if it was blocked/empty. */
function extractText(data: GeminiResponse): string {
  if (data.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked the prompt: ${data.promptFeedback.blockReason}`);
  }
  const parts = data.candidates?.[0]?.content?.parts;
  const text = parts?.map((p) => p.text ?? "").join("").trim();
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}

/**
 * Generate a validated report from a dataset summary. Throws QuotaError when
 * the model is unavailable; throws Error on any other failure.
 */
export async function generateReportContent(summary: DatasetSummary): Promise<ReportContent> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (process.env.FORCE_LLM_429 === "1") {
    throw new QuotaError("FORCE_LLM_429 set — forcing deterministic fallback");
  }
  if (!apiKey) {
    throw new QuotaError("GEMINI_API_KEY is not configured");
  }

  const url = `${ENDPOINT}/${model()}:generateContent`;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: REPORT_SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: buildReportPrompt(summary) }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: GEMINI_RESPONSE_SCHEMA,
      temperature: 0.4,
      maxOutputTokens: 2048,
    },
  });

  let lastStatus = 0;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body,
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(timer);
      // network error / abort — retry if attempts remain, else surface it
      if (attempt < MAX_ATTEMPTS) {
        await sleep(BACKOFF_MS * attempt);
        continue;
      }
      throw e instanceof Error ? e : new Error("Gemini request failed");
    }
    clearTimeout(timer);

    if (RETRYABLE.has(res.status)) {
      lastStatus = res.status;
      if (attempt < MAX_ATTEMPTS) {
        await sleep(BACKOFF_MS * attempt);
        continue;
      }
      throw new QuotaError(`Gemini unavailable (HTTP ${res.status})`);
    }
    if (!res.ok) {
      throw new Error(`Gemini error (HTTP ${res.status})`);
    }

    const data = (await res.json()) as GeminiResponse;
    const text = extractText(data);
    // The model is schema-constrained, but we still validate — a drifting model
    // must never reach the UI. zod strips unknown keys and enforces shape.
    return reportContentSchema.parse(JSON.parse(text));
  }

  // Unreachable in practice (loop returns/throws), but keeps types honest.
  throw new QuotaError(`Gemini unavailable (HTTP ${lastStatus})`);
}

// --- Streaming chat -------------------------------------------------------

/** Wire an external abort signal into a fresh controller (for per-attempt use). */
function linkAbort(signal: AbortSignal | undefined, controller: AbortController): () => void {
  if (!signal) return () => {};
  if (signal.aborted) {
    controller.abort();
    return () => {};
  }
  const onAbort = () => controller.abort();
  signal.addEventListener("abort", onAbort, { once: true });
  return () => signal.removeEventListener("abort", onAbort);
}

/**
 * Stream a grounded chat answer as text deltas.
 *
 * Same failure philosophy as the report path: no key / FORCE_LLM_429 / a
 * retryable status with no attempts left → QuotaError *before any text is
 * yielded*, so the route can send one graceful message. Once bytes start
 * flowing we no longer retry — a mid-stream break surfaces to the caller.
 */
export async function* streamChat(
  messages: ChatMessage[],
  grounding: GroundingContext,
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (process.env.FORCE_LLM_429 === "1") {
    throw new QuotaError("FORCE_LLM_429 set — forcing deterministic fallback");
  }
  if (!apiKey) {
    throw new QuotaError("GEMINI_API_KEY is not configured");
  }

  const url = `${ENDPOINT}/${model()}:streamGenerateContent?alt=sse`;
  const systemText = `${CHAT_SYSTEM_PROMPT}\n\n# DATASET CONTEXT\n${serializeGrounding(grounding)}`;
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: systemText }] },
    contents,
    generationConfig: { temperature: 0.3, topP: 0.95, maxOutputTokens: 1536 },
  });

  let lastStatus = 0;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const unlink = linkAbort(signal, controller);
    const cleanup = () => {
      clearTimeout(timer);
      unlink();
    };

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body,
        signal: controller.signal,
      });
    } catch (e) {
      cleanup();
      if (attempt < MAX_ATTEMPTS) {
        await sleep(BACKOFF_MS * attempt);
        continue;
      }
      throw e instanceof Error ? e : new Error("Gemini request failed");
    }

    if (RETRYABLE.has(res.status)) {
      cleanup();
      lastStatus = res.status;
      if (attempt < MAX_ATTEMPTS) {
        await sleep(BACKOFF_MS * attempt);
        continue;
      }
      throw new QuotaError(`Gemini unavailable (HTTP ${res.status})`);
    }
    if (!res.ok) {
      cleanup();
      throw new Error(`Gemini error (HTTP ${res.status})`);
    }

    // Good response — stream to completion. The timeout guards the whole
    // stream; cleanup runs once the generator is fully drained or torn down.
    try {
      yield* readSseText(res);
      return;
    } finally {
      cleanup();
    }
  }

  throw new QuotaError(`Gemini unavailable (HTTP ${lastStatus})`);
}

/** Parse an `alt=sse` response, yielding the text delta of each event. */
async function* readSseText(res: Response): AsyncGenerator<string, void, unknown> {
  const stream = res.body;
  if (!stream) throw new Error("Gemini returned no response body");
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        let chunk: GeminiResponse;
        try {
          chunk = JSON.parse(payload) as GeminiResponse;
        } catch {
          continue; // ignore keep-alives / partial noise
        }
        if (chunk.promptFeedback?.blockReason) {
          throw new Error(`Gemini blocked the prompt: ${chunk.promptFeedback.blockReason}`);
        }
        const parts = chunk.candidates?.[0]?.content?.parts;
        const text = parts?.map((p) => p.text ?? "").join("") ?? "";
        if (text) yield text;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
