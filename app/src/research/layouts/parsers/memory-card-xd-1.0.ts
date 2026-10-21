// Generated from known/memory-card-xd-1.0.json by tools/parser/generate.ts. Run npm run parsers after changing either.
import { expand, repeat, setEach, spaceView, Store, type At, type ContainerDef, type Read, type SpaceDef } from "../tools/parser/runtime.ts";

export const target = {"schema":"1.0","format":"memory-card-xd","version":"1.0"};

const container: ContainerDef[] = [{"transform":"gc-memory-card","args":{"gameCodes":["GXXE","GXXP"]}},{"transform":"xd-slots"}];

const spaces: SpaceDef[] = [
  {"name":"slot","length":163840,"checksums":[{"step":"xd-header","start":0,"end":8,"at":224},{"step":"xd-body","start":8,"end":163800,"at":16}]},
  {"name":"party:{1..6}","length":196,"source":{"regions":[{"space":"slot","start":360,"end":1536}],"offset":0,"stride":196}},
  {"name":"box:{1..8}:{1..30}","length":196,"source":{"regions":[{"space":"slot","start":2764,"end":8644},{"space":"slot","start":8664,"end":14544},{"space":"slot","start":14564,"end":20444},{"space":"slot","start":20464,"end":26344},{"space":"slot","start":26364,"end":32244},{"space":"slot","start":32264,"end":38144},{"space":"slot","start":38164,"end":44044},{"space":"slot","start":44064,"end":49944}],"offset":0,"stride":196}},
];

export type Spaces =
  { "slot": Slot } &
  { [Name in `party:${1 | 2 | 3 | 4 | 5 | 6}`]: Xk3 } &
  { [Name in `box:${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}:${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30}`]: Xk3 };

export type SpaceName = keyof Spaces;

export class Trainer {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get name(): string {
    return this.#store.text({ space: "slot", offset: 0x138, type: "text-gen3-gc", length: 20 });
  }

  set name(value: string) {
    this.#store.setText({ space: "slot", offset: 0x138, type: "text-gen3-gc", length: 20 }, value);
  }

  get gender(): number {
    return this.#store.number({ space: "slot", offset: 0xA18, type: "u8", length: 1 });
  }

  set gender(value: number) {
    this.#store.setNumber({ space: "slot", offset: 0xA18, type: "u8", length: 1 }, value);
  }

  get tid(): number {
    return this.#store.number({ space: "slot", offset: 0x166, type: "u16be", length: 2 });
  }

  set tid(value: number) {
    this.#store.setNumber({ space: "slot", offset: 0x166, type: "u16be", length: 2 }, value);
  }

  get sid(): number {
    return this.#store.number({ space: "slot", offset: 0x164, type: "u16be", length: 2 });
  }

  set sid(value: number) {
    this.#store.setNumber({ space: "slot", offset: 0x164, type: "u16be", length: 2 }, value);
  }

  get money(): number {
    return this.#store.number({ space: "slot", offset: 0xA1C, type: "u32be", length: 4 });
  }

  set money(value: number) {
    this.#store.setNumber({ space: "slot", offset: 0xA1C, type: "u32be", length: 4 }, value);
  }

  get pokecoupons(): number {
    return this.#store.number({ space: "slot", offset: 0xA20, type: "u32be", length: 4 });
  }

  set pokecoupons(value: number) {
    this.#store.setNumber({ space: "slot", offset: 0xA20, type: "u32be", length: 4 }, value);
  }
}

export class PlayTime {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get totalSeconds(): number {
    return this.#store.number({ space: "slot", offset: 0xD8, type: "f64be", length: 8 });
  }

  set totalSeconds(value: number) {
    this.#store.setNumber({ space: "slot", offset: 0xD8, type: "f64be", length: 8 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x9C, type: "u16be", length: 2 });
  }

