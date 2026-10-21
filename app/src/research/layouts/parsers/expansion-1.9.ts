// Generated from known/expansion-1.9.json by tools/parser/generate.ts. Run npm run parsers after changing either.
import { knownRom, Store, table, withCounts, type At, type Pocket, type RomDef, type SpaceDef } from "../tools/parser/runtime.ts";

export const target = {"schema":"1.0","format":"expansion","version":"1.9"};

export const roms: RomDef[] = [
  {"sha1":"1d20091c4d936f5eb122db8780554dd0829ffb63","name":"Emerald Imperium v1.3.1","counts":{"items":1002,"species":1537,"moves":938,"abilities":328}},
];

const spaces: SpaceDef[] = [
  {"name":"items","length":80,"table":{"pointer":456,"checks":[{"offset":"0x41","type":"u8","equals":[0,1,2,3,4,5,6]},{"any":[{"offset":"0x0C","type":"u32le","pointer":true},{"offset":"0x00","length":80,"type":"bytes","zero":true}]}]}},
  {"name":"species","length":260,"table":{"pointer":444,"checks":[{"offset":"0x38","type":"u8","equals":[0,255]},{"any":[{"offset":"0x58","type":"u32le","pointer":true},{"offset":"0x00","length":260,"type":"bytes","zero":true}]}]}},
  {"name":"moves","length":52,"table":{"pointer":460,"checks":[{"offset":"0x00","type":"u32le","pointer":true},{"offset":"0x04","type":"u32le","pointer":true}]}},
  {"name":"abilities","length":28,"table":{"pointer":524,"checks":[{"offset":"0x14","type":"u32le","pointer":true}]}},
];

export class Item {
  readonly #store: Store;
  readonly #at: At;

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
  }

  get name(): string {
    return this.#store.text({ space: this.#at.space, offset: this.#at.offset + 0x14, type: "text-gen3-intl", length: 20 });
  }

  get pocket(): Pocket | undefined {
    return this.#store.pocket({ space: this.#at.space, offset: this.#at.offset + 0x41, type: "u8", length: 1, pockets: { 1: "items", 2: "mega-stones", 3: "balls", 4: "tms", 5: "berries", 6: "key-items" } });
  }
}

export class Species {
  readonly #store: Store;
  readonly #at: At;

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
  }

  get name(): string {
    return this.#store.text({ space: this.#at.space, offset: this.#at.offset + 0x2C, type: "text-gen3-intl", length: 13 });
  }
}

export class Move {
  readonly #store: Store;
  readonly #at: At;

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
  }

  get name(): string {
    return this.#store.text({ space: this.#at.space, offset: this.#at.offset + 0x0, type: "text-gen3-intl", length: 4, storage: "inline-or-pointer" });
  }
}

export class Ability {
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
  readonly species: readonly Species[];
  readonly moves: readonly Move[];
  readonly abilities: readonly Ability[];

  constructor(file: Uint8Array, sha1?: string) {
    const known = knownRom(roms, file, sha1);
    const store = new Store(file, withCounts(spaces, known));
    this.known = known;
    this.items = table(store, "items", 80, (at) => new Item(store, at));
    this.species = table(store, "species", 260, (at) => new Species(store, at));
    this.moves = table(store, "moves", 52, (at) => new Move(store, at));
    this.abilities = table(store, "abilities", 28, (at) => new Ability(store, at));
  }
}

export const read = (file: Uint8Array, sha1?: string) => new Rom(file, sha1);
