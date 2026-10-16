import { useState } from "react";
import { ConflictSheet, type ConflictSaveHost } from "./ConflictSheet";
import { useSync, type Conflict } from "./sync";

type Showing = { path: string; conflicts: Conflict[]; open: boolean; opens: number };

export function useConflictSheet(host: ConflictSaveHost, folder: string) {
  const { conflicts, conflictHost, synced } = useSync();
  const [showing, setShowing] = useState<Showing>();

  const open = async (path: string) => {
    const found = await conflicts(folder, path).catch((error) => {
      console.error(error);
      return null;
    });
    if (!found) return;
    if (found.length === 0) return void synced(folder, [path]);
    setShowing((was) => ({ path, conflicts: found, open: true, opens: (was?.opens ?? 0) + 1 }));
  };

  const close = () => setShowing((was) => was && { ...was, open: false });

  const sheet = showing && (
    <ConflictSheet
      key={showing.opens}
      open={showing.open}
      host={host}
      cloud={conflictHost}
      folder={folder}
      path={showing.path}
      conflicts={showing.conflicts}
      onResolved={() => {
        close();
        void synced(folder, [showing.path]);
      }}
      onClose={close}
    />
  );

  return { open, sheet };
}
