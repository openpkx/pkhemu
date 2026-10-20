import { TitledCard } from "@/plugin-kit/TitledCard";
import { Button } from "@/components/ui/button";
import { useSideloadBuild } from "@/plus/plus";
import { useJit } from "./jit";

function JitCard() {
  const { on, enable, helper, turnOn, turningOn, pairingFile, importPairingFile, removePairingFile, error } = useJit();
  if (on === undefined && !error) return null;
  const inApp = pairingFile && helper === "ready";

  return (
    <TitledCard title="JIT" className="max-w-sm">
      {on ? (
        <p className="text-muted-foreground">JIT is on until the app closes.</p>
      ) : (
        <>
          <p className="text-muted-foreground">
            {inApp
              ? "JIT is off. Turn it on here or with StikDebug. It stays on until the app closes."
              : "JIT is off. StikDebug can turn it on until the app closes."}
          </p>
          {inApp && (
            <p className="text-muted-foreground">Keep LocalDevVPN on. The first time, it downloads about 17 MB.</p>
          )}
          {pairingFile && helper === "removed" && (
            <p className="text-muted-foreground">
              SideStore removed the JIT helper when it installed the app, so JIT can only be turned on with StikDebug.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {inApp && (
              <Button variant="outline" disabled={turningOn} onClick={() => void turnOn()}>
                {turningOn ? "Turning on JIT…" : "Turn on JIT"}
              </Button>
            )}
            <Button variant="outline" disabled={turningOn} onClick={() => void enable()}>
              {inApp ? "Use StikDebug" : "Enable JIT"}
            </Button>
            <Button variant="outline" disabled={turningOn} onClick={() => void importPairingFile()}>
              Import pairing file
            </Button>
          </div>
        </>
      )}
      {pairingFile && (
        <div className="flex items-center justify-between gap-3">
          <span>Pairing file set</span>
          <Button variant="outline" disabled={turningOn} onClick={() => void removePairingFile()}>
            Remove
          </Button>
        </div>
      )}
      {error && <p className="text-destructive">{error}</p>}
    </TitledCard>
  );
}

export function JitSettings() {
  return useSideloadBuild() ? <JitCard /> : null;
}
