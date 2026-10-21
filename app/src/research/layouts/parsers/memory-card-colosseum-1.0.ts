// Generated from known/memory-card-colosseum-1.0.json by tools/parser/generate.ts. Run npm run parsers after changing either.
import { expand, repeat, setEach, spaceView, Store, type At, type ContainerDef, type Read, type SpaceDef } from "../tools/parser/runtime.ts";

export const target = {"schema":"1.0","format":"memory-card-colosseum","version":"1.0"};

const container: ContainerDef[] = [{"transform":"gc-memory-card","args":{"gameCodes":["GC6E","GC6P"]}},{"transform":"colosseum-slots"}];

const spaces: SpaceDef[] = [
  {"name":"slot","length":122880,"checksums":[{"step":"sha1","start":0,"end":122840,"at":122860},{"step":"colosseum-header","start":0,"end":122880,"at":12}]},
  {"name":"party:{1..6}","length":312,"source":{"regions":[{"space":"slot","start":168,"end":2040}],"offset":0,"stride":312}},
  {"name":"box:{1..3}:{1..30}","length":312,"source":{"regions":[{"space":"slot","start":2980,"end":12340},{"space":"slot","start":12360,"end":21720},{"space":"slot","start":21740,"end":31100}],"offset":0,"stride":312}},
];

export type Spaces =
  { "slot": Slot } &
  { [Name in `party:${1 | 2 | 3 | 4 | 5 | 6}`]: Ck3 } &
  { [Name in `box:${1 | 2 | 3}:${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30}`]: Ck3 };

export type SpaceName = keyof Spaces;

export class Trainer {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get name(): string {
    return this.#store.text({ space: "slot", offset: 0x78, type: "text-gen3-gc", length: 20 });
  }

  set name(value: string) {
    this.#store.setText({ space: "slot", offset: 0x78, type: "text-gen3-gc", length: 20 }, value);
  }

  get gender(): number {
    return this.#store.number({ space: "slot", offset: 0xAF8, type: "u8", length: 1 });
  }

  set gender(value: number) {
    this.#store.setNumber({ space: "slot", offset: 0xAF8, type: "u8", length: 1 }, value);
  }

  get tid(): number {
    return this.#store.number({ space: "slot", offset: 0xA6, type: "u16be", length: 2 });
  }

  set tid(value: number) {
    this.#store.setNumber({ space: "slot", offset: 0xA6, type: "u16be", length: 2 }, value);
  }

  get sid(): number {
    return this.#store.number({ space: "slot", offset: 0xA4, type: "u16be", length: 2 });
  }

  set sid(value: number) {
    this.#store.setNumber({ space: "slot", offset: 0xA4, type: "u16be", length: 2 }, value);
  }

  get money(): number {
    return this.#store.number({ space: "slot", offset: 0xAFC, type: "u32be", length: 4 });
  }

  set money(value: number) {
    this.#store.setNumber({ space: "slot", offset: 0xAFC, type: "u32be", length: 4 }, value);
  }

  get pokecoupons(): number {
    return this.#store.number({ space: "slot", offset: 0xB00, type: "u32be", length: 4 });
  }

  set pokecoupons(value: number) {
    this.#store.setNumber({ space: "slot", offset: 0xB00, type: "u32be", length: 4 }, value);
  }
}

export class PlayTime {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get totalSeconds(): number {
    return this.#store.number({ space: "slot", offset: 0x28, type: "f32be", length: 4 });
  }

  set totalSeconds(value: number) {
    this.#store.setNumber({ space: "slot", offset: 0x28, type: "f32be", length: 4 }, value);
  }
}

export class PokemonEvs {
  readonly #store: Store;
  readonly #at: At;

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
  }

  get health(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x98, type: "u16be", length: 2 });
  }

  set health(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x98, type: "u16be", length: 2 }, value);
  }

  get attack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x9A, type: "u16be", length: 2 });
  }

  set attack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x9A, type: "u16be", length: 2 }, value);
  }

  get defense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x9C, type: "u16be", length: 2 });
  }

  set defense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x9C, type: "u16be", length: 2 }, value);
  }

  get specialAttack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x9E, type: "u16be", length: 2 });
  }

  set specialAttack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x9E, type: "u16be", length: 2 }, value);
  }

  get specialDefense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xA0, type: "u16be", length: 2 });
  }

  set specialDefense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xA0, type: "u16be", length: 2 }, value);
  }

  get speed(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xA2, type: "u16be", length: 2 });
  }

  set speed(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xA2, type: "u16be", length: 2 }, value);
  }
}

