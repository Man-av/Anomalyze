"use client";

/**
 * Compact five-number summary (min · Q1 · median · Q3 · max) drawn under a
 * histogram, so distribution shape and the box/whisker read together on one
 * card. Pure CSS positioning against a min→max scale; theme-aware via the
 * chart CSS variables.
 */

import { fmtNum } from "@/lib/format";
import type { BoxStats } from "@/lib/charts/selectCharts";

export function BoxStrip({ box }: { box: BoxStats }) {
  const span = box.max - box.min;
  const pos = (v: number) => (span <= 0 ? 0 : ((v - box.min) / span) * 100);
  const boxLeft = pos(box.p25);
  const boxWidth = Math.max(0.6, pos(box.p75) - boxLeft);

  return (
    <figure className="mt-4 border-t border-border pt-3">
      <figcaption className="mb-2 flex items-center justify-between text-[11px] text-muted-2">
        <span>Spread (box = middle 50%)</span>
        <span className="font-mono">
          {fmtNum(box.min)} – {fmtNum(box.max)}
        </span>
      </figcaption>
      <div
        className="relative h-6"
        role="img"
        aria-label={`Box plot. Minimum ${fmtNum(box.min)}, lower quartile ${fmtNum(
          box.p25,
        )}, median ${fmtNum(box.median)}, upper quartile ${fmtNum(box.p75)}, maximum ${fmtNum(
          box.max,
        )}.`}
      >
        {/* whisker line */}
        <div className="absolute top-1/2 h-px w-full -translate-y-1/2 bg-border-strong" />
        {/* min / max end caps */}
        <div className="absolute left-0 top-1/2 h-3 w-px -translate-y-1/2 bg-border-strong" />
        <div className="absolute right-0 top-1/2 h-3 w-px -translate-y-1/2 bg-border-strong" />
        {/* IQR box */}
        <div
          className="absolute top-1/2 h-6 -translate-y-1/2 rounded-[3px] border"
          style={{
            left: `${boxLeft}%`,
            width: `${boxWidth}%`,
            background: "color-mix(in srgb, var(--chart-1) 20%, transparent)",
            borderColor: "color-mix(in srgb, var(--chart-1) 55%, transparent)",
          }}
        />
        {/* median */}
        <div
          className="absolute top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full"
          style={{ left: `calc(${pos(box.median)}% - 1px)`, background: "var(--chart-1)" }}
        />
      </div>
    </figure>
  );
}
