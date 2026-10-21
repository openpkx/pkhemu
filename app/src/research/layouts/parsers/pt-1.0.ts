// Generated from known/pt-1.0.json by tools/parser/generate.ts. Run npm run parsers after changing either.
import { counted, expand, repeat, setEach, spaceView, Store, type At, type Counted, type Read, type SpaceDef } from "../tools/parser/runtime.ts";

export const target = {"schema":"1.0","format":"pt","version":"1.0"};

const spaces: SpaceDef[] = [
  {"name":"general","length":53036,"transform":"gen4-slots","args":{"start":"0x0","length":"0xCF2C"},"checksums":[{"step":"crc16-ccitt","start":0,"end":53016,"at":53034}]},
  {"name":"storage","length":74212,"transform":"gen4-slots","args":{"start":"0xCF2C","length":"0x121E4"},"checksums":[{"step":"crc16-ccitt","start":0,"end":74192,"at":74210}]},
  {"name":"party:{1..6}","length":236,"transform":"pk45-crypt","source":{"regions":[{"space":"general","start":0,"end":53036}],"offset":160,"stride":236},"checksums":[{"step":"sum16le","start":8,"end":136,"at":6}]},
  {"name":"box:{1..18}:{1..30}","length":136,"transform":"pk45-crypt","source":{"regions":[{"space":"storage","start":0,"end":74212}],"offset":4,"stride":136},"checksums":[{"step":"sum16le","start":8,"end":136,"at":6}]},
];

export type Spaces =
  { "general": General } &
  { "storage": Storage } &
  { [Name in `party:${1 | 2 | 3 | 4 | 5 | 6}`]: Pk4Party } &
  { [Name in `box:${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18}:${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30}`]: Pk4 };

export type SpaceName = keyof Spaces;

export class Trainer {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get name(): string {
    return this.#store.text({ space: "general", offset: 0x68, type: "text-gen4", length: 16 });
  }

  set name(value: string) {
    this.#store.setText({ space: "general", offset: 0x68, type: "text-gen4", length: 16 }, value);
  }

  get gender(): number {
    return this.#store.number({ space: "general", offset: 0x80, type: "u8", length: 1 });
  }

  set gender(value: number) {
    this.#store.setNumber({ space: "general", offset: 0x80, type: "u8", length: 1 }, value);
  }

  get tid(): number {
    return this.#store.number({ space: "general", offset: 0x78, type: "u16le", length: 2 });
  }

  set tid(value: number) {
    this.#store.setNumber({ space: "general", offset: 0x78, type: "u16le", length: 2 }, value);
  }

  get sid(): number {
    return this.#store.number({ space: "general", offset: 0x7A, type: "u16le", length: 2 });
  }

  set sid(value: number) {
    this.#store.setNumber({ space: "general", offset: 0x7A, type: "u16le", length: 2 }, value);
  }

  get money(): number {
    return this.#store.number({ space: "general", offset: 0x7C, type: "u32le", length: 4 });
  }

  set money(value: number) {
    this.#store.setNumber({ space: "general", offset: 0x7C, type: "u32le", length: 4 }, value);
  }

  get rivalName(): string {
    return this.#store.text({ space: "general", offset: 0x27E8, type: "text-gen4", length: 14 });
  }

  set rivalName(value: string) {
    this.#store.setText({ space: "general", offset: 0x27E8, type: "text-gen4", length: 14 }, value);
  }

  get coins(): number {
    return this.#store.number({ space: "general", offset: 0x88, type: "u16le", length: 2 });
  }

  set coins(value: number) {
    this.#store.setNumber({ space: "general", offset: 0x88, type: "u16le", length: 2 }, value);
  }

  get battlePoints(): number {
    return this.#store.number({ space: "general", offset: 0x7234, type: "u16le", length: 2 });
  }

  set battlePoints(value: number) {
    this.#store.setNumber({ space: "general", offset: 0x7234, type: "u16le", length: 2 }, value);
  }
}

export class PlayTime {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get hours(): number {
    return this.#store.number({ space: "general", offset: 0x8A, type: "u16le", length: 2 });
  }

  set hours(value: number) {
    this.#store.setNumber({ space: "general", offset: 0x8A, type: "u16le", length: 2 }, value);
  }

  get minutes(): number {
    return this.#store.number({ space: "general", offset: 0x8C, type: "u8", length: 1 });
  }

  set minutes(value: number) {
    this.#store.setNumber({ space: "general", offset: 0x8C, type: "u8", length: 1 }, value);
  }

  get seconds(): number {
    return this.#store.number({ space: "general", offset: 0x8D, type: "u8", length: 1 });
  }

  set seconds(value: number) {
    this.#store.setNumber({ space: "general", offset: 0x8D, type: "u8", length: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x18, type: "u8", length: 1 });
  }

  set health(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x18, type: "u8", length: 1 }, value);
  }

  get attack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x19, type: "u8", length: 1 });
  }

  set attack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x19, type: "u8", length: 1 }, value);
  }

  get defense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x1A, type: "u8", length: 1 });
  }

  set defense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x1A, type: "u8", length: 1 }, value);
  }

  get speed(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x1B, type: "u8", length: 1 });
  }

  set speed(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x1B, type: "u8", length: 1 }, value);
  }

  get specialAttack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x1C, type: "u8", length: 1 });
  }

  set specialAttack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x1C, type: "u8", length: 1 }, value);
  }

  get specialDefense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x1D, type: "u8", length: 1 });
  }

  set specialDefense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x1D, type: "u8", length: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x38, type: "u32le", length: 4, bit: 0, width: 5 });
  }

  set health(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x38, type: "u32le", length: 4, bit: 0, width: 5 }, value);
  }

  get attack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x38, type: "u32le", length: 4, bit: 5, width: 5 });
  }

  set attack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x38, type: "u32le", length: 4, bit: 5, width: 5 }, value);
  }

  get defense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x38, type: "u32le", length: 4, bit: 10, width: 5 });
  }

  set defense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x38, type: "u32le", length: 4, bit: 10, width: 5 }, value);
  }

  get speed(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x38, type: "u32le", length: 4, bit: 15, width: 5 });
  }

  set speed(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x38, type: "u32le", length: 4, bit: 15, width: 5 }, value);
  }

  get specialAttack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x38, type: "u32le", length: 4, bit: 20, width: 5 });
  }

  set specialAttack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x38, type: "u32le", length: 4, bit: 20, width: 5 }, value);
  }

  get specialDefense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x38, type: "u32le", length: 4, bit: 25, width: 5 });
  }

  set specialDefense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x38, type: "u32le", length: 4, bit: 25, width: 5 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x28 + this.#at.index * 2, type: "u16le", length: 2 });
  }

  set move(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x28 + this.#at.index * 2, type: "u16le", length: 2 }, value);
  }

  get pp(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x30 + this.#at.index * 1, type: "u8", length: 1 });
  }

  set pp(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x30 + this.#at.index * 1, type: "u8", length: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0xC, type: "u32le", length: 4, bit: 0, width: 16 });
  }

  set tid(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xC, type: "u32le", length: 4, bit: 0, width: 16 }, value);
  }

  get sid(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xC, type: "u32le", length: 4, bit: 16, width: 16 });
  }

  set sid(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xC, type: "u32le", length: 4, bit: 16, width: 16 }, value);
  }

  get name(): string {
    return this.#store.text({ space: this.#at.space, offset: 0x68, type: "text-gen4", length: 16 });
  }

  set name(value: string) {
    this.#store.setText({ space: this.#at.space, offset: 0x68, type: "text-gen4", length: 16 }, value);
  }

  get gender(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x84, type: "u8", length: 1, bit: 7, width: 1 });
  }

  set gender(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x84, type: "u8", length: 1, bit: 7, width: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x80, type: "u16le", length: 2 });
  }

  set location(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x80, type: "u16le", length: 2 }, value);
  }

  get level(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x84, type: "u8", length: 1, bit: 0, width: 7 });
  }

  set level(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x84, type: "u8", length: 1, bit: 0, width: 7 }, value);
  }

  get version(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x5F, type: "u8", length: 1 });
  }

  set version(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x5F, type: "u8", length: 1 }, value);
  }

  get fatefulEncounter(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x40, type: "u8", length: 1, bit: 0, width: 1 });
  }

  set fatefulEncounter(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x40, type: "u8", length: 1, bit: 0, width: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x38, type: "u32le", length: 4, bit: 30, width: 1 });
  }

  set isEgg(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x38, type: "u32le", length: 4, bit: 30, width: 1 }, value);
  }

  get hatchCounter(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x14, type: "u8", length: 1 });
  }

  set hatchCounter(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x14, type: "u8", length: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x82, type: "u8", length: 1, bit: 4, width: 4 });
  }

  set strain(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x82, type: "u8", length: 1, bit: 4, width: 4 }, value);
  }

  get days(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x82, type: "u8", length: 1, bit: 0, width: 4 });
  }

  set days(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x82, type: "u8", length: 1, bit: 0, width: 4 }, value);
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
    this.moves = repeat(4, (index) => new PokemonMove(store, { space: this.#at.space, index, offset: 0x28 + index * 2 }));
    this.owner = new PokemonOwner(store, this.#at);
    this.metConditions = new PokemonMetConditions(store, this.#at);
    this.egg = new PokemonEgg(store, this.#at);
    this.pokerus = new PokemonPokerus(store, this.#at);
  }

  get pid(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x0, type: "u32le", length: 4 });
  }

  set pid(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x0, type: "u32le", length: 4 }, value);
  }

  get species(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x8, type: "u16le", length: 2 });
  }

  set species(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x8, type: "u16le", length: 2 }, value);
  }

  get nickname(): string {
    return this.#store.text({ space: this.#at.space, offset: 0x48, type: "text-gen4", length: 22 });
  }

  set nickname(value: string) {
    this.#store.setText({ space: this.#at.space, offset: 0x48, type: "text-gen4", length: 22 }, value);
  }

  get experience(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x10, type: "u32le", length: 4 });
  }

  set experience(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x10, type: "u32le", length: 4 }, value);
  }

  get heldItem(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xA, type: "u16le", length: 2 });
  }

  set heldItem(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xA, type: "u16le", length: 2 }, value);
  }

  get friendship(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x14, type: "u8", length: 1 });
  }

  set friendship(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x14, type: "u8", length: 1 }, value);
  }

  get ball(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x83, type: "u8", length: 1 });
  }

  set ball(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x83, type: "u8", length: 1 }, value);
  }

  get language(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x17, type: "u8", length: 1 });
  }

  set language(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x17, type: "u8", length: 1 }, value);
  }

  get form(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x40, type: "u8", length: 1, bit: 3, width: 5 });
  }

  set form(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x40, type: "u8", length: 1, bit: 3, width: 5 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x90, type: "u16le", length: 2 });
  }

  set health(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x90, type: "u16le", length: 2 }, value);
  }

  get attack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x92, type: "u16le", length: 2 });
  }

  set attack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x92, type: "u16le", length: 2 }, value);
  }

  get defense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x94, type: "u16le", length: 2 });
  }

  set defense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x94, type: "u16le", length: 2 }, value);
  }

  get speed(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x96, type: "u16le", length: 2 });
  }

  set speed(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x96, type: "u16le", length: 2 }, value);
  }

  get specialAttack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x98, type: "u16le", length: 2 });
  }

  set specialAttack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x98, type: "u16le", length: 2 }, value);
  }

  get specialDefense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x9A, type: "u16le", length: 2 });
  }

  set specialDefense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x9A, type: "u16le", length: 2 }, value);
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

  get level(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x8C, type: "u8", length: 1 });
  }

  set level(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x8C, type: "u8", length: 1 }, value);
  }

  get currentHp(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x8E, type: "u16le", length: 2 });
  }

  set currentHp(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x8E, type: "u16le", length: 2 }, value);
  }

  get statusCondition(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x88, type: "u32le", length: 4 });
  }

  set statusCondition(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x88, type: "u32le", length: 4 }, value);
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
    return this.#store.text({ space: "storage", offset: 0x11EE4 + this.#at.index * 40, type: "text-gen4", length: 40 });
  }

  set name(value: string) {
    this.#store.setText({ space: "storage", offset: 0x11EE4 + this.#at.index * 40, type: "text-gen4", length: 40 }, value);
  }

  get wallpaper(): number {
    return this.#store.number({ space: "storage", offset: 0x121B4 + this.#at.index * 1, type: "u8", length: 1 });
  }

  set wallpaper(value: number) {
    this.#store.setNumber({ space: "storage", offset: 0x121B4 + this.#at.index * 1, type: "u8", length: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: this.#at.offset, type: "u32le", length: 4, bit: 0, width: 16 });
  }

  set item(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: this.#at.offset, type: "u32le", length: 4, bit: 0, width: 16 }, value);
  }

  get count(): number {
    return this.#store.number({ space: this.#at.space, offset: this.#at.offset, type: "u32le", length: 4, bit: 16, width: 16 });
  }

  set count(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: this.#at.offset, type: "u32le", length: 4, bit: 16, width: 16 }, value);
  }
}

