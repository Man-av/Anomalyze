"use client";

/**
 * Horizontal bar chart for a categorical column: top-K values (with the rest
 * rolled into "Other" upstream), each bar a distinct categorical hue. Height
 * scales with the number of bars so labels stay legible.
 */

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { catColor, CHART_COLORS } from "@/lib/charts/palette";
import type { BarSpec } from "@/lib/charts/selectCharts";
import { fmtInt, fmtPct } from "@/lib/format";
import { ChartFrame } from "./ChartFrame";
import { ChartTooltip } from "./ChartTooltip";

const truncate = (s: string, n = 18) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function CategoryBar({ spec }: { spec: BarSpec }) {
  const data = spec.items.map((it, i) => ({ ...it, i }));
  const height = Math.min(440, Math.max(180, data.length * 34 + 24));

  const table = (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="text-left text-xs text-muted-2">
          <th className="py-1 pr-4 font-medium">Value</th>
          <th className="py-1 pr-4 font-medium">Count</th>
          <th className="py-1 font-medium">Share</th>
        </tr>
      </thead>
      <tbody>
        {data.map((d) => (
          <tr key={d.i} className="border-t border-border">
            <td className="py-1 pr-4">{d.value}</td>
            <td className="py-1 pr-4 font-mono">{fmtInt(d.count)}</td>
            <td className="py-1 font-mono">{fmtPct(d.pct)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <ChartFrame title={spec.title} subtitle={spec.subtitle} height={height} table={table}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            tickLine={false}
            axisLine={{ stroke: CHART_COLORS.grid }}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="value"
            tickFormatter={(v) => truncate(String(v))}
            tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            tickLine={false}
            axisLine={false}
            width={112}
          />
          <Tooltip
            cursor={{ fill: "color-mix(in srgb, var(--chart-1) 10%, transparent)" }}
            content={
              <ChartTooltip
                labelKey="value"
                valueFormatter={(v, e) => {
                  const pct = (e.payload?.pct as number | undefined) ?? 0;
                  return `${fmtInt(Number(v))}  (${fmtPct(pct)})`;
                }}
              />
            }
          />
          <Bar dataKey="count" name="Count" radius={[0, 3, 3, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.i} fill={catColor(d.i)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
