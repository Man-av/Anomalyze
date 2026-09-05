"use client";

import { useState } from "react";
import { UserButton, useAuth } from "@clerk/nextjs";
import { HistoryIcon, RefreshIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { fmtBytes, fmtInt } from "@/lib/format";
import { useAnalyzer } from "./AnalyzerContext";
import { HistoryPanel } from "./HistoryPanel";
import { LandingHero } from "./LandingHero";
import { Results } from "./Results";

const REPO = "https://github.com/Man-av/Anomalyze";

// Clerk is optional; the NEXT_PUBLIC key is inlined at build, so this gates the
// auth UI client-side. With no key, no ClerkProvider is mounted (see layout),
// so the Clerk components must not render at all.
const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

/**
 * Inner auth menu — only rendered when ClerkProvider is mounted.
 * useAuth() is safe here because this component is only ever instantiated
 * inside the ClerkProvider tree (guarded by AuthMenu below).
 */
function ClerkAuthMenuInner({ onOpenHistory }: { onOpenHistory: () => void }) {
  const { isSignedIn } = useAuth();
  if (isSignedIn) {
    return (
      <>
        <Button
          variant="subtle"
          onClick={onOpenHistory}
          className="px-2 sm:px-3"
          title="Your analysis history"
        >
          <HistoryIcon size={15} />
          <span className="hidden sm:inline">History</span>
        </Button>
        <UserButton />
      </>
    );
  }
  return (
    <a
      href="/sign-in"
      className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium text-muted transition-[background-color,border-color,color,transform] duration-[var(--dur-micro)] ease-out hover:-translate-y-px hover:bg-surface-2 hover:text-foreground active:translate-y-0 sm:px-3"
    >
      Sign in
    </a>
  );
}

/**
 * Auth guard — renders nothing when Clerk isn't configured, so
 * ClerkAuthMenuInner (and its useAuth hook) never mounts without a provider.
 */
function AuthMenu({ onOpenHistory }: { onOpenHistory: () => void }) {
  if (!clerkEnabled) return null;
  return <ClerkAuthMenuInner onOpenHistory={onOpenHistory} />;
}

/**
 * Edge-aligned header: identity and context left, controls right, hairline
 * underneath, nothing centred. It is sticky and solid — the file you are looking
 * at is the one thing that must never scroll away in a working view.
 *
 * The wordmark was a cursive script face set inline at 1.8rem. It is now the
 * display face, which is the register that reads as a brand rather than as a
 * decoration bolted onto a statistics tool.
 *
 * In the results state the middle slot carries the file identity and the reset,
 * so both stay reachable at any scroll depth. Below 40rem that slot drops to its
 * own full-width row under a hairline rather than competing for the first row.
 */
function AppHeader({ onOpenHistory }: { onOpenHistory: () => void }) {
  const { data, reset } = useAnalyzer();

  const meta = data
    ? [
        `${fmtInt(data.profile.rowCount)} rows`,
        `${fmtInt(data.profile.columnCount)} columns`,
        ...(data.fileSize != null ? [fmtBytes(data.fileSize)] : []),
      ].join(" · ")
    : null;

  return (
    <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <span className="shrink-0 font-heading text-lede leading-head font-bold tracking-tight text-foreground">
          Anomalyze
        </span>

        {data ? (
          <div className="order-last w-full min-w-0 border-t border-border pt-2 sm:order-none sm:w-auto sm:border-t-0 sm:border-l sm:border-border sm:pt-0 sm:pl-4">
            <h1 className="truncate font-mono text-sm font-medium text-foreground">
              {data.fileName}
            </h1>
            <p className="truncate font-mono text-xs text-muted-2">{meta}</p>
          </div>
        ) : null}

        <nav className="ml-auto flex shrink-0 items-center gap-1 text-sm sm:gap-2">
          {data ? (
            <Button
              variant="subtle"
              onClick={reset}
              className="px-2 sm:px-3"
              title="Analyze a different file"
            >
              <RefreshIcon size={15} />
              New file
            </Button>
          ) : null}
          <a
            href={REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-sm px-2 py-1 whitespace-nowrap text-muted transition-colors duration-[var(--dur-micro)] ease-out hover:text-foreground sm:inline"
          >
            GitHub
          </a>
          <AuthMenu onOpenHistory={onOpenHistory} />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

/**
 * Statement footer: the thing worth saying is set as type, and the credit line
 * sits under a hairline beneath it. Both strings are the ones that were already
 * here — the privacy line was footer small print and is now the statement.
 */
function AppFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="max-w-[26ch] font-heading text-panel font-semibold leading-head tracking-tight text-foreground">
          Statistics computed locally · AI narration is optional
        </p>
        <p className="mt-6 border-t border-border pt-4 text-sm text-muted-2">
          Built by Manav Sharma ·{" "}
          <a
            href="https://github.com/man-av"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-ink underline underline-offset-2"
          >
            @man-av
          </a>
        </p>
      </div>
    </footer>
  );
}

export function AnalyzerApp() {
  const { phase } = useAnalyzer();
  const showResults = phase === "ready";
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader onOpenHistory={() => setHistoryOpen(true)} />
      <main className="flex-1">{showResults ? <Results /> : <LandingHero />}</main>
      <AppFooter />
      <HistoryPanel open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </div>
  );
}
