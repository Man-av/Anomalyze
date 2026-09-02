"use client";

/**
 * Boolean split shown as a single proportion bar plus counts — clearer than a
 * two-bar chart for a true/false variable and cheap to render (no Recharts).
 */

import { fmtInt, fmtPct } from "@/lib/format";
import type { BooleanSpec } from "@/lib/charts/selectCharts";
import { ChartFrame } from "./ChartFrame";

export function BooleanChart({ spec }: { spec: BooleanSpec }) {
  const total = spec.trueCount + spec.falseCount;
  const truePct = total > 0 ? spec.trueCount / total : 0;

  const Legend = ({
    color,
    label,
    count,
    pct,
  }: {
    color: string;
    label: string;
    count: number;
    pct: number;
  }) => (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
      <span className="text-muted">{label}</span>
      <span className="font-mono text-foreground">{fmtInt(count)}</span>
      <span className="font-mono text-muted-2">({fmtPct(pct)})</span>
    </div>
  );

  return (
    <ChartFrame title={spec.title} subtitle={spec.subtitle} height={150}>
      <div className="flex h-full flex-col justify-center gap-4">
        <div className="flex h-8 w-full overflow-hidden rounded-md border border-border">
          <div
            className="h-full transition-[width] duration-[var(--dur-long)] ease-out"
            style={{ width: `${truePct * 100}%`, background: "var(--chart-1)" }}
            title={`true: ${fmtPct(truePct)}`}
          />
          <div
            className="h-full flex-1"
            style={{ background: "var(--chart-3)" }}
            title={`false: ${fmtPct(1 - truePct)}`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <Legend color="var(--chart-1)" label="true" count={spec.trueCount} pct={truePct} />
          <Legend
            color="var(--chart-3)"
            label="false"
            count={spec.falseCount}
            pct={1 - truePct}
          />
        </div>
      </div>
    </ChartFrame>
  );
}
