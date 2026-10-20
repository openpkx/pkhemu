// @vitest-environment node
import {
  EngineError,
  type EditablePokemon,
  type Engine,
  type PokemonHandle,
  type Pouch,
  type StatValues,
  type TrainerCard,
} from "@pkhex-everywhere/engine";
import { afterAll, beforeAll, expect, it } from "vitest";
import { knownLayouts, uint, type Layout, type LayoutRange } from "./layout";
import { decodeSpaces, spaceNames } from "./spaces";
import { findSave, readGen3Text, testEngine } from "@/testing/research";

const SECTOR = 0x1000;
const SECURITY_KEY = 0x13579bdf;

// The engine can't export a blank Gen 3 save yet (pkhex-web/issue-tracker#277), so it loads an empty scaffold of sections.
// PKHeX reads 1 at section 0 offset 0xAC as FireRed or LeafGreen, bytes at 0xEE0 as Emerald rather than Ruby or Sapphire,
// and zeros in the trainer name as a Japanese save. Unbound signs its sections with a signature of its own.
const blanks: Record<string, { formatId: string; signature: number; section0?: (view: DataView) => void }> = {
  rs: { formatId: "pkhex", signature: 0x08012025 },
  emerald: {
    formatId: "pkhex",
    signature: 0x08012025,
    section0: (view) => {
      view.setUint32(0xac, SECURITY_KEY, true);
      view.setUint8(0xee1, 0xff);
    },
  },
  frlg: {
    formatId: "pkhex",
    signature: 0x08012025,
    section0: (view) => {
      view.setUint32(0xac, 1, true);
      view.setUint32(0xf20, SECURITY_KEY, true);
    },
  },
  unbound: { formatId: "unbound", signature: 0x01122000 },
};

function scaffold({ signature, section0 }: (typeof blanks)[string]) {
  const save = new Uint8Array(0x20000);
  for (let sector = 0; sector < 28; sector++) {
    const view = new DataView(save.buffer, sector * SECTOR, SECTOR);
    view.setUint16(0xff4, sector % 14, true);
    view.setUint32(0xff8, signature, true);
    view.setUint32(0xffc, sector < 14 ? 1 : 2, true);
    if (sector % 14 === 0) {
      save.fill(0xff, sector * SECTOR, sector * SECTOR + 8);
      section0?.(view);
    }
  }
  return save;
}

type Reading = {
  save: Uint8Array;
  trainer: TrainerCard;
  pouches: Pouch[];
  flags?: boolean[];
  work: Map<number, number>;
  pokemon: Map<string, EditablePokemon>;
};

const spaceOf = ({ source, box, slot }: PokemonHandle) => (source === "party" ? `party:${slot + 1}` : `box:${box! + 1}:${slot + 1}`);

async function addPokemon(engine: Engine) {
  const { versionId } = (await engine.game.version())!;
  for (const species of [25, 129, 1]) {
    const row = (await engine.encounters.search(versionId, species)).find(({ name }) => name.startsWith("Wild"));
    if (row) return (await engine.box.addEncounter(row.index)).at;
  }
}

async function patchPokemon(engine: Engine, at: PokemonHandle) {
  const [options, languages] = [await engine.pokemon.options(at), await engine.game.languages()];
  await engine.pokemon.update(at, {
    nickname: "LAYOUTS",
    friendship: 123,
    metLevel: 9,
    // English is 2, the same as the flags byte after Language, so a Language range moved by one would still match.
    language: languages.find(({ id }) => id > 2)?.id,
    heldItem: options.heldItems.find(({ id, isUnknown }) => id > 0 && !isUnknown)?.id,
    ivs: { health: 1, attack: 2, defense: 3, speed: 4, specialAttack: 5, specialDefense: 6 },
    evs: { health: 11, attack: 22, defense: 33, speed: 44, specialAttack: 55, specialDefense: 66 },
  });
}