  set health(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x9C, type: "u16be", length: 2 }, value);
  }

  get attack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x9E, type: "u16be", length: 2 });
  }

  set attack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x9E, type: "u16be", length: 2 }, value);
  }

  get defense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xA0, type: "u16be", length: 2 });
  }

  set defense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xA0, type: "u16be", length: 2 }, value);
  }

  get specialAttack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xA2, type: "u16be", length: 2 });
  }

  set specialAttack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xA2, type: "u16be", length: 2 }, value);
  }

  get specialDefense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xA4, type: "u16be", length: 2 });
  }

  set specialDefense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xA4, type: "u16be", length: 2 }, value);
  }

  get speed(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xA6, type: "u16be", length: 2 });
  }

  set speed(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xA6, type: "u16be", length: 2 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0xA8, type: "u8", length: 1 });
  }

  set health(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xA8, type: "u8", length: 1 }, value);
  }

  get attack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xA9, type: "u8", length: 1 });
  }

  set attack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xA9, type: "u8", length: 1 }, value);
  }

  get defense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xAA, type: "u8", length: 1 });
  }

  set defense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xAA, type: "u8", length: 1 }, value);
  }

  get specialAttack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xAB, type: "u8", length: 1 });
  }

  set specialAttack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xAB, type: "u8", length: 1 }, value);
  }

  get specialDefense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xAC, type: "u8", length: 1 });
  }

  set specialDefense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xAC, type: "u8", length: 1 }, value);
  }

  get speed(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xAD, type: "u8", length: 1 });
  }

  set speed(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xAD, type: "u8", length: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x80 + this.#at.index * 4, type: "u16be", length: 2 });
  }

  set move(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x80 + this.#at.index * 4, type: "u16be", length: 2 }, value);
  }

  get pp(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x82 + this.#at.index * 4, type: "u8", length: 1 });
  }

  set pp(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x82 + this.#at.index * 4, type: "u8", length: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x24, type: "u32be", length: 4, bit: 0, width: 16 });
  }

  set tid(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x24, type: "u32be", length: 4, bit: 0, width: 16 }, value);
  }

  get sid(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x24, type: "u32be", length: 4, bit: 16, width: 16 });
  }

  set sid(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x24, type: "u32be", length: 4, bit: 16, width: 16 }, value);
  }

  get name(): string {
    return this.#store.text({ space: this.#at.space, offset: 0x38, type: "text-gen3-gc", length: 22 });
  }

  set name(value: string) {
    this.#store.setText({ space: this.#at.space, offset: 0x38, type: "text-gen3-gc", length: 22 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x8, type: "u16be", length: 2 });
  }

  set location(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x8, type: "u16be", length: 2 }, value);
  }

  get level(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xE, type: "u8", length: 1 });
  }

  set level(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xE, type: "u8", length: 1 }, value);
  }

  get version(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x34, type: "u8", length: 1 });
  }

  set version(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x34, type: "u8", length: 1 }, value);
  }

  get fatefulEncounter(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x33, type: "u8", length: 1, bit: 0, width: 1 });
  }

  set fatefulEncounter(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x33, type: "u8", length: 1, bit: 0, width: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x1D, type: "u8", length: 1, bit: 7, width: 1 });
  }

  set isEgg(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x1D, type: "u8", length: 1, bit: 7, width: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x13, type: "u8", length: 1, bit: 0, width: 4 });
  }

  set strain(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x13, type: "u8", length: 1, bit: 0, width: 4 }, value);
  }

  get days(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x15, type: "i8", length: 1 });
  }

  set days(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x15, type: "i8", length: 1 }, value);
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
    this.moves = repeat(4, (index) => new PokemonMove(store, { space: this.#at.space, index, offset: 0x80 + index * 4 }));
    this.owner = new PokemonOwner(store, this.#at);
    this.metConditions = new PokemonMetConditions(store, this.#at);
    this.egg = new PokemonEgg(store, this.#at);
    this.pokerus = new PokemonPokerus(store, this.#at);
  }

  get pid(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x28, type: "u32be", length: 4 });
  }

  set pid(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x28, type: "u32be", length: 4 }, value);
  }

  get species(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x0, type: "u16be", length: 2 });
  }

  set species(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x0, type: "u16be", length: 2 }, value);
  }

  get nickname(): string {
    return this.#store.text({ space: this.#at.space, offset: 0x64, type: "text-gen3-gc", length: 22 });
  }

  set nickname(value: string) {
    this.#store.setText({ space: this.#at.space, offset: 0x64, type: "text-gen3-gc", length: 22 }, value);
  }

  get level(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x11, type: "u8", length: 1 });
  }

  set level(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x11, type: "u8", length: 1 }, value);
  }

  get experience(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x20, type: "u32be", length: 4 });
  }

  set experience(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x20, type: "u32be", length: 4 }, value);
  }

  get heldItem(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x2, type: "u16be", length: 2 });
  }

  set heldItem(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x2, type: "u16be", length: 2 }, value);
  }

  get friendship(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x6, type: "u16be", length: 2 });
  }

  set friendship(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x6, type: "u16be", length: 2 }, value);
  }

  get ball(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xF, type: "u8", length: 1 });
  }

  set ball(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xF, type: "u8", length: 1 }, value);
  }

  get language(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x37, type: "u8", length: 1 });
  }

  set language(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x37, type: "u8", length: 1 }, value);
  }

  get shadowId(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xBA, type: "u16be", length: 2 });
  }

  set shadowId(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xBA, type: "u16be", length: 2 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x90, type: "u16be", length: 2 });
  }

  set health(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x90, type: "u16be", length: 2 }, value);
  }

  get attack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x92, type: "u16be", length: 2 });
  }

  set attack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x92, type: "u16be", length: 2 }, value);
  }

  get defense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x94, type: "u16be", length: 2 });
  }

  set defense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x94, type: "u16be", length: 2 }, value);
  }

  get specialAttack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x96, type: "u16be", length: 2 });
  }

  set specialAttack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x96, type: "u16be", length: 2 }, value);
  }

  get specialDefense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x98, type: "u16be", length: 2 });
  }

  set specialDefense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x98, type: "u16be", length: 2 }, value);
  }

  get speed(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x9A, type: "u16be", length: 2 });
  }

  set speed(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x9A, type: "u16be", length: 2 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x4, type: "u16be", length: 2 });
  }

  set currentHp(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x4, type: "u16be", length: 2 }, value);
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
    return this.#store.text({ space: "slot", offset: 0xAB8 + this.#at.index * 5900, type: "text-gen3-gc", length: 20 });
  }

  set name(value: string) {
    this.#store.setText({ space: "slot", offset: 0xAB8 + this.#at.index * 5900, type: "text-gen3-gc", length: 20 }, value);
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
  readonly battleItems: readonly Item[];

  constructor(store: Store, _at: At) {
    this.items = repeat(30, (index) => new Item(store, { space: "slot", index, offset: 0x600 + index * 4 }));
    this.keyItems = repeat(43, (index) => new Item(store, { space: "slot", index, offset: 0x678 + index * 4 }));
    this.balls = repeat(16, (index) => new Item(store, { space: "slot", index, offset: 0x724 + index * 4 }));
    this.tmsHms = repeat(64, (index) => new Item(store, { space: "slot", index, offset: 0x764 + index * 4 }));
    this.berries = repeat(46, (index) => new Item(store, { space: "slot", index, offset: 0x864 + index * 4 }));
    this.medicine = repeat(3, (index) => new Item(store, { space: "slot", index, offset: 0x91C + index * 4 }));
    this.battleItems = repeat(60, (index) => new Item(store, { space: "slot", index, offset: 0x928 + index * 4 }));
  }
}

