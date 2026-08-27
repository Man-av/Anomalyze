"use client";

/**
 * Analyzer state: a small finite-state machine (idle → parsing → profiling →
 * ready | error) over React Context + useReducer. The provider also owns the
 * async orchestration (parse a file/sample, then profile it) so components just
 * call `analyzeFile` / `loadSample` / `reset` and read state.
 *
 * All analysis runs on the client — raw rows never leave the browser here.
 * Large datasets are profiled in a Web Worker (see WORKER_ROW_THRESHOLD) so the
 * tab stays responsive; small ones stay synchronous to skip the worker overhead.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { LIMITS } from "@/lib/config";
import { profileDataset } from "@/lib/analysis/profile";
import { parseCsv, parseFile } from "@/lib/parse/parseFile";
import type { DatasetProfile, Row } from "@/lib/types";

export type Phase = "idle" | "parsing" | "profiling" | "ready" | "error";

export interface ReadyData {
  fileName: string;
  fileSize: number | null;
  rows: Row[];
  profile: DatasetProfile;
  truncated: boolean;
}

export interface AnalyzerState {
  phase: Phase;
  fileName: string | null;
  data: ReadyData | null;
  error: string | null;
}

type Action =
  | { type: "START"; fileName: string }
  | { type: "PROFILING" }
  | { type: "READY"; data: ReadyData }
  | { type: "ERROR"; message: string }
  | { type: "RESET" };

const INITIAL: AnalyzerState = {
  phase: "idle",
  fileName: null,
  data: null,
  error: null,
};

function reducer(state: AnalyzerState, action: Action): AnalyzerState {
  switch (action.type) {
    case "START":
      return { phase: "parsing", fileName: action.fileName, data: null, error: null };
    case "PROFILING":
      return { ...state, phase: "profiling" };
    case "READY":
      return { phase: "ready", fileName: action.data.fileName, data: action.data, error: null };
    case "ERROR":
      return { ...state, phase: "error", error: action.message };
    case "RESET":
      return INITIAL;
    default:
      return state;
  }
}

interface AnalyzerContextValue extends AnalyzerState {
  analyzeFile: (file: File) => Promise<void>;
  loadSample: (path: string, fileName: string) => Promise<void>;
  reset: () => void;
}

const AnalyzerContext = createContext<AnalyzerContextValue | null>(null);

/** Yield to the event loop so the loading UI paints before we block on profiling. */
const yieldToPaint = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Profile off the main thread. Rejects if the worker is unavailable or errors,
 * so callers can fall back to synchronous profiling.
 * ponytail: one worker per call (construct + terminate); add a reuse pool only
 * if profiling many files back-to-back ever shows up as a real cost.
 */
function profileInWorker(rows: Row[]): Promise<DatasetProfile> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./profile.worker.ts", import.meta.url));
    worker.onmessage = (e: MessageEvent<{ ok: boolean; profile?: DatasetProfile; error?: string }>) => {
      worker.terminate();
      if (e.data.ok && e.data.profile) resolve(e.data.profile);
      else reject(new Error(e.data.error ?? "Profiling failed."));
    };
    worker.onerror = () => {
      worker.terminate();
      reject(new Error("The profiling worker failed."));
    };
    worker.postMessage({ rows });
  });
}

/** Profile in a worker for large datasets; synchronous otherwise (and as a fallback). */
async function profileRows(rows: Row[]): Promise<DatasetProfile> {
  if (rows.length >= LIMITS.WORKER_ROW_THRESHOLD && typeof Worker !== "undefined") {
    try {
      return await profileInWorker(rows);
    } catch {
      // ponytail: sync fallback — a large file may briefly jank the tab, but the
      // analysis always completes rather than dead-ending on a worker failure.
    }
  }
  return profileDataset(rows);
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return "Something went wrong while reading that file.";
}

export function AnalyzerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);

  const runProfile = useCallback(
    async (rows: Row[], meta: { fileName: string; fileSize: number | null; truncated: boolean }) => {
      if (rows.length === 0) {
        dispatch({ type: "ERROR", message: "That file has no data rows to analyze." });
        return;
      }
      dispatch({ type: "PROFILING" });
      await yieldToPaint();
      const profile = await profileRows(rows);
      dispatch({
        type: "READY",
        data: { rows, profile, ...meta },
      });
    },
    [],
  );

  const analyzeFile = useCallback(
    async (file: File) => {
      dispatch({ type: "START", fileName: file.name });
      try {
        await yieldToPaint();
        const result = await parseFile(file);
        if (result.columns.length === 0) {
          dispatch({ type: "ERROR", message: "Couldn't detect any columns in that file." });
          return;
        }
        await runProfile(result.rows, {
          fileName: file.name,
          fileSize: file.size,
          truncated: result.truncated,
        });
      } catch (e) {
        dispatch({ type: "ERROR", message: errorMessage(e) });
      }
    },
    [runProfile],
  );

  const loadSample = useCallback(
    async (path: string, fileName: string) => {
      dispatch({ type: "START", fileName });
      try {
        await yieldToPaint();
        const res = await fetch(path);
        if (!res.ok) throw new Error(`Couldn't load the sample (${res.status}).`);
        const text = await res.text();
        const result = parseCsv(text, fileName);
        await runProfile(result.rows, {
          fileName,
          fileSize: text.length,
          truncated: result.truncated,
        });
      } catch (e) {
        dispatch({ type: "ERROR", message: errorMessage(e) });
      }
    },
    [runProfile],
  );

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  const value = useMemo<AnalyzerContextValue>(
    () => ({ ...state, analyzeFile, loadSample, reset }),
    [state, analyzeFile, loadSample, reset],
  );

  return <AnalyzerContext.Provider value={value}>{children}</AnalyzerContext.Provider>;
}

export function useAnalyzer(): AnalyzerContextValue {
  const ctx = useContext(AnalyzerContext);
  if (!ctx) throw new Error("useAnalyzer must be used within an AnalyzerProvider");
  return ctx;
}