async function exercise(engine: Engine): Promise<Reading> {
  const summary = (await engine.game.get())!;
  await engine.trainer.setName("OPENPKX".slice(0, (await engine.trainer.get()).maxNameLength));
  await engine.trainer.setGender("female");
  await engine.trainer.setMoney(123456);
  for (const { name, addable } of await engine.inventory.get()) {
    const item = addable.at(-1);
    if (item)
      await engine.inventory.setItem({ pouch: name, itemId: item.id }, Math.min(7, item.maxCount)).catch((error) => {
        if (!(error instanceof EngineError && error.code === "pouch-full")) throw error;
      });
  }

  const work = new Map<number, number>();
  let flags: boolean[] | undefined;
  if (summary.hasEvents) {
    const { flagCount, workCount } = (await engine.events.get())!;
    const badges = await engine.trainer.badges();
    if (badges) await engine.trainer.setBadges(badges.map((_, index) => index % 3 === 0));
    for (const index of [1, 0x123, flagCount - 2]) await engine.events.setFlag(index, true);
    for (const [index, value] of [[5, 0xbeef], [workCount - 1, 0x1234]]) {
      await engine.events.setWork(index, value);
      work.set(index, value);
    }
    flags = [];
    for (let index = 0; index < flagCount; index++) flags.push(await engine.events.flag(index));
  }

  const party = (await engine.party.get()).map(({ at }) => at);
  const boxed =
    (await engine.box.get()).find(({ editable }) => editable)?.at ??
    (summary.capabilities.includes("encounters") ? await addPokemon(engine) : undefined);
  const edited = [party[0], boxed].filter((at): at is PokemonHandle => !!at);
  for (const at of edited) await patchPokemon(engine, at);
  const pokemon = new Map<string, EditablePokemon>();
  for (const at of new Set([...party, ...edited])) pokemon.set(spaceOf(at), await engine.pokemon.details(at));

  return {
    save: (await engine.game.export()).bytes,
    trainer: await engine.trainer.get(),
    pouches: await engine.inventory.get(),
    flags,
    work,
    pokemon,
  };
}

type Located = { path: string; range: LayoutRange };
type Expected = number | string | number[] | Record<string, number>;

function locate(layout: Layout) {
  return new Map(
    (layout.spaces ?? []).flatMap((space, index) => {
      const [owner, ranges] = space.kind
        ? [`kinds.${space.kind}`, layout.kinds![space.kind].ranges]
        : [`spaces.${index}`, space.ranges ?? []];
      const located = ranges.map((range, at): Located => ({ path: `${owner}.ranges.${at}`, range }));
      return spaceNames(space.name).map((name) => [name, located] as const);
    }),
  );
}

const POUCHES: Record<string, RegExp> = {
  Items: /^Items pocket/,
  KeyItems: /^Key items pocket/,
  Balls: /^Poké Balls pocket/,
  TMHMs: /^TMs and HMs pocket/,
  Berries: /^Berries pocket/,
  PCItems: /^PC items$/,
};
const STATS: (keyof StatValues)[] = ["health", "attack", "defense", "speed", "specialAttack", "specialDefense"];
const stats = (values: StatValues) => STATS.map((stat) => values[stat]);

const pokemonFields = (pokemon: EditablePokemon): [RegExp, Expected][] => [
  [/^PID$/, pokemon.pid],
  [/^Original trainer ID/, pokemon.trainerId + pokemon.secretId * 0x10000],
  [/^Nickname$/, pokemon.nickname],
  [/^Language$/, pokemon.language],
  [/^Original trainer name$/, pokemon.originalTrainerName],
  [/^Species/, pokemon.speciesIndex],
  [/^Held item/, pokemon.heldItemIndex],
  [/^Friendship$/, pokemon.friendship],
  [/^Moves$/, pokemon.moves.map(({ id }) => id)],
  [/^PP$/, pokemon.moves.map(({ pp }) => pp)],
  [/^EVs/, stats(pokemon.evs)],
  [/^Met location$/, pokemon.metLocation],
  [
    /^Origins$/,
    {
      "Met level": pokemon.metLevel,
      "Origin game": pokemon.version,
      Ball: pokemon.ball,
      "Trainer gender": +(pokemon.originalTrainerGender === "female"),
    },
  ],
  [
    /^IVs/,
    {
      "HP IV": pokemon.ivs.health,
      "Attack IV": pokemon.ivs.attack,
      "Defense IV": pokemon.ivs.defense,
      "Speed IV": pokemon.ivs.speed,
      "Sp. Atk IV": pokemon.ivs.specialAttack,
      "Sp. Def IV": pokemon.ivs.specialDefense,
      "Is egg": +pokemon.isEgg,
    },
  ],
  [/^Ribbons$/, { "Fateful encounter": +pokemon.fatefulEncounter }],
  [/^Level$/, pokemon.level],
  [/^Stats/, stats(pokemon.stats)],
];