export class ShadowPokemon {
  readonly #store: Store;
  readonly #at: At;

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
  }

  get purified(): number {
    return this.#store.number({ space: this.#at.space, offset: this.#at.offset, type: "u8", length: 1, bit: 7, width: 1 });
  }

  set purified(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: this.#at.offset, type: "u8", length: 1, bit: 7, width: 1 }, value);
  }

  get snagged(): number {
    return this.#store.number({ space: this.#at.space, offset: this.#at.offset, type: "u8", length: 1, bit: 6, width: 1 });
  }

  set snagged(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: this.#at.offset, type: "u8", length: 1, bit: 6, width: 1 }, value);
  }

  get species(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xE332 + this.#at.index * 72, type: "u16be", length: 2 });
  }

  set species(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xE332 + this.#at.index * 72, type: "u16be", length: 2 }, value);
  }

  get pid(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xE334 + this.#at.index * 72, type: "u32be", length: 4 });
  }

  set pid(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xE334 + this.#at.index * 72, type: "u32be", length: 4 }, value);
  }

  get purification(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xE33C + this.#at.index * 72, type: "i32be", length: 4 });
  }

  set purification(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xE33C + this.#at.index * 72, type: "i32be", length: 4 }, value);
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
  readonly shadowPokemon: readonly ShadowPokemon[];

  constructor(file: Uint8Array) {
    const store = new Store(file, spaces, container);
    this.#store = store;
    this.#at = { space: "", index: 0, offset: 0 };
    this.trainer = new Trainer(store, this.#at);
    this.playTime = new PlayTime(store, this.#at);
    this.party = expand("party:{1..6}").map((space, index) => new PartyPokemon(store, { space, index, offset: 0 }));
    this.boxes = expand("box:{1..8}").map((space, index) => new Box(store, { space, index, offset: 0 }));
    this.bag = new Bag(store, this.#at);
    this.shadowPokemon = repeat(128, (index) => new ShadowPokemon(store, { space: "slot", index, offset: 0xE318 + index * 72 }));
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

  get encryptionKeys(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x8 + i * 2, type: "u16be", length: 2 }));
  }

  set encryptionKeys(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x8 + i * 2, type: "u16be", length: 2 }, value));
  }

  get bodyChecksum(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x10, type: "bytes", length: 16 });
  }

  set bodyChecksum(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x10, type: "bytes", length: 16 }, value);
  }

  get subBlockLengths(): readonly (number)[] {
    return repeat(16, (i) => this.#store.number({ space: this.#space, offset: 0x20 + i * 2, type: "u16be", length: 2 }));
  }

  set subBlockLengths(values: readonly (number)[]) {
    setEach(16, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x20 + i * 2, type: "u16be", length: 2 }, value));
  }

  get subBlockOffsetsLow(): readonly (number)[] {
    return repeat(16, (i) => this.#store.number({ space: this.#space, offset: 0x40 + i * 4, type: "u16be", length: 2 }));
  }

  set subBlockOffsetsLow(values: readonly (number)[]) {
    setEach(16, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x40 + i * 4, type: "u16be", length: 2 }, value));
  }

  get subBlockOffsetsHigh(): readonly (number)[] {
    return repeat(16, (i) => this.#store.number({ space: this.#space, offset: 0x42 + i * 4, type: "u16be", length: 2 }));
  }

  set subBlockOffsetsHigh(values: readonly (number)[]) {
    setEach(16, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x42 + i * 4, type: "u16be", length: 2 }, value));
  }

  get game(): number {
    return this.#store.number({ space: this.#space, offset: 0xA8, type: "u8", length: 1 });
  }

  set game(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA8, type: "u8", length: 1 }, value);
  }

  get currentRegion(): number {
    return this.#store.number({ space: this.#space, offset: 0xA9, type: "u8", length: 1 });
  }

  set currentRegion(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA9, type: "u8", length: 1 }, value);
  }

  get originalRegion(): number {
    return this.#store.number({ space: this.#space, offset: 0xAA, type: "u8", length: 1 });
  }

  set originalRegion(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xAA, type: "u8", length: 1 }, value);
  }

  get language(): number {
    return this.#store.number({ space: this.#space, offset: 0xAB, type: "u8", length: 1 });
  }

  set language(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xAB, type: "u8", length: 1 }, value);
  }

  get playTime(): number {
    return this.#store.number({ space: this.#space, offset: 0xD8, type: "f64be", length: 8 });
  }

  set playTime(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xD8, type: "f64be", length: 8 }, value);
  }

  get headerChecksum(): number {
    return this.#store.number({ space: this.#space, offset: 0xE0, type: "u32be", length: 4 });
  }

  set headerChecksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xE0, type: "u32be", length: 4 }, value);
  }

  get trainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x138, type: "text-gen3-gc", length: 20 });
  }

  set trainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x138, type: "text-gen3-gc", length: 20 }, value);
  }

  get secretId(): number {
    return this.#store.number({ space: this.#space, offset: 0x164, type: "u16be", length: 2 });
  }

  set secretId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x164, type: "u16be", length: 2 }, value);
  }

  get trainerId(): number {
    return this.#store.number({ space: this.#space, offset: 0x166, type: "u16be", length: 2 });
  }

  set trainerId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x166, type: "u16be", length: 2 }, value);
  }

  get partyPokemon(): readonly (Uint8Array)[] {
    return repeat(6, (i) => this.#store.raw({ space: this.#space, offset: 0x168 + i * 196, type: "bytes", length: 196 }));
  }

  set partyPokemon(values: readonly (Uint8Array)[]) {
    setEach(6, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0x168 + i * 196, type: "bytes", length: 196 }, value));
  }

  get itemsPocket(): readonly SlotItemsPocket[] {
    return repeat(30, (i) => new SlotItemsPocket(this.#store, { space: this.#space, offset: 0x600 + i * 4, type: "u32be", length: 4 }));
  }

  get keyItemsPocket(): readonly SlotKeyItemsPocket[] {
    return repeat(43, (i) => new SlotKeyItemsPocket(this.#store, { space: this.#space, offset: 0x678 + i * 4, type: "u32be", length: 4 }));
  }

  get pokeBallsPocket(): readonly SlotPokeBallsPocket[] {
    return repeat(16, (i) => new SlotPokeBallsPocket(this.#store, { space: this.#space, offset: 0x724 + i * 4, type: "u32be", length: 4 }));
  }

  get tmsAndHmsPocket(): readonly SlotTmsAndHmsPocket[] {
    return repeat(64, (i) => new SlotTmsAndHmsPocket(this.#store, { space: this.#space, offset: 0x764 + i * 4, type: "u32be", length: 4 }));
  }

  get berriesPocket(): readonly SlotBerriesPocket[] {
    return repeat(46, (i) => new SlotBerriesPocket(this.#store, { space: this.#space, offset: 0x864 + i * 4, type: "u32be", length: 4 }));
  }

  get colognesPocket(): readonly SlotColognesPocket[] {
    return repeat(3, (i) => new SlotColognesPocket(this.#store, { space: this.#space, offset: 0x91C + i * 4, type: "u32be", length: 4 }));
  }

  get battleCdsPocket(): readonly SlotBattleCdsPocket[] {
    return repeat(60, (i) => new SlotBattleCdsPocket(this.#store, { space: this.#space, offset: 0x928 + i * 4, type: "u32be", length: 4 }));
  }

  get trainerGender(): number {
    return this.#store.number({ space: this.#space, offset: 0xA18, type: "u8", length: 1 });
  }

  set trainerGender(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA18, type: "u8", length: 1 }, value);
  }

  get money(): number {
    return this.#store.number({ space: this.#space, offset: 0xA1C, type: "u32be", length: 4 });
  }

  set money(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA1C, type: "u32be", length: 4 }, value);
  }

  get pokecoupons(): number {
    return this.#store.number({ space: this.#space, offset: 0xA20, type: "u32be", length: 4 });
  }

  set pokecoupons(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA20, type: "u32be", length: 4 }, value);
  }

  get boxNames(): readonly (string)[] {
    return repeat(8, (i) => this.#store.text({ space: this.#space, offset: 0xAB8 + i * 5900, type: "text-gen3-gc", length: 20 }));
  }

  set boxNames(values: readonly (string)[]) {
    setEach(8, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0xAB8 + i * 5900, type: "text-gen3-gc", length: 20 }, value));
  }

  get boxPokemon(): readonly (Uint8Array)[] {
    return repeat(8, (i) => this.#store.raw({ space: this.#space, offset: 0xACC + i * 5900, type: "bytes", length: 5880 }));
  }

  set boxPokemon(values: readonly (Uint8Array)[]) {
    setEach(8, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0xACC + i * 5900, type: "bytes", length: 5880 }, value));
  }

  get daycareOccupied(): number {
    return this.#store.number({ space: this.#space, offset: 0xC758, type: "u8", length: 1 });
  }

  set daycareOccupied(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xC758, type: "u8", length: 1 }, value);
  }

  get daycareDepositLevel(): number {
    return this.#store.number({ space: this.#space, offset: 0xC759, type: "u8", length: 1 });
  }

  set daycareDepositLevel(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xC759, type: "u8", length: 1 }, value);
  }

  get daycareExperience(): number {
    return this.#store.number({ space: this.#space, offset: 0xC75C, type: "u32be", length: 4 });
  }

  set daycareExperience(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xC75C, type: "u32be", length: 4 }, value);
  }

  get daycarePokemon(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0xC760, type: "bytes", length: 196 });
  }

  set daycarePokemon(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0xC760, type: "bytes", length: 196 }, value);
  }

  get strategyMemoCount(): number {
    return this.#store.number({ space: this.#space, offset: 0xC828, type: "u16be", length: 2 });
  }

  set strategyMemoCount(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xC828, type: "u16be", length: 2 }, value);
  }

  get strategyMemoEntries(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0xC82C, type: "bytes", length: 6000 });
  }

  set strategyMemoEntries(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0xC82C, type: "bytes", length: 6000 }, value);
  }

  get shadowFlags(): readonly SlotShadowFlags[] {
    return repeat(128, (i) => new SlotShadowFlags(this.#store, { space: this.#space, offset: 0xE318 + i * 72, type: "u8", length: 1 }));
  }

  get shadowExperience(): readonly SlotShadowExperience[] {
    return repeat(128, (i) => new SlotShadowExperience(this.#store, { space: this.#space, offset: 0xE31C + i * 72, type: "u32be", length: 4 }));
  }

  get shadowSpecies(): readonly (number)[] {
    return repeat(128, (i) => this.#store.number({ space: this.#space, offset: 0xE332 + i * 72, type: "u16be", length: 2 }));
  }

  set shadowSpecies(values: readonly (number)[]) {
    setEach(128, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xE332 + i * 72, type: "u16be", length: 2 }, value));
  }

  get shadowPid(): readonly (number)[] {
    return repeat(128, (i) => this.#store.number({ space: this.#space, offset: 0xE334 + i * 72, type: "u32be", length: 4 }));
  }

  set shadowPid(values: readonly (number)[]) {
    setEach(128, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xE334 + i * 72, type: "u32be", length: 4 }, value));
  }

  get shadowPurification(): readonly (number)[] {
    return repeat(128, (i) => this.#store.number({ space: this.#space, offset: 0xE33C + i * 72, type: "i32be", length: 4 }));
  }

  set shadowPurification(values: readonly (number)[]) {
    setEach(128, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xE33C + i * 72, type: "i32be", length: 4 }, value));
  }

  get shadowIndex(): readonly (number)[] {
    return repeat(128, (i) => this.#store.number({ space: this.#space, offset: 0xE357 + i * 72, type: "u8", length: 1 }));
  }

  set shadowIndex(values: readonly (number)[]) {
    setEach(128, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xE357 + i * 72, type: "u8", length: 1 }, value));
  }

  get giftRibbons(): readonly (number)[] {
    return repeat(11, (i) => this.#store.number({ space: this.#space, offset: 0x10DD8 + i * 1, type: "u8", length: 1 }));
  }

  set giftRibbons(values: readonly (number)[]) {
    setEach(11, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x10DD8 + i * 1, type: "u8", length: 1 }, value));
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

