import { EngineError, type EditablePokemon, type Engine, type PokemonGender, type StatValues } from "@pkhex-everywhere/engine";
import { originalGame } from "@/game-page/saveSummary";
import type { Facts, GameMemory } from "@/game-memory/gameMemory";

export type ReadPokemon = {
  speciesId: number | null;
  speciesIndex: number;
  species: string;
  form: number;
  isUnknown: boolean;
  isShiny: boolean;
  gender: PokemonGender;
  isEgg: boolean;
  types: number[];
  level: number;
  heldItem: string | null;
  nature: string | null;
  ability: string | null;
  ivs: StatValues;
  moves: string[];
};

export type Reading = { state: "read"; pokemon: ReadPokemon } | { state: "unreadable" };

export type BattleInfo = { kind: "wild" | "trainer"; opponents: Reading[]; left: number };

export type PokemonInfo = { party: Reading[]; battle: BattleInfo | null };

export type Scope = "battle" | "all";

type Decoded = EditablePokemon | "unreadable";

const NO_ITEM = 0;

// A party Pokémon's bytes change with its HP, so this keeps the recent ones rather than all of them.
const MAX_DECODED = 64;

// Gen 4 decrypts a Pokémon in place while it works on it, so a read can land mid-change and fail its checksum.
const MISSES_KEPT = 3;

export function createPokemonInfo(memory: GameMemory, engine: Engine, formatId?: string) {
  // The original game's format is PKHeX's own detection, which `pokemon.read` refuses.
  const hackFormatId = formatId === originalGame ? undefined : formatId;
  const decoded = new Map<string, Promise<Decoded>>();
  const speciesNames = new Map<number, string>();
  const itemNames = new Map<number, string>();
  const abilityNames = new Map<number, string>();
  const natureNames = new Map<number, string>();
  const last = new Map<string, { pokemon: EditablePokemon; misses: number }>();

  const decode = (bytes: Uint8Array, version: number) => {
    const key = bytes.join();
    let pokemon = decoded.get(key);
    if (!pokemon) {
      if (decoded.size >= MAX_DECODED) decoded.clear();
      pokemon = engine.pokemon.read(bytes, version, hackFormatId).catch((error: unknown) => {
        if (error instanceof EngineError && error.code === "bad-checksum") return "unreadable" as const;
        decoded.delete(key);
        throw error;
      });
      decoded.set(key, pokemon);
    }
    return pokemon;
  };

  const steady = (slot: string, pokemon: Decoded): Decoded => {
    if (pokemon !== "unreadable") {
      last.set(slot, { pokemon, misses: 0 });
      return pokemon;
    }
    const kept = last.get(slot);
    if (!kept || kept.misses >= MISSES_KEPT) {
      last.delete(slot);
      return pokemon;
    }
    kept.misses += 1;
    return kept.pokemon;
  };

  const name = async (pokemon: Decoded[]) => {
    const read = pokemon.filter((entry) => entry !== "unreadable");
    const unnamed = (ids: number[], named: Map<number, string>) => [...new Set(ids)].filter((id) => !named.has(id));
    const request = {
      speciesIds: unnamed(read.flatMap((entry) => entry.species ?? []), speciesNames),
      itemIds: unnamed(read.map((entry) => entry.heldItem).filter((id) => id !== NO_ITEM), itemNames),
      abilityIds: unnamed(read.map((entry) => entry.ability), abilityNames),
      natureIds: unnamed(read.map((entry) => entry.nature), natureNames),
    };
    if (Object.values(request).every((ids) => !ids.length)) return;
    const names = await engine.catalog.names({ ...request, formatId: hackFormatId });
    names.species.forEach(({ id, name }) => speciesNames.set(id, name));
    names.items.forEach(({ id, name }) => itemNames.set(id, name));
    names.abilities.forEach(({ id, name }) => abilityNames.set(id, name));
    names.natures.forEach(({ id, name }) => natureNames.set(id, name));
  };

  const reading = (pokemon: Decoded): Reading =>
    pokemon === "unreadable"
      ? { state: "unreadable" }
      : {
          state: "read",
          pokemon: {
            speciesId: pokemon.species,
            speciesIndex: pokemon.speciesIndex,
            species: (pokemon.species !== null && speciesNames.get(pokemon.species)) || pokemon.nickname,
            form: pokemon.form,
            isUnknown: pokemon.isUnknown,
            isShiny: pokemon.isShiny,
            gender: pokemon.gender,
            isEgg: pokemon.isEgg,
            types: pokemon.types,
            level: pokemon.level,
            heldItem: pokemon.heldItem === NO_ITEM ? null : (itemNames.get(pokemon.heldItem) ?? null),
            nature: natureNames.get(pokemon.nature) ?? null,
            ability: abilityNames.get(pokemon.ability) ?? null,
            ivs: pokemon.ivs,
            moves: pokemon.moves.filter((move) => move.id !== 0).map((move) => move.name),
          },
        };

  const read = async (scope: Scope): Promise<PokemonInfo> => {
    const facts: Facts = await memory.read();
    const all = (list: Uint8Array[]) => Promise.all(list.map((bytes) => decode(bytes, facts.version)));
    const [decodedParty, decodedOpponents] = await Promise.all([all(scope === "all" ? facts.party : []), all(facts.battle?.opponents ?? [])]);
    const party = decodedParty.map((pokemon, slot) => steady(`party ${slot}`, pokemon));
    const opponents = decodedOpponents.map((pokemon, slot) => steady(`opponent ${slot}`, pokemon));
    await name([...party, ...opponents]);
    return {
      party: party.map(reading),
      battle: facts.battle && { kind: facts.battle.kind, opponents: opponents.map(reading), left: facts.battle.left },
    };
  };

  return { read };
}
