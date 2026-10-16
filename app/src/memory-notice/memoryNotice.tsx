import { useEffect, useState } from "react";
import { useBackGesture } from "@/back/back";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Input } from "@/input/input";
import { PadNavigation } from "@/pad-navigation/PadNavigation";
import { systemNames, type System } from "@/systems";

export type Entitlement = "extended-virtual-addressing" | "increased-memory-limit";

export type MemoryNoticeHost = {
  /** The memory entitlements the app's signature lacks, empty when it has both or can't tell. */
  missingEntitlements(): Promise<Entitlement[]>;
};

const needsMemory: readonly System[] = ["3ds"];

const names: Record<Entitlement, string> = {
  "extended-virtual-addressing": "extended virtual addressing",
  "increased-memory-limit": "the increased memory limit",
};

function remedy(missing: Entitlement[]) {
  if (!missing.includes("extended-virtual-addressing")) return "Installing again with AltStore gets it.";
  if (!missing.includes("increased-memory-limit")) return "A paid Apple developer account gets it.";
  return "A paid Apple developer account gets both. On a free account, installing with AltStore gets the memory limit.";
}

export function useMemoryNotice({
  host,
  system,
  ready,
  input,
  onQuit,
}: {
  host: MemoryNoticeHost;
  system: System;
  /** Whether the game would boot now, so the notice waits for anything asked before it. */
  ready: boolean;
  input: Input;
  onQuit(): void;
}) {
  const asks = needsMemory.includes(system);
  const [missing, setMissing] = useState<Entitlement[]>();
  const [accepted, setAccepted] = useState(false);
  const onBackGesture = useBackGesture();

  useEffect(() => {
    if (!asks) return;
    let current = true;
    void host
      .missingEntitlements()
      .catch((reason) => {
        console.error(reason);
        return [];
      })
      .then((found) => current && setMissing(found));
    return () => {
      current = false;
    };
  }, [host, asks]);

  const showing = asks && ready && !!missing?.length && !accepted;
  const settled = !asks || accepted || missing?.length === 0;

  useEffect(() => {
    if (showing) return onBackGesture(onQuit);
  }, [showing, onBackGesture, onQuit]);

  const dialog = (
    <AlertDialog open={showing}>
      <AlertDialogContent
        onEscapeKeyDown={(event) => {
          event.stopPropagation();
          onQuit();
        }}
      >
        {showing && <PadNavigation input={input} />}
        <AlertDialogHeader>
          <AlertDialogTitle>{systemNames[system]} games may crash</AlertDialogTitle>
          <AlertDialogDescription>
            pkhemu was installed without {missing?.map((entitlement) => names[entitlement]).join(" or ")}, so it may run
            out of memory. {missing && remedy(missing)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onQuit}>Back</AlertDialogCancel>
          <AlertDialogAction onClick={() => setAccepted(true)}>Play anyway</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { settled, dialog };
}
