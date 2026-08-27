import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/insights/route";
import type { DatasetSummary } from "@/lib/analysis/summarize";

/** Minimal summary — the route only forwards it to the (mocked) LLM call. */
const SUMMARY = {
  rowCount: 10,
  columnCount: 3,
  typeBreakdown: { integer: 1, numeric: 1, boolean: 0, datetime: 1, categorical: 0, id: 0, text: 0 },
  columns: [],
  quality: {
    score: 92,
    grade: "A",
    missingCellsPct: 0,
    duplicateRows: 0,
    duplicateRowsPct: 0,
    constantColumns: [],
    highNullColumns: [],
    mixedTypeColumns: [],
    issues: [],
  },
  anomalies: [],
  strongPairs: [],
} as unknown as DatasetSummary;

/** A model output that satisfies `reportContentSchema`. */
const CONTENT = {
  title: "Daily revenue, 10 days",
  datasetOverview: "A small time series of daily revenue across ten days.",
  shapeAndTrends: "Revenue is stable near 110 with one sharp spike.",
  dataQualityNotes: "Quality is high (A, 92/100) with no missing data.",
  anomalyNotes: "One upward outlier stands out in revenue.",
  keyFindings: ["10 rows × 3 columns; grade A.", "Revenue spikes once to 9,999."],
  suggestedQuestions: ["What caused the revenue spike?", "What is the average revenue?"],
};

function post(body: unknown): Request {
  return new Request("http://localhost/api/insights", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function geminiResponse(content: object, status = 200): Response {
  const body = { candidates: [{ content: { parts: [{ text: JSON.stringify(content) }] } }] };
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
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

describe("POST /api/insights", () => {
  it("returns an AI report when the model responds with valid JSON", async () => {
    const fetchMock = vi.fn(async () => geminiResponse(CONTENT));
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(post({ summary: SUMMARY, hash: "h-ai" }));
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.source).toBe("ai");
    expect(data.cached).toBe(false);
    expect(data.report.source).toBe("ai");
    expect(data.report.title).toBe(CONTENT.title);
    expect(data.report.keyFindings).toEqual(CONTENT.keyFindings);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("degrades to source:'fallback' (still HTTP 200) on a 429", async () => {
    const fetchMock = vi.fn(async () => geminiResponse(CONTENT, 429));
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(post({ summary: SUMMARY, hash: "h-429" }));
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.source).toBe("fallback");
    expect(data.report).toBeNull();
    expect(data.reason).toBe("quota");
    // retried, then gave up
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("serves a cached AI report on the second identical request without calling the model again", async () => {
    const fetchMock = vi.fn(async () => geminiResponse(CONTENT));
    vi.stubGlobal("fetch", fetchMock);

    const first = await (await POST(post({ summary: SUMMARY, hash: "h-cache" }))).json();
    expect(first.cached).toBe(false);
    expect(first.source).toBe("ai");

    const second = await (await POST(post({ summary: SUMMARY, hash: "h-cache" }))).json();
    expect(second.cached).toBe(true);
    expect(second.source).toBe("ai");
    expect(second.report.title).toBe(CONTENT.title);

    // the model was only ever hit once
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("forces the fallback (no network call) when FORCE_LLM_429 is set", async () => {
    process.env.FORCE_LLM_429 = "1";
    const fetchMock = vi.fn(async () => geminiResponse(CONTENT));
    vi.stubGlobal("fetch", fetchMock);

    const data = await (await POST(post({ summary: SUMMARY, hash: "h-force" }))).json();
    expect(data.source).toBe("fallback");
    expect(data.reason).toBe("quota");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a request with no summary as a bad-request fallback", async () => {
    const fetchMock = vi.fn(async () => geminiResponse(CONTENT));
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(post({ hash: "h-nobody" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.source).toBe("fallback");
    expect(data.reason).toBe("bad-request");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
