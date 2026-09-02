import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Surface container: hairline border, tight instrument radius, no shadow.
 * The dashboard's rail anchors are wrapper divs in Results, so the id and the
 * scroll margin live there — a panel doesn't need to know it's a link target.
 */
export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn("overflow-hidden rounded-panel border border-border bg-surface", className)}
    >
      {children}
    </section>
  );
}

/**
 * Section header: optional icon, title, subtitle, and right-aligned actions.
 *
 * The icon used to sit in an `bg-accent-soft` rounded square. That motif is the
 * icon-in-coloured-tile card, and repeating it across seven panels spent the
 * entire accent budget on decoration. The glyph now renders bare in `--muted`:
 * it orients, it doesn't shout, and the accent stays available for state.
 */
export function CardHeader({
  icon,
  title,
  subtitle,
  actions,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 border-b border-border px-5 py-4",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        {icon ? (
          <span className="mt-0.5 shrink-0 text-muted-2" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="font-heading text-base font-semibold tracking-tight">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}
