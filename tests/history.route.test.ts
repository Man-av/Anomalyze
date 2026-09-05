import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock Clerk's server-side auth() and the db layer before importing the route.
const auth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({ auth: () => auth() }));

const saveHistory = vi.fn(async (..._a: unknown[]) => ({ id: "new-id" }));
const listHistory = vi.fn(async (..._a: unknown[]) => [{ id: "a", fileName: "x.csv" }]);
vi.mock("@/lib/db", () => ({
  saveHistory: (...a: unknown[]) => saveHistory(...a),
  listHistory: (...a: unknown[]) => listHistory(...a),
}));

// Import after mocks are registered.
const { GET, POST } = await import("@/app/api/history/route");

/** A valid save body (aggregates only). */
const VALID = {
  fileName: "sales.csv",
  fileSize: 1024,
  rowCount: 100,
  columnCount: 5,
  qualityScore: 92,
  anomalyCount: 3,
  profile: { rowCount: 100, columnCount: 5 },
  report: { title: "T", source: "ai" },
};

function post(body: unknown): Request {
  return new Request("http://localhost/api/history", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  // The routes treat "no publishable key" as Clerk-not-configured → 401, so
  // set one for the authenticated-path tests; the mocked auth() supplies userId.
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_x");
  auth.mockResolvedValue({ userId: "user-1" });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("POST /api/history", () => {
  it("saves a valid record and returns 201 with an id", async () => {
    const res = await POST(post(VALID));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "new-id" });
    expect(saveHistory).toHaveBeenCalledWith("user-1", expect.objectContaining({ fileName: "sales.csv" }));
  });

  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValue({ userId: null });
    const res = await POST(post(VALID));
    expect(res.status).toBe(401);
    expect(saveHistory).not.toHaveBeenCalled();
  });

  it("returns 401 when Clerk is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");
    const res = await POST(post(VALID));
    expect(res.status).toBe(401);
    expect(saveHistory).not.toHaveBeenCalled();
  });

  it("rejects a body carrying raw rows (privacy guard)", async () => {
    const res = await POST(post({ ...VALID, rows: [{ a: 1 }] }));
    expect(res.status).toBe(400);
    expect(saveHistory).not.toHaveBeenCalled();
  });

  it("rejects a profile that smuggles a rows field", async () => {
    const res = await POST(post({ ...VALID, profile: { rowCount: 1, rows: [{ a: 1 }] } }));
    expect(res.status).toBe(400);
    expect(saveHistory).not.toHaveBeenCalled();
  });

  it("rejects an invalid record (missing fields)", async () => {
    const res = await POST(post({ fileName: "x.csv" }));
    expect(res.status).toBe(400);
    expect(saveHistory).not.toHaveBeenCalled();
  });
});

describe("GET /api/history", () => {
  it("returns only the caller's records", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: "a", fileName: "x.csv" }]);
    expect(listHistory).toHaveBeenCalledWith("user-1");
  });

  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValue({ userId: null });
    const res = await GET();
    expect(res.status).toBe(401);
    expect(listHistory).not.toHaveBeenCalled();
  });
});
