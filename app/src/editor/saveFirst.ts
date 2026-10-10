import { useEffect, useRef, useState } from "react";
import type { SaveHost } from "./editSession";

export const STALE_AFTER_SECONDS = 60;
const POLL_MS = 250;
// A game can write its save over several frames, so wait until the writes stop.
const SETTLED_SECONDS = 1;

export function useStaleSave(host: SaveHost) {
  const [stale, setStale] = useState<boolean>();

  useEffect(() => {
    let current = true;
    host.playTimeSinceSave().then(
      (since) => current && setStale(since !== null && since > STALE_AFTER_SECONDS),
      (error) => {
        console.error(error);
        if (current) setStale(false);
      },
    );
    return () => {
      current = false;
    };
  }, [host]);

  return stale;
}

export function useNextSave(host: SaveHost, waiting: boolean, onSaved: () => void) {
  const latestOnSaved = useRef(onSaved);
  latestOnSaved.current = onSaved;

  useEffect(() => {
    if (!waiting) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let previous: number | undefined;
    let saved = false;

    const poll = async () => {
      const since = await host.playTimeSinceSave().catch(() => null);
      if (stopped) return;
      if (since !== null) {
        saved ||= previous !== undefined && since < previous;
        previous = since;
        if (saved && since >= SETTLED_SECONDS) return latestOnSaved.current();
      }
      timer = setTimeout(poll, POLL_MS);
    };
    void poll();

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [host, waiting]);
}