const littleEndian = (bytes: Uint8Array) => bytes.reduceRight((value, byte) => value * 256 + byte, 0);

function compare(layout: Layout, reading: Reading) {
  const mismatches: string[] = [];
  const checked = new Set<string>();
  const decoded = new Map(decodeSpaces(reading.save, layout).map(({ name, bytes }) => [name, bytes]));
  const located = locate(layout);
  const saveWide = [...located].filter(([name]) => !/^(party|box):/.test(name));

  const find = (name: RegExp) =>
    saveWide.flatMap(([space, ranges]) => ranges.filter(({ range }) => name.test(range.name)).map((at) => ({ space, ...at })));
  const bytesOf = ({ space, range }: Located & { space: string }, index = 0) => {
    const offset = uint(range.offset) + index * uint(range.stride ?? 0);
    return offset < 0 ? new Uint8Array() : decoded.get(space)!.subarray(offset, offset + uint(range.length));
  };
  const check = (paths: string[], what: string, actual: number | string, expected: number | string) => {
    if (actual !== expected) mismatches.push(`${what}: the layout reads ${actual} where the engine has ${expected}`);
    else if (expected) paths.forEach((path) => checked.add(path));
  };
  const read = (at: Located & { space: string }, index = 0) => {
    const bytes = bytesOf(at, index);
    return at.range.type === "text-gen3" ? readGen3Text(bytes) : littleEndian(bytes);
  };

  const key = find(/^Security key$/)[0];
  const keyValue = key ? littleEndian(bytesOf(key)) : 0;
  const keyPaths = key && keyValue ? [key.path] : [];

  for (const [name, expected] of [
    [/^Trainer name$/, reading.trainer.name],
    [/^Trainer gender$/, +(reading.trainer.gender === "female")],
  ] as const)
    for (const at of find(name)) check([at.path], at.range.name, read(at), expected);
  for (const at of find(/^Money$/))
    check([at.path, ...keyPaths], "Money", (littleEndian(bytesOf(at)) ^ keyValue) >>> 0, reading.trainer.money ?? 0);

  for (const pouch of reading.pouches) {
    const ranges = find(POUCHES[pouch.name] ?? /^$/);
    if (!ranges.length) mismatches.push(`${pouch.name}: the layout has no range for the engine's pouch`);
    const quantityKey = pouch.name === "PCItems" ? 0 : keyValue & 0xffff;
    const slots = ranges.flatMap((at) => Array.from({ length: uint(at.range.count ?? 1) }, (_, index) => ({ at, index })));
    slots.forEach(({ at, index }, slot) => {
      const entry = littleEndian(bytesOf(at, index));
      const item = pouch.items[slot];
      const actual = entry % 0x10000 ? `${entry % 0x10000}×${Math.floor(entry / 0x10000) ^ quantityKey}` : "";
      check([at.path, ...(item ? keyPaths : [])], `${pouch.name} slot ${slot}`, actual, item ? `${item.index}×${item.count}` : "");
    });
  }

  if (reading.flags) {
    const bits = find(/^Event flags( \(part \d\))?$/).flatMap((at) =>
      [...bytesOf(at)].flatMap((byte) => Array.from({ length: 8 }, (_, bit) => ({ at, value: (byte >> bit) & 1 }))),
    );
    if (bits.length < reading.flags.length)
      mismatches.push(`Event flags: the layout holds ${bits.length}, the engine ${reading.flags.length}`);
    reading.flags.forEach((flag, index) => bits[index] && check([bits[index].at.path], `Event flag ${index}`, bits[index].value, +flag));
  }
  for (const at of find(/^Event (variables|vars|work)$/))
    for (const [index, value] of reading.work) check([at.path], `Event work ${index}`, littleEndian(bytesOf(at, index)), value);

  for (const [space, pokemon] of reading.pokemon) {
    const dex = pokemon.species! - 1;
    for (const at of find(/^Pokédex (owned|seen) flags/))
      check([at.path], `${at.range.name} for ${pokemon.species}`, (bytesOf(at)[dex >> 3] >> (dex & 7)) & 1, 1);

    const ranges = located.get(space);
    if (!ranges) {
      mismatches.push(`${space}: the layout has no space for the engine's Pokémon`);
      continue;
    }
    for (const [name, expected] of pokemonFields(pokemon))
      for (const range of ranges.filter(({ range }) => name.test(range.name))) {
        const at = { space, ...range };
        const what = `${space} ${range.range.name}`;
        if (Array.isArray(expected)) {
          if (uint(range.range.count ?? 1) === expected.length)
            expected.forEach((value, index) => check([at.path], `${what} ${index}`, littleEndian(bytesOf(at, index)), value));
        } else if (typeof expected === "object") {
          const value = littleEndian(bytesOf(at));
          for (const { bit, width, name } of range.range.bits ?? [])
            if (name in expected) check([at.path], `${what} ${name}`, Math.floor(value / 2 ** bit) % 2 ** width, expected[name]);
        } else check([at.path], what, read(at), expected);
      }
  }
  return { mismatches, checked };
}

