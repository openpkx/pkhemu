import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { ChevronRight, RefreshCw } from "lucide-react";
import { cn } from "cn";
import { BottomSheet } from "@/plugin-kit/BottomSheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useMinute } from "@/game-clock/GameClockSetting";
import { count } from "@/import/folder";
import { useAddingGames } from "@/import/importFiles";
import type { ConflictSaveHost } from "./ConflictSheet";
import { runGames, syncStatus } from "./gameStatus";
import { useSync } from "./sync";
import { useConflictSheet } from "./useConflictSheet";

const stageClass = "min-w-0 max-w-[60%] text-right [overflow-wrap:anywhere]";

function SyncDetailsSheet({ open, onClose, onConflict }: { open: boolean; onClose(): void; onConflict(path: string): void }) {
  const sync = useSync();
  const adding = useAddingGames();
  const now = useMinute();
  const { line, percent } = syncStatus(sync.syncing, sync.run, sync.lastSynced, now);
  const games = runGames(sync.gameSync, sync.run);

  return (
    <BottomSheet open={open} title="Sync" onClose={onClose} centeredFromSm className="sm:max-w-sm">
      <div className="grid gap-4 px-3">
        {sync.error && <p className="text-sm text-destructive">{sync.error}</p>}
        <div className="grid gap-1.5">
          <p className="text-sm text-muted-foreground">{line}</p>
          {percent !== undefined && <Progress aria-label="Sync progress" value={percent} />}
        </div>
        {adding > 0 && <p className="text-sm">Adding {count(adding, "game")}</p>}
        {games.length > 0 && (
          <ul aria-label="Games syncing" className="grid min-w-0 gap-1 text-sm pointer-coarse:text-base">
            {games.map(({ path, name, stage }) =>
              sync.gameSync[path]?.state === "conflict" ? (
                <li key={path} className="grid">
                  <Button
                    variant="ghost"
                    className="-mx-3 h-auto min-h-11 justify-between gap-3 rounded-lg px-3 font-normal whitespace-normal pointer-coarse:text-base"
                    onClick={() => onConflict(path)}
                  >
                    <span className="min-w-0 flex-1 truncate text-left">{name}</span>
                    <span className={cn(stageClass, "text-warning")}>{stage}</span>
                    <ChevronRight className="text-muted-foreground" />
                  </Button>
                </li>
              ) : (
                <li key={path} className="flex min-h-11 min-w-0 items-center justify-between gap-3">
                  <span className="min-w-0 flex-1 truncate">{name}</span>
                  <span className={cn(stageClass, "text-muted-foreground")}>{stage}</span>
                </li>
              ),
            )}
          </ul>
        )}
        <Button variant="outline" className="justify-self-end" disabled={sync.syncing} onClick={sync.syncNow}>
          <RefreshCw />
          Sync now
        </Button>
      </div>
    </BottomSheet>
  );
}

const SyncDetailsContext = createContext<() => void>(() => {});

export const useOpenSyncDetails = () => useContext(SyncDetailsContext);

export function SyncDetailsProvider({ host, folder, children }: { host: ConflictSaveHost; folder: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const conflictSheet = useConflictSheet(host, folder);
  const show = useCallback(() => setOpen(true), []);

  return (
    <SyncDetailsContext.Provider value={show}>
      {children}
      <SyncDetailsSheet
        open={open}
        onClose={() => setOpen(false)}
        onConflict={(path) => {
          setOpen(false);
          void conflictSheet.open(path);
        }}
      />
      {conflictSheet.sheet}
    </SyncDetailsContext.Provider>
  );
}