export class PokemonIvs {
  readonly #store: Store;
  readonly #at: At;

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
  }

  get health(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xA4, type: "u16be", length: 2 });
  }

  set health(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xA4, type: "u16be", length: 2 }, value);
  }

  get attack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xA6, type: "u16be", length: 2 });
  }

  set attack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xA6, type: "u16be", length: 2 }, value);
  }

  get defense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xA8, type: "u16be", length: 2 });
  }

  set defense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xA8, type: "u16be", length: 2 }, value);
  }

  get specialAttack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xAA, type: "u16be", length: 2 });
  }

  set specialAttack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xAA, type: "u16be", length: 2 }, value);
  }

  get specialDefense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xAC, type: "u16be", length: 2 });
  }

  set specialDefense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xAC, type: "u16be", length: 2 }, value);
  }

  get speed(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xAE, type: "u16be", length: 2 });
  }

  set speed(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xAE, type: "u16be", length: 2 }, value);
  }
}

export class PokemonMove {
  readonly #store: Store;
  readonly #at: At;

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
  }

  get move(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x78 + this.#at.index * 4, type: "u16be", length: 2 });
  }

  set move(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x78 + this.#at.index * 4, type: "u16be", length: 2 }, value);
  }

  get pp(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x7A + this.#at.index * 4, type: "u8", length: 1 });
  }

  set pp(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x7A + this.#at.index * 4, type: "u8", length: 1 }, value);
  }
}

export class PokemonOwner {
  readonly #store: Store;
  readonly #at: At;

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
  }

  get tid(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x14, type: "u32be", length: 4, bit: 0, width: 16 });
  }

  set tid(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x14, type: "u32be", length: 4, bit: 0, width: 16 }, value);
  }

  get sid(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x14, type: "u32be", length: 4, bit: 16, width: 16 });
  }

  set sid(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x14, type: "u32be", length: 4, bit: 16, width: 16 }, value);
  }

  get name(): string {
    return this.#store.text({ space: this.#at.space, offset: 0x18, type: "text-gen3-gc", length: 22 });
  }

  set name(value: string) {
    this.#store.setText({ space: this.#at.space, offset: 0x18, type: "text-gen3-gc", length: 22 }, value);
  }

  get gender(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x10, type: "u8", length: 1 });
  }

  set gender(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x10, type: "u8", length: 1 }, value);
  }
}

export class PokemonMetConditions {
  readonly #store: Store;
  readonly #at: At;

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
  }

  get location(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xC, type: "u16be", length: 2 });
  }

  set location(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xC, type: "u16be", length: 2 }, value);
  }

  get level(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xE, type: "u8", length: 1 });
  }

  set level(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xE, type: "u8", length: 1 }, value);
  }

  get version(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x8, type: "u8", length: 1 });
  }

  set version(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x8, type: "u8", length: 1 }, value);
  }

  get fatefulEncounter(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xFB, type: "u8", length: 1, bit: 0, width: 1 });
  }

  set fatefulEncounter(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xFB, type: "u8", length: 1, bit: 0, width: 1 }, value);
  }
}

export class PokemonEgg {
  readonly #store: Store;
  readonly #at: At;

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
  }

  get isEgg(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xCB, type: "u8", length: 1 });
  }

  set isEgg(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xCB, type: "u8", length: 1 }, value);
  }
}

export class PokemonPokerus {
  readonly #store: Store;
  readonly #at: At;

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
  }

  get strain(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xCA, type: "u8", length: 1, bit: 0, width: 4 });
  }

  set strain(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xCA, type: "u8", length: 1, bit: 0, width: 4 }, value);
  }

  get days(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xD0, type: "i8", length: 1 });
  }

  set days(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xD0, type: "i8", length: 1 }, value);
  }
}

export class Pokemon {
  readonly #store: Store;
  readonly #at: At;
  readonly evs: PokemonEvs;
  readonly ivs: PokemonIvs;
  readonly moves: readonly PokemonMove[];
  readonly owner: PokemonOwner;
  readonly metConditions: PokemonMetConditions;
  readonly egg: PokemonEgg;
  readonly pokerus: PokemonPokerus;

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
    this.evs = new PokemonEvs(store, this.#at);
    this.ivs = new PokemonIvs(store, this.#at);
    this.moves = repeat(4, (index) => new PokemonMove(store, { space: this.#at.space, index, offset: 0x78 + index * 4 }));
    this.owner = new PokemonOwner(store, this.#at);
    this.metConditions = new PokemonMetConditions(store, this.#at);
    this.egg = new PokemonEgg(store, this.#at);
    this.pokerus = new PokemonPokerus(store, this.#at);
  }

  get pid(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x4, type: "u32be", length: 4 });
  }

  set pid(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x4, type: "u32be", length: 4 }, value);
  }

  get species(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x0, type: "u16be", length: 2 });
  }

  set species(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x0, type: "u16be", length: 2 }, value);
  }

  get nickname(): string {
    return this.#store.text({ space: this.#at.space, offset: 0x44, type: "text-gen3-gc", length: 22 });
  }

  set nickname(value: string) {
    this.#store.setText({ space: this.#at.space, offset: 0x44, type: "text-gen3-gc", length: 22 }, value);
  }