export class SlotBattleCdsPocket {
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

export class SlotShadowFlags {
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

  get snagged(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 1 });
  }

  set snagged(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 1 }, value);
  }

  get purified(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 1 });
  }

  set purified(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 1 }, value);
  }
}

export class SlotShadowExperience {
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

  get experience(): number {
    return this.#store.number({ ...this.#read, bit: 12, width: 20 });
  }

  set experience(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 12, width: 20 }, value);
  }
}

export class Xk3 {
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

  get heldItem(): number {
    return this.#store.number({ space: this.#space, offset: 0x2, type: "u16be", length: 2 });
  }

  set heldItem(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2, type: "u16be", length: 2 }, value);
  }

  get currentHp(): number {
    return this.#store.number({ space: this.#space, offset: 0x4, type: "u16be", length: 2 });
  }

  set currentHp(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x4, type: "u16be", length: 2 }, value);
  }

  get friendship(): number {
    return this.#store.number({ space: this.#space, offset: 0x6, type: "u16be", length: 2 });
  }

  set friendship(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6, type: "u16be", length: 2 }, value);
  }

  get metLocation(): number {
    return this.#store.number({ space: this.#space, offset: 0x8, type: "u16be", length: 2 });
  }

  set metLocation(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x8, type: "u16be", length: 2 }, value);
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

  get level(): number {
    return this.#store.number({ space: this.#space, offset: 0x11, type: "u8", length: 1 });
  }

  set level(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x11, type: "u8", length: 1 }, value);
  }

  get sheen(): number {
    return this.#store.number({ space: this.#space, offset: 0x12, type: "u8", length: 1 });
  }

  set sheen(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x12, type: "u8", length: 1 }, value);
  }

  get pokerusStrain(): Xk3PokerusStrain {
    return new Xk3PokerusStrain(this.#store, { space: this.#space, offset: 0x13, type: "u8", length: 1 });
  }

  get markings(): number {
    return this.#store.number({ space: this.#space, offset: 0x14, type: "u8", length: 1 });
  }

  set markings(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x14, type: "u8", length: 1 }, value);
  }

  get pokerusDays(): number {
    return this.#store.number({ space: this.#space, offset: 0x15, type: "i8", length: 1 });
  }

  set pokerusDays(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x15, type: "i8", length: 1 }, value);
  }

  get flags(): Xk3Flags {
    return new Xk3Flags(this.#store, { space: this.#space, offset: 0x1D, type: "u8", length: 1 });
  }

  get experience(): number {
    return this.#store.number({ space: this.#space, offset: 0x20, type: "u32be", length: 4 });
  }

  set experience(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x20, type: "u32be", length: 4 }, value);
  }

  get originalTrainerId(): Xk3OriginalTrainerId {
    return new Xk3OriginalTrainerId(this.#store, { space: this.#space, offset: 0x24, type: "u32be", length: 4 });
  }

  get pid(): number {
    return this.#store.number({ space: this.#space, offset: 0x28, type: "u32be", length: 4 });
  }

  set pid(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x28, type: "u32be", length: 4 }, value);
  }

  get obedient(): number {
    return this.#store.number({ space: this.#space, offset: 0x30, type: "u8", length: 1 });
  }

  set obedient(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x30, type: "u8", length: 1 }, value);
  }

  get encounterInfo(): Xk3EncounterInfo {
    return new Xk3EncounterInfo(this.#store, { space: this.#space, offset: 0x33, type: "u8", length: 1 });
  }

  get originGame(): number {
    return this.#store.number({ space: this.#space, offset: 0x34, type: "u8", length: 1 });
  }

  set originGame(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x34, type: "u8", length: 1 }, value);
  }

  get currentRegion(): number {
    return this.#store.number({ space: this.#space, offset: 0x35, type: "u8", length: 1 });
  }

  set currentRegion(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x35, type: "u8", length: 1 }, value);
  }

  get originalRegion(): number {
    return this.#store.number({ space: this.#space, offset: 0x36, type: "u8", length: 1 });
  }

  set originalRegion(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x36, type: "u8", length: 1 }, value);
  }

  get language(): number {
    return this.#store.number({ space: this.#space, offset: 0x37, type: "u8", length: 1 });
  }

  set language(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x37, type: "u8", length: 1 }, value);
  }

  get originalTrainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x38, type: "text-gen3-gc", length: 22 });
  }

  set originalTrainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x38, type: "text-gen3-gc", length: 22 }, value);
  }

  get nicknameDisplay(): string {
    return this.#store.text({ space: this.#space, offset: 0x4E, type: "text-gen3-gc", length: 22 });
  }

  set nicknameDisplay(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x4E, type: "text-gen3-gc", length: 22 }, value);
  }

  get nickname(): string {
    return this.#store.text({ space: this.#space, offset: 0x64, type: "text-gen3-gc", length: 22 });
  }

  set nickname(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x64, type: "text-gen3-gc", length: 22 }, value);
  }

  get ribbons(): Xk3Ribbons {
    return new Xk3Ribbons(this.#store, { space: this.#space, offset: 0x7C, type: "u16be", length: 2 });
  }

  get moves(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x80 + i * 4, type: "u16be", length: 2 }));
  }

  set moves(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x80 + i * 4, type: "u16be", length: 2 }, value));
  }

  get pp(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x82 + i * 4, type: "u8", length: 1 }));
  }

  set pp(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x82 + i * 4, type: "u8", length: 1 }, value));
  }

  get ppUps(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x83 + i * 4, type: "u8", length: 1 }));
  }

  set ppUps(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x83 + i * 4, type: "u8", length: 1 }, value));
  }

  get stats(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x90 + i * 2, type: "u16be", length: 2 }));
  }

  set stats(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x90 + i * 2, type: "u16be", length: 2 }, value));
  }

  get evs(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x9C + i * 2, type: "u16be", length: 2 }));
  }

  set evs(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x9C + i * 2, type: "u16be", length: 2 }, value));
  }

  get ivs(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0xA8 + i * 1, type: "u8", length: 1 }));
  }

  set ivs(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xA8 + i * 1, type: "u8", length: 1 }, value));
  }

  get contestStats(): readonly (number)[] {
    return repeat(5, (i) => this.#store.number({ space: this.#space, offset: 0xAE + i * 1, type: "u8", length: 1 }));
  }

  set contestStats(values: readonly (number)[]) {
    setEach(5, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xAE + i * 1, type: "u8", length: 1 }, value));
  }

  get contestRibbons(): readonly (number)[] {
    return repeat(5, (i) => this.#store.number({ space: this.#space, offset: 0xB3 + i * 1, type: "u8", length: 1 }));
  }

  set contestRibbons(values: readonly (number)[]) {
    setEach(5, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xB3 + i * 1, type: "u8", length: 1 }, value));
  }

  get shadowId(): number {
    return this.#store.number({ space: this.#space, offset: 0xBA, type: "u16be", length: 2 });
  }

  set shadowId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xBA, type: "u16be", length: 2 }, value);
  }
}

