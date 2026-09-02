"use client";

import { Spinner } from "@/components/ui/states";
import { cn } from "@/lib/cn";
import { Markdown } from "./Markdown";

/**
 * One chat turn. Alignment separates the speakers; a lightness step separates
 * the surfaces. The user turn used to be a solid accent fill, which spent the
 * whole accent budget on a transcript that only grows.
 * An assistant turn that is still empty while streaming shows "Thinking…".
 */
export function MessageBubble({
  role,
  content,
  streaming,
}: {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] min-w-0 rounded-panel px-3.5 py-2.5",
          isUser
            ? "rounded-br-sm bg-surface-3 text-foreground"
            : "rounded-bl-sm bg-surface-2 text-foreground",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
        ) : content ? (
          <Markdown>{content}</Markdown>
        ) : streaming ? (
          <span className="flex items-center gap-2 text-sm text-muted">
            <Spinner size={14} /> Thinking…
          </span>
        ) : null}
      </div>
    </div>
  );
}