  get level(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x60, type: "u8", length: 1 });
  }

  set level(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x60, type: "u8", length: 1 }, value);
  }

  get experience(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x5C, type: "u32be", length: 4 });
  }

  set experience(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x5C, type: "u32be", length: 4 }, value);
  }

  get heldItem(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x88, type: "u16be", length: 2 });
  }

  set heldItem(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x88, type: "u16be", length: 2 }, value);
  }

  get friendship(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xB0, type: "u16be", length: 2 });
  }

  set friendship(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xB0, type: "u16be", length: 2 }, value);
  }

  get ball(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xF, type: "u8", length: 1 });
  }

  set ball(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xF, type: "u8", length: 1 }, value);
  }

  get language(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xB, type: "u8", length: 1 });
  }

  set language(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xB, type: "u8", length: 1 }, value);
  }

  get shadowId(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xD8, type: "u16be", length: 2 });
  }

  set shadowId(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xD8, type: "u16be", length: 2 }, value);
  }

  get purification(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xDC, type: "i32be", length: 4 });
  }

  set purification(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xDC, type: "i32be", length: 4 }, value);
  }
}

export class PartyPokemonStats {
  readonly #store: Store;
  readonly #at: At;

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
  }

  get health(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x8C, type: "u16be", length: 2 });
  }

  set health(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x8C, type: "u16be", length: 2 }, value);
  }

  get attack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x8E, type: "u16be", length: 2 });
  }

  set attack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x8E, type: "u16be", length: 2 }, value);
  }

  get defense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x90, type: "u16be", length: 2 });
  }

  set defense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x90, type: "u16be", length: 2 }, value);
  }

  get specialAttack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x92, type: "u16be", length: 2 });
  }

  set specialAttack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x92, type: "u16be", length: 2 }, value);
  }

  get specialDefense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x94, type: "u16be", length: 2 });
  }

  set specialDefense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x94, type: "u16be", length: 2 }, value);
  }

  get speed(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x96, type: "u16be", length: 2 });
  }

  set speed(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x96, type: "u16be", length: 2 }, value);
  }
}

export class PartyPokemon extends Pokemon {
  readonly #store: Store;
  readonly #at: At;
  readonly stats: PartyPokemonStats;

  constructor(store: Store, at: At) {
    super(store, at);
    this.#store = store;
    this.#at = at;
    this.stats = new PartyPokemonStats(store, this.#at);
  }

  get currentHp(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x8A, type: "u16be", length: 2 });
  }

  set currentHp(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x8A, type: "u16be", length: 2 }, value);
  }
}

export class Box {
  readonly #store: Store;
  readonly #at: At;
  readonly slots: readonly Pokemon[];

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
    this.slots = expand(`${this.#at.space}:{1..30}`).map((space, index) => new Pokemon(store, { space, index, offset: 0 }));
  }

  get name(): string {
    return this.#store.text({ space: "slot", offset: 0xB90 + this.#at.index * 9380, type: "text-gen3-gc", length: 16 });
  }

  set name(value: string) {
    this.#store.setText({ space: "slot", offset: 0xB90 + this.#at.index * 9380, type: "text-gen3-gc", length: 16 }, value);
  }
}

export class Item {
  readonly #store: Store;
  readonly #at: At;

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
  }

  get item(): number {
    return this.#store.number({ space: this.#at.space, offset: this.#at.offset, type: "u32be", length: 4, bit: 16, width: 16 });
  }

  set item(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: this.#at.offset, type: "u32be", length: 4, bit: 16, width: 16 }, value);
  }

  get count(): number {
    return this.#store.number({ space: this.#at.space, offset: this.#at.offset, type: "u32be", length: 4, bit: 0, width: 16 });
  }

  set count(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: this.#at.offset, type: "u32be", length: 4, bit: 0, width: 16 }, value);
  }
}

export class Bag {
  readonly items: readonly Item[];
  readonly keyItems: readonly Item[];
  readonly balls: readonly Item[];
  readonly tmsHms: readonly Item[];
  readonly berries: readonly Item[];
  readonly medicine: readonly Item[];

  constructor(store: Store, _at: At) {
    this.items = repeat(20, (index) => new Item(store, { space: "slot", index, offset: 0x7F8 + index * 4 }));
    this.keyItems = repeat(43, (index) => new Item(store, { space: "slot", index, offset: 0x848 + index * 4 }));
    this.balls = repeat(16, (index) => new Item(store, { space: "slot", index, offset: 0x8F4 + index * 4 }));
    this.tmsHms = repeat(64, (index) => new Item(store, { space: "slot", index, offset: 0x934 + index * 4 }));
    this.berries = repeat(46, (index) => new Item(store, { space: "slot", index, offset: 0xA34 + index * 4 }));
    this.medicine = repeat(3, (index) => new Item(store, { space: "slot", index, offset: 0xAEC + index * 4 }));
  }
}

export class Save {
  readonly #store: Store;
  readonly #at: At;
  readonly trainer: Trainer;
  readonly playTime: PlayTime;
  readonly party: readonly PartyPokemon[];
  readonly boxes: readonly Box[];
  readonly bag: Bag;

