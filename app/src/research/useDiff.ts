import { useEffect, useState } from "react";
import { diffReadings, diffSpaces, type SpaceChanges, type ValueCandidate } from "./diff";
import type { SaveFile } from "./host";
import { decodeSpaces, type PickedLayout } from "./layout";
import { readValues } from "./values";

export type Diff =
  | { state: "ready"; changes: SpaceChanges[]; values: ValueCandidate[]; pockets: string[]; spaces: number; checked: boolean }
  | { state: "no-layout" }
  | { state: "unreadable" };

export function useDiff(picked: PickedLayout | undefined, saves?: { baseline: SaveFile; after: SaveFile }) {
  const [diff, setDiff] = useState<Diff>();

  useEffect(() => {
    setDiff(undefined);
    if (!saves) return;
    let live = true;
    void (async (): Promise<Diff> => {
      if (!picked) return { state: "no-layout" };
      const values = Promise.all([readValues(saves.baseline.bytes, picked.layout), readValues(saves.after.bytes, picked.layout)]).then(
        ([before, after]) => ({ values: diffReadings(before, after), pockets: after.pouches.map(({ pocket }) => pocket) }),
        () => ({ values: [], pockets: [] }),
      );
      try {
        const [before, after] = await Promise.all([decodeSpaces(saves.baseline.bytes, picked.layout), decodeSpaces(saves.after.bytes, picked.layout)]);
        const changes = diffSpaces(before, after);
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
  }, [picked, saves]);

  return diff;
}
