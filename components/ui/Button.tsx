import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "subtle";

/* Every interactive state, and where each one lives:
 *
 *   rest / hover / active / disabled  here
 *   focus-visible                     globals.css `:focus-visible` — one ring for
 *                                     every focusable element in the app
 *   loading                           the caller. ChatInput swaps send → stop, a
 *                                     real action a generic `loading` prop can't
 *                                     express; ProcessingCard owns the parse
 *                                     phase. Neither wants a spinning button.
 *   error / success                   states.tsx + Badge tones, never button fill
 *
 * `enabled:` on hover and active, not `pointer-events-none`, so a disabled button
 * still shows `cursor-not-allowed` instead of silently swallowing the pointer.
 * Tailwind v4 already compiles `hover:` inside `@media (hover: hover)`, so no
 * affordance here is hover-only for a touch user. */
const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-fg enabled:hover:bg-accent-hover enabled:active:bg-accent-hover",
  ghost:
    "border border-border bg-surface text-foreground enabled:hover:border-border-strong enabled:hover:bg-surface-2 enabled:active:bg-surface-3",
  subtle:
    "text-muted enabled:hover:bg-surface-2 enabled:hover:text-foreground enabled:active:bg-surface-3",
};

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
}) {
  return (
    <button
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium",
        "transition-[background-color,border-color,color,transform] duration-[var(--dur-micro)] ease-out",
        "enabled:hover:-translate-y-px enabled:active:translate-y-0",
        "disabled:cursor-not-allowed disabled:opacity-55",
        // 48px minimum target on touch, where a 36px button is a mis-tap.
        "pointer-coarse:min-h-12",
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
