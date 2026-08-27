import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/chat/route";
import type { GroundingContext } from "@/lib/llm/grounding";

/** A minimal but well-formed grounding — the route only forwards/serializes it. */
const GROUNDING = {
  rowCount: 3,
  columnCount: 2,
  columns: ["x (integer): min 1, max 3", "y (categorical): 2 distinct"],
  quality: "score 100/100 (grade A); 0.0% cells missing",
  correlations: [],
  anomalies: [],
  extremes: [],
  rows: [{ rowIndex: 0, values: { x: 1, y: "a" } }],
  sampleNote: "1 of 3 rows shown",
} as unknown as GroundingContext;

function post(body: unknown): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Build a Gemini `alt=sse` streaming Response from a list of text deltas. */
function sseResponse(deltas: string[], status = 200): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const d of deltas) {
        const evt = { candidates: [{ content: { parts: [{ text: d }] } }] };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(evt)}\n\n`));
      }
      controller.close();
    },
  });
  return new Response(stream, { status, headers: { "content-type": "text/event-stream" } });
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.GEMINI_API_KEY = "test-key";
  delete process.env.FORCE_LLM_429;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  process.env = { ...ORIGINAL_ENV };
});

describe("POST /api/chat", () => {
  it("streams the model's text deltas back to the client", async () => {
    const fetchMock = vi.fn(async (..._args: unknown[]) => sseResponse(["Hello ", "world"]));
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(post({ messages: [{ role: "user", content: "hi" }], grounding: GROUNDING }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    expect(await res.text()).toBe("Hello world");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain("streamGenerateContent");
    expect(url).toContain("alt=sse");
  });

  it("sends one graceful message (still HTTP 200) when the model returns 429", async () => {
    const fetchMock = vi.fn(async () => sseResponse([], 429));
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(post({ messages: [{ role: "user", content: "hi" }], grounding: GROUNDING }));
    expect(res.status).toBe(200);
    const out = await res.text();
    expect(out).toContain("free-tier limit");
    // retried on the retryable status before giving up
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("forces the graceful fallback with no network call when FORCE_LLM_429 is set", async () => {
    process.env.FORCE_LLM_429 = "1";
    const fetchMock = vi.fn(async () => sseResponse(["should not be used"]));
    vi.stubGlobal("fetch", fetchMock);

    const out = await (await POST(post({ messages: [{ role: "user", content: "hi" }], grounding: GROUNDING }))).text();
    expect(out).toContain("free-tier limit");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a request with no messages without calling the model", async () => {
    const fetchMock = vi.fn(async () => sseResponse(["x"]));
    vi.stubGlobal("fetch", fetchMock);

    const out = await (await POST(post({ grounding: GROUNDING }))).text();
    expect(out).toContain("couldn't read that request");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a conversation whose last turn is not from the user", async () => {
    const fetchMock = vi.fn(async () => sseResponse(["x"]));
    vi.stubGlobal("fetch", fetchMock);

    const body = { messages: [{ role: "assistant", content: "hi" }], grounding: GROUNDING };
    const out = await (await POST(post(body))).text();
    expect(out).toContain("couldn't read that request");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
