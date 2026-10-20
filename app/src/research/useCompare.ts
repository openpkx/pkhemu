import { useCallback, useEffect, useRef, useState } from "react";
import type { ResearchHost, SaveFile } from "./host";

export type Compare =
  | { stage: "baseline" }
  | { stage: "after"; baseline: SaveFile; latest: boolean }
  | { stage: "open"; baseline: SaveFile; latest: boolean; after: SaveFile };

const KEY = "compare";
const ENDED = "Loading a state ended your compare";

const same = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((byte, index) => byte === b[index]);

export function useCompare(host: ResearchHost) {
  const [compare, setCompareState] = useState<Compare | undefined | null>(null);
  const current = useRef(compare);
  const endOnLoad = useRef(false);

  const setCompare = useCallback(
    (next: Compare | undefined) => {
      current.current = next;
      setCompareState(next);
      void host.store(KEY, next);
    },
    [host],
  );

  useEffect(() => {
    let live = true;
    host.load<Compare>(KEY).then(
      (stored) => {
        if (!live || current.current !== null) return;
        if (endOnLoad.current && stored) {
          setCompare(undefined);
          void host.notify(ENDED);
          return;
        }
        current.current = stored;
        setCompareState(stored);
      },
      () => live && setCompareState((current.current = undefined)),
    );
    return () => {
      live = false;
    };
  }, [host, setCompare]);

  useEffect(
    () =>
      host.listen((event) => {
        const compare = current.current;
        if (event.kind === "state-loaded" && compare === null) endOnLoad.current = true;
        if (event.kind === "state-loaded" && compare) {
          setCompare(undefined);
          void host.notify(ENDED);
        }
        if (event.kind !== "save-written") return;
        if (compare?.stage === "baseline") {
          setCompare({ stage: "after", baseline: event.save, latest: false });
          void host.notify("First save kept. Play, then save again.");
        }
        if (compare?.stage === "after" && !same(compare.baseline.bytes, event.save.bytes)) {
          setCompare({ ...compare, stage: "open", after: event.save });
          void host.notify("Compare ready in Research");
        }
      }),
    [host, setCompare],
  );

  const status =
    compare === null
      ? undefined
      : !compare
        ? "Compare two saves"
        : compare.stage === "baseline"
          ? "Waiting for your first save"
          : compare.stage === "after"
            ? "Waiting for your next save"
            : "Compare ready";

  useEffect(() => {
    if (status) void host.setStatus(status);
  }, [host, status]);

  return {
    compare,
    async start(from: "latest" | "next") {
      if (from === "next") return setCompare({ stage: "baseline" });
      try {
        setCompare({ stage: "after", baseline: await host.saveFile(), latest: true });
      } catch {
        void host.notify("Couldn't read the save file");
      }
    },
    end: () => setCompare(undefined),
  };
}
