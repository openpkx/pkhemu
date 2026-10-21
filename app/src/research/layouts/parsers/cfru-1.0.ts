// Generated from known/cfru-1.0.json by tools/parser/generate.ts. Run npm run parsers after changing either.
import { knownRom, Store, table, withCounts, type At, type Pocket, type RomDef, type SpaceDef } from "../tools/parser/runtime.ts";

export const target = {"schema":"1.0","format":"cfru","version":"1.0"};

export const roms: RomDef[] = [
  {"sha1":"b4776b82a4c7915d0fadeaa27e013523f99dfd94","name":"Pokémon Unbound v2.1.1.1","counts":{"items":729,"species":1294,"moves":923,"abilities":293}},
  {"sha1":"964f951a0fdaf209e4ea1344883ef0d557bb3a80","name":"Pokémon Radical Red v4.1","counts":{"items":750,"species":1376,"moves":1004,"abilities":282}},
];

const spaces: SpaceDef[] = [
  {"name":"items","length":44,"table":{"pointer":633048,"checks":[{"offset":"0x14","type":"u32le","pointer":true}]}},
  {"name":"species","length":11,"table":{"pointer":70736,"checks":[{"offset":"0x00","type":"u8","not":255},{"offset":"0x0A","type":"u8","equals":255}]}},
  {"name":"moves","length":13,"table":{"pointer":198820,"checks":[{"offset":"0x00","type":"u8","not":255},{"offset":"0x0C","type":"u8","equals":255}]}},
  {"name":"abilities","length":17,"table":{"pointer":884740,"checks":[{"offset":"0x00","type":"u8","not":255},{"offset":"0x10","type":"u8","equals":255}]}},
];

export class Item {
  readonly #store: Store;
  readonly #at: At;

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
  }

  get name(): string {
    return this.#store.text({ space: this.#at.space, offset: this.#at.offset + 0x0, type: "text-gen3-intl", length: 14, storage: "inline-or-pointer" });
  }

  get pocket(): Pocket | undefined {
    return this.#store.pocket({ space: this.#at.space, offset: this.#at.offset + 0x1A, type: "u8", length: 1, pockets: { 1: "items", 2: "key-items", 3: "balls", 4: "tms", 5: "berries" } });
  }
}

export class SpeciesName {
  readonly #store: Store;
  readonly #at: At;

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
  }

  get name(): string {
    return this.#store.text({ space: this.#at.space, offset: this.#at.offset + 0x0, type: "text-gen3-intl", length: 11 });
  }
}

export class MoveName {
  readonly #store: Store;
  readonly #at: At;

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
  }

  get name(): string {
    return this.#store.text({ space: this.#at.space, offset: this.#at.offset + 0x0, type: "text-gen3-intl", length: 13 });
  }
}

export class AbilityName {
  readonly #store: Store;
  readonly #at: At;

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
  }

  get name(): string {
    return this.#store.text({ space: this.#at.space, offset: this.#at.offset + 0x0, type: "text-gen3-intl", length: 17 });
  }
}

export class Rom {
  readonly known: RomDef | undefined;
  readonly items: readonly Item[];
  readonly species: readonly SpeciesName[];
  readonly moves: readonly MoveName[];
  readonly abilities: readonly AbilityName[];

  constructor(file: Uint8Array, sha1?: string) {
    const known = knownRom(roms, file, sha1);
    const store = new Store(file, withCounts(spaces, known));
    this.known = known;
    this.items = table(store, "items", 44, (at) => new Item(store, at));
    this.species = table(store, "species", 11, (at) => new SpeciesName(store, at));
    this.moves = table(store, "moves", 13, (at) => new MoveName(store, at));
    this.abilities = table(store, "abilities", 17, (at) => new AbilityName(store, at));
  }
}

export const read = (file: Uint8Array, sha1?: string) => new Rom(file, sha1);
