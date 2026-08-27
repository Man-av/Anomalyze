import { AlertIcon, ArrowDownIcon, ArrowUpIcon, CheckIcon } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/states";
import { ANOMALY } from "@/lib/config";
import { fmtInt, fmtNum } from "@/lib/format";
import type { Anomaly } from "@/lib/types";
import { BAND_META, METHOD_LABEL } from "./typeMeta";

export function AnomaliesPanel({ anomalies }: { anomalies: Anomaly[] }) {
  const sorted = [...anomalies].sort((a, b) => b.score - a.score);
  const shown = sorted.slice(0, ANOMALY.MAX_SHOW);
  const overflow = sorted.length - shown.length;
  const columns = new Set(anomalies.map((a) => a.column)).size;

  return (
    <Card>
      <CardHeader
        icon={<AlertIcon size={16} />}
        title="Anomalies"
        subtitle="Robust MAD z-score & IQR fences"
        actions={
          anomalies.length > 0 ? (
            <Badge tone="danger">
              {fmtInt(anomalies.length)} in {fmtInt(columns)} col
              {columns === 1 ? "" : "s"}
            </Badge>
          ) : (
            <Badge tone="ok">Clean</Badge>
          )
        }
      />
      {shown.length === 0 ? (
        <EmptyState
          icon={<CheckIcon size={20} />}
          title="No anomalies flagged"
          description="The robust detectors found no statistical outliers in the numeric columns."
        />
      ) : (
        <CardBody className="px-0 py-0">
          <div className="max-h-[22rem] overflow-auto" tabIndex={0} aria-label="Flagged anomalies">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-2 text-left text-xs text-muted-2">
                <tr>
                  <th className="px-5 py-2 font-medium">Column</th>
                  <th className="px-3 py-2 text-right font-medium">Value</th>
                  <th className="px-3 py-2 font-medium">Method</th>
                  <th className="px-3 py-2 text-right font-medium">Score</th>
                  <th className="px-5 py-2 font-medium">Severity</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((a, i) => {
                  const band = BAND_META[a.band];
                  return (
                    <tr
                      key={`${a.column}-${a.rowIndex}-${i}`}
                      className="border-t border-border"
                    >
                      <td className="px-5 py-2">
                        <span className="flex items-center gap-1.5">
                          {a.direction === "up" ? (
                            <ArrowUpIcon className="text-danger" />
                          ) : (
                            <ArrowDownIcon className="text-info" />
                          )}
                          <span className="font-mono text-xs">{a.column}</span>
                        </span>
                        <span className="text-xs text-muted-2">
                          row {fmtInt(a.rowIndex + 1)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">
                        {fmtNum(a.value)}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted">
                        {METHOD_LABEL[a.method]}
                        {a.corroborated ? (
                          <span className="ml-1 text-ok" title="Corroborated by both methods">
                            ✓
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted">
                        {fmtNum(a.score)}
                      </td>
                      <td className="px-5 py-2">
                        <Badge tone={band.tone}>{band.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {overflow > 0 ? (
            <p className="border-t border-border px-5 py-2 text-xs text-muted-2">
              +{fmtInt(overflow)} more not shown
            </p>
          ) : null}
        </CardBody>
      )}
    </Card>
  );
}
