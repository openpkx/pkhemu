import type { GravityHost } from "./gravity";

declare global {
  interface Window {
    androidGravity?: { start(): void; stop(): void; read(): string | null };
  }
}

export const androidGravityHost: GravityHost = {
  start: () => window.androidGravity?.start(),
  stop: () => window.androidGravity?.stop(),
  read() {
    const reading = window.androidGravity?.read();
    if (!reading) return undefined;
    const [x, y, z] = reading.split(",").map(Number);
    return { x, y, z };
  },
};