  constructor(file: Uint8Array) {
    const store = new Store(file, spaces, container);
    this.#store = store;
    this.#at = { space: "", index: 0, offset: 0 };
    this.trainer = new Trainer(store, this.#at);
    this.playTime = new PlayTime(store, this.#at);
    this.party = expand("party:{1..6}").map((space, index) => new PartyPokemon(store, { space, index, offset: 0 }));
    this.boxes = expand("box:{1..3}").map((space, index) => new Box(store, { space, index, offset: 0 }));
    this.bag = new Bag(store, this.#at);
  }

  space<Name extends SpaceName>(name: Name): Spaces[Name] {
    return spaceView(this.#store, name, views) as Spaces[Name];
  }

  write(): Uint8Array {
    return this.#store.write();
  }
}

export class Slot {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get magic(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x0, type: "bytes", length: 4 });
  }

  set magic(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x0, type: "bytes", length: 4 }, value);
  }

  get saveCounter(): number {
    return this.#store.number({ space: this.#space, offset: 0x4, type: "i32be", length: 4 });
  }

  set saveCounter(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x4, type: "i32be", length: 4 }, value);
  }

  get game(): number {
    return this.#store.number({ space: this.#space, offset: 0x8, type: "u8", length: 1 });
  }

  set game(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x8, type: "u8", length: 1 }, value);
  }

  get currentRegion(): number {
    return this.#store.number({ space: this.#space, offset: 0x9, type: "u8", length: 1 });
  }

  set currentRegion(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x9, type: "u8", length: 1 }, value);
  }

  get originalRegion(): number {
    return this.#store.number({ space: this.#space, offset: 0xA, type: "u8", length: 1 });
  }

  set originalRegion(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA, type: "u8", length: 1 }, value);
  }

  get language(): number {
    return this.#store.number({ space: this.#space, offset: 0xB, type: "u8", length: 1 });
  }

  set language(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xB, type: "u8", length: 1 }, value);
  }

  get headerChecksum(): number {
    return this.#store.number({ space: this.#space, offset: 0xC, type: "u32be", length: 4 });
  }

  set headerChecksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xC, type: "u32be", length: 4 }, value);
  }

  get playTime(): number {
    return this.#store.number({ space: this.#space, offset: 0x28, type: "f32be", length: 4 });
  }

  set playTime(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x28, type: "f32be", length: 4 }, value);
  }

  get trainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x78, type: "text-gen3-gc", length: 20 });
  }

  set trainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x78, type: "text-gen3-gc", length: 20 }, value);
  }

  get trainerNameCopy(): string {
    return this.#store.text({ space: this.#space, offset: 0x8C, type: "text-gen3-gc", length: 20 });
  }

  set trainerNameCopy(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x8C, type: "text-gen3-gc", length: 20 }, value);
  }

  get secretId(): number {
    return this.#store.number({ space: this.#space, offset: 0xA4, type: "u16be", length: 2 });
  }

  set secretId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA4, type: "u16be", length: 2 }, value);
  }

  get trainerId(): number {
    return this.#store.number({ space: this.#space, offset: 0xA6, type: "u16be", length: 2 });
  }

  set trainerId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA6, type: "u16be", length: 2 }, value);
  }

  get partyPokemon(): readonly (Uint8Array)[] {
    return repeat(6, (i) => this.#store.raw({ space: this.#space, offset: 0xA8 + i * 312, type: "bytes", length: 312 }));
  }

  set partyPokemon(values: readonly (Uint8Array)[]) {
    setEach(6, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0xA8 + i * 312, type: "bytes", length: 312 }, value));
  }

  get itemsPocket(): readonly SlotItemsPocket[] {
    return repeat(20, (i) => new SlotItemsPocket(this.#store, { space: this.#space, offset: 0x7F8 + i * 4, type: "u32be", length: 4 }));
  }

  get keyItemsPocket(): readonly SlotKeyItemsPocket[] {
    return repeat(43, (i) => new SlotKeyItemsPocket(this.#store, { space: this.#space, offset: 0x848 + i * 4, type: "u32be", length: 4 }));
  }

  get pokeBallsPocket(): readonly SlotPokeBallsPocket[] {
    return repeat(16, (i) => new SlotPokeBallsPocket(this.#store, { space: this.#space, offset: 0x8F4 + i * 4, type: "u32be", length: 4 }));
  }

  get tmsAndHmsPocket(): readonly SlotTmsAndHmsPocket[] {
    return repeat(64, (i) => new SlotTmsAndHmsPocket(this.#store, { space: this.#space, offset: 0x934 + i * 4, type: "u32be", length: 4 }));
  }

  get berriesPocket(): readonly SlotBerriesPocket[] {
    return repeat(46, (i) => new SlotBerriesPocket(this.#store, { space: this.#space, offset: 0xA34 + i * 4, type: "u32be", length: 4 }));
  }

  get colognesPocket(): readonly SlotColognesPocket[] {
    return repeat(3, (i) => new SlotColognesPocket(this.#store, { space: this.#space, offset: 0xAEC + i * 4, type: "u32be", length: 4 }));
  }

  get trainerGender(): number {
    return this.#store.number({ space: this.#space, offset: 0xAF8, type: "u8", length: 1 });
  }

  set trainerGender(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xAF8, type: "u8", length: 1 }, value);
  }

  get money(): number {
    return this.#store.number({ space: this.#space, offset: 0xAFC, type: "u32be", length: 4 });
  }

  set money(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xAFC, type: "u32be", length: 4 }, value);
  }

  get pokecoupons(): number {
    return this.#store.number({ space: this.#space, offset: 0xB00, type: "u32be", length: 4 });
  }

  set pokecoupons(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xB00, type: "u32be", length: 4 }, value);
  }

  get pokecouponsTotal(): number {
    return this.#store.number({ space: this.#space, offset: 0xB04, type: "u32be", length: 4 });
  }

  set pokecouponsTotal(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xB04, type: "u32be", length: 4 }, value);
  }

  get ruiName(): string {
    return this.#store.text({ space: this.#space, offset: 0xB3A, type: "text-gen3-gc", length: 20 });
  }

  set ruiName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0xB3A, type: "text-gen3-gc", length: 20 }, value);
  }

  get boxNames(): readonly (string)[] {
    return repeat(3, (i) => this.#store.text({ space: this.#space, offset: 0xB90 + i * 9380, type: "text-gen3-gc", length: 16 }));
  }

  set boxNames(values: readonly (string)[]) {
    setEach(3, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0xB90 + i * 9380, type: "text-gen3-gc", length: 16 }, value));
  }

  get boxPokemon(): readonly (Uint8Array)[] {
    return repeat(3, (i) => this.#store.raw({ space: this.#space, offset: 0xBA4 + i * 9380, type: "bytes", length: 9360 }));
  }

  set boxPokemon(values: readonly (Uint8Array)[]) {
    setEach(3, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0xBA4 + i * 9380, type: "bytes", length: 9360 }, value));
  }

  get daycareOccupied(): number {
    return this.#store.number({ space: this.#space, offset: 0x8170, type: "u8", length: 1 });
  }

  set daycareOccupied(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x8170, type: "u8", length: 1 }, value);
  }

  get daycareDepositLevel(): number {
    return this.#store.number({ space: this.#space, offset: 0x8171, type: "u8", length: 1 });
  }

  set daycareDepositLevel(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x8171, type: "u8", length: 1 }, value);
  }

  get daycareExperience(): number {
    return this.#store.number({ space: this.#space, offset: 0x8174, type: "u32be", length: 4 });
  }

  set daycareExperience(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x8174, type: "u32be", length: 4 }, value);
  }

  get daycarePokemon(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x8178, type: "bytes", length: 312 });
  }

  set daycarePokemon(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x8178, type: "bytes", length: 312 }, value);
  }

  get strategyMemoCount(): number {
    return this.#store.number({ space: this.#space, offset: 0x82B0, type: "u16be", length: 2 });
  }

  set strategyMemoCount(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x82B0, type: "u16be", length: 2 }, value);
  }

  get strategyMemoEntries(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x82B4, type: "bytes", length: 6000 });
  }

  set strategyMemoEntries(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x82B4, type: "bytes", length: 6000 }, value);
  }

  get bonusDiscTitles(): SlotBonusDiscTitles {
    return new SlotBonusDiscTitles(this.#store, { space: this.#space, offset: 0x1C118, type: "u8", length: 1 });
  }

  get celebiSent(): number {
    return this.#store.number({ space: this.#space, offset: 0x1C119, type: "u8", length: 1 });
  }

  set celebiSent(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1C119, type: "u8", length: 1 }, value);
  }

  get celebiGift(): SlotCelebiGift {
    return new SlotCelebiGift(this.#store, { space: this.#space, offset: 0x1C11A, type: "u8", length: 1 });
  }

  get giftRibbons(): readonly (number)[] {
    return repeat(11, (i) => this.#store.number({ space: this.#space, offset: 0x1C464 + i * 1, type: "u8", length: 1 }));
  }

  set giftRibbons(values: readonly (number)[]) {
    setEach(11, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x1C464 + i * 1, type: "u8", length: 1 }, value));
  }

  get secondDigest(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x1DFD8, type: "bytes", length: 20 });
  }

  set secondDigest(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x1DFD8, type: "bytes", length: 20 }, value);
  }

  get digest(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x1DFEC, type: "bytes", length: 20 });
  }

  set digest(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x1DFEC, type: "bytes", length: 20 }, value);
  }
}

