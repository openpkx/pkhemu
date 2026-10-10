import { useEffect, useState } from "react";
import type { System } from "@/systems";
import type { ReadMemory } from "./builds";
import { openGameMemory, type GameMemory } from "./gameMemory";

const RETRY_MS = 1000;

export function useGameMemory(system: System, running: boolean, read: ReadMemory) {
  const [memory, setMemory] = useState<GameMemory | "unsupported">();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!running || memory) return;
    let current = true;
    let retry: ReturnType<typeof setTimeout>;
    openGameMemory(system, read).then(
      (opened) => current && setMemory(opened),
      () => {
        if (current) retry = setTimeout(() => setAttempt((attempt) => attempt + 1), RETRY_MS);
      },
    );
    return () => {
      current = false;
      clearTimeout(retry);
    };
  }, [system, running, read, memory, attempt]);

  return memory;
}
