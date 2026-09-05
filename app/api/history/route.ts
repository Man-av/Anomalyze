/**
 * /api/history — list and save a signed-in user's past analyses.
 *
 *   GET  → the caller's recent analyses (metadata only, for the list).
 *   POST → persist one completed analysis (aggregates only).
 *
 * Auth is required on both; unauthenticated calls get 401. History is the one
 * feature that needs an account — the rest of the app works logged-out.
 *
 * Privacy is enforced here, not just trusted: the POST body is validated with
 * zod and any `rows` field is rejected outright, so raw data can never be
 * persisted even if a client tried.
 */

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { listHistory, saveHistory } from "@/lib/db";

export const runtime = "nodejs";

// The profile/report blobs are large and already validated on the client; we
// only assert they're objects (and crucially, carry no `rows`). passthrough()
// keeps their fields, `rows` is explicitly forbidden below.
const jsonObject = z.object({}).passthrough();

const saveSchema = z
  .object({
    fileName: z.string().trim().min(1).max(255),
    fileSize: z.number().int().nonnegative().nullable(),
    rowCount: z.number().int().nonnegative(),
    columnCount: z.number().int().nonnegative(),
    qualityScore: z.number().int().min(0).max(100),
    anomalyCount: z.number().int().nonnegative(),
    profile: jsonObject,
    report: jsonObject,
  })
  .strict() // reject unknown top-level keys (e.g. a stray `rows`)
  .refine((v) => !("rows" in v.profile), {
    message: "profile must not contain raw rows",
  });

// A single stored payload is capped so a hostile client can't wedge huge blobs
// into the row. ~1MB of JSON is far more than any real aggregate profile.
const MAX_BODY_BYTES = 1_000_000;

export async function GET(): Promise<Response> {
  if (!clerkConfigured()) return unauthorized();
  const { userId } = await auth();
  if (!userId) return unauthorized();

  const items = await listHistory(userId);
  return Response.json(items);
}

export async function POST(req: Request): Promise<Response> {
  if (!clerkConfigured()) return unauthorized();
  const { userId } = await auth();
  if (!userId) return unauthorized();

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return Response.json({ error: "Payload too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid history record." }, { status: 400 });
  }

  const { profile, report, ...meta } = parsed.data;
  const { id } = await saveHistory(userId, {
    ...meta,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    profile: profile as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    report: report as any,
  });
  return Response.json({ id }, { status: 201 });
}

function unauthorized(): Response {
  return Response.json({ error: "Sign in to use history." }, { status: 401 });
}

// Clerk is optional. When it isn't configured, clerkMiddleware() isn't mounted
// (see proxy.ts), so auth() would throw rather than report "signed out". Guard
// on the same key the middleware gates on and treat unconfigured as 401 — the
// UI never calls this route without Clerk, but a direct request stays graceful.
function clerkConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
}
