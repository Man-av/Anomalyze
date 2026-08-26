"use client";

/**
 * Time-series line for a numeric column against the dataset's datetime index.
 * Anomalies (from the time-aware detector) are marked with ringed dots; normal
 * points draw no dot to keep the line clean.
 */

import type { ReactElement } from "react";
import dayjs from "dayjs";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS } from "@/lib/charts/palette";
import type { TimelinePoint, TimelineSpec } from "@/lib/charts/selectCharts";
import { fmtInt, fmtNum } from "@/lib/format";
import { ChartFrame } from "./ChartFrame";
import { ChartTooltip } from "./ChartTooltip";

const fmtDate = (v: number | string) => dayjs(v).format("MMM D, YYYY");
const fmtTick = (v: number | string) => dayjs(v).format("MMM D");

/** Custom dot: a marker only for flagged points, an empty node otherwise. */
function renderDot(props: unknown): ReactElement {
  const { cx, cy, payload, index } = props as {
    cx?: number;
    cy?: number;
    payload?: TimelinePoint;
    index?: number;
  };
  const key = `d-${index ?? 0}`;
  if (payload?.band === undefined || cx == null || cy == null) {
    return <g key={key} />;
  }
  return (
    <g key={key}>
      <circle cx={cx} cy={cy} r={5.5} fill={CHART_COLORS.anomaly} fillOpacity={0.18} />
      <circle
        cx={cx}
        cy={cy}
        r={3}
        fill={CHART_COLORS.anomaly}
        stroke="var(--surface)"
        strokeWidth={1}
      />
    </g>
  );
}

export function TimeSeriesChart({ spec }: { spec: TimelineSpec }) {
  const flagged = spec.points.filter((p) => p.band !== undefined);

  const table = (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="text-left text-xs text-muted-2">
          <th className="py-1 pr-4 font-medium">Date</th>
          <th className="py-1 pr-4 font-medium">{spec.column}</th>
          <th className="py-1 font-medium">Flag</th>
        </tr>
      </thead>
      <tbody className="font-mono">
        {spec.points.map((p, i) => (
          <tr key={i} className="border-t border-border">
            <td className="py-1 pr-4">{fmtTick(p.x)}</td>
            <td className="py-1 pr-4">{fmtNum(p.y)}</td>
            <td className="py-1">{p.band ? `${p.band} ${p.direction === "up" ? "▲" : "▼"}` : ""}</td>
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
      footer={
        flagged.length ? (
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: CHART_COLORS.anomaly }}
            />
            {fmtInt(flagged.length)} anomal{flagged.length === 1 ? "y" : "ies"} flagged against the
            local trend
          </p>
        ) : null
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={spec.points} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="x"
            tickFormatter={fmtTick}
            tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            tickLine={false}
            axisLine={{ stroke: CHART_COLORS.grid }}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <YAxis
            tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v) => fmtNum(Number(v))}
          />
          <Tooltip
            cursor={{ stroke: CHART_COLORS.axis, strokeDasharray: "3 3" }}
            content={
              <ChartTooltip
                labelFormatter={fmtDate}
                valueFormatter={(v) => fmtNum(Number(v))}
              />
            }
          />
          <Line
            type="monotone"
            dataKey="y"
            name={spec.column}
            stroke={CHART_COLORS.primary}
            strokeWidth={1.8}
            dot={renderDot}
            activeDot={{ r: 3 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
