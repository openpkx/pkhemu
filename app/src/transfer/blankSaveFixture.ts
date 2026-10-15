import type { Engine } from "@pkhex-everywhere/engine";

// Blank Gen 1 and 2 saves export empty lists without their 0xFF terminator, so they don't load back
// (pkhex-web/issue-tracker#277). These are the party and current box lists of the English Red and Crystal.
const gameBoyLists: Record<string, number[]> = { Red: [0x2f2c, 0x30c0], Crystal: [0x2865, 0x2d10] };

export async function exportBlank(engine: Engine, version: number) {
  await engine.game.loadBlank(version);
  return exportLoadable(engine);
}

export async function exportLoadable(engine: Engine) {
  const loaded = await engine.game.get();
  const bytes = (await engine.game.export()).bytes.slice();
  for (const at of gameBoyLists[loaded?.version ?? ""] ?? []) if (bytes[at] === 0) bytes[at + 1] = 0xff;
  return bytes;
}