export class Bag {
  readonly items: readonly Item[];
  readonly keyItems: readonly Item[];
  readonly tmsHms: readonly Item[];
  readonly mailItems: readonly Item[];
  readonly medicine: readonly Item[];
  readonly berries: readonly Item[];
  readonly balls: readonly Item[];
  readonly battleItems: readonly Item[];

  constructor(store: Store, _at: At) {
    this.items = repeat(165, (index) => new Item(store, { space: "general", index, offset: 0x630 + index * 4 }));
    this.keyItems = repeat(50, (index) => new Item(store, { space: "general", index, offset: 0x8C4 + index * 4 }));
    this.tmsHms = repeat(100, (index) => new Item(store, { space: "general", index, offset: 0x98C + index * 4 }));
    this.mailItems = repeat(12, (index) => new Item(store, { space: "general", index, offset: 0xB1C + index * 4 }));
    this.medicine = repeat(40, (index) => new Item(store, { space: "general", index, offset: 0xB4C + index * 4 }));
    this.berries = repeat(64, (index) => new Item(store, { space: "general", index, offset: 0xBEC + index * 4 }));
    this.balls = repeat(15, (index) => new Item(store, { space: "general", index, offset: 0xCEC + index * 4 }));
    this.battleItems = repeat(30, (index) => new Item(store, { space: "general", index, offset: 0xD28 + index * 4 }));
  }
}

export class Badges {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get badge1(): number {
    return this.#store.number({ space: "general", offset: 0x82, type: "u8", length: 1, bit: 0, width: 1 });
  }

  set badge1(value: number) {
    this.#store.setNumber({ space: "general", offset: 0x82, type: "u8", length: 1, bit: 0, width: 1 }, value);
  }

  get badge2(): number {
    return this.#store.number({ space: "general", offset: 0x82, type: "u8", length: 1, bit: 1, width: 1 });
  }

  set badge2(value: number) {
    this.#store.setNumber({ space: "general", offset: 0x82, type: "u8", length: 1, bit: 1, width: 1 }, value);
  }

  get badge3(): number {
    return this.#store.number({ space: "general", offset: 0x82, type: "u8", length: 1, bit: 2, width: 1 });
  }

  set badge3(value: number) {
    this.#store.setNumber({ space: "general", offset: 0x82, type: "u8", length: 1, bit: 2, width: 1 }, value);
  }

  get badge4(): number {
    return this.#store.number({ space: "general", offset: 0x82, type: "u8", length: 1, bit: 3, width: 1 });
  }

  set badge4(value: number) {
    this.#store.setNumber({ space: "general", offset: 0x82, type: "u8", length: 1, bit: 3, width: 1 }, value);
  }

  get badge5(): number {
    return this.#store.number({ space: "general", offset: 0x82, type: "u8", length: 1, bit: 4, width: 1 });
  }

  set badge5(value: number) {
    this.#store.setNumber({ space: "general", offset: 0x82, type: "u8", length: 1, bit: 4, width: 1 }, value);
  }

  get badge6(): number {
    return this.#store.number({ space: "general", offset: 0x82, type: "u8", length: 1, bit: 5, width: 1 });
  }

  set badge6(value: number) {
    this.#store.setNumber({ space: "general", offset: 0x82, type: "u8", length: 1, bit: 5, width: 1 }, value);
  }

  get badge7(): number {
    return this.#store.number({ space: "general", offset: 0x82, type: "u8", length: 1, bit: 6, width: 1 });
  }

  set badge7(value: number) {
    this.#store.setNumber({ space: "general", offset: 0x82, type: "u8", length: 1, bit: 6, width: 1 }, value);
  }

  get badge8(): number {
    return this.#store.number({ space: "general", offset: 0x82, type: "u8", length: 1, bit: 7, width: 1 });
  }

  set badge8(value: number) {
    this.#store.setNumber({ space: "general", offset: 0x82, type: "u8", length: 1, bit: 7, width: 1 }, value);
  }
}

export class Pokedex {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get owned(): readonly boolean[] {
    return this.#store.flags({ space: "general", offset: 0x132C, type: "flags", length: 64 });
  }

  set owned(value: readonly boolean[]) {
    this.#store.setFlags({ space: "general", offset: 0x132C, type: "flags", length: 64 }, value);
  }

  get seen(): readonly boolean[] {
    return this.#store.flags({ space: "general", offset: 0x136C, type: "flags", length: 64 });
  }

  set seen(value: readonly boolean[]) {
    this.#store.setFlags({ space: "general", offset: 0x136C, type: "flags", length: 64 }, value);
  }
}

export class EventsEventWork {
  readonly #store: Store;
  readonly #at: At;

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
  }

  get value(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xDAC + this.#at.index * 2, type: "u16le", length: 2 });
  }

  set value(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xDAC + this.#at.index * 2, type: "u16le", length: 2 }, value);
  }
}

export class Events {
  readonly #store: Store;
  readonly work: readonly EventsEventWork[];

  constructor(store: Store, _at: At) {
    this.#store = store;
    this.work = repeat(288, (index) => new EventsEventWork(store, { space: "general", index, offset: 0xDAC + index * 2 }));
  }

  get flags(): readonly boolean[] {
    return this.#store.flags({ space: "general", offset: 0xFEC, type: "flags", length: 364 });
  }

  set flags(value: readonly boolean[]) {
    this.#store.setFlags({ space: "general", offset: 0xFEC, type: "flags", length: 364 }, value);
  }
}

export class Save {
  readonly #store: Store;
  readonly #at: At;
  readonly trainer: Trainer;
  readonly playTime: PlayTime;
  readonly party: Counted<PartyPokemon>;
  readonly boxes: readonly Box[];
  readonly bag: Bag;
  readonly badges: Badges;
  readonly pokedex: Pokedex;
  readonly events: Events;

