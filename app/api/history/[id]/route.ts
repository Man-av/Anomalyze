/**
 * /api/history/[id] — fetch or delete one of the caller's stored analyses.
 *
 * Both are ownership-checked: the query filters on the session user id, so a
 * user can never read or delete another user's record even with a valid id.
 */

import { auth } from "@clerk/nextjs/server";
import { deleteHistory, getHistory } from "@/lib/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx): Promise<Response> {
  if (!clerkConfigured()) return unauthorized();
  const { userId } = await auth();
  if (!userId) return unauthorized();

  const { id } = await params;
  const record = await getHistory(userId, id);
  if (!record) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json(record);
}

export async function DELETE(_req: Request, { params }: Ctx): Promise<Response> {
  if (!clerkConfigured()) return unauthorized();
  const { userId } = await auth();
  if (!userId) return unauthorized();

  const { id } = await params;
  const ok = await deleteHistory(userId, id);
  if (!ok) return Response.json({ error: "Not found." }, { status: 404 });
  return new Response(null, { status: 204 });
}

function unauthorized(): Response {
  return Response.json({ error: "Sign in to use history." }, { status: 401 });
}

// See /api/history/route.ts — auth() throws when Clerk isn't configured, so
// treat the unconfigured case as 401.
function clerkConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
}
