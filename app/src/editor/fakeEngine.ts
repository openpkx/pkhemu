import {
  createEngine,
  type AddFromFileOptions,
  type CatalogNamesRequest,
  type Choice,
  type EditablePokemon,
  type EncounterRow,
  type EngineHost,
  type ErrorCode,
  type EventRow,
  type FormatEntry,
  type GameProgress,
  type GiftEvent,
  type ItemChoice,
  type ItemHandle,
  type OfferedPokemon,
  type PokemonHandle,
  type PokemonOptions,
  type PokemonPatch,
  type PokemonPreview,
  type PokemonSummary,
  type Pouch,
  type RefusedPokemon,
  type SaveCapability,
  type SaveEvents,
  type SpeciesEntry,
  type StatValues,
  type TeamSlot,
  type TransferDirection,
  type TransferOffer,
  type TransferRoom,
  type TransferRoutes,
  type TransferSave,
  type TrainerCard,
  type TrainerGender,
  type WonderCardEntry,
  type WonderCardPreview,
} from "@pkhex-everywhere/engine";
import { gen3Nickname } from "@/game-memory/snapshots/snapshotMemory";

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));

export const fakeMoves: Choice[] = [
  { id: 1, name: "Pound" },
  { id: 33, name: "Tackle" },
  { id: 45, name: "Growl" },
  { id: 85, name: "Thunderbolt" },
];
const allMoves: Choice[] = [...fakeMoves, { id: 94, name: "Psychic" }];
const natures: Choice[] = [
  { id: 0, name: "Hardy" },
  { id: 3, name: "Adamant" },
  { id: 15, name: "Modest" },
];

const abilities: Choice[] = [
  { id: 65, name: "Overgrow" },
  { id: 34, name: "Chlorophyll" },
];
const allAbilities: Choice[] = [...abilities, { id: 22, name: "Intimidate" }];

const types: Choice[] = [
  { id: 0, name: "Normal" },
  { id: 3, name: "Poison" },
  { id: 9, name: "Fire" },
  { id: 11, name: "Grass" },
];

const zeroStats = { health: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };

export function fakeDetails(
  summary: PokemonSummary,
  generation: number,
  overrides: Partial<EditablePokemon> = {},
): EditablePokemon {
  return {
    species: summary.speciesId,
    speciesIndex: summary.speciesIndex,
    evolutionFamily: summary.speciesId ?? 0,
    isUnknown: false,
    editable: true,
    form: 0,
    gender: "male",
    nature: 0,
    ability: generation >= 3 ? 65 : 0,
    heldItem: 0,
    heldItemIndex: overrides.heldItem ?? 0,
    heldItemIsUnknown: false,
    ball: 4,
    friendship: 70,
    language: 2,
    isShiny: summary.isShiny,
    isAlpha: null,
    isEgg: false,
    nickname: summary.nickname,
    level: summary.level,
    pid: 0,
    types: [0],
    isInfected: false,
    isCured: false,
    trainerId: 12345,
    secretId: 0,
    originalTrainerName: "ASH",
    originalTrainerGender: "male",
    handlingTrainerName: "",
    handlingTrainerGender: "male",
    currentHandler: "originalTrainer",
    version: 0,
    metLocation: 0,
    metLevel: 5,
    metDate: null,
    fatefulEncounter: false,
    isShadow: null,
    shadowId: null,
    purification: null,
    ivs: { ...zeroStats },
    evs: { ...zeroStats },
    avs: null,
    stats: { ...zeroStats },
    hiddenPower: null,
    combatPower: null,
    calculatedCombatPower: null,
    moves: [
      { id: 33, name: "Tackle", pp: 35, maxPp: 35, isUnknown: false },
      { id: 0, name: "", pp: 0, maxPp: 0, isUnknown: false },
      { id: 0, name: "", pp: 0, maxPp: 0, isUnknown: false },
      { id: 0, name: "", pp: 0, maxPp: 0, isUnknown: false },
    ],
    legality: generation >= 3 ? { valid: true, messages: [] } : null,
    ...overrides,
  };
}

const fakeHeldItems: ItemChoice[] = [
  { id: 0, index: 0, name: "(None)", isUnknown: false },
  { id: 234, index: 234, name: "Leftovers", isUnknown: false },
];

