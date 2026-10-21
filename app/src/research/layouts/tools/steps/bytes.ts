export type Uint = number | string;

export const uint = (value: Uint): number => (typeof value === "string" ? parseInt(value, 16) : value);

export const view = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

export const equal = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((byte, i) => byte === b[i]);

export const hex = (bytes: Uint8Array) => [...bytes].map((byte) => byte.toString(16).toUpperCase().padStart(2, "0")).join(" ");

export const fromHex = (text: string) =>
  Uint8Array.from(text.split(/\s+/).filter(Boolean), (pair) => {
    if (!/^[0-9A-Fa-f]{2}$/.test(pair)) throw new Error(`"${pair}" isn't a byte`);
    return parseInt(pair, 16);
  });
