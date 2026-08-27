/// <reference lib="webworker" />

/**
 * Off-main-thread profiling for large datasets. Constructed on demand by
 * AnalyzerContext (see WORKER_ROW_THRESHOLD); small files stay synchronous so
 * they skip the worker's serialization overhead. Rows are plain objects, so
 * they cross the boundary via structured clone.
 */

import { profileDataset } from "@/lib/analysis/profile";
import type { Row } from "@/lib/types";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<{ rows: Row[] }>) => {
  try {
    const profile = profileDataset(e.data.rows);
    ctx.postMessage({ ok: true, profile });
  } catch (err) {
    ctx.postMessage({ ok: false, error: err instanceof Error ? err.message : "Profiling failed." });
  }
};