  constructor(file: Uint8Array) {
    const store = new Store(file, spaces);
    this.#store = store;
    this.#at = { space: "", index: 0, offset: 0 };
    this.trainer = new Trainer(store, this.#at);
    this.playTime = new PlayTime(store, this.#at);
    this.party = counted(expand("party:{1..6}").map((space, index) => new PartyPokemon(store, { space, index, offset: 0 })), store, { space: "general", offset: 0x9C, type: "u8", length: 1 });
    this.boxes = expand("box:{1..18}").map((space, index) => new Box(store, { space, index, offset: 0 }));
    this.bag = new Bag(store, this.#at);
    this.badges = new Badges(store, this.#at);
    this.pokedex = new Pokedex(store, this.#at);
    this.events = new Events(store, this.#at);
  }

  space<Name extends SpaceName>(name: Name): Spaces[Name] {
    return spaceView(this.#store, name, views) as Spaces[Name];
  }

  write(): Uint8Array {
    return this.#store.write();
  }
}

export class General {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get adventureStarted(): number {
    return this.#store.number({ space: this.#space, offset: 0x34, type: "u32le", length: 4 });
  }

  set adventureStarted(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x34, type: "u32le", length: 4 }, value);
  }

  get hallOfFameEntered(): number {
    return this.#store.number({ space: this.#space, offset: 0x3C, type: "u32le", length: 4 });
  }

  set hallOfFameEntered(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x3C, type: "u32le", length: 4 }, value);
  }

  get mysteryGiftFlags(): GeneralMysteryGiftFlags {
    return new GeneralMysteryGiftFlags(this.#store, { space: this.#space, offset: 0x48, type: "u8", length: 1 });
  }

  get trainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x68, type: "text-gen4", length: 16 });
  }

  set trainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x68, type: "text-gen4", length: 16 }, value);
  }

  get trainerId(): number {
    return this.#store.number({ space: this.#space, offset: 0x78, type: "u16le", length: 2 });
  }

  set trainerId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x78, type: "u16le", length: 2 }, value);
  }

  get secretId(): number {
    return this.#store.number({ space: this.#space, offset: 0x7A, type: "u16le", length: 2 });
  }

  set secretId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x7A, type: "u16le", length: 2 }, value);
  }

  get money(): number {
    return this.#store.number({ space: this.#space, offset: 0x7C, type: "u32le", length: 4 });
  }

  set money(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x7C, type: "u32le", length: 4 }, value);
  }

  get trainerGender(): number {
    return this.#store.number({ space: this.#space, offset: 0x80, type: "u8", length: 1 });
  }

  set trainerGender(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x80, type: "u8", length: 1 }, value);
  }

  get language(): number {
    return this.#store.number({ space: this.#space, offset: 0x81, type: "u8", length: 1 });
  }

  set language(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x81, type: "u8", length: 1 }, value);
  }

  get badges(): GeneralBadges {
    return new GeneralBadges(this.#store, { space: this.#space, offset: 0x82, type: "u8", length: 1 });
  }

  get trainerSprite(): number {
    return this.#store.number({ space: this.#space, offset: 0x83, type: "u8", length: 1 });
  }

  set trainerSprite(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x83, type: "u8", length: 1 }, value);
  }

  get romCode(): number {
    return this.#store.number({ space: this.#space, offset: 0x84, type: "u8", length: 1 });
  }

  set romCode(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x84, type: "u8", length: 1 }, value);
  }

  get progressFlags(): GeneralProgressFlags {
    return new GeneralProgressFlags(this.#store, { space: this.#space, offset: 0x85, type: "u8", length: 1 });
  }

  get coins(): number {
    return this.#store.number({ space: this.#space, offset: 0x88, type: "u16le", length: 2 });
  }

  set coins(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x88, type: "u16le", length: 2 }, value);
  }

  get playTimeHours(): number {
    return this.#store.number({ space: this.#space, offset: 0x8A, type: "u16le", length: 2 });
  }

  set playTimeHours(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x8A, type: "u16le", length: 2 }, value);
  }

  get playTimeMinutes(): number {
    return this.#store.number({ space: this.#space, offset: 0x8C, type: "u8", length: 1 });
  }

  set playTimeMinutes(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x8C, type: "u8", length: 1 }, value);
  }

  get playTimeSeconds(): number {
    return this.#store.number({ space: this.#space, offset: 0x8D, type: "u8", length: 1 });
  }

  set playTimeSeconds(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x8D, type: "u8", length: 1 }, value);
  }

  get partyCount(): number {
    return this.#store.number({ space: this.#space, offset: 0x9C, type: "u8", length: 1 });
  }

  set partyCount(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x9C, type: "u8", length: 1 }, value);
  }

  get partyPokemon(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0xA0, type: "bytes", length: 1416 });
  }

  set partyPokemon(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0xA0, type: "bytes", length: 1416 }, value);
  }

  get itemsPocket(): readonly GeneralItemsPocket[] {
    return repeat(165, (i) => new GeneralItemsPocket(this.#store, { space: this.#space, offset: 0x630 + i * 4, type: "u32le", length: 4 }));
  }

  get keyItemsPocket(): readonly GeneralKeyItemsPocket[] {
    return repeat(50, (i) => new GeneralKeyItemsPocket(this.#store, { space: this.#space, offset: 0x8C4 + i * 4, type: "u32le", length: 4 }));
  }

  get tmsAndHmsPocket(): readonly GeneralTmsAndHmsPocket[] {
    return repeat(100, (i) => new GeneralTmsAndHmsPocket(this.#store, { space: this.#space, offset: 0x98C + i * 4, type: "u32le", length: 4 }));
  }

  get mailPocket(): readonly GeneralMailPocket[] {
    return repeat(12, (i) => new GeneralMailPocket(this.#store, { space: this.#space, offset: 0xB1C + i * 4, type: "u32le", length: 4 }));
  }

  get medicinePocket(): readonly GeneralMedicinePocket[] {
    return repeat(40, (i) => new GeneralMedicinePocket(this.#store, { space: this.#space, offset: 0xB4C + i * 4, type: "u32le", length: 4 }));
  }

  get berriesPocket(): readonly GeneralBerriesPocket[] {
    return repeat(64, (i) => new GeneralBerriesPocket(this.#store, { space: this.#space, offset: 0xBEC + i * 4, type: "u32le", length: 4 }));
  }

  get pokeBallsPocket(): readonly GeneralPokeBallsPocket[] {
    return repeat(15, (i) => new GeneralPokeBallsPocket(this.#store, { space: this.#space, offset: 0xCEC + i * 4, type: "u32le", length: 4 }));
  }

  get battleItemsPocket(): readonly GeneralBattleItemsPocket[] {
    return repeat(30, (i) => new GeneralBattleItemsPocket(this.#store, { space: this.#space, offset: 0xD28 + i * 4, type: "u32le", length: 4 }));
  }

  get eventWork(): readonly (number)[] {
    return repeat(288, (i) => this.#store.number({ space: this.#space, offset: 0xDAC + i * 2, type: "u16le", length: 2 }));
  }

  set eventWork(values: readonly (number)[]) {
    setEach(288, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xDAC + i * 2, type: "u16le", length: 2 }, value));
  }

  get eventFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0xFEC, type: "flags", length: 364 });
  }

  set eventFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0xFEC, type: "flags", length: 364 }, value);
  }

  get poketchFlags(): GeneralPoketchFlags {
    return new GeneralPoketchFlags(this.#store, { space: this.#space, offset: 0x1160, type: "u8", length: 1 });
  }

  get poketchAppsUnlockedCount(): number {
    return this.#store.number({ space: this.#space, offset: 0x1161, type: "u8", length: 1 });
  }

  set poketchAppsUnlockedCount(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1161, type: "u8", length: 1 }, value);
  }

  get poketchCurrentApp(): number {
    return this.#store.number({ space: this.#space, offset: 0x1162, type: "i8", length: 1 });
  }

  set poketchCurrentApp(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1162, type: "i8", length: 1 }, value);
  }

  get poketchAppsUnlocked(): readonly (number)[] {
    return repeat(25, (i) => this.#store.number({ space: this.#space, offset: 0x1163 + i * 1, type: "u8", length: 1 }));
  }

  set poketchAppsUnlocked(values: readonly (number)[]) {
    setEach(25, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x1163 + i * 1, type: "u8", length: 1 }, value));
  }

  get poketchStepCounter(): number {
    return this.#store.number({ space: this.#space, offset: 0x1184, type: "u32le", length: 4 });
  }

  set poketchStepCounter(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1184, type: "u32le", length: 4 }, value);
  }

  get poketchDotArtist(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x118A, type: "bytes", length: 120 });
  }

  set poketchDotArtist(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x118A, type: "bytes", length: 120 }, value);
  }

  get currentMap(): number {
    return this.#store.number({ space: this.#space, offset: 0x1280, type: "u16le", length: 2 });
  }

  set currentMap(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1280, type: "u16le", length: 2 }, value);
  }

  get playerXPosition(): number {
    return this.#store.number({ space: this.#space, offset: 0x1288, type: "u16le", length: 2 });
  }

  set playerXPosition(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1288, type: "u16le", length: 2 }, value);
  }

  get playerYPosition(): number {
    return this.#store.number({ space: this.#space, offset: 0x128C, type: "u16le", length: 2 });
  }

  set playerYPosition(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x128C, type: "u16le", length: 2 }, value);
  }

  get pokedexMagic(): number {
    return this.#store.number({ space: this.#space, offset: 0x1328, type: "u32le", length: 4 });
  }

  set pokedexMagic(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1328, type: "u32le", length: 4 }, value);
  }

  get pokedexOwnedFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x132C, type: "flags", length: 64 });
  }

  set pokedexOwnedFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x132C, type: "flags", length: 64 }, value);
  }

  get pokedexSeenFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x136C, type: "flags", length: 64 });
  }

  set pokedexSeenFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x136C, type: "flags", length: 64 }, value);
  }

  get pokedexFirstGenderFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x13AC, type: "flags", length: 64 });
  }

  set pokedexFirstGenderFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x13AC, type: "flags", length: 64 }, value);
  }

  get pokedexSecondGenderFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x13EC, type: "flags", length: 64 });
  }

  set pokedexSecondGenderFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x13EC, type: "flags", length: 64 }, value);
  }

  get pokedexSpindaPid(): number {
    return this.#store.number({ space: this.#space, offset: 0x142C, type: "u32le", length: 4 });
  }

  set pokedexSpindaPid(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x142C, type: "u32le", length: 4 }, value);
  }

  get daycarePokemon(): readonly (Uint8Array)[] {
    return repeat(2, (i) => this.#store.raw({ space: this.#space, offset: 0x1654 + i * 236, type: "bytes", length: 136 }));
  }

  set daycarePokemon(values: readonly (Uint8Array)[]) {
    setEach(2, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0x1654 + i * 236, type: "bytes", length: 136 }, value));
  }

  get daycareExperienceGained(): readonly (number)[] {
    return repeat(2, (i) => this.#store.number({ space: this.#space, offset: 0x173C + i * 236, type: "u32le", length: 4 }));
  }

  set daycareExperienceGained(values: readonly (number)[]) {
    setEach(2, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x173C + i * 236, type: "u32le", length: 4 }, value));
  }

  get daycareSeed(): number {
    return this.#store.number({ space: this.#space, offset: 0x182C, type: "u32le", length: 4 });
  }

  set daycareSeed(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x182C, type: "u32le", length: 4 }, value);
  }

  get daycareStepCounter(): number {
    return this.#store.number({ space: this.#space, offset: 0x1830, type: "u8", length: 1 });
  }

  set daycareStepCounter(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1830, type: "u8", length: 1 }, value);
  }

  get rivalName(): string {
    return this.#store.text({ space: this.#space, offset: 0x27E8, type: "text-gen4", length: 14 });
  }

  set rivalName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x27E8, type: "text-gen4", length: 14 }, value);
  }

  get playerXPositionCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x287E, type: "u16le", length: 2 });
  }

  set playerXPositionCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x287E, type: "u16le", length: 2 }, value);
  }

  get playerYPositionCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x2882, type: "u16le", length: 2 });
  }

  set playerYPositionCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2882, type: "u16le", length: 2 }, value);
  }

  get playerZPosition(): number {
    return this.#store.number({ space: this.#space, offset: 0x2886, type: "u16le", length: 2 });
  }

  set playerZPosition(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2886, type: "u16le", length: 2 }, value);
  }

  get undergroundPeopleMet(): number {
    return this.#store.number({ space: this.#space, offset: 0x3CB4, type: "u32le", length: 4 });
  }

  set undergroundPeopleMet(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x3CB4, type: "u32le", length: 4 }, value);
  }

  get undergroundGiftsGiven(): number {
    return this.#store.number({ space: this.#space, offset: 0x3CB8, type: "u32le", length: 4 });
  }

  set undergroundGiftsGiven(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x3CB8, type: "u32le", length: 4 }, value);
  }

  get undergroundFlagsTaken(): number {
    return this.#store.number({ space: this.#space, offset: 0x3CBC, type: "u32le", length: 4 });
  }

  set undergroundFlagsTaken(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x3CBC, type: "u32le", length: 4 }, value);
  }

  get undergroundSpheresDug(): number {
    return this.#store.number({ space: this.#space, offset: 0x3CC0, type: "u32le", length: 4 });
  }

  set undergroundSpheresDug(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x3CC0, type: "u32le", length: 4 }, value);
  }

  get undergroundFossilsDug(): number {
    return this.#store.number({ space: this.#space, offset: 0x3CC4, type: "u32le", length: 4 });
  }

  set undergroundFossilsDug(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x3CC4, type: "u32le", length: 4 }, value);
  }

  get undergroundPlayersTrapped(): number {
    return this.#store.number({ space: this.#space, offset: 0x3CCC, type: "u32le", length: 4 });
  }

  set undergroundPlayersTrapped(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x3CCC, type: "u32le", length: 4 }, value);
  }

  get undergroundTimesTrapped(): number {
    return this.#store.number({ space: this.#space, offset: 0x3CD0, type: "u32le", length: 4 });
  }

  set undergroundTimesTrapped(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x3CD0, type: "u32le", length: 4 }, value);
  }

  get undergroundOthersHelped(): number {
    return this.#store.number({ space: this.#space, offset: 0x3CD4, type: "u32le", length: 4 });
  }

  set undergroundOthersHelped(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x3CD4, type: "u32le", length: 4 }, value);
  }

  get undergroundGiftsReceived(): number {
    return this.#store.number({ space: this.#space, offset: 0x3CD8, type: "u32le", length: 4 });
  }

  set undergroundGiftsReceived(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x3CD8, type: "u32le", length: 4 }, value);
  }

  get undergroundFlagsLost(): number {
    return this.#store.number({ space: this.#space, offset: 0x3CDC, type: "u32le", length: 4 });
  }

  set undergroundFlagsLost(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x3CDC, type: "u32le", length: 4 }, value);
  }

  get undergroundFlagsRecovered(): number {
    return this.#store.number({ space: this.#space, offset: 0x3CE0, type: "u32le", length: 4 });
  }

  set undergroundFlagsRecovered(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x3CE0, type: "u32le", length: 4 }, value);
  }

  get undergroundBaseMoved(): number {
    return this.#store.number({ space: this.#space, offset: 0x3CE4, type: "u32le", length: 4 });
  }

  set undergroundBaseMoved(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x3CE4, type: "u32le", length: 4 }, value);
  }

  get undergroundFlagsRegistered(): number {
    return this.#store.number({ space: this.#space, offset: 0x3CE8, type: "u32le", length: 4 });
  }

  set undergroundFlagsRegistered(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x3CE8, type: "u32le", length: 4 }, value);
  }

  get undergroundTraps(): readonly (number)[] {
    return repeat(40, (i) => this.#store.number({ space: this.#space, offset: 0x4538 + i * 1, type: "u8", length: 1 }));
  }

  set undergroundTraps(values: readonly (number)[]) {
    setEach(40, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x4538 + i * 1, type: "u8", length: 1 }, value));
  }

  get undergroundGoods(): readonly (number)[] {
    return repeat(40, (i) => this.#store.number({ space: this.#space, offset: 0x4560 + i * 1, type: "u8", length: 1 }));
  }

  set undergroundGoods(values: readonly (number)[]) {
    setEach(40, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x4560 + i * 1, type: "u8", length: 1 }, value));
  }

  get undergroundTreasures(): readonly (number)[] {
    return repeat(40, (i) => this.#store.number({ space: this.#space, offset: 0x4588 + i * 1, type: "u8", length: 1 }));
  }

  set undergroundTreasures(values: readonly (number)[]) {
    setEach(40, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x4588 + i * 1, type: "u8", length: 1 }, value));
  }

  get undergroundSphereTypes(): readonly (number)[] {
    return repeat(40, (i) => this.#store.number({ space: this.#space, offset: 0x45B0 + i * 1, type: "u8", length: 1 }));
  }

  set undergroundSphereTypes(values: readonly (number)[]) {
    setEach(40, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x45B0 + i * 1, type: "u8", length: 1 }, value));
  }

  get undergroundSphereSizes(): readonly (number)[] {
    return repeat(40, (i) => this.#store.number({ space: this.#space, offset: 0x45D8 + i * 1, type: "u8", length: 1 }));
  }

  set undergroundSphereSizes(values: readonly (number)[]) {
    setEach(40, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x45D8 + i * 1, type: "u8", length: 1 }, value));
  }

  get accessoryCounts(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x4E38, type: "bytes", length: 32 });
  }

  set accessoryCounts(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x4E38, type: "bytes", length: 32 }, value);
  }

  get accessoriesOwned(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x4E58, type: "flags", length: 8 });
  }

  set accessoriesOwned(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x4E58, type: "flags", length: 8 }, value);
  }

  get backdropPositions(): readonly (number)[] {
    return repeat(18, (i) => this.#store.number({ space: this.#space, offset: 0x4E60 + i * 1, type: "u8", length: 1 }));
  }

  set backdropPositions(values: readonly (number)[]) {
    setEach(18, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x4E60 + i * 1, type: "u8", length: 1 }, value));
  }

  get poffins(): readonly (Uint8Array)[] {
    return repeat(100, (i) => this.#store.raw({ space: this.#space, offset: 0x52E8 + i * 8, type: "bytes", length: 8 }));
  }

  set poffins(values: readonly (Uint8Array)[]) {
    setEach(100, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0x52E8 + i * 8, type: "bytes", length: 8 }, value));
  }

  get groups(): readonly (Uint8Array)[] {
    return repeat(6, (i) => this.#store.raw({ space: this.#space, offset: 0x5610 + i * 44, type: "bytes", length: 44 }));
  }

  set groups(values: readonly (Uint8Array)[]) {
    setEach(6, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0x5610 + i * 44, type: "bytes", length: 44 }, value));
  }

  get records(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x61B0, type: "bytes", length: 444 });
  }

  set records(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x61B0, type: "bytes", length: 444 }, value);
  }

  get seals(): readonly (number)[] {
    return repeat(80, (i) => this.#store.number({ space: this.#space, offset: 0x6494 + i * 1, type: "u8", length: 1 }));
  }

  set seals(values: readonly (number)[]) {
    setEach(80, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x6494 + i * 1, type: "u8", length: 1 }, value));
  }

  get chatotChatter(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x64EC, type: "bytes", length: 1004 });
  }

  set chatotChatter(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x64EC, type: "bytes", length: 1004 }, value);
  }

  get battlePoints(): number {
    return this.#store.number({ space: this.#space, offset: 0x7234, type: "u16le", length: 2 });
  }

  set battlePoints(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x7234, type: "u16le", length: 2 }, value);
  }

  get battleTowerSeed(): number {
    return this.#store.number({ space: this.#space, offset: 0x7238, type: "u32le", length: 4 });
  }

  set battleTowerSeed(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x7238, type: "u32le", length: 4 }, value);
  }

  get giftRibbons(): readonly (number)[] {
    return repeat(14, (i) => this.#store.number({ space: this.#space, offset: 0x7F10 + i * 1, type: "u8", length: 1 }));
  }

  set giftRibbons(values: readonly (number)[]) {
    setEach(14, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x7F10 + i * 1, type: "u8", length: 1 }, value));
  }

  get safariSeed(): number {
    return this.#store.number({ space: this.#space, offset: 0x7F24, type: "u32le", length: 4 });
  }

  set safariSeed(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x7F24, type: "u32le", length: 4 }, value);
  }

  get swarmSeed(): number {
    return this.#store.number({ space: this.#space, offset: 0x7F28, type: "u32le", length: 4 });
  }

  set swarmSeed(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x7F28, type: "u32le", length: 4 }, value);
  }

  get honeyTrees(): readonly (Uint8Array)[] {
    return repeat(22, (i) => this.#store.raw({ space: this.#space, offset: 0x7F38 + i * 8, type: "bytes", length: 8 }));
  }

  set honeyTrees(values: readonly (Uint8Array)[]) {
    setEach(22, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0x7F38 + i * 8, type: "bytes", length: 8 }, value));
  }

  get roamerLocation(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x7FF4 + i * 20, type: "i32le", length: 4 }));
  }

  set roamerLocation(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x7FF4 + i * 20, type: "i32le", length: 4 }, value));
  }

  get roamerIvs(): readonly GeneralRoamerIvs[] {
    return repeat(6, (i) => new GeneralRoamerIvs(this.#store, { space: this.#space, offset: 0x7FF8 + i * 20, type: "u32le", length: 4 }));
  }

  get roamerPid(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x7FFC + i * 20, type: "u32le", length: 4 }));
  }

  set roamerPid(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x7FFC + i * 20, type: "u32le", length: 4 }, value));
  }

  get roamerSpecies(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x8000 + i * 20, type: "u16le", length: 2 }));
  }

  set roamerSpecies(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x8000 + i * 20, type: "u16le", length: 2 }, value));
  }

  get roamerCurrentHp(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x8002 + i * 20, type: "u16le", length: 2 }));
  }

  set roamerCurrentHp(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x8002 + i * 20, type: "u16le", length: 2 }, value));
  }

  get roamerLevel(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x8004 + i * 20, type: "u8", length: 1 }));
  }

  set roamerLevel(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x8004 + i * 20, type: "u8", length: 1 }, value));
  }

  get roamerStatus(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x8005 + i * 20, type: "u8", length: 1 }));
  }

  set roamerStatus(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x8005 + i * 20, type: "u8", length: 1 }, value));
  }

  get roamerActive(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x8006 + i * 20, type: "u8", length: 1 }));
  }

  set roamerActive(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x8006 + i * 20, type: "u8", length: 1 }, value));
  }

  get geonetGlobalFlag(): number {
    return this.#store.number({ space: this.#space, offset: 0xA4C4, type: "u8", length: 1 });
  }

  set geonetGlobalFlag(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA4C4, type: "u8", length: 1 }, value);
  }

  get geonetCountry(): number {
    return this.#store.number({ space: this.#space, offset: 0xA4C5, type: "u8", length: 1 });
  }

  set geonetCountry(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA4C5, type: "u8", length: 1 }, value);
  }

  get geonetRegion(): number {
    return this.#store.number({ space: this.#space, offset: 0xA4C6, type: "u8", length: 1 });
  }

  set geonetRegion(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA4C6, type: "u8", length: 1 }, value);
  }

  get mysteryGiftReceivedFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0xB4C0, type: "flags", length: 256 });
  }

  set mysteryGiftReceivedFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0xB4C0, type: "flags", length: 256 }, value);
  }

  get mysteryGifts(): readonly (Uint8Array)[] {
    return repeat(8, (i) => this.#store.raw({ space: this.#space, offset: 0xB5C0 + i * 260, type: "bytes", length: 260 }));
  }

  set mysteryGifts(values: readonly (Uint8Array)[]) {
    setEach(8, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0xB5C0 + i * 260, type: "bytes", length: 260 }, value));
  }

  get wonderCards(): readonly (Uint8Array)[] {
    return repeat(3, (i) => this.#store.raw({ space: this.#space, offset: 0xBDE0 + i * 856, type: "bytes", length: 856 }));
  }

  set wonderCards(values: readonly (Uint8Array)[]) {
    setEach(3, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0xBDE0 + i * 856, type: "bytes", length: 856 }, value));
  }

  get majorSaveCounter(): number {
    return this.#store.number({ space: this.#space, offset: 0xCF18, type: "u32le", length: 4 });
  }

  set majorSaveCounter(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xCF18, type: "u32le", length: 4 }, value);
  }

  get minorSaveCounter(): number {
    return this.#store.number({ space: this.#space, offset: 0xCF1C, type: "u32le", length: 4 });
  }

  set minorSaveCounter(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xCF1C, type: "u32le", length: 4 }, value);
  }

  get blockSize(): number {
    return this.#store.number({ space: this.#space, offset: 0xCF20, type: "u32le", length: 4 });
  }

  set blockSize(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xCF20, type: "u32le", length: 4 }, value);
  }

  get magic(): number {
    return this.#store.number({ space: this.#space, offset: 0xCF24, type: "u32le", length: 4 });
  }

  set magic(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xCF24, type: "u32le", length: 4 }, value);
  }

  get checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0xCF2A, type: "u16le", length: 2 });
  }

  set checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xCF2A, type: "u16le", length: 2 }, value);
  }
}

