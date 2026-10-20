export const hex = (value: number, digits = 4) => `0x${value.toString(16).toUpperCase().padStart(digits, "0")}`;
export const byte = (value: number) => value.toString(16).toUpperCase().padStart(2, "0");
export const bytesText = (values: Iterable<number>) => [...values].map(byte).join(" ");

export const plural = (count: number, one: string, many = `${one}s`) => `${count.toLocaleString()} ${count === 1 ? one : many}`;

export const time = (at: number) => new Date(at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