function fakeOptions(summary: PokemonSummary, generation: number, heldItems: ItemChoice[]): PokemonOptions {
  return {
    species: [
      { id: summary.speciesId ?? 0, name: summary.species },
      { id: 999, name: "Evolved" },
    ],
    abilities: generation >= 3 ? abilities : [],
    forms: [],
    metLocations: [],
    moves: fakeMoves,
    heldItems,
    locked: generation === 3 || generation === 4 ? ["nature"] : [],
  };
}

export type FakePartner = { version: string; generation?: number; routes: TransferRoutes; room: TransferRoom; pokemon?: PokemonSummary[] };

export type FakeTransfer = {
  partners: Record<string, FakePartner>;
  refuse?(offer: TransferOffer, fileName: string): RefusedPokemon[];
  offered?(from: PokemonSummary, direction: TransferDirection): Partial<OfferedPokemon>;
};

const withoutSave = new Set(["game.load", "game.close", "game.get", "game.version", "transfer.get", "pokemon.read", "catalog.names"]);

const itemNames: Record<number, string> = { 234: "Leftovers", 13: "Potion" };

const sameSlot = (a: PokemonHandle, b: PokemonHandle) =>
  a.source === b.source && a.slot === b.slot && (a.box ?? null) === (b.box ?? null) && (a.team ?? null) === (b.team ?? null);

export type FakeEncounter = Omit<EncounterRow, "index" | "version">;

export type FakeEventEncounter = Omit<EventRow, "index">;

export type FakeTeam = { name: string | null; cup: string | null; members: PokemonSummary[] };

export type FakeGiftEvent = Omit<GiftEvent, "received"> & { level?: number };

export type FakeMysteryGift = {
  /** Null for a Gen 5 save, where `setUnlocked` fails with `not-supported`. */
  unlocked: boolean | null;
  slots: number;
  cards?: WonderCardEntry[];
  events?: FakeGiftEvent[];
  received?: number[];
  /** Inserts fail with `no-slot`, as when eight Gen 4 gifts wait for the delivery person. */
  queueFull?: boolean;
};

export const fakeCardFile = (text: string) => new TextEncoder().encode(text);

export type FakeEngineSave = {
  party?: PokemonSummary[];
  box?: PokemonSummary[];
  boxCount?: number;
  /** Registered teams of six, as a Stadium save has. Members' handles are filled in from their team and position. */
  teams?: FakeTeam[];
  inventory?: Pouch[];
  trainer?: TrainerCard;
  generation?: number;
  details?: Record<string, Partial<EditablePokemon>>;
  heldItems?: ItemChoice[];
  events?: SaveEvents;
  progress?: GameProgress;
  transfer?: FakeTransfer;
  capabilities?: SaveCapability[];
  species?: SpeciesEntry[];
  encounters?: FakeEncounter[];
  eventEncounters?: FakeEventEncounter[];
  refuseAdd?: ErrorCode;
  /** Species whose files no game can move into this save. `box.addFromFile` refuses them without `allowUnofficial`. */
  unofficialFiles?: number[];
  /** Pokémon `pokemon.read` finds in game memory, by the nickname in their bytes. Any others fail with `bad-checksum`. */
  inMemory?: Record<string, Partial<EditablePokemon>>;
  /** A ROM hack format the in-memory Pokémon are in. `pokemon.read` without its id fails with `bad-checksum`, and `catalog.names` names its `species` only with its id. */
  memoryFormat?: { id: string; species: SpeciesEntry[] };
  /** Formats the save might be in. `game.load` without a `formatId` then fails with `format-choice-required`. */
  candidates?: FormatEntry[];
  /** The format `game.load` recognises the save as outright. */
  detected?: string;
  version?: string;
  versionId?: number;
  /** A Wonder Card album. A fake card file is an event's id, or `unknown:<title>` for a card no event matches, as `fakeCardFile` makes. */
  mysteryGift?: FakeMysteryGift;
};