export class GeneralMysteryGiftFlags {
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

  get mysteryGiftUnlocked(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set mysteryGiftUnlocked(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }
}

export class GeneralBadges {
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

  get badge1(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set badge1(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get badge2(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set badge2(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }

  get badge3(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 1 });
  }

  set badge3(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 1 }, value);
  }

  get badge4(): number {
    return this.#store.number({ ...this.#read, bit: 3, width: 1 });
  }

  set badge4(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 3, width: 1 }, value);
  }

  get badge5(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 1 });
  }

  set badge5(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 1 }, value);
  }

  get badge6(): number {
    return this.#store.number({ ...this.#read, bit: 5, width: 1 });
  }

  set badge6(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 5, width: 1 }, value);
  }

  get badge7(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 1 });
  }

  set badge7(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 1 }, value);
  }

  get badge8(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 1 });
  }

  set badge8(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 1 }, value);
  }
}

export class GeneralProgressFlags {
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

  get gameClear(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set gameClear(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get nationalPokedex(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set nationalPokedex(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }
}

export class GeneralItemsPocket {
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
    return this.#store.number({ ...this.#read, bit: 0, width: 16 });
  }

  set item(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 16 }, value);
  }

  get quantity(): number {
    return this.#store.number({ ...this.#read, bit: 16, width: 16 });
  }

  set quantity(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 16, width: 16 }, value);
  }
}

export class GeneralKeyItemsPocket {
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
    return this.#store.number({ ...this.#read, bit: 0, width: 16 });
  }

  set item(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 16 }, value);
  }

  get quantity(): number {
    return this.#store.number({ ...this.#read, bit: 16, width: 16 });
  }

  set quantity(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 16, width: 16 }, value);
  }
}

export class GeneralTmsAndHmsPocket {
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
    return this.#store.number({ ...this.#read, bit: 0, width: 16 });
  }

  set item(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 16 }, value);
  }

  get quantity(): number {
    return this.#store.number({ ...this.#read, bit: 16, width: 16 });
  }

  set quantity(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 16, width: 16 }, value);
  }
}

export class GeneralMailPocket {
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
    return this.#store.number({ ...this.#read, bit: 0, width: 16 });
  }

  set item(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 16 }, value);
  }

  get quantity(): number {
    return this.#store.number({ ...this.#read, bit: 16, width: 16 });
  }

  set quantity(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 16, width: 16 }, value);
  }
}

export class GeneralMedicinePocket {
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
    return this.#store.number({ ...this.#read, bit: 0, width: 16 });
  }

  set item(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 16 }, value);
  }

  get quantity(): number {
    return this.#store.number({ ...this.#read, bit: 16, width: 16 });
  }

  set quantity(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 16, width: 16 }, value);
  }
}

export class GeneralBerriesPocket {
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
    return this.#store.number({ ...this.#read, bit: 0, width: 16 });
  }

  set item(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 16 }, value);
  }

  get quantity(): number {
    return this.#store.number({ ...this.#read, bit: 16, width: 16 });
  }

  set quantity(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 16, width: 16 }, value);
  }
}

export class GeneralPokeBallsPocket {
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
    return this.#store.number({ ...this.#read, bit: 0, width: 16 });
  }

  set item(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 16 }, value);
  }

  get quantity(): number {
    return this.#store.number({ ...this.#read, bit: 16, width: 16 });
  }

  set quantity(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 16, width: 16 }, value);
  }
}

export class GeneralBattleItemsPocket {
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
    return this.#store.number({ ...this.#read, bit: 0, width: 16 });
  }

  set item(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 16 }, value);
  }

  get quantity(): number {
    return this.#store.number({ ...this.#read, bit: 16, width: 16 });
  }

  set quantity(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 16, width: 16 }, value);
  }
}

export class GeneralPoketchFlags {
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

  get enabled(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set enabled(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get flag1(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set flag1(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }

  get flag2(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 1 });
  }

  set flag2(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 1 }, value);
  }

  get color(): number {
    return this.#store.number({ ...this.#read, bit: 3, width: 3 });
  }

  set color(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 3, width: 3 }, value);
  }

  get flag6(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 1 });
  }

  set flag6(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 1 }, value);
  }

  get flag7(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 1 });
  }

  set flag7(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 1 }, value);
  }
}

export class GeneralRoamerIvs {
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

  get hp(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 5 });
  }

  set hp(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 5 }, value);
  }

  get attack(): number {
    return this.#store.number({ ...this.#read, bit: 5, width: 5 });
  }

  set attack(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 5, width: 5 }, value);
  }

  get defense(): number {
    return this.#store.number({ ...this.#read, bit: 10, width: 5 });
  }

  set defense(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 10, width: 5 }, value);
  }

  get speed(): number {
    return this.#store.number({ ...this.#read, bit: 15, width: 5 });
  }

  set speed(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 15, width: 5 }, value);
  }

  get spAtk(): number {
    return this.#store.number({ ...this.#read, bit: 20, width: 5 });
  }

  set spAtk(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 20, width: 5 }, value);
  }

  get spDef(): number {
    return this.#store.number({ ...this.#read, bit: 25, width: 5 });
  }

  set spDef(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 25, width: 5 }, value);
  }
}

