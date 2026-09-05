import { clerkMiddleware } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";

// Next.js 16 renames the middleware entry to `proxy.ts` (was `middleware.ts`).
//
// Clerk is optional. With no publishable key the app still boots: auth UI is
// hidden and /api/history returns 401. So only mount Clerk's middleware when
// it's configured — otherwise pass every request straight through.
const proxy = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ? clerkMiddleware()
  : (_req: NextRequest) => NextResponse.next();

export default proxy;

export const config = {
  matcher: [
    // Skip Next internals and static assets; run on everything else.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run on API routes.
    "/(api|trpc)(.*)",
  ],
};
