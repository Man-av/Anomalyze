"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { fmtInt } from "@/lib/format";
import { useAnalyzer } from "./AnalyzerContext";
import { AnomaliesPanel } from "./AnomaliesPanel";
import { ChatBridgeProvider } from "./chat/ChatBridge";
import { Chat } from "./chat/Chat";
import { ColumnProfileTable } from "./ColumnProfileTable";
import { Dashboard } from "./Dashboard";
import { DataQualityPanel } from "./DataQualityPanel";
import { KpiCards } from "./KpiCards";
import { ReportPanel } from "./ReportPanel";

/**
 * The six panels, in the order they render. Every label is the panel's own
 * existing title — the rail names things, it doesn't rename them.
 *
 * The KPI strip is deliberately not in here: it sits above the rail as a
 * full-width band, and a nav link to the top of the page is not orientation.
 */
const SECTIONS = [
  { id: "report", label: "Narrative report" },
  { id: "charts", label: "Visualizations" },
  { id: "chat", label: "Chat with your data" },
  { id: "quality", label: "Data quality" },
  { id: "anomalies", label: "Anomalies" },
  { id: "columns", label: "Column profiles" },
] as const;

const SECTION_IDS = SECTIONS.map((s) => s.id);

/**
 * Which panel the reader is in. The observer root is squeezed to a band just
 * under the sticky header (top inset ≈ header height, bottom inset 75%), so at
 * most one panel is ever crossing it and "current" needs no scoring heuristic.
 *
 * The last known section is kept when nothing is in the band — between two long
 * panels the rail should hold its place, not blank out.
 */
function useActiveSection(): string {
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const els = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting);
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-88px 0px -75% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return active;
}

/**
 * Section rail. One markup path, two layouts:
 *
 *   ≥ 60rem  a sticky vertical list in the left column.
 *   < 60rem  a horizontally scrollable strip under the header, not sticky —
 *            sticky-plus-scroll-sync on a phone steals a third of the viewport.
 *
 * The accent marks the current item and nothing else in this component, which is
 * the whole of its share of the accent budget. The left rule is 2px in both
 * layouts so the marker doesn't change shape across the breakpoint.
 */
function SectionRail({ active }: { active: string }) {
  return (
    <nav
      aria-label="Panels"
      className="-mx-4 mb-8 overflow-x-auto px-4 sm:-mx-6 sm:px-6 min-[60rem]:sticky min-[60rem]:top-24 min-[60rem]:mx-0 min-[60rem]:mb-0 min-[60rem]:self-start min-[60rem]:overflow-visible min-[60rem]:px-0"
    >
      <ul className="flex gap-2 min-[60rem]:flex-col min-[60rem]:gap-0">
        {SECTIONS.map((s) => {
          const current = s.id === active;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={current ? "location" : undefined}
                className={cn(
                  "flex items-center border-l-2 py-1.5 pr-3 pl-2.5 text-sm whitespace-nowrap",
                  "transition-colors duration-[var(--dur-micro)] ease-out",
                  "bg-surface min-[60rem]:bg-transparent",
                  "pointer-coarse:min-h-12",
                  current
                    ? "border-l-accent font-medium text-foreground"
                    : "border-l-border text-muted hover:border-l-border-strong hover:text-foreground",
                )}
              >
                {s.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Results() {
  const { data } = useAnalyzer();
  const active = useActiveSection();
  if (!data) return null;
  const { profile, truncated, rows } = data;

  return (
    <ChatBridgeProvider>
      {/* The file name, its counts, and the reset live in the app header in this
          state, so they stay visible at any scroll depth. Nothing repeats them
          here. */}
      <div className="mx-auto max-w-6xl px-4 pt-6 pb-16 sm:px-6">
        {truncated ? (
          <div className="mb-6 rounded-panel border border-warn bg-warn-soft px-4 py-3 text-sm text-foreground">
            This file is large — showing the first {fmtInt(profile.rowCount)} rows.
            Statistics are computed on the loaded rows.
          </div>
        ) : null}

        <KpiCards profile={profile} />

        <div className="mt-8 min-[60rem]:grid min-[60rem]:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] min-[60rem]:gap-10">
          <SectionRail active={active} />

          <div className="space-y-8">
            <div id="report" className="scroll-mt-24">
              <ReportPanel profile={profile} />
            </div>

            <div id="charts" className="scroll-mt-24">
              <Dashboard profile={profile} rows={rows} />
            </div>

            <div id="chat" className="scroll-mt-24">
              <Chat profile={profile} rows={rows} />
            </div>

            <div id="quality" className="scroll-mt-24">
              <DataQualityPanel quality={profile.quality} />
            </div>

            <div id="anomalies" className="scroll-mt-24">
              <AnomaliesPanel anomalies={profile.anomalies} />
            </div>

            <div id="columns" className="scroll-mt-24">
              <ColumnProfileTable
                columns={profile.columns}
                {...(profile.datetimeIndex ? { datetimeIndex: profile.datetimeIndex } : {})}
              />
            </div>
          </div>
        </div>
      </div>
    </ChatBridgeProvider>
  );
}