export class SlotItemsPocket {
  readonly #store: Store;
  readonly #read: Read;

  constructor(store: Store, read: Read) {
    this.#store = store;
    this.#read = read;
  }

  get value(): number {
    return this.#store.number(this.#read);
  }

  set value(value: number) {
    this.#store.setNumber(this.#read, value);
  }

  get item(): number {
    return this.#store.number({ ...this.#read, bit: 16, width: 16 });
  }

  set item(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 16, width: 16 }, value);
  }

  get quantity(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 16 });
  }

  set quantity(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 16 }, value);
  }
}

export class SlotKeyItemsPocket {
  readonly #store: Store;
  readonly #read: Read;

  constructor(store: Store, read: Read) {
    this.#store = store;
    this.#read = read;
  }

  get value(): number {
    return this.#store.number(this.#read);
  }

  set value(value: number) {
    this.#store.setNumber(this.#read, value);
  }

  get item(): number {
    return this.#store.number({ ...this.#read, bit: 16, width: 16 });
  }

  set item(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 16, width: 16 }, value);
  }

  get quantity(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 16 });
  }

  set quantity(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 16 }, value);
  }
}

export class SlotPokeBallsPocket {
  readonly #store: Store;
  readonly #read: Read;

  constructor(store: Store, read: Read) {
    this.#store = store;
    this.#read = read;
  }

