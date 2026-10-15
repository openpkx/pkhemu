import { useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useBack } from "@/back/back";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/button";
import { useGamesFolder } from "@/games-folder/gamesFolder";
import { navigate, Screen } from "@/motion/motion";
import { usePlus } from "@/plus/plus";
import { usePreferences } from "@/preferences/preferences";
import type { Frame } from "@/screen";
import { chosenSkin, skinLine } from "@/skins";
import { systemNames, type System } from "@/systems";
import { lastFrameOn, type PreviewFrameHost } from "./previewFrame";
import { SkinPicker } from "./SkinPicker";

export function SkinsScreen({ systems, host, onBack }: { systems: readonly System[]; host: PreviewFrameHost; onBack(): void }) {
  const { skins } = usePreferences().preferences;
  const plus = usePlus().status?.state;
  const gamesFolder = useGamesFolder();
  const [picking, setPicking] = useState<{ system: System; frame?: Frame }>();
  const tapped = useRef<System>(undefined);
  useBack(onBack);

  const pick = async (system: System) => {
    tapped.current = system;
    const frame =
      gamesFolder.status === "ready" ? await lastFrameOn(host, gamesFolder.folder, system).catch(() => undefined) : undefined;
    if (tapped.current === system) navigate("forward", () => setPicking({ system, frame }));
  };

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-background px-safe pb-safe">
      <ScreenHeader title="Skins" onBack={onBack} />
      <main className="grid justify-items-center p-4">
        <ul aria-label="Systems" className="grid w-full max-w-sm gap-1">
          {systems.map((system) => {
            const skin = chosenSkin(system, skins[system], plus);
            return (
              <li key={system}>
                <Button
                  variant="ghost"
                  className="h-auto w-full justify-start gap-3 rounded-lg px-3 py-2 text-base"
                  onClick={() => void pick(system)}
                >
                  <span
                    aria-hidden
                    className="h-12 w-9 shrink-0 rounded-md bg-cover bg-top ring-1 ring-foreground/10"
                    style={{ backgroundImage: `url(${skin.image})`, backgroundColor: skin.base }}
                  />
                  <span className="grid min-w-0 flex-1 text-left">
                    {systemNames[system]}
                    <span className="truncate text-sm font-normal text-muted-foreground">{skinLine(skin, skins[system].look)}</span>
                  </span>
                  <ChevronRight className="text-muted-foreground" />
                </Button>
              </li>
            );
          })}
        </ul>
      </main>
      {picking && (
        <Screen>
          <SkinPicker system={picking.system} frame={picking.frame} onClose={() => navigate("back", () => setPicking(undefined))} />
        </Screen>
      )}
    </div>
  );
}
