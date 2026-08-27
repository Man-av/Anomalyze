"use client";

/**
 * Lightweight bridge so the report's "questions to explore" chips can push a
 * question into the chat (which lives lower on the page) and scroll to it.
 * The chat registers its container; chips call `ask()`. Consumers read the
 * context optionally — components render fine with no provider present.
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

interface ChatBridgeValue {
  /** a question queued by a chip click, awaiting the chat to pick it up */
  pending: string | null;
  ask: (question: string) => void;
  consume: () => void;
  registerTarget: (el: HTMLElement | null) => void;
}

const ChatBridgeContext = createContext<ChatBridgeValue | null>(null);

export function ChatBridgeProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<string | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);

  const registerTarget = useCallback((el: HTMLElement | null) => {
    targetRef.current = el;
  }, []);

  const ask = useCallback((question: string) => {
    setPending(question);
    // scroll to the chat after this paint
    requestAnimationFrame(() => {
      targetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const consume = useCallback(() => setPending(null), []);

  const value = useMemo<ChatBridgeValue>(
    () => ({ pending, ask, consume, registerTarget }),
    [pending, ask, consume, registerTarget],
  );

  return <ChatBridgeContext.Provider value={value}>{children}</ChatBridgeContext.Provider>;
}

/** Returns the bridge, or null when rendered outside a provider. */
export function useChatBridge(): ChatBridgeValue | null {
  return useContext(ChatBridgeContext);
}
