import { useEffect, useState } from "react";
import { Toast } from "@/components/Toast";

export type CoreMessage = { text: string; durationMs: number };
export type CoreMessages = (listener: (message: CoreMessage) => void) => () => void;

const SHORTEST_MS = 1000;

export function CoreMessageToast({ messages }: { messages: CoreMessages }) {
  const [message, setMessage] = useState<CoreMessage>();

  useEffect(() => messages(setMessage), [messages]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(undefined), Math.max(message.durationMs, SHORTEST_MS));
    return () => clearTimeout(timer);
  }, [message]);

  return <Toast inline>{message?.text}</Toast>;
}