export class Storage {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get currentBox(): number {
    return this.#store.number({ space: this.#space, offset: 0x0, type: "u8", length: 1 });
  }

  set currentBox(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x0, type: "u8", length: 1 }, value);
  }

  get boxPokemon(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x4, type: "bytes", length: 73440 });
  }

  set boxPokemon(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x4, type: "bytes", length: 73440 }, value);
  }

  get boxNames(): readonly (string)[] {
    return repeat(18, (i) => this.#store.text({ space: this.#space, offset: 0x11EE4 + i * 40, type: "text-gen4", length: 40 }));
  }

  set boxNames(values: readonly (string)[]) {
    setEach(18, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0x11EE4 + i * 40, type: "text-gen4", length: 40 }, value));
  }

  get boxWallpapers(): readonly (number)[] {
    return repeat(18, (i) => this.#store.number({ space: this.#space, offset: 0x121B4 + i * 1, type: "u8", length: 1 }));
  }

  set boxWallpapers(values: readonly (number)[]) {
    setEach(18, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x121B4 + i * 1, type: "u8", length: 1 }, value));
  }

  get boxFlags(): number {
    return this.#store.number({ space: this.#space, offset: 0x121C6, type: "u8", length: 1 });
  }

  set boxFlags(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x121C6, type: "u8", length: 1 }, value);
  }

  get majorSaveCounter(): number {
    return this.#store.number({ space: this.#space, offset: 0x121D0, type: "u32le", length: 4 });
  }

  set majorSaveCounter(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x121D0, type: "u32le", length: 4 }, value);
  }

  get minorSaveCounter(): number {
    return this.#store.number({ space: this.#space, offset: 0x121D4, type: "u32le", length: 4 });
  }

  set minorSaveCounter(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x121D4, type: "u32le", length: 4 }, value);
  }

  get blockSize(): number {
    return this.#store.number({ space: this.#space, offset: 0x121D8, type: "u32le", length: 4 });
  }

  set blockSize(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x121D8, type: "u32le", length: 4 }, value);
  }

  get magic(): number {
    return this.#store.number({ space: this.#space, offset: 0x121DC, type: "u32le", length: 4 });
  }

  set magic(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x121DC, type: "u32le", length: 4 }, value);
  }

  get checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x121E2, type: "u16le", length: 2 });
  }

  set checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x121E2, type: "u16le", length: 2 }, value);
  }
}

export class Pk4Party {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get pid(): number {
    return this.#store.number({ space: this.#space, offset: 0x0, type: "u32le", length: 4 });
  }

  set pid(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x0, type: "u32le", length: 4 }, value);
  }

  get sanity(): number {
    return this.#store.number({ space: this.#space, offset: 0x4, type: "u16le", length: 2 });
  }

  set sanity(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x4, type: "u16le", length: 2 }, value);
  }

  get checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6, type: "u16le", length: 2 });
  }

  set checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6, type: "u16le", length: 2 }, value);
  }

  get species(): number {
    return this.#store.number({ space: this.#space, offset: 0x8, type: "u16le", length: 2 });
  }

  set species(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x8, type: "u16le", length: 2 }, value);
  }

  get heldItem(): number {
    return this.#store.number({ space: this.#space, offset: 0xA, type: "u16le", length: 2 });
  }

  set heldItem(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA, type: "u16le", length: 2 }, value);
  }

  get originalTrainerId(): Pk4PartyOriginalTrainerId {
    return new Pk4PartyOriginalTrainerId(this.#store, { space: this.#space, offset: 0xC, type: "u32le", length: 4 });
  }

  get experience(): number {
    return this.#store.number({ space: this.#space, offset: 0x10, type: "u32le", length: 4 });
  }

  set experience(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x10, type: "u32le", length: 4 }, value);
  }

  get friendship(): number {
    return this.#store.number({ space: this.#space, offset: 0x14, type: "u8", length: 1 });
  }

  set friendship(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x14, type: "u8", length: 1 }, value);
  }

  get ability(): number {
    return this.#store.number({ space: this.#space, offset: 0x15, type: "u8", length: 1 });
  }

  set ability(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x15, type: "u8", length: 1 }, value);
  }

  get markings(): number {
    return this.#store.number({ space: this.#space, offset: 0x16, type: "u8", length: 1 });
  }

  set markings(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x16, type: "u8", length: 1 }, value);
  }

  get language(): number {
    return this.#store.number({ space: this.#space, offset: 0x17, type: "u8", length: 1 });
  }

  set language(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x17, type: "u8", length: 1 }, value);
  }

  get evs(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x18 + i * 1, type: "u8", length: 1 }));
  }

  set evs(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x18 + i * 1, type: "u8", length: 1 }, value));
  }

  get contestStats(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x1E + i * 1, type: "u8", length: 1 }));
  }

  set contestStats(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x1E + i * 1, type: "u8", length: 1 }, value));
  }

  get sinnohRibbons(): Pk4PartySinnohRibbons {
    return new Pk4PartySinnohRibbons(this.#store, { space: this.#space, offset: 0x24, type: "u32le", length: 4 });
  }

  get moves(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x28 + i * 2, type: "u16le", length: 2 }));
  }

  set moves(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x28 + i * 2, type: "u16le", length: 2 }, value));
  }

  get pp(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x30 + i * 1, type: "u8", length: 1 }));
  }

  set pp(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x30 + i * 1, type: "u8", length: 1 }, value));
  }

  get ppUps(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x34 + i * 1, type: "u8", length: 1 }));
  }

  set ppUps(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x34 + i * 1, type: "u8", length: 1 }, value));
  }

  get ivsEggAndNicknamed(): Pk4PartyIvsEggAndNicknamed {
    return new Pk4PartyIvsEggAndNicknamed(this.#store, { space: this.#space, offset: 0x38, type: "u32le", length: 4 });
  }

  get hoennRibbons(): Pk4PartyHoennRibbons {
    return new Pk4PartyHoennRibbons(this.#store, { space: this.#space, offset: 0x3C, type: "u32le", length: 4 });
  }

  get fatefulEncounterGenderAndForm(): Pk4PartyFatefulEncounterGenderAndForm {
    return new Pk4PartyFatefulEncounterGenderAndForm(this.#store, { space: this.#space, offset: 0x40, type: "u8", length: 1 });
  }

  get shinyLeaves(): number {
    return this.#store.number({ space: this.#space, offset: 0x41, type: "u8", length: 1 });
  }

  set shinyLeaves(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x41, type: "u8", length: 1 }, value);
  }

  get unused1(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x42, type: "bytes", length: 2 });
  }

  set unused1(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x42, type: "bytes", length: 2 }, value);
  }

  get eggLocationExtended(): number {
    return this.#store.number({ space: this.#space, offset: 0x44, type: "u16le", length: 2 });
  }

  set eggLocationExtended(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x44, type: "u16le", length: 2 }, value);
  }

  get metLocationExtended(): number {
    return this.#store.number({ space: this.#space, offset: 0x46, type: "u16le", length: 2 });
  }

  set metLocationExtended(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x46, type: "u16le", length: 2 }, value);
  }

  get nickname(): string {
    return this.#store.text({ space: this.#space, offset: 0x48, type: "text-gen4", length: 22 });
  }

  set nickname(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x48, type: "text-gen4", length: 22 }, value);
  }

  get unused2(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x5E, type: "bytes", length: 1 });
  }

  set unused2(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x5E, type: "bytes", length: 1 }, value);
  }

  get originGame(): number {
    return this.#store.number({ space: this.#space, offset: 0x5F, type: "u8", length: 1 });
  }

  set originGame(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x5F, type: "u8", length: 1 }, value);
  }

  get sinnohContestRibbons(): Pk4PartySinnohContestRibbons {
    return new Pk4PartySinnohContestRibbons(this.#store, { space: this.#space, offset: 0x60, type: "u32le", length: 4 });
  }

  get unused3(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x64, type: "bytes", length: 4 });
  }

  set unused3(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x64, type: "bytes", length: 4 }, value);
  }

  get originalTrainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x68, type: "text-gen4", length: 16 });
  }

  set originalTrainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x68, type: "text-gen4", length: 16 }, value);
  }

  get eggYear(): number {
    return this.#store.number({ space: this.#space, offset: 0x78, type: "u8", length: 1 });
  }

  set eggYear(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x78, type: "u8", length: 1 }, value);
  }

  get eggMonth(): number {
    return this.#store.number({ space: this.#space, offset: 0x79, type: "u8", length: 1 });
  }

  set eggMonth(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x79, type: "u8", length: 1 }, value);
  }

  get eggDay(): number {
    return this.#store.number({ space: this.#space, offset: 0x7A, type: "u8", length: 1 });
  }

  set eggDay(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x7A, type: "u8", length: 1 }, value);
  }

  get metYear(): number {
    return this.#store.number({ space: this.#space, offset: 0x7B, type: "u8", length: 1 });
  }

  set metYear(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x7B, type: "u8", length: 1 }, value);
  }

  get metMonth(): number {
    return this.#store.number({ space: this.#space, offset: 0x7C, type: "u8", length: 1 });
  }

  set metMonth(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x7C, type: "u8", length: 1 }, value);
  }

  get metDay(): number {
    return this.#store.number({ space: this.#space, offset: 0x7D, type: "u8", length: 1 });
  }

  set metDay(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x7D, type: "u8", length: 1 }, value);
  }

  get eggLocation(): number {
    return this.#store.number({ space: this.#space, offset: 0x7E, type: "u16le", length: 2 });
  }

  set eggLocation(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x7E, type: "u16le", length: 2 }, value);
  }

  get metLocation(): number {
    return this.#store.number({ space: this.#space, offset: 0x80, type: "u16le", length: 2 });
  }

  set metLocation(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x80, type: "u16le", length: 2 }, value);
  }

  get pokerus(): Pk4PartyPokerus {
    return new Pk4PartyPokerus(this.#store, { space: this.#space, offset: 0x82, type: "u8", length: 1 });
  }

  get ball(): number {
    return this.#store.number({ space: this.#space, offset: 0x83, type: "u8", length: 1 });
  }

  set ball(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x83, type: "u8", length: 1 }, value);
  }

  get metLevelAndTrainerGender(): Pk4PartyMetLevelAndTrainerGender {
    return new Pk4PartyMetLevelAndTrainerGender(this.#store, { space: this.#space, offset: 0x84, type: "u8", length: 1 });
  }

  get encounterType(): number {
    return this.#store.number({ space: this.#space, offset: 0x85, type: "u8", length: 1 });
  }

  set encounterType(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x85, type: "u8", length: 1 }, value);
  }

  get ballHgss(): number {
    return this.#store.number({ space: this.#space, offset: 0x86, type: "u8", length: 1 });
  }

  set ballHgss(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x86, type: "u8", length: 1 }, value);
  }

  get walkingMood(): number {
    return this.#store.number({ space: this.#space, offset: 0x87, type: "i8", length: 1 });
  }

  set walkingMood(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x87, type: "i8", length: 1 }, value);
  }

  get statusCondition(): number {
    return this.#store.number({ space: this.#space, offset: 0x88, type: "u32le", length: 4 });
  }

  set statusCondition(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x88, type: "u32le", length: 4 }, value);
  }

  get level(): number {
    return this.#store.number({ space: this.#space, offset: 0x8C, type: "u8", length: 1 });
  }

  set level(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x8C, type: "u8", length: 1 }, value);
  }

  get ballCapsule(): number {
    return this.#store.number({ space: this.#space, offset: 0x8D, type: "u8", length: 1 });
  }

  set ballCapsule(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x8D, type: "u8", length: 1 }, value);
  }

  get currentHp(): number {
    return this.#store.number({ space: this.#space, offset: 0x8E, type: "u16le", length: 2 });
  }

  set currentHp(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x8E, type: "u16le", length: 2 }, value);
  }

  get stats(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x90 + i * 2, type: "u16le", length: 2 }));
  }

  set stats(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x90 + i * 2, type: "u16le", length: 2 }, value));
  }

  get heldMail(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x9C, type: "bytes", length: 56 });
  }

  set heldMail(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x9C, type: "bytes", length: 56 }, value);
  }

  get seals(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0xD4, type: "bytes", length: 24 });
  }

  set seals(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0xD4, type: "bytes", length: 24 }, value);
  }
}

