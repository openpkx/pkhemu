import type { Engine, PokemonHandle } from "@pkhex-everywhere/engine";
import { pocketLabel } from "@/editor/pockets";
import { inTurn } from "@/lib/engineTurn";
import type { EngineReading } from "@/research/host";

const slotName = ({ source, slot, box }: PokemonHandle) =>
  source === "box" ? `Box ${(box ?? 0) + 1}, slot ${slot + 1}` : `Party slot ${slot + 1}`;

export function readSave(engine: Engine, save: Uint8Array, formatId?: string) {
  return inTurn(async (): Promise<EngineReading> => {
    await engine.game.load(save, undefined, formatId);
    try {
      const [pouches, party, boxed, heldItems] = await Promise.all([
        engine.inventory.get(),
        engine.party.get(),
        engine.box.get(),
        engine.game.heldItems(),
      ]);
      const names = new Map(heldItems.map(({ id, name }) => [id, name]));
      const held: EngineReading["held"] = [];
      for (const { at, species } of [...party, ...boxed]) {
        const { heldItem, heldItemIndex, heldItemIsUnknown } = await engine.pokemon.details(at);
        if (!heldItemIndex) continue;
        const name = heldItemIsUnknown ? undefined : (names.get(heldItem) ?? `Item ${heldItem}`);
        held.push({ slot: slotName(at), species, item: { index: heldItemIndex, name, count: 1 } });
      }
      return {
        pouches: pouches.map(({ name, items }) => ({
          pocket: pocketLabel(name),
          items: items.map(({ index, name, count, isUnknown }) => ({ index, name: isUnknown ? undefined : name, count })),
        })),
        held,
      };
    } finally {
      await engine.game.close();
    }
  });
}
