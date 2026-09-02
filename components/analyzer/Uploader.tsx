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

/**
 * The page's primary action and its largest single element. Width is decided by
 * the caller (LandingHero's 34rem column), not here.
 *
 * Accent appears in exactly one place: the active drag state, where it is
 * genuine state feedback. Plain hover moves the rule and the surface instead —
 * three accent-bordered targets stacked on one screen is the whole budget spent
 * on hover states.
 *
 * No focus classes: the `:focus-visible` rule in globals.css governs every
 * focusable element in the app, including this `role="button"` div.
 */
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
    <div>
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
          "group cursor-pointer rounded-panel border-2 border-dashed px-6 py-12 text-center",
          "transition-[background-color,border-color] duration-[var(--dur-micro)] ease-out",
          dragging
            ? "border-accent bg-accent-soft"
            : "border-border-strong bg-surface hover:border-foreground hover:bg-surface-2",
        )}
      >
        <UploadIcon
          className={cn(
            "mx-auto transition-colors duration-[var(--dur-micro)] ease-out",
            dragging ? "text-accent" : "text-muted-2 group-hover:text-foreground",
          )}
        />
        <p className="mt-4 text-base font-medium text-foreground">
          Drop your file here, or click to browse
        </p>
        <p className="mt-1 text-sm text-muted">.csv, .xlsx or .xls — up to ~25MB</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={onPick}
          className="hidden"
        />
      </div>

      <div className="mt-5">
        <p className="text-xs text-muted-2">No account needed — or try a sample:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SAMPLES.map((s) => (
            <button
              key={s.file}
              type="button"
              onClick={() => void loadSample(s.path, s.file)}
              className="min-w-0 rounded-sm border border-border bg-surface px-3 py-2 text-left transition-colors duration-[var(--dur-micro)] ease-out hover:border-border-strong hover:bg-surface-2"
            >
              <span className="block text-sm font-medium text-foreground">
                {s.name}
              </span>
              <span className="block font-mono text-xs text-muted-2">{s.note}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
