"use client";

/**
 * History drawer: lists a signed-in user's past analyses and reopens one.
 *
 * Only aggregates were stored, so reopening loads the profile + report into
 * "restore mode" (see AnalyzerContext.loadFromHistory) — row-dependent charts,
 * scatter/timeline, and row-level chat degrade gracefully; everything computed
 * from the profile still renders.
 *
 * Dependency-free: a fixed overlay + escape-to-close, not a modal library.
 */

import { useCallback, useEffect, useState } from "react";
import { CloseIcon } from "@/components/icons";
import { Spinner } from "@/components/ui/states";
import { fmtInt } from "@/lib/format";
import { useAnalyzer } from "./AnalyzerContext";
import type { HistoryListItem, HistoryRecord } from "@/lib/db";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function HistoryPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { loadFromHistory } = useAnalyzer();
  const [items, setItems] = useState<HistoryListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  // Load the list each time the drawer opens (cheap; keeps it fresh after a save).
  useEffect(() => {
    if (!open) return;
    let active = true;
    setItems(null);
    setError(null);
    (async () => {
      try {
        const res = await fetch("/api/history");
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as HistoryListItem[];
        if (active) setItems(data);
      } catch {
        if (active) setError("Couldn't load your history. Please try again.");
      }
    })();
    return () => {
      active = false;
    };
  }, [open]);

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const openRecord = useCallback(
    async (id: string) => {
      setOpeningId(id);
      try {
        const res = await fetch(`/api/history/${id}`);
        if (!res.ok) throw new Error(String(res.status));
        const record = (await res.json()) as HistoryRecord;
        loadFromHistory({
          fileName: record.fileName,
          fileSize: record.fileSize,
          profile: record.profile,
          report: record.report,
        });
        onClose();
      } catch {
        setError("Couldn't open that analysis. Please try again.");
      } finally {
        setOpeningId(null);
      }
    },
    [loadFromHistory, onClose],
  );

  const remove = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/history/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(String(res.status));
      setItems((prev) => prev?.filter((it) => it.id !== id) ?? prev);
    } catch {
      setError("Couldn't delete that entry. Please try again.");
    }
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Analysis history"
    >
      {/* Scrim */}
      <button
        type="button"
        aria-label="Close history"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      {/* Drawer */}
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-heading text-base font-semibold tracking-tight">
            Your analysis history
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            aria-label="Close"
          >
            <CloseIcon size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {error ? (
            <p className="mx-2 rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}

          {items === null && !error ? (
            <div className="flex justify-center py-10 text-muted">
              <Spinner size={20} />
            </div>
          ) : items && items.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-muted-2">
              No saved analyses yet. Analyze a file while signed in and it&apos;ll
              show up here.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {items?.map((it) => (
                <li key={it.id}>
                  <div className="group flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2.5 transition-colors hover:border-border-strong">
                    <button
                      type="button"
                      onClick={() => openRecord(it.id)}
                      disabled={openingId !== null}
                      className="min-w-0 flex-1 text-left disabled:opacity-60"
                    >
                      <p className="truncate font-mono text-sm font-medium text-foreground">
                        {it.fileName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-2">
                        {fmtInt(it.rowCount)} × {fmtInt(it.columnCount)} · grade{" "}
                        {gradeFor(it.qualityScore)} · {it.anomalyCount} anomal
                        {it.anomalyCount === 1 ? "y" : "ies"} · {fmtDate(it.createdAt)}
                      </p>
                    </button>
                    {openingId === it.id ? (
                      <Spinner size={15} />
                    ) : (
                      <button
                        type="button"
                        onClick={() => remove(it.id)}
                        aria-label={`Delete ${it.fileName}`}
                        className="shrink-0 rounded-sm p-1.5 text-muted-2 opacity-0 transition-opacity hover:bg-surface-2 hover:text-danger group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <CloseIcon size={14} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

/** Grade band from the stored 0–100 score (mirrors QualityReport.grade). */
function gradeFor(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}