function moved(layout: Layout, path: string, by: number) {
  const copy = structuredClone(layout);
  const range = path.split(".").reduce<unknown>((object, key) => (object as Record<string, unknown>)[key], copy) as LayoutRange;
  range.offset = uint(range.offset) + by;
  return copy;
}

const unnoticedMoves = (layout: Layout, reading: Reading, checked: Set<string>) =>
  [...checked].filter((path) => [-1, 1].some((by) => !compare(moved(layout, path, by), reading).mismatches.length));

let engine: Engine;
beforeAll(() => {
  engine = testEngine();
});

const layouts = (await knownLayouts()).map((layout) => ({ title: `${layout.target.format} ${layout.target.version}`, layout }));
const checkedIn = new Map<Layout, Set<string>>();
const record = (layout: Layout, checked: Set<string>) =>
  checkedIn.set(layout, new Set([...(checkedIn.get(layout) ?? []), ...checked]));

it.for(layouts)("checks the $title layout against a blank save the engine edits", { timeout: 300_000 }, async ({ layout }) => {
  const blank = blanks[layout.target.format];
  expect(blank, `no blank save for ${layout.target.format}`).toBeDefined();
  await engine.game.load(scaffold(blank), "blank.sav", blank.formatId);
  const reading = await exercise(engine);

  const { mismatches, checked } = compare(layout, reading);
  expect(mismatches).toEqual([]);
  expect(unnoticedMoves(layout, reading, checked)).toEqual([]);
  record(layout, checked);
});

it.for(layouts)("checks the $title layout against a save in data/saves/", { timeout: 300_000 }, async ({ layout }, { skip }) => {
  const found = await findSave(engine, layout.target.format);
  if (!found) return skip(`needs a save in data/saves/ that the engine reads as ${layout.target.format}`);
  const reading = await exercise(engine);

  const { mismatches, checked } = compare(layout, reading);
  expect(mismatches, found.path).toEqual([]);
  // A real save's neighbouring bytes can hold the same values, so a range only counts where moving it breaks the check.
  const unnoticed = unnoticedMoves(layout, reading, checked);
  record(layout, new Set([...checked].filter((path) => !unnoticed.includes(path))));
});

afterAll(() => {
  const lines = [...checkedIn].flatMap(([layout, checked]) => {
    const owners = [
      ...Object.entries(layout.kinds ?? {}).map(([kind, { ranges }]) => [`kinds.${kind}`, `kind ${kind}`, ranges] as const),
      ...(layout.spaces ?? []).map((space, index) => [`spaces.${index}`, space.name, space.ranges ?? []] as const),
    ];
    const unset = owners.map(([owner, label, ranges]) => ({
      label,
      names: ranges
        .filter((range, index) => range.confidence === "known" && !checked.has(`${owner}.ranges.${index}`))
        .map(({ name }) => name),
    }));
    const known = owners.flatMap(([, , ranges]) => ranges).filter(({ confidence }) => confidence === "known").length;
    const left = unset.flatMap(({ names }) => names).length;
    const { format, version } = layout.target;
    return [
      `${format} ${version}: the engine sets ${known - left} of ${known} known ranges. The other ${left} rest on their citation alone:`,
      ...unset.filter(({ names }) => names.length).map(({ label, names }) => `  ${label}: ${names.join(", ")}`),
    ];
  });
  console.log(lines.join("\n"));
});
