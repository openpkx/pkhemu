import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Toast } from "@/components/Toast";
import type { SaveHost } from "./editSession";

const POLL_MS = 250;

export type UndoHost = SaveHost & {
  undo(): Promise<void>;
  canUndo(): Promise<boolean>;
};

export function useUndo(host: UndoHost) {
  const [undoable, setUndoable] = useState(false);

  const saveHost = useMemo<SaveHost>(
    () => ({
      ...host,
      apply: async (edited) => {
        await host.apply(edited);
        setUndoable(true);
      },
    }),
    [host],
  );

  useEffect(() => {
    if (!undoable) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      const can = await host.canUndo().catch(() => true);
      if (stopped) return;
      if (!can) return setUndoable(false);
      timer = setTimeout(poll, POLL_MS);
    };
    timer = setTimeout(poll, POLL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [host, undoable]);

  const undo = useCallback(async () => {
    try {
      await host.undo();
    } catch (error) {
      console.error(error);
    } finally {
      setUndoable(false);
    }
  }, [host]);

  return { host: saveHost, undoable, undo };
}

export function UndoToast({ children, onUndo }: { children?: ReactNode; onUndo(): void }) {
  return <Toast inline>{children && <WithUndo onUndo={onUndo}>{children}</WithUndo>}</Toast>;
}

export function WithUndo({ children, onUndo }: { children: ReactNode; onUndo(): void }) {
  return (
    <>
      {children} ·{" "}
      <button className="pointer-events-auto -mr-2 rounded-full px-2 font-medium hover:bg-white/20" onClick={onUndo}>
        Undo
      </button>
    </>
  );
}
