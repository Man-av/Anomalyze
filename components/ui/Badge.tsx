import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "accent" | "ok" | "warn" | "danger" | "info";

/* Coloured-text-on-soft-tint was the old scheme, and at 12px it did not clear
 * 4.5:1 — the tone colours sit around L 56–63% and the soft tints around L 94%,
 * which lands near 3.2–4.2:1. Readable-ish, not compliant.
 *
 * So the ink is `--foreground` on every semantic tone (>12:1 on those tints) and
 * the tone is carried by the tinted field plus a hairline in the tone hue, which
 * only needs 3:1 as a non-text element and clears it. Neutral keeps `--muted`
 * because it already passes and because the most common badge should stay quiet.
 *
 * Square-ish, not a pill: 4px reads instrument, `rounded-full` reads consumer. */
const TONES: Record<BadgeTone, string> = {
  neutral: "border-border bg-surface-3 text-muted",
  accent: "border-accent bg-accent-soft text-foreground",
  ok: "border-ok bg-ok-soft text-foreground",
  warn: "border-warn bg-warn-soft text-foreground",
  danger: "border-danger bg-danger-soft text-foreground",
  info: "border-info bg-info-soft text-foreground",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
