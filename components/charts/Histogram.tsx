"use client";

/**
 * Histogram of a numeric column (Freedman–Diaconis bins from the profile),
 * with a five-number box strip beneath it. Bars use the primary chart hue.
 */

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_COLORS } from "@/lib/charts/palette";
import type { HistogramSpec } from "@/lib/charts/selectCharts";
import { fmtCompact, fmtInt, fmtNum } from "@/lib/format";
import { BoxStrip } from "./BoxStrip";
import { ChartFrame } from "./ChartFrame";
import { ChartTooltip } from "./ChartTooltip";

export function Histogram({ spec }: { spec: HistogramSpec }) {
  const data = spec.bins.map((b, i) => ({
    i,
    label: fmtCompact((b.x0 + b.x1) / 2),
    range: `${fmtNum(b.x0)} – ${fmtNum(b.x1)}`,
    count: b.count,
  }));

  const table = (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="text-left text-xs text-muted-2">
          <th className="py-1 pr-4 font-medium">Range</th>
          <th className="py-1 font-medium">Count</th>
        </tr>
      </thead>
      <tbody className="font-mono">
        {data.map((d) => (
          <tr key={d.i} className="border-t border-border">
            <td className="py-1 pr-4">{d.range}</td>
            <td className="py-1">{fmtInt(d.count)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <ChartFrame
      title={spec.title}
      subtitle={spec.subtitle}
      table={table}
      footer={<BoxStrip box={spec.box} />}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }} barCategoryGap={1}>
          <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            tickLine={false}
            axisLine={{ stroke: CHART_COLORS.grid }}
            interval="preserveStartEnd"
            minTickGap={18}
          />
          <YAxis
            tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            tickLine={false}
            axisLine={false}
            width={44}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "color-mix(in srgb, var(--chart-1) 12%, transparent)" }}
            content={
              <ChartTooltip
                labelKey="range"
                valueFormatter={(v) => `${fmtInt(Number(v))} rows`}
              />
            }
          />
          <Bar
            dataKey="count"
            name="Count"
            fill={CHART_COLORS.primary}
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
