import { LazyStore } from "@tauri-apps/plugin-store";

const BYTES = "$bytes";

function base64(bytes: Uint8Array) {
  let binary = "";
  for (let start = 0; start < bytes.length; start += 0x8000) binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
  return btoa(binary);
}

export const toText = (value: unknown) =>
  JSON.stringify(value, (_, value: unknown) => (value instanceof Uint8Array ? { [BYTES]: base64(value) } : value));

export const fromText = (text: string): unknown =>
  JSON.parse(text, (_, value: unknown) =>
    value && typeof value === "object" && BYTES in value ? Uint8Array.from(atob(String(value[BYTES])), (char) => char.charCodeAt(0)) : value,
  );

type Games = Record<string, Record<string, string>>;

// Apart from settings.json, as it holds whole saves.
const store = new LazyStore("research.json");

let queue: Promise<unknown> = Promise.resolve();
// One at a time, so a store doesn't rewrite the games another store just changed.
const inOrder = <T,>(run: () => Promise<T>) => {
  const result = queue.then(run);
  queue = result.catch(() => {});
  return result;
};

export const researchStorage = {
  load: (game: string, key: string) =>
    inOrder(async () => {
      const text = (await store.get<Games>("games"))?.[game]?.[key];
      return text === undefined ? undefined : fromText(text);
    }),
  store: (game: string, key: string, value: unknown) =>
    inOrder(async () => {
      const games = (await store.get<Games>("games")) ?? {};
      const { [key]: _, ...kept } = games[game] ?? {};
      await store.set("games", { ...games, [game]: value === undefined ? kept : { ...kept, [key]: toText(value) } });
      await store.save();
    }),
};
