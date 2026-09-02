import { TableIcon } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { fmtInt, fmtNum, fmtPct } from "@/lib/format";
import type { ColumnProfile } from "@/lib/types";
import { TYPE_META } from "./typeMeta";

/** One-line, type-aware summary of a column's contents. */
function columnSummary(col: ColumnProfile): string {
  switch (col.type) {
    case "numeric":
    case "integer":
      return `${fmtNum(col.min)} – ${fmtNum(col.max)} · median ${fmtNum(col.median)}`;
    case "categorical":
      return `${fmtInt(col.cardinality)} distinct · mode “${col.mode}”`;
    case "datetime":
      return `${col.min.slice(0, 10)} → ${col.max.slice(0, 10)} · ${col.granularity}`;
    case "boolean":
      return `${fmtPct(col.truePct)} true · ${fmtInt(col.trueCount)}/${fmtInt(col.count)}`;
    case "id":
      return `${fmtInt(col.unique)} unique identifiers`;
    case "text": {
      const samples = col.sampleValues
        .slice(0, 2)
        .map((v) => `“${v}”`)
        .join(", ");
      return `avg ${fmtInt(col.avgLength)} chars${samples ? ` · e.g. ${samples}` : ""}`;
    }
  }
}

export function ColumnProfileTable({
  columns,
  datetimeIndex,
}: {
  columns: ColumnProfile[];
  datetimeIndex?: string;
}) {
  return (
    <Card>
      <CardHeader
        icon={<TableIcon size={16} />}
        title="Column profiles"
        subtitle={`${fmtInt(columns.length)} columns, typed and summarized`}
      />
      <CardBody className="px-0 py-0">
        <div className="overflow-x-auto" tabIndex={0} aria-label="Column profiles">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs text-muted-2">
              <tr>
                <th className="px-5 py-2.5 font-medium">Column</th>
                <th className="px-3 py-2.5 font-medium">Type</th>
                <th className="px-3 py-2.5 text-right font-medium">Missing</th>
                <th className="px-3 py-2.5 text-right font-medium">Distinct</th>
                <th className="px-5 py-2.5 font-medium">Summary</th>
              </tr>
            </thead>
            <tbody>
              {columns.map((col) => {
                const meta = TYPE_META[col.type];
                const isIndex = col.name === datetimeIndex;
                return (
                  <tr key={col.name} className="border-t border-border">
                    <td className="px-5 py-2.5">
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium">
                          {col.name}
                        </span>
                        {isIndex ? (
                          <Badge tone="ok" className="text-[10px]">
                            index
                          </Badge>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted">
                      {col.missing > 0 ? fmtPct(col.missingPct) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted">
                      {fmtInt(col.unique)}
                    </td>
                    <td className="px-5 py-2.5 text-muted">{columnSummary(col)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
