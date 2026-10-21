import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { detectSave } from "@/research/layout";
import { detect } from "@/research/layouts/parsers/detect.ts";

export const data = fileURLToPath(new URL("../../../data/", import.meta.url));
export const files = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir)
        .sort()
        .flatMap((name) => (statSync(join(dir, name)).isDirectory() ? files(join(dir, name)) : [join(dir, name)]))
    : [];

// A ROM's SHA-1 picks its layout whatever the file holds, and a hack can keep its base game's detection,
// so the save must pass the format's own tests and be the one certain match with the ROM.
// A 3DS save keeps the name of the file in the game's save archive, such as main.
export function findSave(format: string, romSha1?: string) {
  for (const path of files(`${data}saves`).filter((path) => /(\.(sav|raw)|\bmain)$/.test(path))) {
    const save = new Uint8Array(readFileSync(path));
    if (!detect(save).some((found) => found.format === format)) continue;
    const found = detectSave(save, romSha1);
    if (found.length === 1 && found[0].format === format && found[0].match === "certain") return { path, save };
  }
}

const run = (start: number, chars: string) => [...chars].map((char, index) => [start + index, char] as const);
const westernText = new Map<number, string>([
  [0x00, " "],
  [0x1b, "é"],
  ...run(0xa1, "0123456789!?.-"),
  ...run(0xb5, "♂♀"),
  ...run(0xb8, ",×/"),
  ...run(0xbb, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"),
]);
const westernCodes = new Map([...westernText].map(([code, char]) => [char, code]));

export const gen3Text = (text: string) => [...text].map((char) => westernCodes.get(char) ?? -1);
