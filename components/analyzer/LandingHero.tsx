"use client";

import { Fragment } from "react";
import { Card } from "@/components/ui/Card";
import { ErrorState, Spinner } from "@/components/ui/states";
import { useAnalyzer } from "./AnalyzerContext";
import { Uploader } from "./Uploader";

/**
 * The three capability claims. Copy verbatim from the previous bento grid — the
 * "Auto dashboard" entry carries the longer body it had as the grid's large
 * cell, of which the short version was a prefix, so nothing is lost.
 *
 * The `icon` field is gone with the icon-in-coloured-square tiles it fed.
 */
const FEATURES: { term: string; body: string }[] = [
  {
    term: "Instant report",
    body: "A plain-English read on shape, trends, and quality — written by the LLM, or composed deterministically when it isn't available.",
  },
  {
    term: "Auto dashboard",
    body: "Histograms, time series, correlations — the right chart is ranked and chosen per column type, not forced. A categorical column never gets stuffed into a line chart just because it was easy.",
  },
  {
    term: "Chat with it",
    body: "Ask questions in plain English, grounded on pre-computed facts and a stratified sample — not raw-row guesswork.",
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
        <text x="8" y="16" className="font-mono" fontSize="11" fontWeight="600" fill="var(--danger)">
          3.8σ · flagged
        </text>
      </g>
    </svg>
  );
}

function ProcessingCard({ fileName, phase }: { fileName: string | null; phase: string }) {
  const label = phase === "parsing" ? "Parsing file…" : "Profiling columns…";
  return (
    <Card>
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <Spinner size={28} />
        <p className="mt-4 text-base font-medium">{label}</p>
        {fileName ? (
          <p className="mt-1 font-mono text-xs text-muted-2">{fileName}</p>
        ) : null}
      </div>
    </Card>
  );
}

/**
 * All three states of the upload slot fill their container rather than
 * self-centring at `max-w-xl`. The 34rem column below is the one place that
 * width is decided, so the slot never disagrees with the caption under it.
 */
function DropArea() {
  const { phase, fileName, error, reset } = useAnalyzer();
  if (phase === "parsing" || phase === "profiling") {
    return <ProcessingCard fileName={fileName} phase={phase} />;
  }
  if (phase === "error") {
    return (
      <Card>
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
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* ── Hero ──────────────────────────────────────────────────────────────
          Left-biased and asymmetric, and left-aligned at every width: a
          centred hero column is the single most common generated-landing
          layout. `minmax(0, …)` on both tracks so the sparkline can't push
          the grid wider than the viewport. */}
      <section className="grid items-center gap-10 pt-16 pb-14 sm:pt-24 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-10">
        <div>
          {/* Was a dot + mono-uppercase-tracked eyebrow. Same words, now a
              plain descriptor in the body face. */}
          <p className="mb-5 text-sm text-muted">Anomaly Detection · In-browser</p>

          <h1 className="text-hero leading-hero tracking-hero font-semibold">
            Every dataset has a point that doesn&rsquo;t belong.
            <br />
            <span className="text-accent">Anomalyze</span> finds it.
          </h1>

          <p className="mt-6 max-w-[65ch] text-lede text-pretty text-muted">
            Drop in a CSV or Excel file. Anomalyze profiles every column, flags
            real outliers with MAD &amp; IQR &mdash; not a fooled-by-its-own-outliers
            3σ &mdash; builds the right chart per column, and takes questions in
            plain English.
          </p>
        </div>

        {/* Hairline frame, no shadow: the border already draws the edge, and a
            second edge under it is depth for its own sake. */}
        <div className="rounded-panel border border-border bg-surface p-4">
          <div className="mb-2 flex items-center justify-between gap-3 px-1 font-mono text-xs text-muted-2">
            <span className="truncate">revenue.csv &middot; row 232</span>
            <span className="shrink-0">MAD robust-z</span>
          </div>
          <AnomalySparkline />
        </div>
      </section>

      {/* ── Upload ─────────────────────────────────────────────────────────── */}
      <section className="pb-16">
        <h2 className="text-head leading-head font-semibold tracking-tight">
          Upload your data
        </h2>
        <div className="mt-6 max-w-[34rem]">
          <DropArea />
          <p className="mt-4 font-mono text-xs text-muted-2">
            CSV &nbsp;·&nbsp; Excel (.xlsx / .xls) &nbsp;·&nbsp; analyzed entirely in your browser
          </p>
        </div>
      </section>

      {/* ── What it does ───────────────────────────────────────────────────────
          A definition list, because that is what this content is: three named
          capabilities and their descriptions. Rows are separated by a hairline
          and nothing else — no tiles, no chips, no equal-column grid. */}
      <section className="pb-24">
        <h2 className="text-head leading-head font-semibold tracking-tight">
          What it does
        </h2>
        <dl className="mt-6 grid border-b border-border sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
          {FEATURES.map((f) => (
            <Fragment key={f.term}>
              <dt className="border-t border-border pt-4 pb-1.5 font-heading text-base font-semibold text-foreground sm:pr-8 sm:pb-5">
                {f.term}
              </dt>
              <dd className="pb-5 text-sm leading-relaxed text-muted sm:border-t sm:border-border sm:pt-4">
                {f.body}
              </dd>
            </Fragment>
          ))}
        </dl>
      </section>
    </div>
  );
}