export class Pk4PartyOriginalTrainerId {
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

export class Pk4PartySinnohRibbons {
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

  get sinnohChampion(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set sinnohChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get ability(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set ability(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }

  get greatAbility(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 1 });
  }

  set greatAbility(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 1 }, value);
  }

  get doubleAbility(): number {
    return this.#store.number({ ...this.#read, bit: 3, width: 1 });
  }

  set doubleAbility(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 3, width: 1 }, value);
  }

  get multiAbility(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 1 });
  }

  set multiAbility(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 1 }, value);
  }

  get pairAbility(): number {
    return this.#store.number({ ...this.#read, bit: 5, width: 1 });
  }

  set pairAbility(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 5, width: 1 }, value);
  }

  get worldAbility(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 1 });
  }

  set worldAbility(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 1 }, value);
  }

  get alert(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 1 });
  }

  set alert(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 1 }, value);
  }

  get shock(): number {
    return this.#store.number({ ...this.#read, bit: 8, width: 1 });
  }

  set shock(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 8, width: 1 }, value);
  }

  get downcast(): number {
    return this.#store.number({ ...this.#read, bit: 9, width: 1 });
  }

  set downcast(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 9, width: 1 }, value);
  }

  get careless(): number {
    return this.#store.number({ ...this.#read, bit: 10, width: 1 });
  }

  set careless(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 10, width: 1 }, value);
  }

  get relax(): number {
    return this.#store.number({ ...this.#read, bit: 11, width: 1 });
  }

  set relax(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 11, width: 1 }, value);
  }

  get snooze(): number {
    return this.#store.number({ ...this.#read, bit: 12, width: 1 });
  }

  set snooze(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 12, width: 1 }, value);
  }

  get smile(): number {
    return this.#store.number({ ...this.#read, bit: 13, width: 1 });
  }

  set smile(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 13, width: 1 }, value);
  }

  get gorgeous(): number {
    return this.#store.number({ ...this.#read, bit: 14, width: 1 });
  }

  set gorgeous(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 14, width: 1 }, value);
  }

  get royal(): number {
    return this.#store.number({ ...this.#read, bit: 15, width: 1 });
  }

  set royal(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 15, width: 1 }, value);
  }

  get gorgeousRoyal(): number {
    return this.#store.number({ ...this.#read, bit: 16, width: 1 });
  }

  set gorgeousRoyal(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 16, width: 1 }, value);
  }

  get footprint(): number {
    return this.#store.number({ ...this.#read, bit: 17, width: 1 });
  }

  set footprint(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 17, width: 1 }, value);
  }

  get record(): number {
    return this.#store.number({ ...this.#read, bit: 18, width: 1 });
  }

  set record(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 18, width: 1 }, value);
  }

  get event(): number {
    return this.#store.number({ ...this.#read, bit: 19, width: 1 });
  }

  set event(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 19, width: 1 }, value);
  }

  get legend(): number {
    return this.#store.number({ ...this.#read, bit: 20, width: 1 });
  }

  set legend(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 20, width: 1 }, value);
  }

  get worldChampion(): number {
    return this.#store.number({ ...this.#read, bit: 21, width: 1 });
  }

  set worldChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 21, width: 1 }, value);
  }

  get birthday(): number {
    return this.#store.number({ ...this.#read, bit: 22, width: 1 });
  }

  set birthday(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 22, width: 1 }, value);
  }

  get special(): number {
    return this.#store.number({ ...this.#read, bit: 23, width: 1 });
  }

  set special(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 23, width: 1 }, value);
  }

  get souvenir(): number {
    return this.#store.number({ ...this.#read, bit: 24, width: 1 });
  }

  set souvenir(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 24, width: 1 }, value);
  }

  get wishing(): number {
    return this.#store.number({ ...this.#read, bit: 25, width: 1 });
  }

  set wishing(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 25, width: 1 }, value);
  }

  get classic(): number {
    return this.#store.number({ ...this.#read, bit: 26, width: 1 });
  }

  set classic(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 26, width: 1 }, value);
  }

  get premier(): number {
    return this.#store.number({ ...this.#read, bit: 27, width: 1 });
  }

  set premier(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 27, width: 1 }, value);
  }
}

export class Pk4PartyIvsEggAndNicknamed {
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

  get hpIv(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 5 });
  }

  set hpIv(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 5 }, value);
  }

  get attackIv(): number {
    return this.#store.number({ ...this.#read, bit: 5, width: 5 });
  }

  set attackIv(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 5, width: 5 }, value);
  }

  get defenseIv(): number {
    return this.#store.number({ ...this.#read, bit: 10, width: 5 });
  }

  set defenseIv(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 10, width: 5 }, value);
  }

  get speedIv(): number {
    return this.#store.number({ ...this.#read, bit: 15, width: 5 });
  }

  set speedIv(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 15, width: 5 }, value);
  }

  get spAtkIv(): number {
    return this.#store.number({ ...this.#read, bit: 20, width: 5 });
  }

  set spAtkIv(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 20, width: 5 }, value);
  }

  get spDefIv(): number {
    return this.#store.number({ ...this.#read, bit: 25, width: 5 });
  }

  set spDefIv(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 25, width: 5 }, value);
  }

  get isEgg(): number {
    return this.#store.number({ ...this.#read, bit: 30, width: 1 });
  }

  set isEgg(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 30, width: 1 }, value);
  }

  get isNicknamed(): number {
    return this.#store.number({ ...this.#read, bit: 31, width: 1 });
  }

  set isNicknamed(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 31, width: 1 }, value);
  }
}

export class Pk4PartyHoennRibbons {
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

  get cool(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set cool(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get coolSuper(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set coolSuper(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }

  get coolHyper(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 1 });
  }

  set coolHyper(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 1 }, value);
  }

  get coolMaster(): number {
    return this.#store.number({ ...this.#read, bit: 3, width: 1 });
  }

  set coolMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 3, width: 1 }, value);
  }

  get beauty(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 1 });
  }

  set beauty(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 1 }, value);
  }

  get beautySuper(): number {
    return this.#store.number({ ...this.#read, bit: 5, width: 1 });
  }

  set beautySuper(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 5, width: 1 }, value);
  }

  get beautyHyper(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 1 });
  }

  set beautyHyper(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 1 }, value);
  }

  get beautyMaster(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 1 });
  }

  set beautyMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 1 }, value);
  }

  get cute(): number {
    return this.#store.number({ ...this.#read, bit: 8, width: 1 });
  }

  set cute(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 8, width: 1 }, value);
  }

  get cuteSuper(): number {
    return this.#store.number({ ...this.#read, bit: 9, width: 1 });
  }

  set cuteSuper(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 9, width: 1 }, value);
  }

  get cuteHyper(): number {
    return this.#store.number({ ...this.#read, bit: 10, width: 1 });
  }

  set cuteHyper(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 10, width: 1 }, value);
  }

  get cuteMaster(): number {
    return this.#store.number({ ...this.#read, bit: 11, width: 1 });
  }

  set cuteMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 11, width: 1 }, value);
  }

  get smart(): number {
    return this.#store.number({ ...this.#read, bit: 12, width: 1 });
  }

  set smart(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 12, width: 1 }, value);
  }

  get smartSuper(): number {
    return this.#store.number({ ...this.#read, bit: 13, width: 1 });
  }

  set smartSuper(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 13, width: 1 }, value);
  }

  get smartHyper(): number {
    return this.#store.number({ ...this.#read, bit: 14, width: 1 });
  }

  set smartHyper(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 14, width: 1 }, value);
  }

  get smartMaster(): number {
    return this.#store.number({ ...this.#read, bit: 15, width: 1 });
  }

  set smartMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 15, width: 1 }, value);
  }

  get tough(): number {
    return this.#store.number({ ...this.#read, bit: 16, width: 1 });
  }

  set tough(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 16, width: 1 }, value);
  }

  get toughSuper(): number {
    return this.#store.number({ ...this.#read, bit: 17, width: 1 });
  }

  set toughSuper(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 17, width: 1 }, value);
  }

  get toughHyper(): number {
    return this.#store.number({ ...this.#read, bit: 18, width: 1 });
  }

  set toughHyper(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 18, width: 1 }, value);
  }

  get toughMaster(): number {
    return this.#store.number({ ...this.#read, bit: 19, width: 1 });
  }

  set toughMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 19, width: 1 }, value);
  }

  get champion(): number {
    return this.#store.number({ ...this.#read, bit: 20, width: 1 });
  }

  set champion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 20, width: 1 }, value);
  }

  get winning(): number {
    return this.#store.number({ ...this.#read, bit: 21, width: 1 });
  }

  set winning(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 21, width: 1 }, value);
  }

  get victory(): number {
    return this.#store.number({ ...this.#read, bit: 22, width: 1 });
  }

  set victory(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 22, width: 1 }, value);
  }

  get artist(): number {
    return this.#store.number({ ...this.#read, bit: 23, width: 1 });
  }

  set artist(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 23, width: 1 }, value);
  }

  get effort(): number {
    return this.#store.number({ ...this.#read, bit: 24, width: 1 });
  }

  set effort(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 24, width: 1 }, value);
  }

  get battleChampion(): number {
    return this.#store.number({ ...this.#read, bit: 25, width: 1 });
  }

  set battleChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 25, width: 1 }, value);
  }

  get regionalChampion(): number {
    return this.#store.number({ ...this.#read, bit: 26, width: 1 });
  }

  set regionalChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 26, width: 1 }, value);
  }

  get nationalChampion(): number {
    return this.#store.number({ ...this.#read, bit: 27, width: 1 });
  }

  set nationalChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 27, width: 1 }, value);
  }

  get country(): number {
    return this.#store.number({ ...this.#read, bit: 28, width: 1 });
  }

  set country(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 28, width: 1 }, value);
  }

  get national(): number {
    return this.#store.number({ ...this.#read, bit: 29, width: 1 });
  }

  set national(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 29, width: 1 }, value);
  }

  get earth(): number {
    return this.#store.number({ ...this.#read, bit: 30, width: 1 });
  }

  set earth(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 30, width: 1 }, value);
  }

  get world(): number {
    return this.#store.number({ ...this.#read, bit: 31, width: 1 });
  }

  set world(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 31, width: 1 }, value);
  }
}

export class Pk4PartyFatefulEncounterGenderAndForm {
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

  get gender(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 2 });
  }

  set gender(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 2 }, value);
  }

  get form(): number {
    return this.#store.number({ ...this.#read, bit: 3, width: 5 });
  }

  set form(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 3, width: 5 }, value);
  }
}

export class Pk4PartySinnohContestRibbons {
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

