import { vi } from "vitest";
import type { Cheat, CheatsHost } from "./CheatsScreen";

type Stored = { name: string; code: string; on?: boolean };

export function fakeCheats(stored: Stored[] = [], rejects: Record<string, string> = {}) {
  let next = 0;
  let codes: Cheat[] = [];
  const problem = (code: string) => rejects[code] ?? null;
  const named = (name: string, except?: string) => {
    if (name.trim()) return name.trim();
    const taken = (name: string) => codes.some((code) => code.name === name && code.id !== except);
    let n = 1;
    while (taken(`Code ${n}`)) n++;
    return `Code ${n}`;
  };
  const add = (name: string, code: string, on = true) =>
    codes.push({ id: `id-${++next}`, name: named(name), code, on: on && !problem(code), problem: problem(code) });
  const listed = async () => codes.map((code) => ({ ...code }));
  const find = (id: string) => {
    const code = codes.find((code) => code.id === id);
    if (!code) throw "That code is gone.";
    return code;
  };
  stored.forEach(({ name, code, on }) => add(name, code, on));

  return {
    listCheats: vi.fn(listed),
    addCheat: vi.fn(async (_folder: string, _path: string, name: string, code: string) => {
      add(name, code);
      return listed();
    }),
    editCheat: vi.fn(async (_folder: string, _path: string, id: string, name: string, text: string) => {
      const code = find(id);
      Object.assign(code, { name: named(name, id), code: text, on: code.on && !problem(text), problem: problem(text) });
      return listed();
    }),
    deleteCheat: vi.fn(async (_folder: string, _path: string, id: string) => {
      find(id);
      codes = codes.filter((code) => code.id !== id);
      return listed();
    }),
    toggleCheat: vi.fn(async (_folder: string, _path: string, id: string, on: boolean) => {
      const code = find(id);
      if (on && code.problem) throw code.problem;
      code.on = on;
      return listed();
    }),
  } satisfies CheatsHost;
}
