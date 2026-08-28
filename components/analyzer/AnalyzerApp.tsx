"use client";


import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAnalyzer } from "./AnalyzerContext";
import { LandingHero } from "./LandingHero";
import { Results } from "./Results";

function AppHeader() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
      <div className="flex items-center">
        <span
          style={{
            fontFamily: "'GoingToDoGreatThings', cursive",
            fontWeight: 900,
            fontSize: "1.8rem",
          }}
          className="text-accent"
        >
          Anomalyze
        </span>
      </div>
      <nav className="flex items-center gap-4 text-sm text-muted">
        <a
          href="https://github.com/Man-av/Anomalyze"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted hover:text-foreground"
        >
          GitHub
        </a>
        <ThemeToggle />
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
            className="text-accent underline underline-offset-2 hover:text-accent-hover"
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
