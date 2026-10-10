import { useEffect, useState } from "react";

export type Gravity = { x: number; y: number; z: number };

declare global {
  interface Window {
    androidGravity?: { start(): void; stop(): void; read(): string | null };
  }
}

export function readGravity(): Gravity | undefined {
  const reading = window.androidGravity?.read();
  if (!reading) return undefined;
  const [x, y, z] = reading.split(",").map(Number);
  return { x, y, z };
}

export function useGravity(playing: boolean) {
  const [visible, setVisible] = useState(() => document.visibilityState === "visible");

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  useEffect(() => {
    if (!playing || !visible) return;
    window.androidGravity?.start();
    return () => window.androidGravity?.stop();
  }, [playing, visible]);
}
