import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { fmtInt } from "@/lib/format";
import type { DatasetProfile } from "@/lib/types";
import { gradeTone } from "./typeMeta";

/**
 * Figures in the display face, labels in sentence case. The labels used to be
 * uppercase and letter-spaced, which is the dashboard-template micro-label; a
 * plain label lets the number be the loud thing, which is the point of a KPI.
 */
function KpiTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="rounded-panel border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="font-heading text-2xl font-semibold tabular-nums tracking-tight">
          {value}
        </span>
        {sub ? <span className="text-xs text-muted-2">{sub}</span> : null}
      </div>
    </div>
  );
}

export function KpiCards({ profile }: { profile: DatasetProfile }) {
  const tb = profile.typeBreakdown;
  const numericCount = tb.numeric + tb.integer;
  const anomalyCount = profile.anomalies.length;
  const q = profile.quality;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <KpiTile label="Rows" value={fmtInt(profile.rowCount)} />
      <KpiTile label="Columns" value={fmtInt(profile.columnCount)} />
      <KpiTile
        label="Numeric"
        value={fmtInt(numericCount)}
        sub={`of ${fmtInt(profile.columnCount)}`}
      />
      <KpiTile
        label="Anomalies"
        value={fmtInt(anomalyCount)}
        sub={anomalyCount > 0 ? "flagged" : "none"}
      />
      <KpiTile
        label="Quality"
        value={q.score}
        sub={
          <span className="flex items-center gap-2">
            / 100
            <Badge tone={gradeTone(q.grade)}>{q.grade}</Badge>
          </span>
        }
      />
    </div>
  );
}
