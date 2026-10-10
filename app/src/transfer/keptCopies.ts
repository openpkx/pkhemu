import type {
  EditablePokemon,
  Engine,
  PokemonHandle,
  PokemonPatch,
  TransferArrival,
  TransferField,
  TransferOffer,
  TransferResult,
} from "@pkhex-everywhere/engine";

export type StoredCopy = {
  identityKey: string;
  generation: number;
  game: string;
  bytes: Uint8Array;
  aliases?: string[];
  ambiguous?: boolean;
};

export type KeptCopyHost = {
  keptCopies(keys: string[]): Promise<StoredCopy[]>;
  keepCopies(copies: StoredCopy[]): Promise<void>;
};

export type CopyNote = {
  at: PokemonHandle;
  restored?: { game: string; patched: TransferField[] };
  keptFrom?: string;
  ambiguous?: boolean;
};

type Keep = Omit<StoredCopy, "bytes"> & { at: PokemonHandle };

export type KeptCopyPlan = { offer: TransferOffer; notes: CopyNote[]; keeps: Keep[] };

const hex = (value: number, digits: number) => value.toString(16).toUpperCase().padStart(digits, "0");

const fiveDigits = (value: number) => String(value).padStart(5, "0");

export function copyKey(pokemon: EditablePokemon, generation: number) {
  if (generation <= 2) {
    const name = Array.from(new TextEncoder().encode(pokemon.originalTrainerName), (byte) => hex(byte, 2)).join("");
    const { attack, defense, speed, specialAttack } = pokemon.ivs;
    const dvs = [attack, defense, speed, specialAttack].map((iv) => hex(iv, 1)).join("");
    return `GB-${fiveDigits(pokemon.trainerId)}-${name}-${dvs}`;
  }
  return `${hex(pokemon.pid >>> 0, 8)}-${fiveDigits(pokemon.trainerId)}-${fiveDigits(pokemon.secretId)}`;
}

const changeable: { fields: TransferField[]; value(pokemon: EditablePokemon): PokemonPatch }[] = [
  { fields: ["species", "form"], value: ({ species, form }) => ({ species, form }) },
  { fields: ["level"], value: ({ level }) => ({ level }) },
  { fields: ["moves"], value: ({ moves }) => ({ moves: moves.map(({ id }) => id) }) },
  { fields: [], value: ({ evs }) => ({ evs }) },
  { fields: ["nickname"], value: ({ nickname }) => ({ nickname }) },
  { fields: ["heldItem"], value: ({ heldItem }) => ({ heldItem }) },
  { fields: ["friendship"], value: ({ friendship }) => ({ friendship }) },
];

const same = (a: PokemonPatch, b: PokemonPatch) => JSON.stringify(a) === JSON.stringify(b);

const usualArrival = async (engine: Engine, at: PokemonHandle) =>
  engine.transfer.convert(await engine.transfer.export(at, "mine"), "partner");

async function restore(engine: Engine, at: PokemonHandle, copy: StoredCopy, current: EditablePokemon) {
  const file = { bytes: copy.bytes, generation: copy.generation };
  const asNow = await engine.transfer.convert(file, "mine");
  if (asNow.pokemon.evolutionFamily !== current.evolutionFamily) return;
  const usual = await usualArrival(engine, at);
  const base = await engine.transfer.convert(file, "partner");
  const changed = changeable.filter(({ value }) => !same(value(current), value(asNow.pokemon)));
  const arrival: TransferArrival = { at, bytes: base.bytes, patch: Object.assign({}, ...changed.map(({ value }) => value(usual.pokemon))) };
  return { arrival, patched: changed.flatMap(({ fields }) => fields), arrives: base.pokemon };
}

export async function planTransfer(engine: Engine, host: KeptCopyHost, send: PokemonHandle[], sourceGame: string): Promise<KeptCopyPlan> {
  const arrivals: TransferArrival[] = [];
  const plan: KeptCopyPlan = { offer: { send, receive: [], arrivals }, notes: [], keeps: [] };
  const [mine, transfer] = [await engine.game.get(), await engine.transfer.get()];
  if (!mine || !transfer) return plan;
  const [source, destination] = [mine.generation, transfer.partner.generation];
  const pokemon: EditablePokemon[] = [];
  for (const at of send) pokemon.push(await engine.transfer.details(at, "mine"));
  const keys = pokemon.map((current) => copyKey(current, source));
  const stored = await host.keptCopies(keys).catch((reason) => {
    console.error(reason);
    return [];
  });
  for (const [index, at] of send.entries()) {
    const key = keys[index];
    const copy = stored.find(({ identityKey, aliases }) => identityKey === key || aliases?.includes(key));
    const note: CopyNote = { at };
    let arrives: EditablePokemon | undefined;
    if (copy?.ambiguous) note.ambiguous = true;
    else if (copy && copy.generation > source && copy.generation >= destination) {
      const restored = await restore(engine, at, copy, pokemon[index]).catch((reason) => console.error(reason));
      if (restored) {
        arrivals.push(restored.arrival);
        note.restored = { game: copy.game, patched: restored.patched };
        arrives = restored.arrives;
      }
    }
    if (source >= 3 && destination < source) {
      note.keptFrom = sourceGame;
      const arriving = arrives ?? (await usualArrival(engine, at).then(({ pokemon }) => pokemon, () => undefined));
      const aliases = destination <= 2 && arriving ? [copyKey(arriving, destination)] : [];
      plan.keeps.push({ at, identityKey: key, generation: source, game: sourceGame, aliases });
    }
    plan.notes.push(note);
  }
  return plan;
}

export async function commitTransfer(engine: Engine, host: KeptCopyHost, plan: KeptCopyPlan) {
  const copies: StoredCopy[] = [];
  for (const { at, ...copy } of plan.keeps) copies.push({ ...copy, bytes: (await engine.transfer.export(at, "mine")).bytes });
  const result: TransferResult = await engine.transfer.commit(plan.offer);
  return { result, keep: () => host.keepCopies(copies).catch((reason) => console.error(reason)) };
}

const sameSlot = (a: PokemonHandle, b: PokemonHandle) => a.source === b.source && a.slot === b.slot && (a.box ?? null) === (b.box ?? null);

export const noteFor = (notes: CopyNote[], at: PokemonHandle) => notes.find((note) => sameSlot(note.at, at));