// Mirrors the engine's notifications: loading changes "*", exporting touches "party" and "box", draft commands touch "draft",
// and committing touches the Pokémon's storage too.
export function fakeEngine({
  party = [],
  box: initialBox = [],
  boxCount = 14,
  teams: initialTeams = [],
  inventory = [],
  trainer = { id: "00001/00000", name: "RED", maxNameLength: 7, gender: "male", money: 0, battlePoints: null, rival: null },
  generation = 3,
  details: detailOverrides = {},
  heldItems = fakeHeldItems,
  events,
  progress = { playTime: null, badges: null, pokedex: null },
  transfer,
  capabilities = [],
  species = [],
  encounters = [],
  eventEncounters = [],
  refuseAdd,
  unofficialFiles = [],
  inMemory = {},
  memoryFormat,
  candidates = [],
  detected,
  version = "Emerald",
  versionId = 3,
  mysteryGift,
}: FakeEngineSave = {}) {
  const box = [...initialBox];
  const teams = initialTeams.map((team) => ({ ...team, members: [...team.members] }));
  const placeTeam = (team: number) =>
    teams[team].members.forEach((member, slot) => (member.at = { source: "team", team, slot }));
  teams.forEach((_, team) => placeTeam(team));
  const teamCalls: { call: "place" | "clear"; from?: PokemonHandle; to: TeamSlot }[] = [];
  const everyPokemon = () => [...party, ...box, ...teams.flatMap((team) => team.members)];
  const reads: number[] = [];
  let lastSearch: EncounterRow[] = [];
  const addedEncounters: number[] = [];
  const exports: PokemonHandle[] = [];
  const filesAdded: Uint8Array[] = [];
  let save: Uint8Array | undefined;
  let format: string | null = null;
  const loads: (string | null)[] = [];
  const partnerFormats: (string | null)[] = [];
  let partner: (FakePartner & { fileName: string; data: string }) | undefined;
  const opened: string[] = [];
  const transferOffers: { command: "preview" | "commit"; offer: TransferOffer }[] = [];
  const received = (command: "preview" | "commit", offer: TransferOffer) => {
    const arrivals = offer.arrivals?.map((arrival) => ({ ...arrival, bytes: fromBase64(arrival.bytes as unknown as string) }));
    transferOffers.push({ command, offer: { ...offer, ...(arrivals && { arrivals }) } });
  };
  const transferSummary = () =>
    partner && {
      partner: {
        fileName: partner.fileName,
        version: partner.version,
        generation: partner.generation ?? generation,
        hasEvents: false,
        format: null,
        capabilities: [],
        statsApproximate: false,
      },
      routes: partner.routes,
      room: partner.room,
    };
  const openPartner = () => {
    if (!partner) throw { code: "no-transfer", message: "No transfer" };
    return partner;
  };
  const memoryFormatOf = (formatId: string | null | undefined) => {
    if (formatId === "pkhex") throw { code: "not-supported", message: "pkhex isn't a ROM hack." };
    if (formatId && formatId !== memoryFormat?.id) throw { code: "not-found", message: `No format ${formatId}.` };
    return formatId ? memoryFormat : undefined;
  };
  const album = mysteryGift && {
    unlocked: mysteryGift.unlocked,
    cards: [...(mysteryGift.cards ?? [])],
    received: new Set(mysteryGift.received),
  };
  const giftEvents = mysteryGift?.events ?? [];
  const giftAlbum = () => {
    if (!album) throw { code: "not-supported", message: "This save has no Wonder Card album." };
    return album;
  };
  const giftSlot = (slot: number) => {
    if (!Number.isInteger(slot) || slot < 0 || slot >= mysteryGift!.slots) throw { code: "out-of-range", message: `No slot ${slot}.` };
  };
  const giftEvent = (id: string) => {
    const event = giftEvents.find((event) => event.id === id);
    if (!event) throw { code: "not-found", message: `No event ${id}.` };
    return event;
  };
  const giftPreview = ({ title, kind, species, item, language, cardId, level = 1 }: FakeGiftEvent, known = true): WonderCardPreview => ({
    title,
    kind,
    pokemon: species && {
      speciesId: species.id,
      speciesIndex: species.id,
      species: species.name,
      isUnknown: false,
      editable: true,
      form: { id: 0, name: "" },
      nickname: species.name.toUpperCase(),
      level,
      isShiny: false,
      gender: "genderless",
      isEgg: false,
      types: [],
    },
    item,
    language,
    cardId,
    known,
  });
  const cardFile = (data: string): { event: FakeGiftEvent; known: boolean } => {
    const text = new TextDecoder().decode(fromBase64(data));
    const event = giftEvents.find((event) => event.id === text);
    if (event) return { event, known: true };
    if (!text.startsWith("unknown:")) throw { code: "unparseable", message: "The file isn't a Wonder Card." };
    const title = text.slice("unknown:".length);
    return { event: { id: text, title, kind: "other", species: null, item: null, language: null, cardId: 0 }, known: false };
  };
  const insertCard = ({ title, kind, species, item, language, cardId }: FakeGiftEvent, known: boolean, slot: number) => {
    const { cards, received } = giftAlbum();
    giftSlot(slot);
    if (mysteryGift!.queueFull) throw { code: "no-slot", message: "Eight gifts are already waiting for the delivery person." };
    const at = Math.min(slot, cards.length);
    cards[at] = { title, kind, species, item, language, cardId, known };
    if (cardId > 0) received.add(cardId);
    notify(["mysteryGift"]);
    return at;
  };
  const pouches = structuredClone(inventory);
  const card = structuredClone(trainer);
  const keyItems = () => pouches.find((pouch) => pouch.name === "KeyItems")?.items ?? [];
  const holds = (name: string) => keyItems().some((item) => item.name === name);
  const flags = Array.from({ length: events?.flagCount ?? 0 }, () => false);
  events?.flags.forEach((flag) => (flags[flag.index] = flag.value));
  const checkFlag = (index: number) => {
    if (!Number.isInteger(index) || index < 0 || index >= flags.length)
      throw { code: "out-of-range", message: `Flag ${index} is out of range.` };
  };
  events?.gen3?.islands.forEach((flag) => (flags[flag.index] = flag.value));
  const work = Array.from({ length: events?.workCount ?? 0 }, () => 0);
  events?.work.forEach((entry) => (work[entry.index] = entry.value));
  const listeners = new Set<(topics: string[]) => void>();
  const notify = (topics: string[]) => listeners.forEach((listener) => listener(topics));
  const stored = new Map<PokemonSummary, EditablePokemon>(
    everyPokemon().map((summary) => [summary, fakeDetails(summary, generation, detailOverrides[summary.nickname])]),
  );
  let draft: { from: PokemonSummary; details: EditablePokemon } | undefined;

  const find = (at: PokemonHandle) => {
    const summary = everyPokemon().find((pokemon) => sameSlot(pokemon.at, at));
    if (!summary) throw new Error(`no Pokémon at ${JSON.stringify(at)}`);
    return summary;
  };
  const read = (at: PokemonHandle) => {
    if (at.source === "draft") {
      if (!draft) throw { code: "no-draft", message: "No draft" };
      return draft;
    }
    const from = find(at);
    return { from, details: stored.get(from)! };
  };
  const partnerDetails = (at: PokemonHandle, side: TransferSave) => {
    if (side === "mine") return read(at).details;
    const { pokemon = [], generation: theirs = generation } = openPartner();
    return fakeDetails(pokemon.find((pokemon) => sameSlot(pokemon.at, at))!, theirs);
  };
  const patched = (details: EditablePokemon, patch: PokemonPatch): EditablePokemon => {
    if (patch.level !== undefined && patch.level !== null && (patch.level < 1 || patch.level > 100))
      throw { code: "invalid-patch", message: `Level must be between 1 and 100, got ${patch.level}.` };
    const { ivs, evs, moves, ...rest } = patch;
    const next = { ...details, ...Object.fromEntries(Object.entries(rest).filter(([, value]) => value !== null)) };
    if (patch.isShadow === false) next.purification = 0;
    if (ivs) next.ivs = { ...details.ivs, ...(ivs as Partial<StatValues>) };
    if (evs) next.evs = { ...details.evs, ...(evs as Partial<StatValues>) };
    if (moves)
      next.moves = moves.map((id) => {
        const move = allMoves.find((move) => move.id === id);
        return { id, name: move?.name ?? "", pp: move ? 10 : 0, maxPp: move ? 10 : 0, isUnknown: false };
      });
    return next as EditablePokemon;
  };

  const addToBox = (speciesId: number, name: string, form: PokemonSummary["form"]) => {
    const taken = (at: PokemonHandle) => box.some((pokemon) => sameSlot(pokemon.at, at));
    const at = Array.from({ length: boxCount * 30 }, (_, i): PokemonHandle => ({ source: "box", box: Math.floor(i / 30), slot: i % 30 })).find(
      (at) => !taken(at),
    );
    if (!at) throw { code: "box-full", message: "The boxes are full." };
    const added: PokemonSummary = {
      id: `added:${box.length}` as PokemonSummary["id"],
      at,
      speciesId,
      speciesIndex: speciesId,
      species: name,
      isUnknown: false,
      editable: true,
      form,
      nickname: name.toUpperCase(),
      level: 5,
      isShiny: false,
      gender: "male",
      isEgg: false,
      types: [],
    };
    box.push(added);
    stored.set(added, fakeDetails(added, generation, detailOverrides[added.nickname]));
    notify(["box"]);
    return { id: added.id, at };
  };

  // A fake Pokémon file is its species id as two little-endian bytes.
  const fileEntry = (bytes: Uint8Array) => {
    if (refuseAdd && refuseAdd !== "box-full") throw { code: refuseAdd, message: `Refused with ${refuseAdd}.` };
    const entry = bytes.length === 2 && species.find((entry) => entry.id === (bytes[0] | (bytes[1] << 8)));
    if (!entry) throw { code: "unparseable", message: "Not a Pokémon file." };
    return entry;
  };

  const preview = (offer: TransferOffer) => {
    const { room, routes, pokemon: theirs = [], fileName } = openPartner();
    const crowded = (direction: TransferDirection, free: number): RefusedPokemon[] =>
      offer[direction].length > free ? offer[direction].map((at) => ({ direction, at, reason: "noRoom" })) : [];
    const refused = [...(transfer?.refuse?.(offer, fileName) ?? []), ...crowded("send", room.partner), ...crowded("receive", room.mine)];
    const offered = (direction: TransferDirection) =>
      offer[direction]
        .filter((at) => !refused.some((refusal) => refusal.direction === direction && sameSlot(refusal.at, at)))
        .map((at, slot): OfferedPokemon => {
          const from = direction === "send" ? find(at) : theirs.find((pokemon) => sameSlot(pokemon.at, at))!;
          return {
            direction,
            route: routes[direction] ?? ["link"],
            from,
            arrives: { ...from, at: { source: "box", box: 0, slot } },
            changes: [],
            saveChanges: [],
            legality: { valid: true, messages: [] },
            ...transfer?.offered?.(from, direction),
          };
        });
    return { offers: [...offered("send"), ...offered("receive")], refused };
  };

  const commands: Record<string, (...args: never[]) => unknown> = {
    "game.load": (data: string, _fileName: string | null, formatId: string | null) => {
      const known = formatId === "pkhex" || formatId === detected || candidates.some(({ id }) => id === formatId);
      if (formatId && !known) throw { code: "not-found", message: `No format ${formatId}.` };
      if (!formatId && candidates.length)
        throw { code: "format-choice-required", message: "Choose the save's format.", candidates };
      loads.push(formatId ?? null);
      format = formatId === "pkhex" ? null : (formatId ?? detected ?? null);
      save = fromBase64(data);
      notify(["*"]);
    },
    "game.close": () => {
      save = undefined;
      notify(["*"]);
    },
    "game.get": () =>
      save && { fileName: "save.sav", version, generation, hasEvents: !!events, hasMysteryGift: !!mysteryGift, capabilities },
    "game.version": () =>
      save && { version, versionId, generation: `Gen${generation}`, generationId: generation, formatId: format },
    "game.export": () => {
      notify(["party", "box"]);
      return { bytes: toBase64(save!), fileName: "save.sav" };
    },
    "game.progress": () => progress,
    "game.natures": () => (generation >= 3 ? natures : []),
    "game.moves": () => allMoves,
    "game.types": () => types,
    "party.get": () => party,
    "party.showdown": () => party.map((pokemon) => `${pokemon.nickname} (${pokemon.species})`).join("\n\n"),
    "box.get": () => box,
    "box.list": () => Array.from({ length: boxCount }, (_, index) => ({ box: index, name: null, slots: 30 })),
    "box.addEncounter": (index: number) => {
      const row = lastSearch[index];
      if (!row) throw { code: "not-found", message: `No encounter ${index} in the latest search.` };
      if (refuseAdd) throw { code: refuseAdd, message: `Refused with ${refuseAdd}.` };
      const added = addToBox(row.speciesId, row.species, row.form);
      addedEncounters.push(index);
      return added;
    },
    "box.previewFile": (data: string) => {
      const entry = fileEntry(fromBase64(data));
      const pokemon: PokemonPreview = {
        speciesId: entry.id,
        speciesIndex: entry.id,
        species: entry.name,
        isUnknown: false,
        editable: true,
        form: { id: 0, name: "" },
        nickname: entry.name.toUpperCase(),
        level: 5,
        isShiny: false,
        gender: "male",
        isEgg: false,
        types: [],
      };
      const legality = detailOverrides[pokemon.nickname]?.legality ?? { valid: true, messages: [] };
      return { pokemon, unofficial: unofficialFiles.includes(entry.id), changes: [], legality };
    },
    "box.addFromFile": (data: string, options: AddFromFileOptions | null) => {
      const bytes = fromBase64(data);
      filesAdded.push(bytes);
      if (refuseAdd) throw { code: refuseAdd, message: `Refused with ${refuseAdd}.` };
      const entry = fileEntry(bytes);
      if (unofficialFiles.includes(entry.id) && !options?.allowUnofficial)
        throw { code: "conversion-failed", message: "No game can move this Pokémon here." };
      return addToBox(entry.id, entry.name, { id: 0, name: "" });
    },
    "team.list": () => teams.map(({ name, cup, members }, team) => ({ team, name, cup, slots: 6, filled: members.length })),
    "team.get": (team: number) => {
      if (!teams[team]) throw { code: "out-of-range", message: `No team ${team}.` };
      return teams[team].members;
    },
    "team.place": (from: PokemonHandle, to: TeamSlot) => {
      teamCalls.push({ call: "place", from, to });
      if (!teams.length) throw { code: "not-supported", message: "This save has no teams." };
      const { members } = teams[to.team];
      const source = find(from);
      const placed: PokemonSummary = { ...source, id: `team:${to.team}:${to.slot}` as PokemonSummary["id"] };
      members.splice(Math.min(to.slot, members.length), to.slot < members.length ? 1 : 0, placed);
      placeTeam(to.team);
      stored.set(placed, structuredClone(stored.get(source)!));
      notify(["team"]);
      return placed;
    },
    "team.clear": (at: TeamSlot) => {
      teamCalls.push({ call: "clear", to: at });
      teams[at.team].members.splice(at.slot, 1);
      placeTeam(at.team);
      notify(["team"]);
    },
    "species.list": () => species,
    "encounters.versions": () => ({ versions: [{ id: 3, name: "Emerald" }], default: 3 }),
    "encounters.search": (version: number, speciesId: number) => {
      lastSearch = encounters
        .filter((encounter) => version === 3 && encounter.speciesId === speciesId)
        .map((encounter, index) => ({ ...encounter, index, version: "Emerald" }));
      return lastSearch;
    },
    "encounters.events": (speciesId?: number | null) => {
      lastSearch = eventEncounters
        .filter((row) => speciesId == null || row.speciesId === speciesId)
        .map((row, index) => ({ ...row, index }));
      return lastSearch;
    },
    "inventory.get": () => pouches,
    "inventory.setItem": ({ pouch: name, itemId }: ItemHandle, count: number) => {
      const pouch = pouches.find((pouch) => pouch.name === name)!;
      const owned = pouch.items.find((item) => item.id === itemId);
      const addable = pouch.addable.find((item) => item.id === itemId);
      if (owned && count === 0) {
        pouch.items = pouch.items.filter((item) => item !== owned);
        if (!owned.isUnknown) pouch.addable.push({ id: owned.id, index: owned.index, name: owned.name, maxCount: owned.maxCount });
      } else if (owned) owned.count = count;
      else if (addable && count > 0) {
        pouch.addable = pouch.addable.filter((item) => item !== addable);
        pouch.items.push({ ...addable, count, isUnknown: false });
      }
      notify(["inventory"]);
    },
    "events.get": () =>
      events && {
        ...events,
        flags: events.flags.map((flag) => ({ ...flag, value: flags[flag.index] })),
        work: events.work.map((entry) => ({ ...entry, value: work[entry.index] })),
        gen3: events.gen3 && {
          ...events.gen3,
          anyTicketMissing: events.gen3.tickets.some((ticket) => !holds(ticket)),
          oldSeaMapNeedsConfirmation:
            events.gen3.oldSeaMapNeedsConfirmation && !holds("Old Sea Map"),
          islands: events.gen3.islands.map((flag) => ({ ...flag, value: flags[flag.index] })),
        },
      },
    "events.flag": (index: number) => {
      checkFlag(index);
      return flags[index];
    },
    "events.setFlag": (index: number, value: boolean) => {
      checkFlag(index);
      flags[index] = value;
      notify(["events"]);
    },
    "events.giveTickets": (includeOldSeaMap: boolean) => {
      const added = events!.gen3!.tickets.filter(
        (ticket) =>
          !holds(ticket) &&
          (includeOldSeaMap || !events!.gen3!.oldSeaMapNeedsConfirmation || ticket !== "Old Sea Map"),
      );
      keyItems().push(...added.map((name, i) => ({ id: 1000 + i, index: 1000 + i, name, count: 1, maxCount: 1, isUnknown: false })));
      notify(["events", "inventory"]);
      return added;
    },
    "events.setWork": (index: number, value: number) => {
      if (!Number.isInteger(index) || index < 0 || index >= work.length)
        throw { code: "out-of-range", message: `Work ${index} is out of range.` };
      if (!Number.isInteger(value) || value < events!.workMin || value > events!.workMax)
        throw { code: "out-of-range", message: `Work value ${value} is out of range.` };
      work[index] = value;
      notify(["events"]);
    },
    "mysteryGift.status": () => {
      const { unlocked, cards } = giftAlbum();
      return { unlocked, slots: Array.from({ length: mysteryGift!.slots }, (_, index) => ({ index, card: cards[index] ?? null })) };
    },
    "mysteryGift.events": () => {
      const { received } = giftAlbum();
      return giftEvents.map(({ level: _, ...event }) => ({ ...event, received: received.has(event.cardId) }));
    },
    "mysteryGift.previewEvent": (id: string) => {
      giftAlbum();
      return giftPreview(giftEvent(id));
    },
    "mysteryGift.previewFile": (data: string) => {
      giftAlbum();
      const { event, known } = cardFile(data);
      return giftPreview(event, known);
    },
    "mysteryGift.insertEvent": (id: string, slot: number) => insertCard(giftEvent(id), true, slot),
    "mysteryGift.insertFile": (data: string, slot: number) => {
      const { event, known } = cardFile(data);
      return insertCard(event, known, slot);
    },
    "mysteryGift.remove": (slot: number) => {
      const { cards } = giftAlbum();
      giftSlot(slot);
      cards.splice(slot, 1);
      notify(["mysteryGift"]);
    },
    "mysteryGift.setUnlocked": (value: boolean) => {
      const gift = giftAlbum();
      if (gift.unlocked === null) throw { code: "not-supported", message: "Generation 5 games show Mystery Gift once the player has the Pokédex." };
      gift.unlocked = value;
      notify(["mysteryGift"]);
    },
    "mysteryGift.setReceived": (cardId: number, value: boolean) => {
      const { received } = giftAlbum();
      if (value) received.add(cardId);
      else received.delete(cardId);
      notify(["mysteryGift"]);
    },
    "trainer.get": () => card,
    "trainer.setName": (name: string) => {
      card.name = name.slice(0, card.maxNameLength);
      notify(["trainer"]);
    },
    "trainer.setGender": (gender: TrainerGender) => {
      card.gender = gender;
      notify(["trainer"]);
    },
    "trainer.setMoney": (amount: number) => {
      save![0] = amount;
      card.money = amount;
      notify(["trainer"]);
    },
    "transfer.open": (data: string, fileName: string, formatId: string | null) => {
      partnerFormats.push(formatId ?? null);
      const found = transfer?.partners[fileName];
      if (!found) throw { code: "invalid-save", message: `Can't read ${fileName}` };
      partner = { ...found, fileName, data };
      opened.push(fileName);
      notify(["transfer"]);
      return transferSummary();
    },
    "transfer.close": () => {
      partner = undefined;
      notify(["transfer"]);
    },
    "transfer.get": () => transferSummary() ?? null,
    "transfer.partnerBoxes": () => openPartner().pokemon ?? [],
    "transfer.details": (at: PokemonHandle, side: TransferSave) => partnerDetails(at, side),
    "transfer.export": (at: PokemonHandle, side: TransferSave) => ({
      bytes: toBase64(new Uint8Array([partnerDetails(at, side).level])),
      fileName: "pokemon.pk",
      generation: side === "mine" ? generation : (openPartner().generation ?? generation),
    }),
    "transfer.convert": (file: { bytes: string; generation: number }, to: TransferSave) => {
      const level = fromBase64(file.bytes)[0];
      const into = to === "mine" ? generation : (openPartner().generation ?? generation);
      return { bytes: file.bytes, pokemon: fakeDetails({ speciesId: 1, nickname: "COPY", level, isShiny: false } as PokemonSummary, into) };
    },
    "transfer.preview": (offer: TransferOffer) => {
      received("preview", offer);
      return preview(offer);
    },
    "transfer.commit": (offer: TransferOffer) => {
      received("commit", offer);
      const { fileName, data } = openPartner();
      const { offers, refused } = preview(offer);
      if (refused.length) throw { code: "transfer-refused", message: "Refused" };
      notify(["party", "box", "transfer"]);
      const arrived = offers.map(({ direction, arrives }) => ({ direction, id: arrives.id, at: arrives.at }));
      return { save: { bytes: toBase64(save!), fileName: "save.sav" }, partner: { bytes: data, fileName }, arrived };
    },
    "pokemon.read": (data: string, version: number, formatId: string | null) => {
      const readFormat = memoryFormatOf(formatId);
      reads.push(version);
      const nickname = gen3Nickname(fromBase64(data));
      const found = inMemory[nickname];
      if (!found || readFormat !== memoryFormat) throw { code: "bad-checksum", message: "Not a Pokémon." };
      const summary = { speciesId: found.species ?? 0, nickname, level: found.level ?? 5, isShiny: found.isShiny ?? false } as PokemonSummary;
      return fakeDetails(summary, generation, { ...found, legality: null });
    },
    "catalog.names": ({ speciesIds, itemIds, abilityIds, natureIds, formatId }: CatalogNamesRequest) => ({
      species: [...species, ...(memoryFormatOf(formatId)?.species ?? [])].filter((entry) => speciesIds.includes(entry.id)),
      items: itemIds.map((id) => ({ id, name: id === 0 ? "(None)" : (itemNames[id] ?? `Item #${id}`) })),
      abilities: (abilityIds ?? []).map((id) => ({ id, name: allAbilities.find((entry) => entry.id === id)?.name ?? `Unknown Ability ${id}` })),
      natures: (natureIds ?? []).map((id) => ({ id, name: natures.find((entry) => entry.id === id)?.name ?? `Unknown Nature ${id}` })),
    }),
    "pokemon.get": (at: PokemonHandle) => find(at),
    "pokemon.details": (at: PokemonHandle) => read(at).details,
    "pokemon.export": (at: PokemonHandle) => {
      exports.push(at);
      const { details } = read(at);
      return { bytes: toBase64(new Uint8Array([details.level])), fileName: `${details.nickname}.pk${generation}` };
    },
    "pokemon.options": (at: PokemonHandle) => {
      return fakeOptions(read(at).from, generation, heldItems);
    },
    "pokemon.edit": (at: PokemonHandle) => {
      const from = find(at);
      draft = { from, details: structuredClone(stored.get(from)!) };
      notify(["draft"]);
    },
    "pokemon.update": (at: PokemonHandle, patch: PokemonPatch) => {
      const pokemon = read(at);
      const details = patched(pokemon.details, patch);
      if (at.source === "draft") draft = { ...pokemon, details };
      else stored.set(pokemon.from, details);
      notify([at.source]);
    },
    "pokemon.commit": () => {
      if (!draft) throw { code: "no-draft", message: "No draft" };
      const { from, details } = draft;
      stored.set(from, details);
      Object.assign(from, { nickname: details.nickname, level: details.level, isShiny: details.isShiny });
      draft = undefined;
      notify(["draft", from.at.source]);
      return from.id;
    },
  };
  const host: EngineHost = {
    ready: async () => {},
    onChange: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    onEvent: () => {},
    getAssemblyExports: async () => ({
      PKHeX: {
        Everywhere: {
          Engine: {
            EngineExports: {
              Call: async (name, args) => {
                const command = commands[name];
                if (!command) return JSON.stringify({ ok: false, error: { code: "unknown-call", message: name } });
                if (!save && !withoutSave.has(name))
                  return JSON.stringify({ ok: false, error: { code: "no-save", message: "No save" } });
                try {
                  return JSON.stringify({ ok: true, value: command(...(JSON.parse(args) as never[])) ?? null });
                } catch (error) {
                  return JSON.stringify({ ok: false, error });
                }
              },
            },
          },
        },
      },
    }),
  };
  return {
    engine: createEngine({ host }),
    loaded: () => save,
    stored: (at: PokemonHandle) => stored.get(find(at))!,
    draft: () => draft?.details,
    transfersOpened: () => opened,
    transferOffers: () => transferOffers,
    addedEncounters: () => addedEncounters,
    exports: () => exports,
    filesAdded: () => filesAdded,
    reads: () => reads,
    loads: () => loads,
    teamCalls: () => teamCalls,
    partnerFormats: () => partnerFormats,
  };
}
