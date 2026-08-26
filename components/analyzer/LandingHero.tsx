"use client";

import type { ReactNode } from "react";
import { AlertIcon, ChartIcon, ChatIcon, DocIcon } from "@/components/icons";
import { Card } from "@/components/ui/Card";
import { ErrorState, Spinner } from "@/components/ui/states";
import { useAnalyzer } from "./AnalyzerContext";
import { Uploader } from "./Uploader";

const FEATURES: { title: string; body: string; icon: ReactNode }[] = [
  {
    title: "Instant report",
    body: "A plain-English read on what the data is, its shape, trends, and quality — no setup.",
    icon: <DocIcon />,
  },
  {
    title: "Robust anomalies",
    body: "Outliers found with MAD & IQR methods that don't get fooled by the outliers themselves.",
    icon: <AlertIcon />,
  },
  {
    title: "Auto dashboard",
    body: "Histograms, time series, correlations — the right chart chosen per column type.",
    icon: <ChartIcon />,
  },
  {
    title: "Chat with it",
    body: "Ask questions in plain language, grounded on computed facts — not raw-row guesswork.",
    icon: <ChatIcon />,
  },
];

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
      <section className="pt-16 pb-14 text-center sm:pt-24">
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-ok" />
          Analyzed in your browser — your data never leaves your device for the report
        </div>
        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
          Upload a dataset.
          <br />
          <span className="text-accent">Understand it in seconds.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-base text-muted sm:text-lg">
          Drop in any CSV or Excel file and Anomalyze profiles every column, flags
          real anomalies, builds the right charts, and lets you ask questions in
          plain English.
        </p>

        <div className="mt-10">
          <DropArea />
        </div>
      </section>

      <section className="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-[var(--radius-card)] border border-border bg-surface p-5"
          >
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
              {f.icon}
            </div>
            <h3 className="text-sm font-semibold">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
