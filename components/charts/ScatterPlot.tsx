"use client";

/**
 * Scatter of a strongly-correlated numeric pair with a least-squares trend
 * line. The data-table view summarizes the relationship (r, n, ranges) rather
 * than listing every point.
 */

import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS } from "@/lib/charts/palette";
import type { ScatterSpec } from "@/lib/charts/selectCharts";
import { fmtCompact, fmtInt, fmtNum } from "@/lib/format";
import { ChartFrame } from "./ChartFrame";
import { ChartTooltip } from "./ChartTooltip";

function extent(points: { x: number; y: number }[], key: "x" | "y") {
  let lo = Infinity;
  let hi = -Infinity;
  for (const p of points) {
    if (p[key] < lo) lo = p[key];
    if (p[key] > hi) hi = p[key];
  }
  return { lo, hi };
}

export function ScatterPlot({ spec }: { spec: ScatterSpec }) {
  const xExt = extent(spec.points, "x");
  const yExt = extent(spec.points, "y");
  const direction = spec.r >= 0 ? "positive" : "negative";

  const table = (
    <table className="w-full border-collapse text-sm">
      <tbody className="font-mono">
        <tr className="border-b border-border">
          <td className="py-1.5 pr-4 font-sans text-muted">Correlation (r)</td>
          <td className="py-1.5">{fmtNum(spec.r)}</td>
        </tr>
        <tr className="border-b border-border">
          <td className="py-1.5 pr-4 font-sans text-muted">Direction</td>
          <td className="py-1.5">{direction}</td>
        </tr>
        <tr className="border-b border-border">
          <td className="py-1.5 pr-4 font-sans text-muted">Points</td>
          <td className="py-1.5">{fmtInt(spec.points.length)}</td>
        </tr>
        <tr className="border-b border-border">
          <td className="py-1.5 pr-4 font-sans text-muted">{spec.xColumn} range</td>
          <td className="py-1.5">
            {fmtNum(xExt.lo)} – {fmtNum(xExt.hi)}
          </td>
        </tr>
        <tr>
          <td className="py-1.5 pr-4 font-sans text-muted">{spec.yColumn} range</td>
          <td className="py-1.5">
            {fmtNum(yExt.lo)} – {fmtNum(yExt.hi)}
          </td>
        </tr>
      </tbody>
    </table>
  );

  return (
    <ChartFrame title={spec.title} subtitle={spec.subtitle} table={table}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            name={spec.xColumn}
            tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            tickLine={false}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickFormatter={(v) => fmtCompact(Number(v))}
            domain={["dataMin", "dataMax"]}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={spec.yColumn}
            tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(v) => fmtCompact(Number(v))}
            domain={["dataMin", "dataMax"]}
          />
          <Tooltip
            cursor={{ strokeDasharray: "3 3", stroke: CHART_COLORS.axis }}
            content={<ChartTooltip hideLabel valueFormatter={(v) => fmtNum(Number(v))} />}
          />
          {spec.trend ? (
            <ReferenceLine
              ifOverflow="extendDomain"
              segment={[
                { x: spec.trend.x1, y: spec.trend.y1 },
                { x: spec.trend.x2, y: spec.trend.y2 },
              ]}
              stroke={CHART_COLORS.neg}
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
          ) : null}
          <Scatter
            data={spec.points}
            fill={CHART_COLORS.primary}
            fillOpacity={0.55}
            isAnimationActive={false}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
