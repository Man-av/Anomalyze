/**
 * The narrative report contract, in three aligned forms:
 *   1. `reportContentSchema` — zod, validates whatever the model returns.
 *   2. `GEMINI_RESPONSE_SCHEMA` — the same shape as a Gemini structured-output
 *      schema, so the model is *constrained* to emit valid JSON.
 *   3. `buildReportPrompt` — the instruction that grounds the model in the
 *      summary and forbids fabrication.
 *
 * Keeping all three in one file is deliberate: if the shape changes, it changes
 * here once. The route validates the model's JSON against (1) and falls back on
 * mismatch, so a drifting model can never corrupt the UI.
 */

import { z } from "zod";
import type { DatasetSummary } from "@/lib/analysis/summarize";

const sentence = z.string().trim().min(1).max(1200);

/** The LLM returns exactly these fields; the route adds `source`. */
export const reportContentSchema = z.object({
  title: z.string().trim().min(1).max(120),
  datasetOverview: sentence,
  shapeAndTrends: sentence,
  dataQualityNotes: sentence,
  anomalyNotes: sentence,
  keyFindings: z.array(z.string().trim().min(1).max(300)).min(1).max(8),
  suggestedQuestions: z.array(z.string().trim().min(1).max(200)).min(1).max(6),
});

export type ReportContent = z.infer<typeof reportContentSchema>;

/**
 * Gemini structured-output schema (OpenAPI subset: UPPERCASE types,
 * `propertyOrdering` to fix section order). Mirrors `reportContentSchema`.
 */
export const GEMINI_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: {
      type: "STRING",
      description: "Short, specific headline for this dataset (max ~10 words).",
    },
    datasetOverview: {
      type: "STRING",
      description: "1–3 sentences: what the dataset appears to contain and its shape.",
    },
    shapeAndTrends: {
      type: "STRING",
      description:
        "1–3 sentences on distributions, ranges, skew, time trends, or the strongest relationships.",
    },
    dataQualityNotes: {
      type: "STRING",
      description:
        "1–3 sentences on the quality score, missing data, duplicates, or problem columns.",
    },
    anomalyNotes: {
      type: "STRING",
      description:
        "1–3 sentences on the notable outliers, or a clear statement that none were flagged.",
    },
    keyFindings: {
      type: "ARRAY",
      description: "3–6 crisp, specific takeaways. Each cites a column and/or a number.",
      items: { type: "STRING" },
    },
    suggestedQuestions: {
      type: "ARRAY",
      description:
        "4–6 natural questions a user could ask a chatbot about THIS dataset, answerable from its columns.",
      items: { type: "STRING" },
    },
  },
  required: [
    "title",
    "datasetOverview",
    "shapeAndTrends",
    "dataQualityNotes",
    "anomalyNotes",
    "keyFindings",
    "suggestedQuestions",
  ],
  propertyOrdering: [
    "title",
    "datasetOverview",
    "shapeAndTrends",
    "dataQualityNotes",
    "anomalyNotes",
    "keyFindings",
    "suggestedQuestions",
  ],
} as const;

export const REPORT_SYSTEM_PROMPT = [
  "You are a senior data analyst writing a concise, accurate profile of a dataset for a non-technical reader.",
  "",
  "You are given ONLY pre-computed summary statistics as JSON — you never see the raw data.",
  "Rules:",
  "- Ground every statement in the provided statistics. Never invent numbers, columns, or values.",
  "- Refer to columns by their exact names and cite concrete figures where useful.",
  "- Be specific and plain-spoken; avoid hedging and filler. No markdown headings — plain sentences.",
  "- If the data is thin or a section has nothing noteworthy, say so briefly rather than padding.",
  "- Keep each prose section to 1–3 sentences.",
  "- 'suggestedQuestions' must be things THIS dataset can actually answer, phrased as a user would ask a chatbot.",
].join("\n");

/** The user turn: the summary JSON plus a short instruction. */
export function buildReportPrompt(summary: DatasetSummary): string {
  return [
    "Here is the statistical profile of the uploaded dataset:",
    "```json",
    JSON.stringify(summary),
    "```",
    "Write the report as structured JSON matching the required schema.",
  ].join("\n");
}
