"use client";

/**
 * Narrative report panel.
 *
 * Owns the "LLM is a pure upgrade" contract on the client:
 *   1. Summarize the profile (aggregates only) and hash it.
 *   2. Compute the deterministic fallback locally — this is the floor.
 *   3. Try `/api/insights`; use the AI report on success, else the fallback.
 *
 * A successful AI report is cached in sessionStorage by hash, so re-analyzing
 * the same file (or remounting) never re-spends the free-tier quota.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { DocIcon, RefreshIcon } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/states";
import { summarizeProfile } from "@/lib/analysis/summarize";
import { hashObject } from "@/lib/hash";
import { buildFallbackReport } from "@/lib/narrative/fallback";
import type { DatasetProfile, Report } from "@/lib/types";
import { useChatBridge } from "./chat/ChatBridge";

interface InsightsResponse {
  report: Report | null;
  source: "ai" | "fallback";
  cached: boolean;
}

function readSession(key: string): Report | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Report) : null;
  } catch {
    return null;
  }
}

function writeSession(key: string, report: Report): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(report));
  } catch {
    /* storage full or unavailable — non-fatal */
  }
}

function Section({ label, children }: { label: string; children: string }) {
  if (!children) return null;
  return (
    <div>
      <h4 className="text-xs font-medium uppercase tracking-wide text-muted-2">{label}</h4>
      <p className="mt-1 text-sm leading-relaxed text-foreground/90">{children}</p>
    </div>
  );
}

export function ReportPanel({ profile }: { profile: DatasetProfile }) {
  const summary = useMemo(() => summarizeProfile(profile), [profile]);
  const hash = useMemo(() => hashObject(summary), [summary]);
  const fallback = useMemo(() => buildFallbackReport(profile), [profile]);
  const bridge = useChatBridge();

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const cacheKey = `insights:${hash}`;

    // Fresh runs (nonce 0) may reuse a cached AI report; a manual retry skips it.
    if (nonce === 0) {
      const stored = readSession(cacheKey);
      if (stored) {
        setReport(stored);
        setLoading(false);
        return;
      }
    }

    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setReport(null);

    (async () => {
      try {
        const res = await fetch("/api/insights", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ summary, hash }),
          signal: controller.signal,
        });
        const data = (await res.json()) as InsightsResponse;
        if (cancelled) return;
        if (data.report && data.source === "ai") {
          setReport(data.report);
          writeSession(cacheKey, data.report);
        } else {
          setReport(fallback);
        }
      } catch {
        if (!cancelled) setReport(fallback);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [hash, summary, fallback, nonce]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);

  const isAi = report?.source === "ai";
  const badge = loading ? (
    <Badge tone="neutral">
      <Spinner size={12} /> Analyzing…
    </Badge>
  ) : isAi ? (
    <Badge tone="accent">AI-generated</Badge>
  ) : (
    <Badge tone="neutral">Built-in analysis</Badge>
  );

  return (
    <Card>
      <CardHeader
        icon={<DocIcon size={16} />}
        title="Narrative report"
        subtitle="Plain-English summary of your data"
        actions={badge}
      />
      <CardBody className="space-y-5" aria-busy={loading}>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : report ? (
          <>
            <h3 className="text-base font-semibold tracking-tight">{report.title}</h3>

            <div className="space-y-4">
              <Section label="Overview">{report.datasetOverview}</Section>
              <Section label="Shape & trends">{report.shapeAndTrends}</Section>
              <Section label="Data quality">{report.dataQualityNotes}</Section>
              <Section label="Anomalies">{report.anomalyNotes}</Section>
            </div>

            {report.keyFindings.length > 0 ? (
              <div className="border-t border-border pt-4">
                <h4 className="text-xs font-medium uppercase tracking-wide text-muted-2">
                  Key findings
                </h4>
                <ul className="mt-2 space-y-1.5">
                  {report.keyFindings.map((f, i) => (
                    <li key={i} className="flex gap-2 text-sm leading-relaxed">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {report.suggestedQuestions.length > 0 ? (
              <div className="border-t border-border pt-4">
                <h4 className="text-xs font-medium uppercase tracking-wide text-muted-2">
                  Questions to explore
                </h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {report.suggestedQuestions.map((q, i) =>
                    bridge ? (
                      <button
                        key={i}
                        type="button"
                        onClick={() => bridge.ask(q)}
                        className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                      >
                        {q}
                      </button>
                    ) : (
                      <span
                        key={i}
                        className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted"
                      >
                        {q}
                      </span>
                    ),
                  )}
                </div>
              </div>
            ) : null}

            {!isAi ? (
              <div className="flex items-center justify-between border-t border-border pt-4">
                <p className="text-xs text-muted-2">
                  Generated locally. The AI writer was unavailable (free-tier limit or no key).
                </p>
                <Button variant="ghost" className="shrink-0 px-3 py-1.5 text-xs" onClick={retry}>
                  <RefreshIcon size={13} />
                  Try AI
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
      </CardBody>
    </Card>
  );
}
