import { useEffect, useRef, useState } from "react";
import type { OnBackGesture } from "@/backGesture";
import type { Input } from "@/input/input";
import { capturingPads } from "@/input/padPresses";
import { navigate } from "@/motion/motion";

export type Overlay =
  | "menu"
  | "editor"
  | "settings"
  | "licences"
  | "saveState"
  | "loadState"
  | "cheats"
  | "transferPak"
  | "skin"
  | "pokemonInfo"
  | "achievements"
  | "achievement";

const backFrom: Record<Exclude<Overlay, "editor">, Overlay | undefined> = {
  menu: undefined,
  settings: "menu",
  licences: "settings",
  saveState: "menu",
  loadState: "menu",
  cheats: "menu",
  transferPak: "menu",
  skin: "menu",
  pokemonInfo: undefined,
  achievements: "menu",
  achievement: undefined,
};

export function useOverlay(input: Input, onBackGesture: OnBackGesture) {
  const [overlay, show] = useState<Overlay>();
  const playing = overlay === undefined;
  const editing = overlay === "editor";
  const latest = useRef(overlay);
  latest.current = overlay;

  useEffect(() => {
    if (playing) return input.attach(window);
  }, [input, playing]);

  useEffect(() => {
    if (overlay && overlay !== "menu") return;
    return input.onEvent((event) => {
      if (capturingPads()) return;
      if (event === "pauseMenu") show((overlay) => (overlay ? undefined : "menu"));
      if (event === "editor") show("editor");
    });
  }, [input, overlay]);

  useEffect(() => {
    if (editing) return;
    return onBackGesture(() => {
      const from = latest.current;
      if (!from) return show("menu");
      const to = from === "editor" ? "menu" : backFrom[from];
      if (to) navigate("back", () => show(to));
      else show(undefined);
    });
  }, [onBackGesture, editing]);

  return { overlay, show };
}
