"use client";

import { LogoMark } from "@/components/icons";
import { useAnalyzer } from "./AnalyzerContext";
import { LandingHero } from "./LandingHero";
import { Results } from "./Results";

function AppHeader() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
      <div className="flex items-center gap-2.5">
        <LogoMark />
        <span className="text-[15px] font-semibold tracking-tight">Anomalyze</span>
      </div>
      <nav className="flex items-center gap-6 text-sm text-muted">
        <a
          href="https://github.com/man-av"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-foreground"
        >
          GitHub
        </a>
      </nav>
    </header>
  );
}

function AppFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-8 text-sm text-muted-2 sm:flex-row">
        <p>
          Built by Manav Sharma ·{" "}
          <a
            href="https://github.com/man-av"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-hover"
          >
            @man-av
          </a>
        </p>
        <p>Statistics computed locally · AI narration is optional</p>
      </div>
    </footer>
  );
}

export function AnalyzerApp() {
  const { phase } = useAnalyzer();
  const showResults = phase === "ready";

  return (
    <div className={showResults ? "min-h-screen" : "bg-hero-glow min-h-screen"}>
      <AppHeader />
      {showResults ? <Results /> : <LandingHero />}
      <AppFooter />
    </div>
  );
}
