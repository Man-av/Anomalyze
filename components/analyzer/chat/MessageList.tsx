"use client";

import { useEffect, useRef } from "react";
import { ChatIcon } from "@/components/icons";
import { MessageBubble } from "./MessageBubble";
import type { UiMessage } from "./Chat";

/**
 * Scrollable transcript. Empty state offers a few dataset-agnostic starter
 * prompts; once there are messages it auto-scrolls to the latest.
 */
export function MessageList({
  messages,
  busy,
  starters,
  onAsk,
}: {
  messages: UiMessage[];
  busy: boolean;
  starters: string[];
  onAsk: (question: string) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="py-4">
        <div className="mb-4 flex flex-col items-center text-center">
          <span className="mb-3 text-muted-2" aria-hidden="true">
            <ChatIcon size={24} />
          </span>
          <p className="text-sm font-medium">Ask anything about your data</p>
          <p className="mt-1 max-w-sm text-sm text-muted-2">
            Answers are grounded in the statistics computed locally — only a small, capped sample of rows
            is ever sent.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {starters.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onAsk(s)}
              className="rounded-sm border border-border bg-surface-2 px-3 py-1.5 text-left text-xs text-muted transition-colors duration-[var(--dur-micro)] ease-out hover:border-border-strong hover:bg-surface-3 hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1" tabIndex={0} aria-label="Conversation">
      {messages.map((m) => (
        <MessageBubble key={m.id} role={m.role} content={m.content} streaming={busy} />
      ))}
      <div ref={endRef} />
    </div>
  );
}