  get cool(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set cool(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get coolGreat(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set coolGreat(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }

  get coolUltra(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 1 });
  }

  set coolUltra(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 1 }, value);
  }

  get coolMaster(): number {
    return this.#store.number({ ...this.#read, bit: 3, width: 1 });
  }

  set coolMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 3, width: 1 }, value);
  }

  get beauty(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 1 });
  }

  set beauty(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 1 }, value);
  }

  get beautyGreat(): number {
    return this.#store.number({ ...this.#read, bit: 5, width: 1 });
  }

  set beautyGreat(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 5, width: 1 }, value);
  }

  get beautyUltra(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 1 });
  }

  set beautyUltra(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 1 }, value);
  }

  get beautyMaster(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 1 });
  }

  set beautyMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 1 }, value);
  }

  get cute(): number {
    return this.#store.number({ ...this.#read, bit: 8, width: 1 });
  }

  set cute(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 8, width: 1 }, value);
  }

  get cuteGreat(): number {
    return this.#store.number({ ...this.#read, bit: 9, width: 1 });
  }

  set cuteGreat(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 9, width: 1 }, value);
  }

  get cuteUltra(): number {
    return this.#store.number({ ...this.#read, bit: 10, width: 1 });
  }

  set cuteUltra(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 10, width: 1 }, value);
  }

  get cuteMaster(): number {
    return this.#store.number({ ...this.#read, bit: 11, width: 1 });
  }

  set cuteMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 11, width: 1 }, value);
  }

  get smart(): number {
    return this.#store.number({ ...this.#read, bit: 12, width: 1 });
  }

  set smart(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 12, width: 1 }, value);
  }

  get smartGreat(): number {
    return this.#store.number({ ...this.#read, bit: 13, width: 1 });
  }

  set smartGreat(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 13, width: 1 }, value);
  }

  get smartUltra(): number {
    return this.#store.number({ ...this.#read, bit: 14, width: 1 });
  }

  set smartUltra(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 14, width: 1 }, value);
  }

  get smartMaster(): number {
    return this.#store.number({ ...this.#read, bit: 15, width: 1 });
  }

  set smartMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 15, width: 1 }, value);
  }

  get tough(): number {
    return this.#store.number({ ...this.#read, bit: 16, width: 1 });
  }

  set tough(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 16, width: 1 }, value);
  }

  get toughGreat(): number {
    return this.#store.number({ ...this.#read, bit: 17, width: 1 });
  }

  set toughGreat(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 17, width: 1 }, value);
  }

  get toughUltra(): number {
    return this.#store.number({ ...this.#read, bit: 18, width: 1 });
  }

  set toughUltra(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 18, width: 1 }, value);
  }

  get toughMaster(): number {
    return this.#store.number({ ...this.#read, bit: 19, width: 1 });
  }

  set toughMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 19, width: 1 }, value);
  }
}

export class Pk4PartyPokerus {
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

  get days(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 4 });
  }

  set days(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 4 }, value);
  }

  get strain(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 4 });
  }

  set strain(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 4 }, value);
  }
}

export class Pk4PartyMetLevelAndTrainerGender {
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

  get metLevel(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 7 });
  }

  set metLevel(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 7 }, value);
  }

  get trainerGender(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 1 });
  }

  set trainerGender(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 1 }, value);
  }
}

export class Pk4 {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get pid(): number {
    return this.#store.number({ space: this.#space, offset: 0x0, type: "u32le", length: 4 });
  }

  set pid(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x0, type: "u32le", length: 4 }, value);
  }

  get sanity(): number {
    return this.#store.number({ space: this.#space, offset: 0x4, type: "u16le", length: 2 });
  }

  set sanity(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x4, type: "u16le", length: 2 }, value);
  }

  get checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6, type: "u16le", length: 2 });
  }

  set checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6, type: "u16le", length: 2 }, value);
  }

  get species(): number {
    return this.#store.number({ space: this.#space, offset: 0x8, type: "u16le", length: 2 });
  }

  set species(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x8, type: "u16le", length: 2 }, value);
  }

  get heldItem(): number {
    return this.#store.number({ space: this.#space, offset: 0xA, type: "u16le", length: 2 });
  }

  set heldItem(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA, type: "u16le", length: 2 }, value);
  }

  get originalTrainerId(): Pk4OriginalTrainerId {
    return new Pk4OriginalTrainerId(this.#store, { space: this.#space, offset: 0xC, type: "u32le", length: 4 });
  }

  get experience(): number {
    return this.#store.number({ space: this.#space, offset: 0x10, type: "u32le", length: 4 });
  }

  set experience(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x10, type: "u32le", length: 4 }, value);
  }

  get friendship(): number {
    return this.#store.number({ space: this.#space, offset: 0x14, type: "u8", length: 1 });
  }

  set friendship(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x14, type: "u8", length: 1 }, value);
  }

  get ability(): number {
    return this.#store.number({ space: this.#space, offset: 0x15, type: "u8", length: 1 });
  }

  set ability(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x15, type: "u8", length: 1 }, value);
  }

  get markings(): number {
    return this.#store.number({ space: this.#space, offset: 0x16, type: "u8", length: 1 });
  }

  set markings(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x16, type: "u8", length: 1 }, value);
  }

  get language(): number {
    return this.#store.number({ space: this.#space, offset: 0x17, type: "u8", length: 1 });
  }

  set language(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x17, type: "u8", length: 1 }, value);
  }

  get evs(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x18 + i * 1, type: "u8", length: 1 }));
  }

  set evs(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x18 + i * 1, type: "u8", length: 1 }, value));
  }

  get contestStats(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x1E + i * 1, type: "u8", length: 1 }));
  }

  set contestStats(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x1E + i * 1, type: "u8", length: 1 }, value));
  }

  get sinnohRibbons(): Pk4SinnohRibbons {
    return new Pk4SinnohRibbons(this.#store, { space: this.#space, offset: 0x24, type: "u32le", length: 4 });
  }

  get moves(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x28 + i * 2, type: "u16le", length: 2 }));
  }

  set moves(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x28 + i * 2, type: "u16le", length: 2 }, value));
  }

  get pp(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x30 + i * 1, type: "u8", length: 1 }));
  }

  set pp(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x30 + i * 1, type: "u8", length: 1 }, value));
  }

  get ppUps(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x34 + i * 1, type: "u8", length: 1 }));
  }

  set ppUps(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x34 + i * 1, type: "u8", length: 1 }, value));
  }

  get ivsEggAndNicknamed(): Pk4IvsEggAndNicknamed {
    return new Pk4IvsEggAndNicknamed(this.#store, { space: this.#space, offset: 0x38, type: "u32le", length: 4 });
  }

  get hoennRibbons(): Pk4HoennRibbons {
    return new Pk4HoennRibbons(this.#store, { space: this.#space, offset: 0x3C, type: "u32le", length: 4 });
  }

  get fatefulEncounterGenderAndForm(): Pk4FatefulEncounterGenderAndForm {
    return new Pk4FatefulEncounterGenderAndForm(this.#store, { space: this.#space, offset: 0x40, type: "u8", length: 1 });
  }

  get shinyLeaves(): number {
    return this.#store.number({ space: this.#space, offset: 0x41, type: "u8", length: 1 });
  }

  set shinyLeaves(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x41, type: "u8", length: 1 }, value);
  }

  get unused1(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x42, type: "bytes", length: 2 });
  }

  set unused1(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x42, type: "bytes", length: 2 }, value);
  }

  get eggLocationExtended(): number {
    return this.#store.number({ space: this.#space, offset: 0x44, type: "u16le", length: 2 });
  }

  set eggLocationExtended(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x44, type: "u16le", length: 2 }, value);
  }

  get metLocationExtended(): number {
    return this.#store.number({ space: this.#space, offset: 0x46, type: "u16le", length: 2 });
  }

  set metLocationExtended(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x46, type: "u16le", length: 2 }, value);
  }

  get nickname(): string {
    return this.#store.text({ space: this.#space, offset: 0x48, type: "text-gen4", length: 22 });
  }

  set nickname(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x48, type: "text-gen4", length: 22 }, value);
  }

  get unused2(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x5E, type: "bytes", length: 1 });
  }

  set unused2(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x5E, type: "bytes", length: 1 }, value);
  }

  get originGame(): number {
    return this.#store.number({ space: this.#space, offset: 0x5F, type: "u8", length: 1 });
  }

  set originGame(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x5F, type: "u8", length: 1 }, value);
  }

  get sinnohContestRibbons(): Pk4SinnohContestRibbons {
    return new Pk4SinnohContestRibbons(this.#store, { space: this.#space, offset: 0x60, type: "u32le", length: 4 });
  }

  get unused3(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x64, type: "bytes", length: 4 });
  }

  set unused3(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x64, type: "bytes", length: 4 }, value);
  }

  get originalTrainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x68, type: "text-gen4", length: 16 });
  }

  set originalTrainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x68, type: "text-gen4", length: 16 }, value);
  }

  get eggYear(): number {
    return this.#store.number({ space: this.#space, offset: 0x78, type: "u8", length: 1 });
  }

  set eggYear(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x78, type: "u8", length: 1 }, value);
  }

  get eggMonth(): number {
    return this.#store.number({ space: this.#space, offset: 0x79, type: "u8", length: 1 });
  }

  set eggMonth(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x79, type: "u8", length: 1 }, value);
  }

  get eggDay(): number {
    return this.#store.number({ space: this.#space, offset: 0x7A, type: "u8", length: 1 });
  }

  set eggDay(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x7A, type: "u8", length: 1 }, value);
  }

  get metYear(): number {
    return this.#store.number({ space: this.#space, offset: 0x7B, type: "u8", length: 1 });
  }

  set metYear(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x7B, type: "u8", length: 1 }, value);
  }

  get metMonth(): number {
    return this.#store.number({ space: this.#space, offset: 0x7C, type: "u8", length: 1 });
  }

  set metMonth(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x7C, type: "u8", length: 1 }, value);
  }

  get metDay(): number {
    return this.#store.number({ space: this.#space, offset: 0x7D, type: "u8", length: 1 });
  }

  set metDay(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x7D, type: "u8", length: 1 }, value);
  }

  get eggLocation(): number {
    return this.#store.number({ space: this.#space, offset: 0x7E, type: "u16le", length: 2 });
  }

  set eggLocation(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x7E, type: "u16le", length: 2 }, value);
  }

  get metLocation(): number {
    return this.#store.number({ space: this.#space, offset: 0x80, type: "u16le", length: 2 });
  }

  set metLocation(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x80, type: "u16le", length: 2 }, value);
  }

  get pokerus(): Pk4Pokerus {
    return new Pk4Pokerus(this.#store, { space: this.#space, offset: 0x82, type: "u8", length: 1 });
  }

  get ball(): number {
    return this.#store.number({ space: this.#space, offset: 0x83, type: "u8", length: 1 });
  }

  set ball(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x83, type: "u8", length: 1 }, value);
  }

  get metLevelAndTrainerGender(): Pk4MetLevelAndTrainerGender {
    return new Pk4MetLevelAndTrainerGender(this.#store, { space: this.#space, offset: 0x84, type: "u8", length: 1 });
  }

  get encounterType(): number {
    return this.#store.number({ space: this.#space, offset: 0x85, type: "u8", length: 1 });
  }

  set encounterType(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x85, type: "u8", length: 1 }, value);
  }

  get ballHgss(): number {
    return this.#store.number({ space: this.#space, offset: 0x86, type: "u8", length: 1 });
  }

  set ballHgss(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x86, type: "u8", length: 1 }, value);
  }

  get walkingMood(): number {
    return this.#store.number({ space: this.#space, offset: 0x87, type: "i8", length: 1 });
  }

  set walkingMood(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x87, type: "i8", length: 1 }, value);
  }
}

export class Pk4OriginalTrainerId {
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

export class Pk4SinnohRibbons {
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

  get sinnohChampion(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set sinnohChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get ability(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set ability(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }

  get greatAbility(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 1 });
  }

