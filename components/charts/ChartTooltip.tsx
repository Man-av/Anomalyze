"use client";

/**
 * Themed tooltip shared by every Recharts chart. Recharts injects
 * `active`/`payload`/`label` when used as `content`; the formatter props let
 * each chart control how label and values render. Kept intentionally loose on
 * the payload type to avoid churn against Recharts' internal tooltip types.
 */

import type { ReactNode } from "react";

export interface TooltipEntry {
  name?: ReactNode;
  value?: number | string | Array<number | string>;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: number | string;
  /** hide the header line entirely (e.g. histograms where the label is noise) */
  hideLabel?: boolean;
  /** read the header from `payload[0].payload[labelKey]` instead of `label` */
  labelKey?: string;
  labelFormatter?: (label: number | string) => ReactNode;
  valueFormatter?: (value: number | string | undefined, entry: TooltipEntry) => ReactNode;
}

export function ChartTooltip({
  active,
  payload,
  label,
  hideLabel,
  labelKey,
  labelFormatter,
  valueFormatter,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const rawLabel =
    labelKey && payload[0]?.payload
      ? (payload[0].payload[labelKey] as number | string | undefined)
      : label;

  return (
    <div
      className="pointer-events-none min-w-[7rem] rounded-lg border border-border-strong bg-surface px-3 py-2 text-xs"
      style={{ boxShadow: "0 10px 30px -10px hsl(var(--shadow-color) / 0.55)" }}
    >
      {!hideLabel && rawLabel !== undefined && rawLabel !== "" ? (
        <div className="mb-1.5 font-medium text-foreground">
          {labelFormatter ? labelFormatter(rawLabel) : String(rawLabel)}
        </div>
      ) : null}
      <ul className="space-y-1">
        {payload.map((e, i) => {
          const scalar = Array.isArray(e.value) ? e.value.join("–") : e.value;
          return (
            <li key={i} className="flex items-center gap-2">
              {e.color ? (
                <span
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ background: e.color }}
                />
              ) : null}
              {e.name != null && e.name !== "" ? (
                <span className="text-muted">{e.name}</span>
              ) : null}
              <span className="ml-auto pl-4 font-mono tabular-nums text-foreground">
                {valueFormatter ? valueFormatter(scalar, e) : String(scalar)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
