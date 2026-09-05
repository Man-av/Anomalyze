/**
 * Per-user analysis history, backed by Neon Postgres.
 *
 * Privacy contract: this table stores ONLY aggregates — the `profile`
 * (statistics) and the narrative `report`, plus file metadata. It never stores
 * raw rows or cell values, matching the "analyzed in your browser" promise.
 * The `/api/history` route enforces that no `rows` field is accepted.
 *
 * Schema lives in schema.sql; run it once against the database. Keeping the
 * driver behind these four functions means the routes never build SQL inline.
 */

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { DatasetProfile, Report } from "@/lib/types";

// Lazy: neon() throws if the connection string is missing, so constructing it
// at module load would break `next build`'s route collection when POSTGRES_URL
// isn't set (e.g. local builds without the DB). Created on first query instead.
let _sql: NeonQueryFunction<false, false> | null = null;
function sql(strings: TemplateStringsArray, ...params: unknown[]) {
  if (!_sql) {
    const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
    if (!url) throw new Error("POSTGRES_URL is not set — history storage is unavailable.");
    _sql = neon(url);
  }
  return _sql(strings, ...params);
}

/** One row as the list view needs it — no heavy JSON blobs. */
export interface HistoryListItem {
  id: string;
  fileName: string;
  fileSize: number | null;
  rowCount: number;
  columnCount: number;
  qualityScore: number;
  anomalyCount: number;
  createdAt: string;
}

/** A full stored record, enough to restore the dashboard. */
export interface HistoryRecord extends HistoryListItem {
  profile: DatasetProfile;
  report: Report;
}

/** What the client sends to persist a completed analysis (aggregates only). */
export interface HistoryInput {
  fileName: string;
  fileSize: number | null;
  rowCount: number;
  columnCount: number;
  qualityScore: number;
  anomalyCount: number;
  profile: DatasetProfile;
  report: Report;
}

export async function listHistory(userId: string): Promise<HistoryListItem[]> {
  const rows = await sql`
    SELECT id, file_name, file_size, row_count, column_count,
           quality_score, anomaly_count, created_at
    FROM history
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 100
  `;
  return rows.map(toListItem);
}

export async function getHistory(userId: string, id: string): Promise<HistoryRecord | null> {
  const rows = await sql`
    SELECT id, file_name, file_size, row_count, column_count,
           quality_score, anomaly_count, created_at, profile, report
    FROM history
    WHERE user_id = ${userId} AND id = ${id}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    ...toListItem(row),
    profile: row.profile as DatasetProfile,
    report: row.report as Report,
  };
}

export async function saveHistory(userId: string, r: HistoryInput): Promise<{ id: string }> {
  const rows = await sql`
    INSERT INTO history
      (user_id, file_name, file_size, row_count, column_count,
       quality_score, anomaly_count, profile, report)
    VALUES
      (${userId}, ${r.fileName}, ${r.fileSize}, ${r.rowCount}, ${r.columnCount},
       ${r.qualityScore}, ${r.anomalyCount}, ${JSON.stringify(r.profile)}, ${JSON.stringify(r.report)})
    RETURNING id
  `;
  return { id: rows[0]!.id as string };
}

export async function deleteHistory(userId: string, id: string): Promise<boolean> {
  const rows = await sql`
    DELETE FROM history WHERE user_id = ${userId} AND id = ${id} RETURNING id
  `;
  return rows.length > 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toListItem(row: any): HistoryListItem {
  return {
    id: row.id as string,
    fileName: row.file_name as string,
    fileSize: row.file_size as number | null,
    rowCount: row.row_count as number,
    columnCount: row.column_count as number,
    qualityScore: row.quality_score as number,
    anomalyCount: row.anomaly_count as number,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}
