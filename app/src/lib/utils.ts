export { cn } from "cn"

export function pngDataUrl(bytes: Iterable<number>) {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `data:image/png;base64,${btoa(binary)}`
}

export function inRange(value: unknown, min: number, max: number) {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max
}

export const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));
