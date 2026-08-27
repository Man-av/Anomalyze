"use client";

/**
 * Correlation matrix as a diverging heatmap. Rendered as a real <table> with
 * row/column headers and the numeric r in every cell, so it's legible to
 * screen readers without a separate table view. Positive correlations tint
 * toward the positive hue, negative toward the warm hue; the diagonal is
 * neutral (self-correlation is always 1 and carries no information).
 */

import { corrFill } from "@/lib/charts/palette";
import type { HeatmapSpec } from "@/lib/charts/selectCharts";
import { fmtNum } from "@/lib/format";
import { ChartFrame } from "./ChartFrame";

const truncate = (s: string, n = 12) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function CorrelationHeatmap({ spec }: { spec: HeatmapSpec }) {
  const cols = spec.columns;

  const LegendSwatch = ({ r }: { r: number }) => (
    <span
      className="inline-block h-3 w-4 rounded-[3px] border border-border"
      style={{ background: corrFill(r) }}
    />
  );

  return (
    <ChartFrame title={spec.title} subtitle={spec.subtitle} fluid>
      <div className="overflow-x-auto" tabIndex={0} aria-label="Correlation matrix">
        <table className="w-full border-collapse text-center text-xs">
          <thead>
            <tr>
              <td className="p-1" />
              {cols.map((c) => (
                <th
                  key={c}
                  scope="col"
                  className="p-1 align-bottom font-medium text-muted-2"
                >
                  <span title={c}>{truncate(c)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cols.map((rowName, ri) => {
              const row = spec.matrix[ri] ?? [];
              return (
                <tr key={rowName}>
                  <th
                    scope="row"
                    className="whitespace-nowrap py-1 pr-2 text-right font-medium text-muted-2"
                  >
                    <span title={rowName}>{truncate(rowName)}</span>
                  </th>
                  {cols.map((colName, ci) => {
                    const r = row[ci] ?? 0;
                    const diag = ri === ci;
                    return (
                      <td key={colName} className="p-0.5">
                        <div
                          className="flex h-9 min-w-[2.75rem] items-center justify-center rounded-[4px] font-mono tabular-nums"
                          title={`${rowName} × ${colName}: ${fmtNum(r)}`}
                          style={
                            diag
                              ? { background: "var(--surface-2)", color: "var(--muted-2)" }
                              : { background: corrFill(r), color: "var(--foreground)" }
                          }
                        >
                          {diag ? "1" : Math.abs(r) < 0.005 ? "0" : fmtNum(r)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2 text-[11px] text-muted-2">
        <span>−1</span>
        <LegendSwatch r={-1} />
        <LegendSwatch r={-0.5} />
        <LegendSwatch r={0} />
        <LegendSwatch r={0.5} />
        <LegendSwatch r={1} />
        <span>+1</span>
      </div>
    </ChartFrame>
  );
}