export class Xk3PokerusStrain {
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

export class Xk3Flags {
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

  get captured(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 1 });
  }

  set captured(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 1 }, value);
  }

  get blockTrades(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 1 });
  }

  set blockTrades(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 1 }, value);
  }

  get invalid(): number {
    return this.#store.number({ ...this.#read, bit: 5, width: 1 });
  }

  set invalid(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 5, width: 1 }, value);
  }

  get ability(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 1 });
  }

  set ability(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 1 }, value);
  }

  get isEgg(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 1 });
  }

  set isEgg(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 1 }, value);
  }
}

export class Xk3OriginalTrainerId {
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

export class Xk3EncounterInfo {
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

export class Xk3Ribbons {
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

  get world(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 1 });
  }

  set world(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 1 }, value);
  }

  get earth(): number {
    return this.#store.number({ ...this.#read, bit: 5, width: 1 });
  }

  set earth(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 5, width: 1 }, value);
  }

  get national(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 1 });
  }

  set national(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 1 }, value);
  }

  get country(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 1 });
  }

  set country(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 1 }, value);
  }

  get nationalChampion(): number {
    return this.#store.number({ ...this.#read, bit: 8, width: 1 });
  }

  set nationalChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 8, width: 1 }, value);
  }

  get regionalChampion(): number {
    return this.#store.number({ ...this.#read, bit: 9, width: 1 });
  }

  set regionalChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 9, width: 1 }, value);
  }

  get battleChampion(): number {
    return this.#store.number({ ...this.#read, bit: 10, width: 1 });
  }

  set battleChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 10, width: 1 }, value);
  }

  get effort(): number {
    return this.#store.number({ ...this.#read, bit: 11, width: 1 });
  }

  set effort(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 11, width: 1 }, value);
  }

  get artist(): number {
    return this.#store.number({ ...this.#read, bit: 12, width: 1 });
  }

  set artist(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 12, width: 1 }, value);
  }

  get victory(): number {
    return this.#store.number({ ...this.#read, bit: 13, width: 1 });
  }

  set victory(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 13, width: 1 }, value);
  }

  get winning(): number {
    return this.#store.number({ ...this.#read, bit: 14, width: 1 });
  }

  set winning(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 14, width: 1 }, value);
  }

  get champion(): number {
    return this.#store.number({ ...this.#read, bit: 15, width: 1 });
  }

  set champion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 15, width: 1 }, value);
  }
}

const views: [string, new (store: Store, space: string) => unknown][] = [
  ["slot", Slot],
  ["party:{1..6}", Xk3],
  ["box:{1..8}:{1..30}", Xk3],
];

export const read = (file: Uint8Array) => new Save(file);