  get value(): number {
    return this.#store.number(this.#read);
  }

  set value(value: number) {
    this.#store.setNumber(this.#read, value);
  }

  get item(): number {
    return this.#store.number({ ...this.#read, bit: 16, width: 16 });
  }

  set item(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 16, width: 16 }, value);
  }

  get quantity(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 16 });
  }

  set quantity(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 16 }, value);
  }
}

export class SlotTmsAndHmsPocket {
  readonly #store: Store;
  readonly #read: Read;

  constructor(store: Store, read: Read) {
    this.#store = store;
    this.#read = read;
  }

  get value(): number {
    return this.#store.number(this.#read);
  }

  set value(value: number) {
    this.#store.setNumber(this.#read, value);
  }

  get item(): number {
    return this.#store.number({ ...this.#read, bit: 16, width: 16 });
  }

  set item(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 16, width: 16 }, value);
  }

  get quantity(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 16 });
  }

  set quantity(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 16 }, value);
  }
}

export class SlotBerriesPocket {
  readonly #store: Store;
  readonly #read: Read;

  constructor(store: Store, read: Read) {
    this.#store = store;
    this.#read = read;
  }

  get value(): number {
    return this.#store.number(this.#read);
  }

  set value(value: number) {
    this.#store.setNumber(this.#read, value);
  }

  get item(): number {
    return this.#store.number({ ...this.#read, bit: 16, width: 16 });
  }

  set item(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 16, width: 16 }, value);
  }

  get quantity(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 16 });
  }

  set quantity(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 16 }, value);
  }
}

export class SlotColognesPocket {
  readonly #store: Store;
  readonly #read: Read;

  constructor(store: Store, read: Read) {
    this.#store = store;
    this.#read = read;
  }

  get value(): number {
    return this.#store.number(this.#read);
  }

  set value(value: number) {
    this.#store.setNumber(this.#read, value);
  }

  get item(): number {
    return this.#store.number({ ...this.#read, bit: 16, width: 16 });
  }

  set item(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 16, width: 16 }, value);
  }

  get quantity(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 16 });
  }

  set quantity(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 16 }, value);
  }
}

export class SlotBonusDiscTitles {
  readonly #store: Store;
  readonly #read: Read;

  constructor(store: Store, read: Read) {
    this.#store = store;
    this.#read = read;
  }

  get value(): number {
    return this.#store.number(this.#read);
  }

  set value(value: number) {
    this.#store.setNumber(this.#read, value);
  }

  get gold(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set gold(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get silver(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set silver(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }

  get bronze(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 1 });
  }

  set bronze(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 1 }, value);
  }
}

export class SlotCelebiGift {
  readonly #store: Store;
  readonly #read: Read;

  constructor(store: Store, read: Read) {
    this.#store = store;
    this.#read = read;
  }

  get value(): number {
    return this.#store.number(this.#read);
  }

  set value(value: number) {
    this.#store.setNumber(this.#read, value);
  }

  get received(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 1 });
  }

  set received(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 1 }, value);
  }
}

export class Ck3 {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get species(): number {
    return this.#store.number({ space: this.#space, offset: 0x0, type: "u16be", length: 2 });
  }

