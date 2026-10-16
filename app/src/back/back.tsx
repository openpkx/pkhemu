import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { OnBackGesture } from "@/backGesture";

export type BackHost = {
  listen: OnBackGesture;
  exit(): void;
};

type Handler = { order: number; current?: () => void };

const BackContext = createContext<Set<Handler> | null>(null);
let nextOrder = 0;

function innermost(handlers: Set<Handler>) {
  let found: Handler | undefined;
  for (const handler of handlers) if (handler.current && (!found || handler.order > found.order)) found = handler;
  return found?.current;
}

function add(handlers: Set<Handler>, handler: Handler) {
  handlers.add(handler);
  return () => void handlers.delete(handler);
}

export function BackProvider({ host, children }: { host?: BackHost; children: ReactNode }) {
  const [handlers] = useState(() => new Set<Handler>());

  useEffect(
    () =>
      host?.listen(() => {
        const onBack = innermost(handlers);
        if (onBack) onBack();
        else host.exit();
      }),
    [host, handlers],
  );

  return <BackContext.Provider value={handlers}>{children}</BackContext.Provider>;
}

function useHandlers() {
  const handlers = useContext(BackContext);
  if (!handlers) throw new Error("useBack needs a BackProvider");
  return handlers;
}

export function useBack(onBack: (() => void) | undefined) {
  const handlers = useHandlers();
  // Taken during render, which runs parents before children, so the innermost screen has the highest order.
  // Taken again when the handler turns on, so an overlay mounted closed ranks above screens mounted before it opened.
  const [handler] = useState<Handler>(() => ({ order: nextOrder++, current: onBack }));
  if (onBack && !handler.current) handler.order = nextOrder++;
  handler.current = onBack;

  useEffect(() => add(handlers, handler), [handlers, handler]);
}

export function useBackGesture(): OnBackGesture {
  const handlers = useHandlers();
  return useCallback((onBack) => add(handlers, { order: nextOrder++, current: onBack }), [handlers]);
}

export function useGoBack() {
  const handlers = useHandlers();
  return useCallback(() => innermost(handlers)?.(), [handlers]);
}
