import { useEffect, useState } from "react";
import { diffReadings, diffSpaces, type SpaceChanges, type ValueCandidate } from "./diff";
import type { ResearchHost, SaveFile } from "./host";
import type { PickedLayout } from "./layout";
import { decodeSpaces } from "./spaces";

export type Diff =
  | { state: "ready"; changes: SpaceChanges[]; values: ValueCandidate[]; pockets: string[]; spaces: number; checked: boolean }
  | { state: "no-layout" }
  | { state: "unreadable" };

export function useDiff(host: ResearchHost, picked: PickedLayout | undefined, saves?: { baseline: SaveFile; after: SaveFile }) {
  const [diff, setDiff] = useState<Diff>();

  useEffect(() => {
    setDiff(undefined);
    if (!saves) return;
    let live = true;
    void (async (): Promise<Diff> => {
      const values = Promise.all([host.read(saves.baseline.bytes), host.read(saves.after.bytes)]).then(
        ([before, after]) => ({ values: diffReadings(before, after), pockets: after.pouches.map(({ pocket }) => pocket) }),
        () => ({ values: [], pockets: [] }),
      );
      if (!picked) return { state: "no-layout" };
      try {
        const after = decodeSpaces(saves.after.bytes, picked.layout);
        const changes = diffSpaces(decodeSpaces(saves.baseline.bytes, picked.layout), after);
        return { state: "ready", changes, ...(await values), spaces: after.length, checked: picked.checked };
      } catch {
        return { state: "unreadable" };
      }
    })()
      .catch((): Diff => ({ state: "unreadable" }))
      .then((diff) => live && setDiff(diff));
    return () => {
      live = false;
    };
  }, [host, picked, saves]);

  return diff;
}