  set greatAbility(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 1 }, value);
  }

  get doubleAbility(): number {
    return this.#store.number({ ...this.#read, bit: 3, width: 1 });
  }

  set doubleAbility(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 3, width: 1 }, value);
  }

  get multiAbility(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 1 });
  }

  set multiAbility(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 1 }, value);
  }

  get pairAbility(): number {
    return this.#store.number({ ...this.#read, bit: 5, width: 1 });
  }

  set pairAbility(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 5, width: 1 }, value);
  }

  get worldAbility(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 1 });
  }

  set worldAbility(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 1 }, value);
  }

  get alert(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 1 });
  }

  set alert(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 1 }, value);
  }

  get shock(): number {
    return this.#store.number({ ...this.#read, bit: 8, width: 1 });
  }

  set shock(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 8, width: 1 }, value);
  }

  get downcast(): number {
    return this.#store.number({ ...this.#read, bit: 9, width: 1 });
  }

  set downcast(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 9, width: 1 }, value);
  }

  get careless(): number {
    return this.#store.number({ ...this.#read, bit: 10, width: 1 });
  }

  set careless(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 10, width: 1 }, value);
  }

  get relax(): number {
    return this.#store.number({ ...this.#read, bit: 11, width: 1 });
  }

  set relax(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 11, width: 1 }, value);
  }

  get snooze(): number {
    return this.#store.number({ ...this.#read, bit: 12, width: 1 });
  }

  set snooze(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 12, width: 1 }, value);
  }

  get smile(): number {
    return this.#store.number({ ...this.#read, bit: 13, width: 1 });
  }

  set smile(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 13, width: 1 }, value);
  }

  get gorgeous(): number {
    return this.#store.number({ ...this.#read, bit: 14, width: 1 });
  }

  set gorgeous(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 14, width: 1 }, value);
  }

  get royal(): number {
    return this.#store.number({ ...this.#read, bit: 15, width: 1 });
  }

  set royal(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 15, width: 1 }, value);
  }

  get gorgeousRoyal(): number {
    return this.#store.number({ ...this.#read, bit: 16, width: 1 });
  }

  set gorgeousRoyal(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 16, width: 1 }, value);
  }

  get footprint(): number {
    return this.#store.number({ ...this.#read, bit: 17, width: 1 });
  }

  set footprint(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 17, width: 1 }, value);
  }

  get record(): number {
    return this.#store.number({ ...this.#read, bit: 18, width: 1 });
  }

  set record(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 18, width: 1 }, value);
  }

  get event(): number {
    return this.#store.number({ ...this.#read, bit: 19, width: 1 });
  }

  set event(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 19, width: 1 }, value);
  }

  get legend(): number {
    return this.#store.number({ ...this.#read, bit: 20, width: 1 });
  }

  set legend(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 20, width: 1 }, value);
  }

  get worldChampion(): number {
    return this.#store.number({ ...this.#read, bit: 21, width: 1 });
  }

  set worldChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 21, width: 1 }, value);
  }

  get birthday(): number {
    return this.#store.number({ ...this.#read, bit: 22, width: 1 });
  }

  set birthday(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 22, width: 1 }, value);
  }

  get special(): number {
    return this.#store.number({ ...this.#read, bit: 23, width: 1 });
  }

  set special(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 23, width: 1 }, value);
  }

  get souvenir(): number {
    return this.#store.number({ ...this.#read, bit: 24, width: 1 });
  }

  set souvenir(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 24, width: 1 }, value);
  }

  get wishing(): number {
    return this.#store.number({ ...this.#read, bit: 25, width: 1 });
  }

  set wishing(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 25, width: 1 }, value);
  }

  get classic(): number {
    return this.#store.number({ ...this.#read, bit: 26, width: 1 });
  }

  set classic(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 26, width: 1 }, value);
  }

  get premier(): number {
    return this.#store.number({ ...this.#read, bit: 27, width: 1 });
  }

  set premier(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 27, width: 1 }, value);
  }
}

export class Pk4IvsEggAndNicknamed {
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

  get hpIv(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 5 });
  }

  set hpIv(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 5 }, value);
  }

  get attackIv(): number {
    return this.#store.number({ ...this.#read, bit: 5, width: 5 });
  }

  set attackIv(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 5, width: 5 }, value);
  }

  get defenseIv(): number {
    return this.#store.number({ ...this.#read, bit: 10, width: 5 });
  }

  set defenseIv(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 10, width: 5 }, value);
  }

  get speedIv(): number {
    return this.#store.number({ ...this.#read, bit: 15, width: 5 });
  }

  set speedIv(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 15, width: 5 }, value);
  }

  get spAtkIv(): number {
    return this.#store.number({ ...this.#read, bit: 20, width: 5 });
  }

  set spAtkIv(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 20, width: 5 }, value);
  }

  get spDefIv(): number {
    return this.#store.number({ ...this.#read, bit: 25, width: 5 });
  }

  set spDefIv(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 25, width: 5 }, value);
  }

  get isEgg(): number {
    return this.#store.number({ ...this.#read, bit: 30, width: 1 });
  }

  set isEgg(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 30, width: 1 }, value);
  }

  get isNicknamed(): number {
    return this.#store.number({ ...this.#read, bit: 31, width: 1 });
  }

  set isNicknamed(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 31, width: 1 }, value);
  }
}

export class Pk4HoennRibbons {
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

  get cool(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set cool(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get coolSuper(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set coolSuper(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }

  get coolHyper(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 1 });
  }

  set coolHyper(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 1 }, value);
  }

  get coolMaster(): number {
    return this.#store.number({ ...this.#read, bit: 3, width: 1 });
  }

  set coolMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 3, width: 1 }, value);
  }

  get beauty(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 1 });
  }

  set beauty(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 1 }, value);
  }

  get beautySuper(): number {
    return this.#store.number({ ...this.#read, bit: 5, width: 1 });
  }

  set beautySuper(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 5, width: 1 }, value);
  }

  get beautyHyper(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 1 });
  }

  set beautyHyper(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 1 }, value);
  }

  get beautyMaster(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 1 });
  }

  set beautyMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 1 }, value);
  }

  get cute(): number {
    return this.#store.number({ ...this.#read, bit: 8, width: 1 });
  }

  set cute(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 8, width: 1 }, value);
  }

  get cuteSuper(): number {
    return this.#store.number({ ...this.#read, bit: 9, width: 1 });
  }

  set cuteSuper(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 9, width: 1 }, value);
  }

  get cuteHyper(): number {
    return this.#store.number({ ...this.#read, bit: 10, width: 1 });
  }

  set cuteHyper(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 10, width: 1 }, value);
  }

  get cuteMaster(): number {
    return this.#store.number({ ...this.#read, bit: 11, width: 1 });
  }

  set cuteMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 11, width: 1 }, value);
  }

  get smart(): number {
    return this.#store.number({ ...this.#read, bit: 12, width: 1 });
  }

  set smart(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 12, width: 1 }, value);
  }

  get smartSuper(): number {
    return this.#store.number({ ...this.#read, bit: 13, width: 1 });
  }

  set smartSuper(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 13, width: 1 }, value);
  }

  get smartHyper(): number {
    return this.#store.number({ ...this.#read, bit: 14, width: 1 });
  }

  set smartHyper(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 14, width: 1 }, value);
  }

  get smartMaster(): number {
    return this.#store.number({ ...this.#read, bit: 15, width: 1 });
  }

  set smartMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 15, width: 1 }, value);
  }

  get tough(): number {
    return this.#store.number({ ...this.#read, bit: 16, width: 1 });
  }

  set tough(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 16, width: 1 }, value);
  }

  get toughSuper(): number {
    return this.#store.number({ ...this.#read, bit: 17, width: 1 });
  }

  set toughSuper(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 17, width: 1 }, value);
  }

  get toughHyper(): number {
    return this.#store.number({ ...this.#read, bit: 18, width: 1 });
  }

  set toughHyper(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 18, width: 1 }, value);
  }

  get toughMaster(): number {
    return this.#store.number({ ...this.#read, bit: 19, width: 1 });
  }

  set toughMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 19, width: 1 }, value);
  }

  get champion(): number {
    return this.#store.number({ ...this.#read, bit: 20, width: 1 });
  }

  set champion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 20, width: 1 }, value);
  }

  get winning(): number {
    return this.#store.number({ ...this.#read, bit: 21, width: 1 });
  }

  set winning(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 21, width: 1 }, value);
  }

  get victory(): number {
    return this.#store.number({ ...this.#read, bit: 22, width: 1 });
  }

  set victory(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 22, width: 1 }, value);
  }

  get artist(): number {
    return this.#store.number({ ...this.#read, bit: 23, width: 1 });
  }

  set artist(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 23, width: 1 }, value);
  }

  get effort(): number {
    return this.#store.number({ ...this.#read, bit: 24, width: 1 });
  }

  set effort(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 24, width: 1 }, value);
  }

  get battleChampion(): number {
    return this.#store.number({ ...this.#read, bit: 25, width: 1 });
  }

  set battleChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 25, width: 1 }, value);
  }

  get regionalChampion(): number {
    return this.#store.number({ ...this.#read, bit: 26, width: 1 });
  }

  set regionalChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 26, width: 1 }, value);
  }

  get nationalChampion(): number {
    return this.#store.number({ ...this.#read, bit: 27, width: 1 });
  }

  set nationalChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 27, width: 1 }, value);
  }

  get country(): number {
    return this.#store.number({ ...this.#read, bit: 28, width: 1 });
  }

  set country(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 28, width: 1 }, value);
  }

  get national(): number {
    return this.#store.number({ ...this.#read, bit: 29, width: 1 });
  }

  set national(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 29, width: 1 }, value);
  }

  get earth(): number {
    return this.#store.number({ ...this.#read, bit: 30, width: 1 });
  }

  set earth(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 30, width: 1 }, value);
  }

  get world(): number {
    return this.#store.number({ ...this.#read, bit: 31, width: 1 });
  }

  set world(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 31, width: 1 }, value);
  }
}

export class Pk4FatefulEncounterGenderAndForm {
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

  get gender(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 2 });
  }

  set gender(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 2 }, value);
  }

  get form(): number {
    return this.#store.number({ ...this.#read, bit: 3, width: 5 });
  }

  set form(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 3, width: 5 }, value);
  }
}

export class Pk4SinnohContestRibbons {
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

  get cool(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set cool(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get coolGreat(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set coolGreat(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }

  get coolUltra(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 1 });
  }

  set coolUltra(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 1 }, value);
  }

  get coolMaster(): number {
    return this.#store.number({ ...this.#read, bit: 3, width: 1 });
  }

  set coolMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 3, width: 1 }, value);
  }

  get beauty(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 1 });
  }

  set beauty(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 1 }, value);
  }

  get beautyGreat(): number {
    return this.#store.number({ ...this.#read, bit: 5, width: 1 });
  }

  set beautyGreat(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 5, width: 1 }, value);
  }

  get beautyUltra(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 1 });
  }

  set beautyUltra(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 1 }, value);
  }

  get beautyMaster(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 1 });
  }

  set beautyMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 1 }, value);
  }

  get cute(): number {
    return this.#store.number({ ...this.#read, bit: 8, width: 1 });
  }

  set cute(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 8, width: 1 }, value);
  }

  get cuteGreat(): number {
    return this.#store.number({ ...this.#read, bit: 9, width: 1 });
  }

  set cuteGreat(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 9, width: 1 }, value);
  }

  get cuteUltra(): number {
    return this.#store.number({ ...this.#read, bit: 10, width: 1 });
  }

  set cuteUltra(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 10, width: 1 }, value);
  }

  get cuteMaster(): number {
    return this.#store.number({ ...this.#read, bit: 11, width: 1 });
  }

  set cuteMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 11, width: 1 }, value);
  }

  get smart(): number {
    return this.#store.number({ ...this.#read, bit: 12, width: 1 });
  }

  set smart(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 12, width: 1 }, value);
  }

  get smartGreat(): number {
    return this.#store.number({ ...this.#read, bit: 13, width: 1 });
  }

  set smartGreat(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 13, width: 1 }, value);
  }

  get smartUltra(): number {
    return this.#store.number({ ...this.#read, bit: 14, width: 1 });
  }

  set smartUltra(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 14, width: 1 }, value);
  }

  get smartMaster(): number {
    return this.#store.number({ ...this.#read, bit: 15, width: 1 });
  }

  set smartMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 15, width: 1 }, value);
  }

  get tough(): number {
    return this.#store.number({ ...this.#read, bit: 16, width: 1 });
  }

  set tough(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 16, width: 1 }, value);
  }

  get toughGreat(): number {
    return this.#store.number({ ...this.#read, bit: 17, width: 1 });
  }

  set toughGreat(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 17, width: 1 }, value);
  }

  get toughUltra(): number {
    return this.#store.number({ ...this.#read, bit: 18, width: 1 });
  }

  set toughUltra(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 18, width: 1 }, value);
  }

  get toughMaster(): number {
    return this.#store.number({ ...this.#read, bit: 19, width: 1 });
  }

  set toughMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 19, width: 1 }, value);
  }
}

export class Pk4Pokerus {
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

  get days(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 4 });
  }

  set days(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 4 }, value);
  }

  get strain(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 4 });
  }

  set strain(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 4 }, value);
  }
}

export class Pk4MetLevelAndTrainerGender {
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

  get metLevel(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 7 });
  }

  set metLevel(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 7 }, value);
  }

  get trainerGender(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 1 });
  }

  set trainerGender(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 1 }, value);
  }
}

const views: [string, new (store: Store, space: string) => unknown][] = [
  ["general", General],
  ["storage", Storage],
  ["party:{1..6}", Pk4Party],
  ["box:{1..18}:{1..30}", Pk4],
];

export const read = (file: Uint8Array) => new Save(file);
