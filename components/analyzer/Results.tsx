"use client";

import { DocIcon, RefreshIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { fmtBytes, fmtInt } from "@/lib/format";
import { useAnalyzer } from "./AnalyzerContext";
import { AnomaliesPanel } from "./AnomaliesPanel";
import { ColumnProfileTable } from "./ColumnProfileTable";
import { Dashboard } from "./Dashboard";
import { DataQualityPanel } from "./DataQualityPanel";
import { KpiCards } from "./KpiCards";

export function Results() {
  const { data, reset } = useAnalyzer();
  if (!data) return null;
  const { profile, fileName, fileSize, truncated, rows } = data;

  const metaParts = [
    `${fmtInt(profile.rowCount)} rows`,
    `${fmtInt(profile.columnCount)} columns`,
  ];
  if (fileSize != null) metaParts.push(fmtBytes(fileSize));

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <DocIcon size={20} />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{fileName}</h1>
            <p className="text-xs text-muted-2">{metaParts.join(" · ")}</p>
          </div>
        </div>
        <Button variant="ghost" onClick={reset}>
          <RefreshIcon />
          New file
        </Button>
      </div>

      {truncated ? (
        <div className="mb-6 rounded-lg border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-warn">
          This file is large — showing the first {fmtInt(profile.rowCount)} rows.
          Statistics are computed on the loaded rows.
        </div>
      ) : null}

      <KpiCards profile={profile} />

      <div className="mt-8">
        <Dashboard profile={profile} rows={rows} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <DataQualityPanel quality={profile.quality} />
        <AnomaliesPanel anomalies={profile.anomalies} />
      </div>

      <div className="mt-8">
        <ColumnProfileTable
          columns={profile.columns}
          {...(profile.datetimeIndex ? { datetimeIndex: profile.datetimeIndex } : {})}
        />
      </div>
    </main>
  );
}
