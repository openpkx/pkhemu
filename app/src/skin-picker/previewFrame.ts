import type { Size } from "@/fit";
import type { Frame } from "@/screen";
import type { System } from "@/systems";

export type PreviewFrameHost = {
  pausedScreenshot(): Promise<number[] | null>;
  recentlyPlayed(limit: number): Promise<string[]>;
  lastScreenshot(folder: string, path: string): Promise<number[] | null>;
};

const RECENT = 100;

const screenSizes: Record<System, Size> = {
  gb: { width: 160, height: 144 },
  gbc: { width: 160, height: 144 },
  gba: { width: 240, height: 160 },
  nds: { width: 256, height: 384 },
  n64: { width: 320, height: 240 },
  "3ds": { width: 400, height: 480 },
};

export function darkFrame(system: System): Frame {
  const { width, height } = screenSizes[system];
  return { width, height, pixels: new Uint16Array(width * height) };
}

export async function lastScreenshotOn(host: PreviewFrameHost, folder: string, system: System) {
  const path = (await host.recentlyPlayed(RECENT)).find((path) => path.split("/")[0] === system);
  return (path && (await host.lastScreenshot(folder, path))) || undefined;
}

export async function pausedFrame(host: PreviewFrameHost) {
  return decoded(await host.pausedScreenshot());
}

export async function lastFrameOn(host: PreviewFrameHost, folder: string, system: System) {
  return decoded(await lastScreenshotOn(host, folder, system));
}

function decoded(png: number[] | null | undefined) {
  return png ? decodeFrame(png) : undefined;
}

export async function decodeFrame(png: number[]): Promise<Frame> {
  const bitmap = await createImageBitmap(new Blob([new Uint8Array(png)], { type: "image/png" }), {
    colorSpaceConversion: "none",
  });
  const { width, height } = bitmap;
  const context = new OffscreenCanvas(width, height).getContext("2d")!;
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const { data } = context.getImageData(0, 0, width, height);
  const pixels = new Uint16Array(width * height);
  for (let i = 0; i < pixels.length; i++) {
    pixels[i] = ((data[i * 4] >> 3) << 11) | ((data[i * 4 + 1] >> 2) << 5) | (data[i * 4 + 2] >> 3);
  }
  return { width, height, pixels };
}