  set species(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x0, type: "u16be", length: 2 }, value);
  }

  get pid(): number {
    return this.#store.number({ space: this.#space, offset: 0x4, type: "u32be", length: 4 });
  }

  set pid(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x4, type: "u32be", length: 4 }, value);
  }

  get originGame(): number {
    return this.#store.number({ space: this.#space, offset: 0x8, type: "u8", length: 1 });
  }

  set originGame(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x8, type: "u8", length: 1 }, value);
  }

  get currentRegion(): number {
    return this.#store.number({ space: this.#space, offset: 0x9, type: "u8", length: 1 });
  }

  set currentRegion(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x9, type: "u8", length: 1 }, value);
  }

  get originalRegion(): number {
    return this.#store.number({ space: this.#space, offset: 0xA, type: "u8", length: 1 });
  }

  set originalRegion(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA, type: "u8", length: 1 }, value);
  }

  get language(): number {
    return this.#store.number({ space: this.#space, offset: 0xB, type: "u8", length: 1 });
  }

  set language(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xB, type: "u8", length: 1 }, value);
  }

  get metLocation(): number {
    return this.#store.number({ space: this.#space, offset: 0xC, type: "u16be", length: 2 });
  }

  set metLocation(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xC, type: "u16be", length: 2 }, value);
  }

  get metLevel(): number {
    return this.#store.number({ space: this.#space, offset: 0xE, type: "u8", length: 1 });
  }

  set metLevel(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xE, type: "u8", length: 1 }, value);
  }

  get ball(): number {
    return this.#store.number({ space: this.#space, offset: 0xF, type: "u8", length: 1 });
  }

  set ball(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xF, type: "u8", length: 1 }, value);
  }

  get originalTrainerGender(): number {
    return this.#store.number({ space: this.#space, offset: 0x10, type: "u8", length: 1 });
  }

  set originalTrainerGender(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x10, type: "u8", length: 1 }, value);
  }

  get originalTrainerId(): Ck3OriginalTrainerId {
    return new Ck3OriginalTrainerId(this.#store, { space: this.#space, offset: 0x14, type: "u32be", length: 4 });
  }

  get originalTrainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x18, type: "text-gen3-gc", length: 22 });
  }

  set originalTrainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x18, type: "text-gen3-gc", length: 22 }, value);
  }

  get nicknameDisplay(): string {
    return this.#store.text({ space: this.#space, offset: 0x2E, type: "text-gen3-gc", length: 22 });
  }

  set nicknameDisplay(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x2E, type: "text-gen3-gc", length: 22 }, value);
  }

  get nickname(): string {
    return this.#store.text({ space: this.#space, offset: 0x44, type: "text-gen3-gc", length: 22 });
  }

  set nickname(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x44, type: "text-gen3-gc", length: 22 }, value);
  }

  get experience(): number {
    return this.#store.number({ space: this.#space, offset: 0x5C, type: "u32be", length: 4 });
  }

  set experience(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x5C, type: "u32be", length: 4 }, value);
  }

  get level(): number {
    return this.#store.number({ space: this.#space, offset: 0x60, type: "u8", length: 1 });
  }

  set level(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x60, type: "u8", length: 1 }, value);
  }

  get moves(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x78 + i * 4, type: "u16be", length: 2 }));
  }

  set moves(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x78 + i * 4, type: "u16be", length: 2 }, value));
  }

  get pp(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x7A + i * 4, type: "u8", length: 1 }));
  }

  set pp(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x7A + i * 4, type: "u8", length: 1 }, value));
  }

  get ppUps(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x7B + i * 4, type: "u8", length: 1 }));
  }

  set ppUps(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x7B + i * 4, type: "u8", length: 1 }, value));
  }

  get heldItem(): number {
    return this.#store.number({ space: this.#space, offset: 0x88, type: "u16be", length: 2 });
  }

  set heldItem(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x88, type: "u16be", length: 2 }, value);
  }

  get currentHp(): number {
    return this.#store.number({ space: this.#space, offset: 0x8A, type: "u16be", length: 2 });
  }

  set currentHp(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x8A, type: "u16be", length: 2 }, value);
  }

  get stats(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x8C + i * 2, type: "u16be", length: 2 }));
  }

  set stats(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x8C + i * 2, type: "u16be", length: 2 }, value));
  }

  get evs(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x98 + i * 2, type: "u16be", length: 2 }));
  }

  set evs(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x98 + i * 2, type: "u16be", length: 2 }, value));
  }

  get ivs(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0xA4 + i * 2, type: "u16be", length: 2 }));
  }

  set ivs(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xA4 + i * 2, type: "u16be", length: 2 }, value));
  }

  get friendship(): number {
    return this.#store.number({ space: this.#space, offset: 0xB0, type: "u16be", length: 2 });
  }

  set friendship(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xB0, type: "u16be", length: 2 }, value);
  }

  get contestStats(): readonly (number)[] {
    return repeat(5, (i) => this.#store.number({ space: this.#space, offset: 0xB2 + i * 1, type: "u8", length: 1 }));
  }

  set contestStats(values: readonly (number)[]) {
    setEach(5, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xB2 + i * 1, type: "u8", length: 1 }, value));
  }

  get contestRibbons(): readonly (number)[] {
    return repeat(5, (i) => this.#store.number({ space: this.#space, offset: 0xB7 + i * 1, type: "u8", length: 1 }));
  }

  set contestRibbons(values: readonly (number)[]) {
    setEach(5, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xB7 + i * 1, type: "u8", length: 1 }, value));
  }

  get sheen(): number {
    return this.#store.number({ space: this.#space, offset: 0xBC, type: "u8", length: 1 });
  }

  set sheen(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xBC, type: "u8", length: 1 }, value);
  }

  get ribbons(): readonly (number)[] {
    return repeat(12, (i) => this.#store.number({ space: this.#space, offset: 0xBD + i * 1, type: "u8", length: 1 }));
  }

  set ribbons(values: readonly (number)[]) {
    setEach(12, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xBD + i * 1, type: "u8", length: 1 }, value));
  }

  get ribbonFlags(): Ck3RibbonFlags {
    return new Ck3RibbonFlags(this.#store, { space: this.#space, offset: 0xC9, type: "u8", length: 1 });
  }

  get pokerusStrain(): Ck3PokerusStrain {
    return new Ck3PokerusStrain(this.#store, { space: this.#space, offset: 0xCA, type: "u8", length: 1 });
  }

  get isEgg(): number {
    return this.#store.number({ space: this.#space, offset: 0xCB, type: "u8", length: 1 });
  }

  set isEgg(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xCB, type: "u8", length: 1 }, value);
  }

  get ability(): number {
    return this.#store.number({ space: this.#space, offset: 0xCC, type: "u8", length: 1 });
  }

  set ability(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xCC, type: "u8", length: 1 }, value);
  }

  get invalid(): number {
    return this.#store.number({ space: this.#space, offset: 0xCD, type: "u8", length: 1 });
  }

  set invalid(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xCD, type: "u8", length: 1 }, value);
  }

  get markings(): number {
    return this.#store.number({ space: this.#space, offset: 0xCF, type: "u8", length: 1 });
  }

  set markings(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xCF, type: "u8", length: 1 }, value);
  }

  get pokerusDays(): number {
    return this.#store.number({ space: this.#space, offset: 0xD0, type: "i8", length: 1 });
  }

  set pokerusDays(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xD0, type: "i8", length: 1 }, value);
  }

  get partySlot(): number {
    return this.#store.number({ space: this.#space, offset: 0xD7, type: "u8", length: 1 });
  }

  set partySlot(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xD7, type: "u8", length: 1 }, value);
  }

  get shadowId(): number {
    return this.#store.number({ space: this.#space, offset: 0xD8, type: "u16be", length: 2 });
  }

  set shadowId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xD8, type: "u16be", length: 2 }, value);
  }

  get purification(): number {
    return this.#store.number({ space: this.#space, offset: 0xDC, type: "i32be", length: 4 });
  }

  set purification(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xDC, type: "i32be", length: 4 }, value);
  }

  get fatefulEncounter(): Ck3FatefulEncounter {
    return new Ck3FatefulEncounter(this.#store, { space: this.#space, offset: 0xFB, type: "u8", length: 1 });
  }
}

