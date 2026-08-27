"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowUpIcon } from "@/components/icons";
import { Spinner } from "@/components/ui/states";

/**
 * Auto-growing textarea with Enter-to-send (Shift+Enter for a newline).
 * While a response is streaming, the send button becomes a stop button.
 */
export function ChatInput({
  busy,
  onSend,
  onStop,
}: {
  busy: boolean;
  onSend: (question: string) => void;
  onStop: () => void;
}) {
  const [value, setValue] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  };

  const submit = () => {
    const q = value.trim();
    if (!q || busy) return;
    onSend(q);
    setValue("");
    if (taRef.current) taRef.current.style.height = "auto";
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex items-end gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 focus-within:ring-2 focus-within:ring-[var(--ring)]">
      <textarea
        ref={taRef}
        rows={1}
        value={value}
        placeholder="Ask about trends, anomalies, correlations…"
        onChange={(e) => {
          setValue(e.target.value);
          resize();
        }}
        onKeyDown={onKeyDown}
        className="max-h-40 flex-1 resize-none bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted-2 focus:outline-none"
      />
      {busy ? (
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop generating"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-muted transition-colors hover:text-foreground"
        >
          <Spinner size={14} />
        </button>
      ) : (
        <button
          type="button"
          onClick={submit}
          disabled={!value.trim()}
          aria-label="Send message"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-fg transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowUpIcon size={16} />
        </button>
      )}
    </div>
  );
}
