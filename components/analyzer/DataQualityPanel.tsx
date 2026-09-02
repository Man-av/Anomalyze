import type { ReactNode } from "react";
import { CheckIcon } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { fmtInt, fmtPct } from "@/lib/format";
import type { QualityReport } from "@/lib/types";
import { gradeTone, TONE_BAR } from "./typeMeta";

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-2">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function ColumnChips({ label, columns }: { label: string; columns: string[] }) {
  if (columns.length === 0) return null;
  return (
    <div>
      <dt className="text-xs text-muted-2">{label}</dt>
      <dd className="mt-1 flex flex-wrap gap-1">
        {columns.map((c) => (
          <Badge key={c} tone="neutral" className="font-mono">
            {c}
          </Badge>
        ))}
      </dd>
    </div>
  );
}

export function DataQualityPanel({ quality: q }: { quality: QualityReport }) {
  const tone = gradeTone(q.grade);
  const hasIssues = q.components.length > 0;

  return (
    <Card>
      <CardHeader
        icon={<CheckIcon size={16} />}
        title="Data quality"
        subtitle="Transparent 0–100 score"
        actions={<Badge tone={tone}>Grade {q.grade}</Badge>}
      />
      <CardBody>
        <div className="flex items-baseline gap-2">
          <span className="font-heading text-4xl font-semibold tabular-nums tracking-tight">
            {q.score}
          </span>
          <span className="text-sm text-muted-2">/ 100</span>
        </div>
        <div
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-3"
          role="meter"
          aria-valuenow={q.score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Data quality score"
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-[var(--dur-long)] ease-out",
              TONE_BAR[tone],
            )}
            style={{ width: `${q.score}%` }}
          />
        </div>

        {hasIssues ? (
          <ul className="mt-4 space-y-1.5">
            {q.components.map((c) => (
              <li
                key={c.label}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted">{c.label}</span>
                {/* The penalty was `text-danger`, which is ~3.9:1 on a light
                    surface — under AA at this size. The minus sign carries the
                    sign; ink carries the reading. */}
                <span className="font-medium tabular-nums text-foreground">
                  −{c.penalty}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-foreground">
            No quality issues detected.
          </p>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
          <Fact label="Missing cells" value={fmtPct(q.missingCellsPct)} />
          <Fact
            label="Duplicate rows"
            value={`${fmtInt(q.duplicateRows)} (${fmtPct(q.duplicateRowsPct)})`}
          />
        </dl>

        {q.constantColumns.length > 0 ||
        q.highNullColumns.length > 0 ||
        q.mixedTypeColumns.length > 0 ? (
          <dl className="mt-3 space-y-3">
            <ColumnChips label="Constant columns" columns={q.constantColumns} />
            <ColumnChips label="Mostly empty" columns={q.highNullColumns} />
            <ColumnChips label="Mixed types" columns={q.mixedTypeColumns} />
          </dl>
        ) : null}
      </CardBody>
    </Card>
  );
}
