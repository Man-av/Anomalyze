/**
 * POST /api/chat — grounded, streaming chat over the uploaded dataset.
 *
 * Request body: `{ messages: ChatMessage[], grounding: GroundingContext }`.
 * The client builds the grounding (schema + exact per-column stats + quality +
 * top anomalies + strong correlations + an extremes table + a capped sample),
 * so this route never sees the full dataset — only the compact, bounded context.
 *
 * Response: a `text/plain` stream of the answer, chunk by chunk. The whole
 * product works on zero LLM quota, so failures never 500 — on `QuotaError`
 * (no key / free-tier limit) or any error *before* the first token, we stream
 * a single graceful sentence instead. A mid-stream break just ends the answer.
 */

import { QuotaError, streamChat } from "@/lib/llm/gemini";
import type { ChatMessage, GroundingContext } from "@/lib/llm/grounding";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Keep prompts bounded — only the tail of the conversation matters here. */
const MAX_HISTORY = 12;
const MAX_MESSAGE_CHARS = 4000;

const QUOTA_MESSAGE =
  "⚠️ The AI chat is unavailable right now — the free-tier limit was reached or no API key is configured. Your report, charts, and anomaly detection all run locally and stay fully available. Please try again later.";
const ERROR_MESSAGE =
  "⚠️ Something went wrong reaching the AI service. The rest of Anomalyze runs locally and is unaffected — please try again in a moment.";
const BAD_REQUEST_MESSAGE = "⚠️ I couldn't read that request. Please reload the page and ask again.";

interface ChatRequest {
  messages?: unknown;
  grounding?: GroundingContext;
}

function isChatMessage(m: unknown): m is ChatMessage {
  if (typeof m !== "object" || m === null) return false;
  const { role, content } = m as Record<string, unknown>;
  return (role === "user" || role === "assistant") && typeof content === "string";
}

/** A one-shot text response (used for validation failures). */
function text(message: string): Response {
  return new Response(message, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function POST(req: Request): Promise<Response> {
  let payload: ChatRequest;
  try {
    payload = (await req.json()) as ChatRequest;
  } catch {
    return text(BAD_REQUEST_MESSAGE);
  }

  const { messages, grounding } = payload;
  if (!Array.isArray(messages) || !grounding || typeof grounding !== "object") {
    return text(BAD_REQUEST_MESSAGE);
  }

  const history: ChatMessage[] = messages
    .filter(isChatMessage)
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));

  if (history.length === 0 || history[history.length - 1]?.role !== "user") {
    return text(BAD_REQUEST_MESSAGE);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let streamed = false;
      try {
        for await (const delta of streamChat(history, grounding, req.signal)) {
          if (delta) {
            streamed = true;
            controller.enqueue(encoder.encode(delta));
          }
        }
      } catch (err) {
        // Before any token: send one graceful message. Mid-stream: end quietly
        // (the client keeps whatever arrived), unless nothing came through.
        if (!streamed) {
          const msg = err instanceof QuotaError ? QUOTA_MESSAGE : ERROR_MESSAGE;
          controller.enqueue(encoder.encode(msg));
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      // disable proxy buffering so tokens flush as they arrive
      "x-accel-buffering": "no",
    },
  });
}
