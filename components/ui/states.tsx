import type { ReactNode } from "react";
import { AlertIcon, SpinnerIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

/** Spinning loader that inherits color via `currentColor`. */
export function Spinner({
  size = 18,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <SpinnerIcon size={size} className={cn("animate-spin text-accent", className)} />
  );
}

/** Neutral placeholder for "nothing here yet" regions. */
export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon ? (
        // Bare glyph, no tinted circle behind it. The circle-blob empty state is
        // on every generated app and it makes an absence look like a feature.
        <span className="mb-3 text-muted-2" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-2">{description}</p>
      ) : null}
    </div>
  );
}

/** Error region with an optional retry action. */
export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try again",
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <span className="mb-3 text-danger" aria-hidden="true">
        <AlertIcon size={24} />
      </span>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted">{message}</p>
      {onRetry ? (
        <Button variant="ghost" className="mt-4" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
