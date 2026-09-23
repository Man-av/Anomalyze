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
            <span className="text-accent"><span className="font-brand text-hero-lg">Anomalyze</span> finds it.</span>
          </h1>

          <p className="mt-6 max-w-[65ch] text-base text-pretty text-muted">
            Drop in a CSV or Excel file. Anomalyze profiles every column, flags
            real outliers with MAD &amp; IQR &mdash; not a fooled-by-its-own-outliers
            3σ &mdash; builds the right chart per column, and takes questions in
            plain English.
          </p>
        </div>

        <div className="p-4">
          <iframe
            src="/correlation_3d_v2.html"
            title="3D correlation analysis"
            className="aspect-[16/10] w-full border-0"
          />
        </div>
      </section>

      <div className="grid gap-16 pb-24 lg:grid-cols-2 lg:gap-12">
        {/* ── Upload ─────────────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-head leading-head font-semibold tracking-tight transition-colors duration-[var(--dur-micro)] hover:text-accent">
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
        <section>
          <h2 className="text-head leading-head font-semibold tracking-tight transition-colors duration-[var(--dur-micro)] hover:text-accent">
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
    </div>
  );
}
