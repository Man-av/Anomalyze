"use client";

/**
 * Card wrapper shared by every chart: title/subtitle, an optional footer
 * (used for the histogram's box strip), and a chart ⇄ data-table toggle so the
 * information is available to screen-reader and keyboard users, not only as
 * pixels. Charts pass their Recharts tree as `children` and a plain `<table>`
 * as `table`; `fluid` opts out of the fixed-height chart box (the heatmap
 * sizes itself).
 */

import { useId, useState, type ReactNode } from "react";
import { ChartIcon, TableIcon } from "@/components/icons";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export function ChartFrame({
  title,
  subtitle,
  height = 264,
  fluid = false,
  table,
  footer,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  height?: number;
  fluid?: boolean;
  table?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const panelId = useId();
  const showTable = view === "table" && Boolean(table);

  return (
    <Card {...(className ? { className } : {})}>
      <CardHeader
        icon={<ChartIcon size={16} />}
        title={title}
        {...(subtitle ? { subtitle } : {})}
        actions={
          table ? (
            <button
              type="button"
              onClick={() => setView((v) => (v === "chart" ? "table" : "chart"))}
              aria-pressed={view === "table"}
              aria-controls={panelId}
              title={view === "chart" ? "Show data table" : "Show chart"}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-2 transition-colors hover:bg-surface-3 hover:text-foreground"
            >
              {view === "chart" ? <TableIcon size={15} /> : <ChartIcon size={15} />}
              <span className="sr-only">
                {view === "chart" ? "Show data table" : "Show chart"}
              </span>
            </button>
          ) : null
        }
      />
      <CardBody className="pt-3">
        <div id={panelId}>
          {showTable ? (
            <div className="max-h-[300px] overflow-auto" tabIndex={0} aria-label={`${title} data table`}>
              {table}
            </div>
          ) : (
            <>
              {fluid ? (
                children
              ) : (
                <div style={{ height }} className="w-full">
                  {children}
                </div>
              )}
              {footer}
            </>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
