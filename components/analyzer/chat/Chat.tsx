"use client";

/**
 * Data-aware chat.
 *
 * Builds the grounding context (compact, capped — see lib/llm/grounding.ts)
 * once per profile and streams answers from `/api/chat`. The whole feature is
 * additive: the report, charts, and anomaly panels work with zero LLM quota,
 * and a quota/error simply streams a single graceful message here.
 *
 * `send` is kept referentially stable (state read through refs) so the
 * chip-consumption effect doesn't re-fire on every streamed token.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatIcon } from "@/components/icons";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { buildGrounding, type ChatMessage } from "@/lib/llm/grounding";
import type { DatasetProfile, Row } from "@/lib/types";
import { useChatBridge } from "./ChatBridge";
import { ChatInput } from "./ChatInput";
import { MessageList } from "./MessageList";

export interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const STARTERS = [
  "Give me a quick summary of this dataset.",
  "What are the most notable anomalies?",
  "Which columns are most strongly related?",
];

const NETWORK_ERROR =
  "⚠️ I couldn't reach the AI service. The report, charts, and anomaly detection all run locally and are unaffected — please try again.";

let idCounter = 0;
const nextId = () => `m${(idCounter += 1)}`;

export function Chat({
  profile,
  rows,
  restored = false,
}: {
  profile: DatasetProfile;
  rows: Row[];
  restored?: boolean;
}) {
  const grounding = useMemo(() => buildGrounding(profile, rows), [profile, rows]);

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [busy, setBusy] = useState(false);

  // Refs mirror state so `send` can stay stable across renders/tokens.
  const messagesRef = useRef<UiMessage[]>([]);
  const busyRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const cardRef = useRef<HTMLDivElement>(null);
  const bridge = useChatBridge();
  useEffect(() => {
    bridge?.registerTarget(cardRef.current);
  }, [bridge]);

  const setBusyBoth = (v: boolean) => {
    busyRef.current = v;
    setBusy(v);
  };

  const send = useCallback(
    async (raw: string) => {
      const question = raw.trim();
      if (!question || busyRef.current) return;

      const userMsg: UiMessage = { id: nextId(), role: "user", content: question };
      const assistantId = nextId();
      const apiMessages: ChatMessage[] = [...messagesRef.current, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", content: "" }]);
      setBusyBoth(true);

      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: apiMessages, grounding }),
          signal: controller.signal,
        });
        if (!res.body) throw new Error("empty response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (!chunk) continue;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
          );
        }
      } catch {
        if (!controller.signal.aborted) {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId && !m.content ? { ...m, content: NETWORK_ERROR } : m)),
          );
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setBusyBoth(false);
      }
    },
    [grounding],
  );

  // Pick up a question queued by a report chip. Re-runs when `busy` clears so a
  // chip clicked mid-stream is still honored once the current answer finishes.
  useEffect(() => {
    if (!bridge?.pending || busy) return;
    const q = bridge.pending;
    bridge.consume();
    void send(q);
  }, [bridge, busy, send]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  return (
    <div ref={cardRef} className="scroll-mt-20">
      <Card>
        <CardHeader
          icon={<ChatIcon size={16} />}
          title="Chat with your data"
          subtitle="Grounded in the statistics computed locally — ask about trends, anomalies, or specific records"
        />
        <CardBody className="space-y-4">
          {restored ? (
            <p className="rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-muted">
              This analysis was reopened from history. Chat is grounded on the
              stored statistics only — reopen the original file for row-level
              answers about specific records.
            </p>
          ) : null}
          <MessageList messages={messages} busy={busy} starters={STARTERS} onAsk={send} />
          <ChatInput busy={busy} onSend={send} onStop={stop} />
        </CardBody>
      </Card>
    </div>
  );
}
