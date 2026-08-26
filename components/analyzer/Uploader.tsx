"use client";

import { useRef, useState, type DragEvent } from "react";
import { UploadIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { useAnalyzer } from "./AnalyzerContext";

interface Sample {
  name: string;
  file: string;
  path: string;
  note: string;
}

const SAMPLES: Sample[] = [
  {
    name: "Daily sales",
    file: "sales_daily.csv",
    path: "/samples/sales_daily.csv",
    note: "Time series · planted spike",
  },
  {
    name: "Survey responses",
    file: "survey_responses.csv",
    path: "/samples/survey_responses.csv",
    note: "Categorical · missing data",
  },
  {
    name: "Messy inventory",
    file: "messy_inventory.csv",
    path: "/samples/messy_inventory.csv",
    note: "Duplicates · mixed types",
  },
];

const ACCEPT = ".csv,.xlsx,.xls";

export function Uploader() {
  const { analyzeFile, loadSample } = useAnalyzer();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void analyzeFile(file);
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void analyzeFile(file);
    // Allow re-selecting the same file later.
    e.target.value = "";
  }

  return (
    <div className="mx-auto max-w-xl">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a CSV or Excel file"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "group cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
          dragging
            ? "border-accent bg-accent-soft/40"
            : "border-border-strong bg-surface/50 hover:border-accent hover:bg-surface",
        )}
      >
        <UploadIcon
          className={cn(
            "mx-auto transition-colors",
            dragging ? "text-accent" : "text-muted group-hover:text-accent",
          )}
        />
        <p className="mt-4 text-[15px] font-medium text-foreground">
          Drop your file here, or click to browse
        </p>
        <p className="mt-1 text-sm text-muted-2">.csv, .xlsx or .xls — up to ~25MB</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={onPick}
          className="hidden"
        />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-center text-xs text-muted-2">
          No account needed — or try a sample:
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {SAMPLES.map((s) => (
            <button
              key={s.file}
              type="button"
              onClick={() => void loadSample(s.path, s.file)}
              className="group rounded-lg border border-border bg-surface px-3 py-2 text-left transition-colors hover:border-accent hover:bg-surface-2"
            >
              <span className="block text-sm font-medium text-foreground">
                {s.name}
              </span>
              <span className="block text-xs text-muted-2">{s.note}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
