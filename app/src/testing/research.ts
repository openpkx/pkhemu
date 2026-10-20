import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createEngine, wasmHost, type Engine } from "@pkhex-everywhere/engine";
import { layoutFormat } from "@/research/layout";

export const data = fileURLToPath(new URL("../../../data/", import.meta.url));
const dotnet = new URL("../../node_modules/@pkhex-everywhere/engine/_framework/dotnet.js", import.meta.url).href;

export const testEngine = () =>
  createEngine({ host: wasmHost({ dotnetUrl: dotnet, load: (url) => import(/* @vite-ignore */ url) }) });

export const files = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir)
        .sort()
        .flatMap((name) => (statSync(join(dir, name)).isDirectory() ? files(join(dir, name)) : [join(dir, name)]))
    : [];

export async function findSave(engine: Engine, format: string) {
  for (const path of files(`${data}saves`).filter((path) => path.endsWith(".sav"))) {
    const save = readFileSync(path);
    const loaded = await engine.game.load(save).then(() => true, () => false);
    const version = loaded && (await engine.game.version());
    if (version && layoutFormat(version) === format) return { path, save: new Uint8Array(save) };
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

export function readGen3Text(bytes: Uint8Array) {
  const end = bytes.indexOf(0xff);
  return [...bytes.subarray(0, end < 0 ? bytes.length : end)].map((code) => westernText.get(code) ?? "?").join("");
}
