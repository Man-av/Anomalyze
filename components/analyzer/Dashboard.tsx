"use client";

/**
 * Visualizations dashboard: runs the chart selector over the profile and
 * renders each spec with its matching chart. The selector already ranks and
 * caps the list, so here we only map kind → component and decide column span
 * (the correlation heatmap spans the full width; everything else is a
 * half-width tile on large screens).
 */

import { useMemo } from "react";
import { ChartIcon } from "@/components/icons";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/states";
import { selectCharts, type ChartSpec } from "@/lib/charts/selectCharts";
import type { DatasetProfile, Row } from "@/lib/types";
import { BooleanChart } from "@/components/charts/BooleanChart";
import { CategoryBar } from "@/components/charts/CategoryBar";
import { CorrelationHeatmap } from "@/components/charts/CorrelationHeatmap";
import { Histogram } from "@/components/charts/Histogram";
import { ScatterPlot } from "@/components/charts/ScatterPlot";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";

function renderChart(spec: ChartSpec) {
  switch (spec.kind) {
    case "timeline":
      return <TimeSeriesChart spec={spec} />;
    case "histogram":
      return <Histogram spec={spec} />;
    case "bar":
      return <CategoryBar spec={spec} />;
    case "boolean":
      return <BooleanChart spec={spec} />;
    case "scatter":
      return <ScatterPlot spec={spec} />;
    case "heatmap":
      return <CorrelationHeatmap spec={spec} />;
  }
}

export function Dashboard({ profile, rows }: { profile: DatasetProfile; rows: Row[] }) {
  const specs = useMemo(() => selectCharts(profile, rows), [profile, rows]);

  return (
    <section aria-labelledby="viz-heading">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="viz-heading" className="text-lg font-semibold tracking-tight">
          Visualizations
        </h2>
        {specs.length > 0 ? (
          <span className="text-xs text-muted-2">
            {specs.length} most informative view{specs.length === 1 ? "" : "s"}, chosen from the
            data
          </span>
        ) : null}
      </div>

      {specs.length === 0 ? (
        <Card>
          <CardBody className="py-10">
            <EmptyState
              icon={<ChartIcon size={22} />}
              title="No charts to show"
              description="This dataset is mostly identifiers or free text, so there's nothing meaningful to plot. The column profile below still has the details."
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {specs.map((spec) => (
            <div key={spec.id} className={spec.kind === "heatmap" ? "lg:col-span-2" : ""}>
              {renderChart(spec)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
