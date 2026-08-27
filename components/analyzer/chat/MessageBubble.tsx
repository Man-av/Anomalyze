"use client";

import { Spinner } from "@/components/ui/states";
import { cn } from "@/lib/cn";
import { Markdown } from "./Markdown";

/**
 * One chat turn. User turns are plain text in an accent bubble; assistant
 * turns render markdown. An assistant turn that is still empty while streaming
 * shows a "Thinking…" placeholder.
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
          "max-w-[85%] rounded-2xl px-3.5 py-2.5",
          isUser ? "rounded-br-sm bg-accent text-accent-fg" : "rounded-bl-sm bg-surface-2 text-foreground",
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
