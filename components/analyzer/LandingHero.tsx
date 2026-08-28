"use client";

import type { ReactNode } from "react";
import { ChartIcon, ChatIcon, DocIcon } from "@/components/icons";
import { Card } from "@/components/ui/Card";
import { ErrorState, Spinner } from "@/components/ui/states";
import { useAnalyzer } from "./AnalyzerContext";
import { Uploader } from "./Uploader";

const SIDE_FEATURES: { title: string; body: string; icon: ReactNode }[] = [
  {
    title: "Instant report",
    body: "A plain-English read on shape, trends, and quality — written by the LLM, or composed deterministically when it isn't available.",
    icon: <DocIcon />,
  },
  {
    title: "Auto dashboard",
    body: "Histograms, time series, correlations — the right chart is ranked and chosen per column type, not forced.",
    icon: <ChartIcon />,
  },
  {
    title: "Chat with it",
    body: "Ask questions in plain English, grounded on pre-computed facts and a stratified sample — not raw-row guesswork.",
    icon: <ChatIcon />,
  },
];

/**
 * The signature visual: a real anomaly call-out, drawn with the app's own
 * chart tokens. This is the one thing Anomalyze does that a plain chart
 * library doesn't — so it's the first thing on the page, not the fourth.
 */
function AnomalySparkline() {
  return (
    <svg
      viewBox="0 0 460 200"
      className="h-full w-full"
      role="img"
      aria-label="Line chart of a metric over time, with one point flagged as a statistical anomaly at 3.8 standard deviations from the trend"
    >
      {[50, 90, 130, 170].map((y) => (
        <line key={y} x1="0" y1={y} x2="460" y2={y} stroke="var(--chart-grid)" strokeWidth="1" />
      ))}
      <path
        d="M 6 132 C 40 126, 60 129, 92 120 C 124 111, 142 118, 172 106 C 198 96, 212 44, 232 38 C 252 32, 262 92, 292 97 C 322 102, 342 84, 372 78 C 402 72, 424 66, 454 60"
        fill="none"
        stroke="var(--chart-1)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line x1="232" y1="38" x2="232" y2="176" stroke="var(--chart-anomaly)" strokeWidth="1" strokeDasharray="3 4" opacity="0.6" />
      <circle cx="232" cy="38" r="10" fill="var(--chart-anomaly)" opacity="0.16" />
      <circle cx="232" cy="38" r="5" fill="var(--chart-anomaly)" stroke="var(--surface)" strokeWidth="2" />
      <g transform="translate(240, 12)">
        <rect width="112" height="24" rx="6" fill="var(--danger-soft)" />
        <text x="8" y="16" fontFamily="var(--font-mono)" fontSize="11" fontWeight="600" fill="var(--danger)">
          3.8σ · flagged
        </text>
      </g>
    </svg>
  );
}

function ProcessingCard({ fileName, phase }: { fileName: string | null; phase: string }) {
  const label = phase === "parsing" ? "Parsing file…" : "Profiling columns…";
  return (
    <Card className="mx-auto max-w-xl">
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <Spinner size={28} />
        <p className="mt-4 text-[15px] font-medium">{label}</p>
        {fileName ? (
          <p className="mt-1 font-mono text-xs text-muted-2">{fileName}</p>
        ) : null}
      </div>
    </Card>
  );
}

function DropArea() {
  const { phase, fileName, error, reset } = useAnalyzer();
  if (phase === "parsing" || phase === "profiling") {
    return <ProcessingCard fileName={fileName} phase={phase} />;
  }
  if (phase === "error") {
    return (
      <Card className="mx-auto max-w-xl">
        <ErrorState
          title="Couldn't analyze that file"
          message={error ?? "Please try a different file."}
          onRetry={reset}
          retryLabel="Choose another file"
        />
      </Card>
    );
  }
  return <Uploader />;
}

export function LandingHero() {
  return (
    <main className="mx-auto max-w-6xl px-6">
      {/* ── Hero ── */}
      <section className="grid items-center gap-10 pt-16 pb-14 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        <div className="text-center lg:text-left">
          {/* Hallmark eyebrow: dot + monospace category label */}
          <div className="mx-auto mb-5 flex items-center justify-center gap-2 lg:mx-0 lg:justify-start">
            <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
              Anomaly Detection · In-browser
            </span>
          </div>

          <h1 className="font-heading mx-auto max-w-xl text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:mx-0">
            Every dataset has a point that doesn&rsquo;t belong.
            <br />
            <span
              style={{
                fontFamily: "'GoingToDoGreatThings', cursive",
                fontWeight: 400,
                fontSize: "1.8em",
              }}
              className="text-accent"
            >
              Anomalyze
            </span>
            <span className="text-accent"> finds it.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-pretty text-base text-muted sm:text-lg lg:mx-0">
            Drop in a CSV or Excel file. Anomalyze profiles every column, flags
            real outliers with MAD &amp; IQR &mdash; not a fooled-by-its-own-outliers
            3σ &mdash; builds the right chart per column, and takes questions in
            plain English.
          </p>
        </div>

        {/* Sparkline hero art */}
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-[0_1px_0_var(--border)]">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="font-mono text-[11px] uppercase tracking-wide text-muted-2">
              revenue.csv &middot; row 232
            </span>
            <span className="font-mono text-[11px] text-muted-2">MAD robust-z</span>
          </div>
          <AnomalySparkline />
        </div>
      </section>

      {/* ── 01 / Upload ── */}
      <section className="pb-12">
        <div className="mb-6 flex items-center gap-3">
          <span className="font-mono text-sm font-semibold text-accent">01</span>
          <span className="font-mono text-xs uppercase tracking-[0.15em] text-muted-2">/&nbsp;&nbsp;Upload your data</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="mx-auto max-w-xl">
          <DropArea />
        </div>
        <p className="mt-4 text-center font-mono text-[11px] text-muted-2">
          CSV &nbsp;·&nbsp; Excel (.xlsx / .xls) &nbsp;·&nbsp; analyzed entirely in your browser
        </p>
      </section>

      {/* ── 02 / What it does ── */}
      <section className="pb-24">
        <div className="mb-6 flex items-center gap-3">
          <span className="font-mono text-sm font-semibold text-accent">02</span>
          <span className="font-mono text-xs uppercase tracking-[0.15em] text-muted-2">/&nbsp;&nbsp;What it does</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid gap-4 md:grid-cols-3 md:grid-rows-2">
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 md:col-span-2 md:row-span-2">
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <ChartIcon />
            </div>
            <h3 className="font-heading text-base font-semibold">Auto dashboard</h3>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">
              Histograms, time series, correlations — the right chart is ranked
              and chosen per column type, not forced. A categorical column never
              gets stuffed into a line chart just because it was easy.
            </p>
            <div className="mt-6 flex items-end gap-1.5" aria-hidden>
              {[38, 62, 44, 80, 52, 70, 30, 58, 90, 46].map((h, i) => (
                <div
                  key={i}
                  className="w-full rounded-t-sm"
                  style={{
                    height: `${h}px`,
                    background: i === 8 ? "var(--chart-anomaly)" : "var(--chart-1)",
                    opacity: i === 8 ? 1 : 0.55,
                  }}
                />
              ))}
            </div>
          </div>

          {SIDE_FEATURES.filter((f) => f.title !== "Auto dashboard").map((f) => (
            <div
              key={f.title}
              className="rounded-[var(--radius-card)] border border-border bg-surface p-5"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                {f.icon}
              </div>
              <h3 className="font-heading text-sm font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}