export class Ck3OriginalTrainerId {
  readonly #store: Store;
  readonly #read: Read;

  constructor(store: Store, read: Read) {
    this.#store = store;
    this.#read = read;
  }

  get value(): number {
    return this.#store.number(this.#read);
  }

  set value(value: number) {
    this.#store.setNumber(this.#read, value);
  }

  get tid(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 16 });
  }

  set tid(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 16 }, value);
  }

  get sid(): number {
    return this.#store.number({ ...this.#read, bit: 16, width: 16 });
  }

  set sid(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 16, width: 16 }, value);
  }
}

export class Ck3RibbonFlags {
  readonly #store: Store;
  readonly #read: Read;

  constructor(store: Store, read: Read) {
    this.#store = store;
    this.#read = read;
  }

  get value(): number {
    return this.#store.number(this.#read);
  }

  set value(value: number) {
    this.#store.setNumber(this.#read, value);
  }

  get unused1(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set unused1(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get unused2(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set unused2(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }

  get unused3(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 1 });
  }

  set unused3(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 1 }, value);
  }

  get unused4(): number {
    return this.#store.number({ ...this.#read, bit: 3, width: 1 });
  }

  set unused4(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 3, width: 1 }, value);
  }

  get fatefulEncounterJapanese(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 1 });
  }

  set fatefulEncounterJapanese(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 1 }, value);
  }
}

export class Ck3PokerusStrain {
  readonly #store: Store;
  readonly #read: Read;

  constructor(store: Store, read: Read) {
    this.#store = store;
    this.#read = read;
  }

  get value(): number {
    return this.#store.number(this.#read);
  }

  set value(value: number) {
    this.#store.setNumber(this.#read, value);
  }

  get strain(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 4 });
  }

  set strain(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 4 }, value);
  }
}

export class Ck3FatefulEncounter {
  readonly #store: Store;
  readonly #read: Read;

  constructor(store: Store, read: Read) {
    this.#store = store;
    this.#read = read;
  }

  get value(): number {
    return this.#store.number(this.#read);
  }

  set value(value: number) {
    this.#store.setNumber(this.#read, value);
  }

  get fatefulEncounter(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set fatefulEncounter(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }
}

const views: [string, new (store: Store, space: string) => unknown][] = [
  ["slot", Slot],
  ["party:{1..6}", Ck3],
  ["box:{1..3}:{1..30}", Ck3],
];

export const read = (file: Uint8Array) => new Save(file);
