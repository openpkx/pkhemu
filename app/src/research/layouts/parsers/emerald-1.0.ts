// Generated from known/emerald-1.0.json by tools/parser/generate.ts. Run npm run parsers after changing either.
import { counted, expand, repeat, setEach, spaceView, Store, type At, type Counted, type Read, type SpaceDef } from "../tools/parser/runtime.ts";

export const target = {"schema":"1.0","format":"emerald","version":"1.0"};

const spaces: SpaceDef[] = [
  {"name":"section:0","length":3968,"transform":"gen3-sections","args":{"section":0},"checksums":[{"step":"sum32le-fold16","start":0,"end":3968}]},
  {"name":"section:1","length":3968,"transform":"gen3-sections","args":{"section":1},"checksums":[{"step":"sum32le-fold16","start":0,"end":3968}]},
  {"name":"section:2","length":3968,"transform":"gen3-sections","args":{"section":2},"checksums":[{"step":"sum32le-fold16","start":0,"end":3968}]},
  {"name":"section:3","length":3968,"transform":"gen3-sections","args":{"section":3},"checksums":[{"step":"sum32le-fold16","start":0,"end":3968}]},
  {"name":"section:4","length":3968,"transform":"gen3-sections","args":{"section":4},"checksums":[{"step":"sum32le-fold16","start":0,"end":3968}]},
  {"name":"section:5","length":3968,"transform":"gen3-sections","args":{"section":5},"checksums":[{"step":"sum32le-fold16","start":0,"end":3968}]},
  {"name":"section:6","length":3968,"transform":"gen3-sections","args":{"section":6},"checksums":[{"step":"sum32le-fold16","start":0,"end":3968}]},
  {"name":"section:7","length":3968,"transform":"gen3-sections","args":{"section":7},"checksums":[{"step":"sum32le-fold16","start":0,"end":3968}]},
  {"name":"section:8","length":3968,"transform":"gen3-sections","args":{"section":8},"checksums":[{"step":"sum32le-fold16","start":0,"end":3968}]},
  {"name":"section:9","length":3968,"transform":"gen3-sections","args":{"section":9},"checksums":[{"step":"sum32le-fold16","start":0,"end":3968}]},
  {"name":"section:10","length":3968,"transform":"gen3-sections","args":{"section":10},"checksums":[{"step":"sum32le-fold16","start":0,"end":3968}]},
  {"name":"section:11","length":3968,"transform":"gen3-sections","args":{"section":11},"checksums":[{"step":"sum32le-fold16","start":0,"end":3968}]},
  {"name":"section:12","length":3968,"transform":"gen3-sections","args":{"section":12},"checksums":[{"step":"sum32le-fold16","start":0,"end":3968}]},
  {"name":"section:13","length":3968,"transform":"gen3-sections","args":{"section":13},"checksums":[{"step":"sum32le-fold16","start":0,"end":3968}]},
  {"name":"sector:28","length":3968,"transform":"gen3-sections","args":{"sector":28},"checksums":[{"step":"sum32le-fold16","start":0,"end":3968}]},
  {"name":"sector:29","length":3968,"transform":"gen3-sections","args":{"sector":29},"checksums":[{"step":"sum32le-fold16","start":0,"end":3968}]},
  {"name":"sector:30","length":3968,"transform":"gen3-sections","args":{"sector":30},"checksums":[{"step":"sum32le-fold16","start":0,"end":3968}]},
  {"name":"sector:31","length":3968,"transform":"gen3-sections","args":{"sector":31},"checksums":[{"step":"sum32le-fold16","start":0,"end":3968}]},
  {"name":"party:{1..6}","length":100,"transform":"pk3-crypt","source":{"regions":[{"space":"section:1","start":0,"end":3968}],"offset":568,"stride":100},"checksums":[{"step":"sum16le","start":32,"end":80,"at":28}]},
  {"name":"box:{1..14}:{1..30}","length":80,"transform":"pk3-crypt","source":{"regions":[{"space":"section:5","start":0,"end":3968},{"space":"section:6","start":0,"end":3968},{"space":"section:7","start":0,"end":3968},{"space":"section:8","start":0,"end":3968},{"space":"section:9","start":0,"end":3968},{"space":"section:10","start":0,"end":3968},{"space":"section:11","start":0,"end":3968},{"space":"section:12","start":0,"end":3968},{"space":"section:13","start":0,"end":3968}],"offset":4,"stride":80},"checksums":[{"step":"sum16le","start":32,"end":80,"at":28}]},
];

export type Spaces =
  { "section:0": Section0 } &
  { "section:1": Section1 } &
  { "section:2": Section2 } &
  { "section:3": Section3 } &
  { "section:4": Section4 } &
  { "section:5": Section5 } &
  { "section:6": Section6 } &
  { "section:7": Section7 } &
  { "section:8": Section8 } &
  { "section:9": Section9 } &
  { "section:10": Section10 } &
  { "section:11": Section11 } &
  { "section:12": Section12 } &
  { "section:13": Section13 } &
  { "sector:28": Sector28 } &
  { "sector:29": Sector29 } &
  { "sector:30": Sector30 } &
  { "sector:31": Sector31 } &
  { [Name in `party:${1 | 2 | 3 | 4 | 5 | 6}`]: Pk3Party } &
  { [Name in `box:${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14}:${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30}`]: Pk3 };

export type SpaceName = keyof Spaces;

export class Trainer {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get name(): string {
    return this.#store.text({ space: "section:0", offset: 0x0, type: "text-gen3-intl", length: 8 });
  }

  set name(value: string) {
    this.#store.setText({ space: "section:0", offset: 0x0, type: "text-gen3-intl", length: 8 }, value);
  }

  get gender(): number {
    return this.#store.number({ space: "section:0", offset: 0x8, type: "u8", length: 1 });
  }

  set gender(value: number) {
    this.#store.setNumber({ space: "section:0", offset: 0x8, type: "u8", length: 1 }, value);
  }

  get tid(): number {
    return this.#store.number({ space: "section:0", offset: 0xA, type: "u16le", length: 2 });
  }

  set tid(value: number) {
    this.#store.setNumber({ space: "section:0", offset: 0xA, type: "u16le", length: 2 }, value);
  }

  get sid(): number {
    return this.#store.number({ space: "section:0", offset: 0xC, type: "u16le", length: 2 });
  }

  set sid(value: number) {
    this.#store.setNumber({ space: "section:0", offset: 0xC, type: "u16le", length: 2 }, value);
  }

  get money(): number {
    return this.#store.xorKey({ space: "section:1", offset: 0x490, type: "u32le", length: 4 }, { space: "section:0", offset: 0xAC, type: "u32le", length: 4 });
  }

  set money(value: number) {
    this.#store.setXorKey({ space: "section:1", offset: 0x490, type: "u32le", length: 4 }, { space: "section:0", offset: 0xAC, type: "u32le", length: 4 }, value);
  }

  get coins(): number {
    return this.#store.xorKey({ space: "section:1", offset: 0x494, type: "u16le", length: 2 }, { space: "section:0", offset: 0xAC, type: "u32le", length: 4 });
  }

  set coins(value: number) {
    this.#store.setXorKey({ space: "section:1", offset: 0x494, type: "u16le", length: 2 }, { space: "section:0", offset: 0xAC, type: "u32le", length: 4 }, value);
  }
}

export class PlayTime {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get hours(): number {
    return this.#store.number({ space: "section:0", offset: 0xE, type: "u16le", length: 2 });
  }

  set hours(value: number) {
    this.#store.setNumber({ space: "section:0", offset: 0xE, type: "u16le", length: 2 }, value);
  }

  get minutes(): number {
    return this.#store.number({ space: "section:0", offset: 0x10, type: "u8", length: 1 });
  }

  set minutes(value: number) {
    this.#store.setNumber({ space: "section:0", offset: 0x10, type: "u8", length: 1 }, value);
  }

  get seconds(): number {
    return this.#store.number({ space: "section:0", offset: 0x11, type: "u8", length: 1 });
  }

  set seconds(value: number) {
    this.#store.setNumber({ space: "section:0", offset: 0x11, type: "u8", length: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x38, type: "u8", length: 1 });
  }

  set health(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x38, type: "u8", length: 1 }, value);
  }

  get attack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x39, type: "u8", length: 1 });
  }

  set attack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x39, type: "u8", length: 1 }, value);
  }

  get defense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x3A, type: "u8", length: 1 });
  }

  set defense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x3A, type: "u8", length: 1 }, value);
  }

  get speed(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x3B, type: "u8", length: 1 });
  }

  set speed(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x3B, type: "u8", length: 1 }, value);
  }

  get specialAttack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x3C, type: "u8", length: 1 });
  }

  set specialAttack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x3C, type: "u8", length: 1 }, value);
  }

  get specialDefense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x3D, type: "u8", length: 1 });
  }

  set specialDefense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x3D, type: "u8", length: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x48, type: "u32le", length: 4, bit: 0, width: 5 });
  }

  set health(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x48, type: "u32le", length: 4, bit: 0, width: 5 }, value);
  }

  get attack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x48, type: "u32le", length: 4, bit: 5, width: 5 });
  }

  set attack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x48, type: "u32le", length: 4, bit: 5, width: 5 }, value);
  }

  get defense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x48, type: "u32le", length: 4, bit: 10, width: 5 });
  }

  set defense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x48, type: "u32le", length: 4, bit: 10, width: 5 }, value);
  }

  get speed(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x48, type: "u32le", length: 4, bit: 15, width: 5 });
  }

  set speed(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x48, type: "u32le", length: 4, bit: 15, width: 5 }, value);
  }

  get specialAttack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x48, type: "u32le", length: 4, bit: 20, width: 5 });
  }

  set specialAttack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x48, type: "u32le", length: 4, bit: 20, width: 5 }, value);
  }

  get specialDefense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x48, type: "u32le", length: 4, bit: 25, width: 5 });
  }

  set specialDefense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x48, type: "u32le", length: 4, bit: 25, width: 5 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x2C + this.#at.index * 2, type: "u16le", length: 2 });
  }

  set move(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x2C + this.#at.index * 2, type: "u16le", length: 2 }, value);
  }

  get pp(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x34 + this.#at.index * 1, type: "u8", length: 1 });
  }

  set pp(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x34 + this.#at.index * 1, type: "u8", length: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x4, type: "u32le", length: 4, bit: 0, width: 16 });
  }

  set tid(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x4, type: "u32le", length: 4, bit: 0, width: 16 }, value);
  }

  get sid(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x4, type: "u32le", length: 4, bit: 16, width: 16 });
  }

  set sid(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x4, type: "u32le", length: 4, bit: 16, width: 16 }, value);
  }

  get name(): string {
    return this.#store.text({ space: this.#at.space, offset: 0x14, type: "text-gen3-intl", length: 7 });
  }

  set name(value: string) {
    this.#store.setText({ space: this.#at.space, offset: 0x14, type: "text-gen3-intl", length: 7 }, value);
  }

  get gender(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x46, type: "u16le", length: 2, bit: 15, width: 1 });
  }

  set gender(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x46, type: "u16le", length: 2, bit: 15, width: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x45, type: "u8", length: 1 });
  }

  set location(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x45, type: "u8", length: 1 }, value);
  }

  get level(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x46, type: "u16le", length: 2, bit: 0, width: 7 });
  }

  set level(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x46, type: "u16le", length: 2, bit: 0, width: 7 }, value);
  }

  get version(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x46, type: "u16le", length: 2, bit: 7, width: 4 });
  }

  set version(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x46, type: "u16le", length: 2, bit: 7, width: 4 }, value);
  }

  get fatefulEncounter(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x4C, type: "u32le", length: 4, bit: 31, width: 1 });
  }

  set fatefulEncounter(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x4C, type: "u32le", length: 4, bit: 31, width: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x48, type: "u32le", length: 4, bit: 30, width: 1 });
  }

  set isEgg(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x48, type: "u32le", length: 4, bit: 30, width: 1 }, value);
  }

  get hatchCounter(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x29, type: "u8", length: 1 });
  }

  set hatchCounter(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x29, type: "u8", length: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x44, type: "u8", length: 1, bit: 4, width: 4 });
  }

  set strain(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x44, type: "u8", length: 1, bit: 4, width: 4 }, value);
  }

  get days(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x44, type: "u8", length: 1, bit: 0, width: 4 });
  }

  set days(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x44, type: "u8", length: 1, bit: 0, width: 4 }, value);
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
    this.moves = repeat(4, (index) => new PokemonMove(store, { space: this.#at.space, index, offset: 0x2C + index * 2 }));
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
    return this.#store.number({ space: this.#at.space, offset: 0x20, type: "u16le", length: 2 });
  }

  set species(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x20, type: "u16le", length: 2 }, value);
  }

  get nickname(): string {
    return this.#store.text({ space: this.#at.space, offset: 0x8, type: "text-gen3-intl", length: 10 });
  }

  set nickname(value: string) {
    this.#store.setText({ space: this.#at.space, offset: 0x8, type: "text-gen3-intl", length: 10 }, value);
  }

  get experience(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x24, type: "u32le", length: 4 });
  }

  set experience(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x24, type: "u32le", length: 4 }, value);
  }

  get heldItem(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x22, type: "u16le", length: 2 });
  }

  set heldItem(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x22, type: "u16le", length: 2 }, value);
  }

  get friendship(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x29, type: "u8", length: 1 });
  }

  set friendship(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x29, type: "u8", length: 1 }, value);
  }

  get ball(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x46, type: "u16le", length: 2, bit: 11, width: 4 });
  }

  set ball(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x46, type: "u16le", length: 2, bit: 11, width: 4 }, value);
  }

  get language(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x12, type: "u8", length: 1 });
  }

  set language(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x12, type: "u8", length: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x58, type: "u16le", length: 2 });
  }

  set health(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x58, type: "u16le", length: 2 }, value);
  }

  get attack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x5A, type: "u16le", length: 2 });
  }

  set attack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x5A, type: "u16le", length: 2 }, value);
  }

  get defense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x5C, type: "u16le", length: 2 });
  }

  set defense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x5C, type: "u16le", length: 2 }, value);
  }

  get speed(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x5E, type: "u16le", length: 2 });
  }

  set speed(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x5E, type: "u16le", length: 2 }, value);
  }

  get specialAttack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x60, type: "u16le", length: 2 });
  }

  set specialAttack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x60, type: "u16le", length: 2 }, value);
  }

  get specialDefense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x62, type: "u16le", length: 2 });
  }

  set specialDefense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x62, type: "u16le", length: 2 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x54, type: "u8", length: 1 });
  }

  set level(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x54, type: "u8", length: 1 }, value);
  }

  get currentHp(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x56, type: "u16le", length: 2 });
  }

  set currentHp(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x56, type: "u16le", length: 2 }, value);
  }

  get statusCondition(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x50, type: "u32le", length: 4 });
  }

  set statusCondition(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x50, type: "u32le", length: 4 }, value);
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
    return this.#store.text({ space: "section:13", offset: 0x744 + this.#at.index * 9, type: "text-gen3-intl", length: 9 });
  }

  set name(value: string) {
    this.#store.setText({ space: "section:13", offset: 0x744 + this.#at.index * 9, type: "text-gen3-intl", length: 9 }, value);
  }

  get wallpaper(): number {
    return this.#store.number({ space: "section:13", offset: 0x7C2 + this.#at.index * 1, type: "u8", length: 1 });
  }

  set wallpaper(value: number) {
    this.#store.setNumber({ space: "section:13", offset: 0x7C2 + this.#at.index * 1, type: "u8", length: 1 }, value);
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

export class PocketItem extends Item {
  readonly #store: Store;
  readonly #at: At;

  constructor(store: Store, at: At) {
    super(store, at);
    this.#store = store;
    this.#at = at;
  }

  get count(): number {
    return this.#store.xorKey({ space: this.#at.space, offset: this.#at.offset, type: "u32le", length: 4, bit: 16, width: 16 }, { space: "section:0", offset: 0xAC, type: "u32le", length: 4 });
  }

  set count(value: number) {
    this.#store.setXorKey({ space: this.#at.space, offset: this.#at.offset, type: "u32le", length: 4, bit: 16, width: 16 }, { space: "section:0", offset: 0xAC, type: "u32le", length: 4 }, value);
  }
}

export class Bag {
  readonly items: readonly PocketItem[];
  readonly keyItems: readonly PocketItem[];
  readonly balls: readonly PocketItem[];
  readonly tmsHms: readonly PocketItem[];
  readonly berries: readonly PocketItem[];
  readonly pcItems: readonly Item[];

  constructor(store: Store, _at: At) {
    this.items = repeat(30, (index) => new PocketItem(store, { space: "section:1", index, offset: 0x560 + index * 4 }));
    this.keyItems = repeat(30, (index) => new PocketItem(store, { space: "section:1", index, offset: 0x5D8 + index * 4 }));
    this.balls = repeat(16, (index) => new PocketItem(store, { space: "section:1", index, offset: 0x650 + index * 4 }));
    this.tmsHms = repeat(64, (index) => new PocketItem(store, { space: "section:1", index, offset: 0x690 + index * 4 }));
    this.berries = repeat(46, (index) => new PocketItem(store, { space: "section:1", index, offset: 0x790 + index * 4 }));
    this.pcItems = repeat(50, (index) => new Item(store, { space: "section:1", index, offset: 0x498 + index * 4 }));
  }
}

export class Badges {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get badge1(): number {
    return this.#store.number({ space: "section:2", offset: 0x3FC, type: "u8", length: 1, bit: 7, width: 1 });
  }

  set badge1(value: number) {
    this.#store.setNumber({ space: "section:2", offset: 0x3FC, type: "u8", length: 1, bit: 7, width: 1 }, value);
  }

  get badge2(): number {
    return this.#store.number({ space: "section:2", offset: 0x3FD, type: "u8", length: 1, bit: 0, width: 1 });
  }

  set badge2(value: number) {
    this.#store.setNumber({ space: "section:2", offset: 0x3FD, type: "u8", length: 1, bit: 0, width: 1 }, value);
  }

  get badge3(): number {
    return this.#store.number({ space: "section:2", offset: 0x3FD, type: "u8", length: 1, bit: 1, width: 1 });
  }

  set badge3(value: number) {
    this.#store.setNumber({ space: "section:2", offset: 0x3FD, type: "u8", length: 1, bit: 1, width: 1 }, value);
  }

  get badge4(): number {
    return this.#store.number({ space: "section:2", offset: 0x3FD, type: "u8", length: 1, bit: 2, width: 1 });
  }

  set badge4(value: number) {
    this.#store.setNumber({ space: "section:2", offset: 0x3FD, type: "u8", length: 1, bit: 2, width: 1 }, value);
  }

  get badge5(): number {
    return this.#store.number({ space: "section:2", offset: 0x3FD, type: "u8", length: 1, bit: 3, width: 1 });
  }

  set badge5(value: number) {
    this.#store.setNumber({ space: "section:2", offset: 0x3FD, type: "u8", length: 1, bit: 3, width: 1 }, value);
  }

  get badge6(): number {
    return this.#store.number({ space: "section:2", offset: 0x3FD, type: "u8", length: 1, bit: 4, width: 1 });
  }

  set badge6(value: number) {
    this.#store.setNumber({ space: "section:2", offset: 0x3FD, type: "u8", length: 1, bit: 4, width: 1 }, value);
  }

  get badge7(): number {
    return this.#store.number({ space: "section:2", offset: 0x3FD, type: "u8", length: 1, bit: 5, width: 1 });
  }

  set badge7(value: number) {
    this.#store.setNumber({ space: "section:2", offset: 0x3FD, type: "u8", length: 1, bit: 5, width: 1 }, value);
  }

  get badge8(): number {
    return this.#store.number({ space: "section:2", offset: 0x3FD, type: "u8", length: 1, bit: 6, width: 1 });
  }

  set badge8(value: number) {
    this.#store.setNumber({ space: "section:2", offset: 0x3FD, type: "u8", length: 1, bit: 6, width: 1 }, value);
  }
}

export class Pokedex {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get owned(): readonly boolean[] {
    return this.#store.flags({ space: "section:0", offset: 0x28, type: "flags", length: 49 });
  }

  set owned(value: readonly boolean[]) {
    this.#store.setFlags({ space: "section:0", offset: 0x28, type: "flags", length: 49 }, value);
  }

  get seen(): readonly boolean[] {
    return this.#store.flags({ space: "section:0", offset: 0x5C, type: "flags", length: 49 });
  }

  set seen(value: readonly boolean[]) {
    this.#store.setFlags({ space: "section:0", offset: 0x5C, type: "flags", length: 49 }, value);
  }

  get seenCopy2(): readonly boolean[] {
    return this.#store.flags({ space: "section:1", offset: 0x988, type: "flags", length: 49 });
  }

  set seenCopy2(value: readonly boolean[]) {
    this.#store.setFlags({ space: "section:1", offset: 0x988, type: "flags", length: 49 }, value);
  }

  get seenCopy3(): readonly boolean[] {
    return this.#store.flags({ space: "section:4", offset: 0xCA4, type: "flags", length: 49 });
  }

  set seenCopy3(value: readonly boolean[]) {
    this.#store.setFlags({ space: "section:4", offset: 0xCA4, type: "flags", length: 49 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x41C + this.#at.index * 2, type: "u16le", length: 2 });
  }

  set value(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x41C + this.#at.index * 2, type: "u16le", length: 2 }, value);
  }
}

export class Events {
  readonly #store: Store;
  readonly work: readonly EventsEventWork[];

  constructor(store: Store, _at: At) {
    this.#store = store;
    this.work = repeat(256, (index) => new EventsEventWork(store, { space: "section:2", index, offset: 0x41C + index * 2 }));
  }

  get flags(): readonly boolean[] {
    return this.#store.flags({ space: "section:2", offset: 0x2F0, type: "flags", length: 300 });
  }

  set flags(value: readonly boolean[]) {
    this.#store.setFlags({ space: "section:2", offset: 0x2F0, type: "flags", length: 300 }, value);
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
    this.party = counted(expand("party:{1..6}").map((space, index) => new PartyPokemon(store, { space, index, offset: 0 })), store, { space: "section:1", offset: 0x234, type: "u8", length: 1 });
    this.boxes = expand("box:{1..14}").map((space, index) => new Box(store, { space, index, offset: 0 }));
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

export class Section0 {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get trainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x0, type: "text-gen3-intl", length: 8 });
  }

  set trainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x0, type: "text-gen3-intl", length: 8 }, value);
  }

  get trainerGender(): number {
    return this.#store.number({ space: this.#space, offset: 0x8, type: "u8", length: 1 });
  }

  set trainerGender(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x8, type: "u8", length: 1 }, value);
  }

  get trainerId(): number {
    return this.#store.number({ space: this.#space, offset: 0xA, type: "u16le", length: 2 });
  }

  set trainerId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA, type: "u16le", length: 2 }, value);
  }

  get secretId(): number {
    return this.#store.number({ space: this.#space, offset: 0xC, type: "u16le", length: 2 });
  }

  set secretId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xC, type: "u16le", length: 2 }, value);
  }

  get playTimeHours(): number {
    return this.#store.number({ space: this.#space, offset: 0xE, type: "u16le", length: 2 });
  }

  set playTimeHours(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xE, type: "u16le", length: 2 }, value);
  }

  get playTimeMinutes(): number {
    return this.#store.number({ space: this.#space, offset: 0x10, type: "u8", length: 1 });
  }

  set playTimeMinutes(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x10, type: "u8", length: 1 }, value);
  }

  get playTimeSeconds(): number {
    return this.#store.number({ space: this.#space, offset: 0x11, type: "u8", length: 1 });
  }

  set playTimeSeconds(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x11, type: "u8", length: 1 }, value);
  }

  get playTimeFrames(): number {
    return this.#store.number({ space: this.#space, offset: 0x12, type: "u8", length: 1 });
  }

  set playTimeFrames(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x12, type: "u8", length: 1 }, value);
  }

  get buttonModeOption(): number {
    return this.#store.number({ space: this.#space, offset: 0x13, type: "u8", length: 1 });
  }

  set buttonModeOption(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x13, type: "u8", length: 1 }, value);
  }

  get options(): Section0Options {
    return new Section0Options(this.#store, { space: this.#space, offset: 0x14, type: "u32le", length: 4 });
  }

  get pokedexSortOrder(): number {
    return this.#store.number({ space: this.#space, offset: 0x18, type: "u8", length: 1 });
  }

  set pokedexSortOrder(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x18, type: "u8", length: 1 }, value);
  }

  get pokedexMode(): number {
    return this.#store.number({ space: this.#space, offset: 0x19, type: "u8", length: 1 });
  }

  set pokedexMode(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x19, type: "u8", length: 1 }, value);
  }

  get nationalPokedexMagic(): number {
    return this.#store.number({ space: this.#space, offset: 0x1A, type: "u8", length: 1 });
  }

  set nationalPokedexMagic(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1A, type: "u8", length: 1 }, value);
  }

  get pokedexUnownPid(): number {
    return this.#store.number({ space: this.#space, offset: 0x1C, type: "u32le", length: 4 });
  }

  set pokedexUnownPid(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1C, type: "u32le", length: 4 }, value);
  }

  get pokedexSpindaPid(): number {
    return this.#store.number({ space: this.#space, offset: 0x20, type: "u32le", length: 4 });
  }

  set pokedexSpindaPid(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x20, type: "u32le", length: 4 }, value);
  }

  get pokedexOwnedFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x28, type: "flags", length: 49 });
  }

  set pokedexOwnedFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x28, type: "flags", length: 49 }, value);
  }

  get pokedexSeenFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x5C, type: "flags", length: 49 });
  }

  set pokedexSeenFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x5C, type: "flags", length: 49 }, value);
  }

  get clockOffsetDays(): number {
    return this.#store.number({ space: this.#space, offset: 0x98, type: "u16le", length: 2 });
  }

  set clockOffsetDays(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x98, type: "u16le", length: 2 }, value);
  }

  get clockOffsetHours(): number {
    return this.#store.number({ space: this.#space, offset: 0x9A, type: "u8", length: 1 });
  }

  set clockOffsetHours(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x9A, type: "u8", length: 1 }, value);
  }

  get clockOffsetMinutes(): number {
    return this.#store.number({ space: this.#space, offset: 0x9B, type: "u8", length: 1 });
  }

  set clockOffsetMinutes(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x9B, type: "u8", length: 1 }, value);
  }

  get clockOffsetSeconds(): number {
    return this.#store.number({ space: this.#space, offset: 0x9C, type: "u8", length: 1 });
  }

  set clockOffsetSeconds(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x9C, type: "u8", length: 1 }, value);
  }

  get lastBerryUpdateDays(): number {
    return this.#store.number({ space: this.#space, offset: 0xA0, type: "u16le", length: 2 });
  }

  set lastBerryUpdateDays(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA0, type: "u16le", length: 2 }, value);
  }

  get lastBerryUpdateHours(): number {
    return this.#store.number({ space: this.#space, offset: 0xA2, type: "u8", length: 1 });
  }

  set lastBerryUpdateHours(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA2, type: "u8", length: 1 }, value);
  }

  get lastBerryUpdateMinutes(): number {
    return this.#store.number({ space: this.#space, offset: 0xA3, type: "u8", length: 1 });
  }

  set lastBerryUpdateMinutes(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA3, type: "u8", length: 1 }, value);
  }

  get lastBerryUpdateSeconds(): number {
    return this.#store.number({ space: this.#space, offset: 0xA4, type: "u8", length: 1 });
  }

  set lastBerryUpdateSeconds(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA4, type: "u8", length: 1 }, value);
  }

  get linkFlags(): number {
    return this.#store.number({ space: this.#space, offset: 0xA8, type: "u32le", length: 4 });
  }

  set linkFlags(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA8, type: "u32le", length: 4 }, value);
  }

  get securityKey(): number {
    return this.#store.number({ space: this.#space, offset: 0xAC, type: "u32le", length: 4 });
  }

  set securityKey(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xAC, type: "u32le", length: 4 }, value);
  }

  get playersApprentice(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0xB0, type: "bytes", length: 44 });
  }

  set playersApprentice(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0xB0, type: "bytes", length: 44 }, value);
  }

  get apprentices(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0xDC, type: "bytes", length: 272 });
  }

  set apprentices(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0xDC, type: "bytes", length: 272 }, value);
  }

  get berryCrushBestPressSpeeds(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x1EC + i * 2, type: "u16le", length: 2 }));
  }

  set berryCrushBestPressSpeeds(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x1EC + i * 2, type: "u16le", length: 2 }, value));
  }

  get berryPowder(): number {
    return this.#store.number({ space: this.#space, offset: 0x1F4, type: "u32le", length: 4 });
  }

  set berryPowder(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1F4, type: "u32le", length: 4 }, value);
  }

  get pokemonJumpJumpsInARow(): number {
    return this.#store.number({ space: this.#space, offset: 0x1FC, type: "u16le", length: 2 });
  }

  set pokemonJumpJumpsInARow(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1FC, type: "u16le", length: 2 }, value);
  }

  get pokemonJumpFivePlayerJumpsInARow(): number {
    return this.#store.number({ space: this.#space, offset: 0x200, type: "u16le", length: 2 });
  }

  set pokemonJumpFivePlayerJumpsInARow(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x200, type: "u16le", length: 2 }, value);
  }

  get pokemonJumpGamesWithTheMostPlayers(): number {
    return this.#store.number({ space: this.#space, offset: 0x202, type: "u16le", length: 2 });
  }

  set pokemonJumpGamesWithTheMostPlayers(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x202, type: "u16le", length: 2 }, value);
  }

  get pokemonJumpBestScore(): number {
    return this.#store.number({ space: this.#space, offset: 0x208, type: "u32le", length: 4 });
  }

  set pokemonJumpBestScore(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x208, type: "u32le", length: 4 }, value);
  }

  get dodrioBerryPickingBestScore(): number {
    return this.#store.number({ space: this.#space, offset: 0x20C, type: "u32le", length: 4 });
  }

  set dodrioBerryPickingBestScore(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x20C, type: "u32le", length: 4 }, value);
  }

  get dodrioBerryPickingBerriesInARow(): number {
    return this.#store.number({ space: this.#space, offset: 0x210, type: "u16le", length: 2 });
  }

  set dodrioBerryPickingBerriesInARow(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x210, type: "u16le", length: 2 }, value);
  }

  get dodrioBerryPickingFivePlayerBerriesInARow(): number {
    return this.#store.number({ space: this.#space, offset: 0x212, type: "u16le", length: 2 });
  }

  set dodrioBerryPickingFivePlayerBerriesInARow(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x212, type: "u16le", length: 2 }, value);
  }

  get eReaderTrainer(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0xBEC, type: "bytes", length: 188 });
  }

  set eReaderTrainer(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0xBEC, type: "bytes", length: 188 }, value);
  }

  get battleFrontierStreakContinueFlags(): Section0BattleFrontierStreakContinueFlags {
    return new Section0BattleFrontierStreakContinueFlags(this.#store, { space: this.#space, offset: 0xCDC, type: "u32le", length: 4 });
  }

  get battleTowerCurrentStreaks(): readonly (number)[] {
    return repeat(8, (i) => this.#store.number({ space: this.#space, offset: 0xCE0 + i * 2, type: "u16le", length: 2 }));
  }

  set battleTowerCurrentStreaks(values: readonly (number)[]) {
    setEach(8, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xCE0 + i * 2, type: "u16le", length: 2 }, value));
  }

  get battleTowerRecordStreaks(): readonly (number)[] {
    return repeat(8, (i) => this.#store.number({ space: this.#space, offset: 0xCF0 + i * 2, type: "u16le", length: 2 }));
  }

  set battleTowerRecordStreaks(values: readonly (number)[]) {
    setEach(8, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xCF0 + i * 2, type: "u16le", length: 2 }, value));
  }

  get battleDomeCurrentStreaks(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0xD0C + i * 2, type: "u16le", length: 2 }));
  }

  set battleDomeCurrentStreaks(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xD0C + i * 2, type: "u16le", length: 2 }, value));
  }

  get battleDomeRecordStreaks(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0xD14 + i * 2, type: "u16le", length: 2 }));
  }

  set battleDomeRecordStreaks(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xD14 + i * 2, type: "u16le", length: 2 }, value));
  }

  get battleDomeChampionships(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0xD1C + i * 2, type: "u16le", length: 2 }));
  }

  set battleDomeChampionships(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xD1C + i * 2, type: "u16le", length: 2 }, value));
  }

  get battlePalaceCurrentStreaks(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0xDC8 + i * 2, type: "u16le", length: 2 }));
  }

  set battlePalaceCurrentStreaks(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xDC8 + i * 2, type: "u16le", length: 2 }, value));
  }

  get battlePalaceRecordStreaks(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0xDD0 + i * 2, type: "u16le", length: 2 }));
  }

  set battlePalaceRecordStreaks(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xDD0 + i * 2, type: "u16le", length: 2 }, value));
  }

  get battleArenaCurrentStreaks(): readonly (number)[] {
    return repeat(2, (i) => this.#store.number({ space: this.#space, offset: 0xDDA + i * 2, type: "u16le", length: 2 }));
  }

  set battleArenaCurrentStreaks(values: readonly (number)[]) {
    setEach(2, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xDDA + i * 2, type: "u16le", length: 2 }, value));
  }

  get battleArenaRecordStreaks(): readonly (number)[] {
    return repeat(2, (i) => this.#store.number({ space: this.#space, offset: 0xDDE + i * 2, type: "u16le", length: 2 }));
  }

  set battleArenaRecordStreaks(values: readonly (number)[]) {
    setEach(2, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xDDE + i * 2, type: "u16le", length: 2 }, value));
  }

  get battleFactoryCurrentStreaks(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0xDE2 + i * 2, type: "u16le", length: 2 }));
  }

  set battleFactoryCurrentStreaks(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xDE2 + i * 2, type: "u16le", length: 2 }, value));
  }

  get battleFactoryRecordStreaks(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0xDEA + i * 2, type: "u16le", length: 2 }));
  }

  set battleFactoryRecordStreaks(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xDEA + i * 2, type: "u16le", length: 2 }, value));
  }

  get battleFactoryCurrentSwaps(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0xDF2 + i * 2, type: "u16le", length: 2 }));
  }

  set battleFactoryCurrentSwaps(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xDF2 + i * 2, type: "u16le", length: 2 }, value));
  }

  get battleFactoryRecordSwaps(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0xDFA + i * 2, type: "u16le", length: 2 }));
  }

  set battleFactoryRecordSwaps(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xDFA + i * 2, type: "u16le", length: 2 }, value));
  }

  get battlePikeCurrentStreaks(): readonly (number)[] {
    return repeat(2, (i) => this.#store.number({ space: this.#space, offset: 0xE04 + i * 2, type: "u16le", length: 2 }));
  }

  set battlePikeCurrentStreaks(values: readonly (number)[]) {
    setEach(2, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xE04 + i * 2, type: "u16le", length: 2 }, value));
  }

  get battlePikeRecordStreaks(): readonly (number)[] {
    return repeat(2, (i) => this.#store.number({ space: this.#space, offset: 0xE08 + i * 2, type: "u16le", length: 2 }));
  }

  set battlePikeRecordStreaks(values: readonly (number)[]) {
    setEach(2, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xE08 + i * 2, type: "u16le", length: 2 }, value));
  }

  get battlePikeRoomsClearedRecord(): readonly (number)[] {
    return repeat(2, (i) => this.#store.number({ space: this.#space, offset: 0xE0C + i * 2, type: "u16le", length: 2 }));
  }

  set battlePikeRoomsClearedRecord(values: readonly (number)[]) {
    setEach(2, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xE0C + i * 2, type: "u16le", length: 2 }, value));
  }

  get battlePyramidCurrentStreaks(): readonly (number)[] {
    return repeat(2, (i) => this.#store.number({ space: this.#space, offset: 0xE1A + i * 2, type: "u16le", length: 2 }));
  }

  set battlePyramidCurrentStreaks(values: readonly (number)[]) {
    setEach(2, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xE1A + i * 2, type: "u16le", length: 2 }, value));
  }

  get battlePyramidRecordStreaks(): readonly (number)[] {
    return repeat(2, (i) => this.#store.number({ space: this.#space, offset: 0xE1E + i * 2, type: "u16le", length: 2 }));
  }

  set battlePyramidRecordStreaks(values: readonly (number)[]) {
    setEach(2, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xE1E + i * 2, type: "u16le", length: 2 }, value));
  }

  get battlePoints(): number {
    return this.#store.number({ space: this.#space, offset: 0xEB8, type: "u16le", length: 2 });
  }

  set battlePoints(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xEB8, type: "u16le", length: 2 }, value);
  }

  get battlePointsEarned(): number {
    return this.#store.number({ space: this.#space, offset: 0xEBA, type: "u16le", length: 2 });
  }

  set battlePointsEarned(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xEBA, type: "u16le", length: 2 }, value);
  }
}

export class Section0Options {
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

  get textSpeed(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 3 });
  }

  set textSpeed(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 3 }, value);
  }

  get windowFrame(): number {
    return this.#store.number({ ...this.#read, bit: 3, width: 5 });
  }

  set windowFrame(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 3, width: 5 }, value);
  }

  get sound(): number {
    return this.#store.number({ ...this.#read, bit: 8, width: 1 });
  }

  set sound(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 8, width: 1 }, value);
  }

  get battleStyle(): number {
    return this.#store.number({ ...this.#read, bit: 9, width: 1 });
  }

  set battleStyle(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 9, width: 1 }, value);
  }

  get battleScene(): number {
    return this.#store.number({ ...this.#read, bit: 10, width: 1 });
  }

  set battleScene(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 10, width: 1 }, value);
  }

  get regionMapZoom(): number {
    return this.#store.number({ ...this.#read, bit: 11, width: 1 });
  }

  set regionMapZoom(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 11, width: 1 }, value);
  }
}

export class Section0BattleFrontierStreakContinueFlags {
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

  get towerSingles(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 2 });
  }

  set towerSingles(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 2 }, value);
  }

  get domeSingles(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 2 });
  }

  set domeSingles(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 2 }, value);
  }

  get palaceSingles(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 2 });
  }

  set palaceSingles(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 2 }, value);
  }

  get arena(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 2 });
  }

  set arena(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 2 }, value);
  }

  get factorySingles(): number {
    return this.#store.number({ ...this.#read, bit: 8, width: 2 });
  }

  set factorySingles(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 8, width: 2 }, value);
  }

  get pike(): number {
    return this.#store.number({ ...this.#read, bit: 10, width: 2 });
  }

  set pike(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 10, width: 2 }, value);
  }

  get pyramid(): number {
    return this.#store.number({ ...this.#read, bit: 12, width: 2 });
  }

  set pyramid(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 12, width: 2 }, value);
  }

  get towerDoubles(): number {
    return this.#store.number({ ...this.#read, bit: 14, width: 2 });
  }

  set towerDoubles(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 14, width: 2 }, value);
  }

  get towerMulti(): number {
    return this.#store.number({ ...this.#read, bit: 16, width: 2 });
  }

  set towerMulti(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 16, width: 2 }, value);
  }

  get towerLinked(): number {
    return this.#store.number({ ...this.#read, bit: 18, width: 2 });
  }

  set towerLinked(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 18, width: 2 }, value);
  }

  get domeDoubles(): number {
    return this.#store.number({ ...this.#read, bit: 20, width: 2 });
  }

  set domeDoubles(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 20, width: 2 }, value);
  }

  get palaceDoubles(): number {
    return this.#store.number({ ...this.#read, bit: 22, width: 2 });
  }

  set palaceDoubles(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 22, width: 2 }, value);
  }

  get factoryDoubles(): number {
    return this.#store.number({ ...this.#read, bit: 24, width: 2 });
  }

  set factoryDoubles(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 24, width: 2 }, value);
  }
}

export class Section1 {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get playerXPosition(): number {
    return this.#store.number({ space: this.#space, offset: 0x0, type: "u16le", length: 2 });
  }

  set playerXPosition(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x0, type: "u16le", length: 2 }, value);
  }

  get playerYPosition(): number {
    return this.#store.number({ space: this.#space, offset: 0x2, type: "u16le", length: 2 });
  }

  set playerYPosition(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2, type: "u16le", length: 2 }, value);
  }

  get partyCount(): number {
    return this.#store.number({ space: this.#space, offset: 0x234, type: "u8", length: 1 });
  }

  set partyCount(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x234, type: "u8", length: 1 }, value);
  }

  get partyPokemon(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x238, type: "bytes", length: 600 });
  }

  set partyPokemon(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x238, type: "bytes", length: 600 }, value);
  }

  get money(): number {
    return this.#store.number({ space: this.#space, offset: 0x490, type: "u32le", length: 4 });
  }

  set money(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x490, type: "u32le", length: 4 }, value);
  }

  get coins(): number {
    return this.#store.number({ space: this.#space, offset: 0x494, type: "u16le", length: 2 });
  }

  set coins(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x494, type: "u16le", length: 2 }, value);
  }

  get registeredItem(): number {
    return this.#store.number({ space: this.#space, offset: 0x496, type: "u16le", length: 2 });
  }

  set registeredItem(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x496, type: "u16le", length: 2 }, value);
  }

  get pcItems(): readonly Section1PcItems[] {
    return repeat(50, (i) => new Section1PcItems(this.#store, { space: this.#space, offset: 0x498 + i * 4, type: "u32le", length: 4 }));
  }

  get itemsPocket(): readonly Section1ItemsPocket[] {
    return repeat(30, (i) => new Section1ItemsPocket(this.#store, { space: this.#space, offset: 0x560 + i * 4, type: "u32le", length: 4 }));
  }

  get keyItemsPocket(): readonly Section1KeyItemsPocket[] {
    return repeat(30, (i) => new Section1KeyItemsPocket(this.#store, { space: this.#space, offset: 0x5D8 + i * 4, type: "u32le", length: 4 }));
  }

  get pokeBallsPocket(): readonly Section1PokeBallsPocket[] {
    return repeat(16, (i) => new Section1PokeBallsPocket(this.#store, { space: this.#space, offset: 0x650 + i * 4, type: "u32le", length: 4 }));
  }

  get tmsAndHmsPocket(): readonly Section1TmsAndHmsPocket[] {
    return repeat(64, (i) => new Section1TmsAndHmsPocket(this.#store, { space: this.#space, offset: 0x690 + i * 4, type: "u32le", length: 4 }));
  }

  get berriesPocket(): readonly Section1BerriesPocket[] {
    return repeat(46, (i) => new Section1BerriesPocket(this.#store, { space: this.#space, offset: 0x790 + i * 4, type: "u32le", length: 4 }));
  }

  get pokeblockColor(): readonly (number)[] {
    return repeat(40, (i) => this.#store.number({ space: this.#space, offset: 0x848 + i * 8, type: "u8", length: 1 }));
  }

  set pokeblockColor(values: readonly (number)[]) {
    setEach(40, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x848 + i * 8, type: "u8", length: 1 }, value));
  }

  get pokeblockSpicy(): readonly (number)[] {
    return repeat(40, (i) => this.#store.number({ space: this.#space, offset: 0x849 + i * 8, type: "u8", length: 1 }));
  }

  set pokeblockSpicy(values: readonly (number)[]) {
    setEach(40, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x849 + i * 8, type: "u8", length: 1 }, value));
  }

  get pokeblockDry(): readonly (number)[] {
    return repeat(40, (i) => this.#store.number({ space: this.#space, offset: 0x84A + i * 8, type: "u8", length: 1 }));
  }

  set pokeblockDry(values: readonly (number)[]) {
    setEach(40, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x84A + i * 8, type: "u8", length: 1 }, value));
  }

  get pokeblockSweet(): readonly (number)[] {
    return repeat(40, (i) => this.#store.number({ space: this.#space, offset: 0x84B + i * 8, type: "u8", length: 1 }));
  }

  set pokeblockSweet(values: readonly (number)[]) {
    setEach(40, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x84B + i * 8, type: "u8", length: 1 }, value));
  }

  get pokeblockBitter(): readonly (number)[] {
    return repeat(40, (i) => this.#store.number({ space: this.#space, offset: 0x84C + i * 8, type: "u8", length: 1 }));
  }

  set pokeblockBitter(values: readonly (number)[]) {
    setEach(40, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x84C + i * 8, type: "u8", length: 1 }, value));
  }

  get pokeblockSour(): readonly (number)[] {
    return repeat(40, (i) => this.#store.number({ space: this.#space, offset: 0x84D + i * 8, type: "u8", length: 1 }));
  }

  set pokeblockSour(values: readonly (number)[]) {
    setEach(40, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x84D + i * 8, type: "u8", length: 1 }, value));
  }

  get pokeblockFeel(): readonly (number)[] {
    return repeat(40, (i) => this.#store.number({ space: this.#space, offset: 0x84E + i * 8, type: "u8", length: 1 }));
  }

  set pokeblockFeel(values: readonly (number)[]) {
    setEach(40, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x84E + i * 8, type: "u8", length: 1 }, value));
  }

  get pokedexSeenFlagsCopy2(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x988, type: "flags", length: 49 });
  }

  set pokedexSeenFlagsCopy2(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x988, type: "flags", length: 49 }, value);
  }

  get berryBlenderBestSpeeds(): readonly (number)[] {
    return repeat(3, (i) => this.#store.number({ space: this.#space, offset: 0x9BC + i * 2, type: "u16le", length: 2 }));
  }

  set berryBlenderBestSpeeds(values: readonly (number)[]) {
    setEach(3, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x9BC + i * 2, type: "u16le", length: 2 }, value));
  }
}

export class Section1PcItems {
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

export class Section1ItemsPocket {
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

export class Section1KeyItemsPocket {
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

export class Section1PokeBallsPocket {
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

export class Section1TmsAndHmsPocket {
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

export class Section1BerriesPocket {
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

export class Section2 {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get eventFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x2F0, type: "flags", length: 300 });
  }

  set eventFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x2F0, type: "flags", length: 300 }, value);
  }

  get eventVariables(): readonly (number)[] {
    return repeat(256, (i) => this.#store.number({ space: this.#space, offset: 0x41C + i * 2, type: "u16le", length: 2 }));
  }

  set eventVariables(values: readonly (number)[]) {
    setEach(256, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x41C + i * 2, type: "u16le", length: 2 }, value));
  }

  get gameStats(): readonly (number)[] {
    return repeat(64, (i) => this.#store.number({ space: this.#space, offset: 0x61C + i * 4, type: "u32le", length: 4 }));
  }

  set gameStats(values: readonly (number)[]) {
    setEach(64, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x61C + i * 4, type: "u32le", length: 4 }, value));
  }

  get secretBaseLocation(): readonly (number)[] {
    return repeat(8, (i) => this.#store.number({ space: this.#space, offset: 0xB1C + i * 160, type: "u8", length: 1 }));
  }

  set secretBaseLocation(values: readonly (number)[]) {
    setEach(8, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xB1C + i * 160, type: "u8", length: 1 }, value));
  }

  get secretBaseOwnerFlags(): readonly Section2SecretBaseOwnerFlags[] {
    return repeat(8, (i) => new Section2SecretBaseOwnerFlags(this.#store, { space: this.#space, offset: 0xB1D + i * 160, type: "u8", length: 1 }));
  }

  get secretBaseTrainerName(): readonly (string)[] {
    return repeat(7, (i) => this.#store.text({ space: this.#space, offset: 0xB1E + i * 160, type: "text-gen3-intl", length: 7 }));
  }

  set secretBaseTrainerName(values: readonly (string)[]) {
    setEach(7, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0xB1E + i * 160, type: "text-gen3-intl", length: 7 }, value));
  }

  get secretBaseTrainerId(): readonly (number)[] {
    return repeat(7, (i) => this.#store.number({ space: this.#space, offset: 0xB25 + i * 160, type: "u16le", length: 2 }));
  }

  set secretBaseTrainerId(values: readonly (number)[]) {
    setEach(7, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xB25 + i * 160, type: "u16le", length: 2 }, value));
  }

  get secretBaseSecretId(): readonly (number)[] {
    return repeat(7, (i) => this.#store.number({ space: this.#space, offset: 0xB27 + i * 160, type: "u16le", length: 2 }));
  }

  set secretBaseSecretId(values: readonly (number)[]) {
    setEach(7, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xB27 + i * 160, type: "u16le", length: 2 }, value));
  }

  get secretBaseLanguage(): readonly (number)[] {
    return repeat(7, (i) => this.#store.number({ space: this.#space, offset: 0xB29 + i * 160, type: "u8", length: 1 }));
  }

  set secretBaseLanguage(values: readonly (number)[]) {
    setEach(7, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xB29 + i * 160, type: "u8", length: 1 }, value));
  }

  get secretBasesReceived(): readonly (number)[] {
    return repeat(7, (i) => this.#store.number({ space: this.#space, offset: 0xB2A + i * 160, type: "u16le", length: 2 }));
  }

  set secretBasesReceived(values: readonly (number)[]) {
    setEach(7, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xB2A + i * 160, type: "u16le", length: 2 }, value));
  }

  get secretBaseTimesEntered(): readonly (number)[] {
    return repeat(7, (i) => this.#store.number({ space: this.#space, offset: 0xB2C + i * 160, type: "u8", length: 1 }));
  }

  set secretBaseTimesEntered(values: readonly (number)[]) {
    setEach(7, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xB2C + i * 160, type: "u8", length: 1 }, value));
  }

  get secretBaseDecorations(): readonly (Uint8Array)[] {
    return repeat(7, (i) => this.#store.raw({ space: this.#space, offset: 0xB2E + i * 160, type: "bytes", length: 16 }));
  }

  set secretBaseDecorations(values: readonly (Uint8Array)[]) {
    setEach(7, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0xB2E + i * 160, type: "bytes", length: 16 }, value));
  }

  get secretBaseDecorationPositions(): readonly (Uint8Array)[] {
    return repeat(7, (i) => this.#store.raw({ space: this.#space, offset: 0xB3E + i * 160, type: "bytes", length: 16 }));
  }

  set secretBaseDecorationPositions(values: readonly (Uint8Array)[]) {
    setEach(7, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0xB3E + i * 160, type: "bytes", length: 16 }, value));
  }

  get secretBaseTeam(): readonly (Uint8Array)[] {
    return repeat(7, (i) => this.#store.raw({ space: this.#space, offset: 0xB50 + i * 160, type: "bytes", length: 108 }));
  }

  set secretBaseTeam(values: readonly (Uint8Array)[]) {
    setEach(7, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0xB50 + i * 160, type: "bytes", length: 108 }, value));
  }

  get secretBaseTrainerNamePart1(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0xF7E, type: "bytes", length: 2 });
  }

  set secretBaseTrainerNamePart1(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0xF7E, type: "bytes", length: 2 }, value);
  }
}

export class Section2SecretBaseOwnerFlags {
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

  get trainerGender(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 1 });
  }

  set trainerGender(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 1 }, value);
  }

  get battledToday(): number {
    return this.#store.number({ ...this.#read, bit: 5, width: 1 });
  }

  set battledToday(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 5, width: 1 }, value);
  }

  get registryStatus(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 2 });
  }

  set registryStatus(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 2 }, value);
  }
}

export class Section3 {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get secretBaseTrainerNamePart2(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x0, type: "bytes", length: 5 });
  }

  set secretBaseTrainerNamePart2(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x0, type: "bytes", length: 5 }, value);
  }

  get secretBaseTrainerId(): readonly (number)[] {
    return repeat(13, (i) => this.#store.number({ space: this.#space, offset: 0x5 + i * 160, type: "u16le", length: 2 }));
  }

  set secretBaseTrainerId(values: readonly (number)[]) {
    setEach(13, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x5 + i * 160, type: "u16le", length: 2 }, value));
  }

  get secretBaseSecretId(): readonly (number)[] {
    return repeat(13, (i) => this.#store.number({ space: this.#space, offset: 0x7 + i * 160, type: "u16le", length: 2 }));
  }

  set secretBaseSecretId(values: readonly (number)[]) {
    setEach(13, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x7 + i * 160, type: "u16le", length: 2 }, value));
  }

  get secretBaseLanguage(): readonly (number)[] {
    return repeat(13, (i) => this.#store.number({ space: this.#space, offset: 0x9 + i * 160, type: "u8", length: 1 }));
  }

  set secretBaseLanguage(values: readonly (number)[]) {
    setEach(13, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x9 + i * 160, type: "u8", length: 1 }, value));
  }

  get secretBasesReceived(): readonly (number)[] {
    return repeat(13, (i) => this.#store.number({ space: this.#space, offset: 0xA + i * 160, type: "u16le", length: 2 }));
  }

  set secretBasesReceived(values: readonly (number)[]) {
    setEach(13, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xA + i * 160, type: "u16le", length: 2 }, value));
  }

  get secretBaseTimesEntered(): readonly (number)[] {
    return repeat(13, (i) => this.#store.number({ space: this.#space, offset: 0xC + i * 160, type: "u8", length: 1 }));
  }

  set secretBaseTimesEntered(values: readonly (number)[]) {
    setEach(13, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xC + i * 160, type: "u8", length: 1 }, value));
  }

  get secretBaseDecorations(): readonly (Uint8Array)[] {
    return repeat(13, (i) => this.#store.raw({ space: this.#space, offset: 0xE + i * 160, type: "bytes", length: 16 }));
  }

  set secretBaseDecorations(values: readonly (Uint8Array)[]) {
    setEach(13, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0xE + i * 160, type: "bytes", length: 16 }, value));
  }

  get secretBaseDecorationPositions(): readonly (Uint8Array)[] {
    return repeat(13, (i) => this.#store.raw({ space: this.#space, offset: 0x1E + i * 160, type: "bytes", length: 16 }));
  }

  set secretBaseDecorationPositions(values: readonly (Uint8Array)[]) {
    setEach(13, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0x1E + i * 160, type: "bytes", length: 16 }, value));
  }

  get secretBaseTeam(): readonly (Uint8Array)[] {
    return repeat(13, (i) => this.#store.raw({ space: this.#space, offset: 0x30 + i * 160, type: "bytes", length: 108 }));
  }

  set secretBaseTeam(values: readonly (Uint8Array)[]) {
    setEach(13, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0x30 + i * 160, type: "bytes", length: 108 }, value));
  }

  get secretBaseLocation(): readonly (number)[] {
    return repeat(12, (i) => this.#store.number({ space: this.#space, offset: 0x9C + i * 160, type: "u8", length: 1 }));
  }

  set secretBaseLocation(values: readonly (number)[]) {
    setEach(12, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x9C + i * 160, type: "u8", length: 1 }, value));
  }

  get secretBaseOwnerFlags(): readonly Section3SecretBaseOwnerFlags[] {
    return repeat(12, (i) => new Section3SecretBaseOwnerFlags(this.#store, { space: this.#space, offset: 0x9D + i * 160, type: "u8", length: 1 }));
  }

  get secretBaseTrainerName(): readonly (string)[] {
    return repeat(12, (i) => this.#store.text({ space: this.#space, offset: 0x9E + i * 160, type: "text-gen3-intl", length: 7 }));
  }

  set secretBaseTrainerName(values: readonly (string)[]) {
    setEach(12, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0x9E + i * 160, type: "text-gen3-intl", length: 7 }, value));
  }

  get decorationDesks(): readonly (number)[] {
    return repeat(10, (i) => this.#store.number({ space: this.#space, offset: 0x834 + i * 1, type: "u8", length: 1 }));
  }

  set decorationDesks(values: readonly (number)[]) {
    setEach(10, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x834 + i * 1, type: "u8", length: 1 }, value));
  }

  get decorationChairs(): readonly (number)[] {
    return repeat(10, (i) => this.#store.number({ space: this.#space, offset: 0x83E + i * 1, type: "u8", length: 1 }));
  }

  set decorationChairs(values: readonly (number)[]) {
    setEach(10, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x83E + i * 1, type: "u8", length: 1 }, value));
  }

  get decorationPlants(): readonly (number)[] {
    return repeat(10, (i) => this.#store.number({ space: this.#space, offset: 0x848 + i * 1, type: "u8", length: 1 }));
  }

  set decorationPlants(values: readonly (number)[]) {
    setEach(10, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x848 + i * 1, type: "u8", length: 1 }, value));
  }

  get decorationOrnaments(): readonly (number)[] {
    return repeat(30, (i) => this.#store.number({ space: this.#space, offset: 0x852 + i * 1, type: "u8", length: 1 }));
  }

  set decorationOrnaments(values: readonly (number)[]) {
    setEach(30, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x852 + i * 1, type: "u8", length: 1 }, value));
  }

  get decorationMats(): readonly (number)[] {
    return repeat(30, (i) => this.#store.number({ space: this.#space, offset: 0x870 + i * 1, type: "u8", length: 1 }));
  }

  set decorationMats(values: readonly (number)[]) {
    setEach(30, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x870 + i * 1, type: "u8", length: 1 }, value));
  }

  get decorationPosters(): readonly (number)[] {
    return repeat(10, (i) => this.#store.number({ space: this.#space, offset: 0x88E + i * 1, type: "u8", length: 1 }));
  }

  set decorationPosters(values: readonly (number)[]) {
    setEach(10, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x88E + i * 1, type: "u8", length: 1 }, value));
  }

  get decorationDolls(): readonly (number)[] {
    return repeat(40, (i) => this.#store.number({ space: this.#space, offset: 0x898 + i * 1, type: "u8", length: 1 }));
  }

  set decorationDolls(values: readonly (number)[]) {
    setEach(40, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x898 + i * 1, type: "u8", length: 1 }, value));
  }

  get decorationCushions(): readonly (number)[] {
    return repeat(10, (i) => this.#store.number({ space: this.#space, offset: 0x8C0 + i * 1, type: "u8", length: 1 }));
  }

  set decorationCushions(values: readonly (number)[]) {
    setEach(10, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x8C0 + i * 1, type: "u8", length: 1 }, value));
  }

  get swarmSpecies(): number {
    return this.#store.number({ space: this.#space, offset: 0xC90, type: "u16le", length: 2 });
  }

  set swarmSpecies(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xC90, type: "u16le", length: 2 }, value);
  }

  get swarmMapNumber(): number {
    return this.#store.number({ space: this.#space, offset: 0xC92, type: "u8", length: 1 });
  }

  set swarmMapNumber(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xC92, type: "u8", length: 1 }, value);
  }

  get swarmMapGroup(): number {
    return this.#store.number({ space: this.#space, offset: 0xC93, type: "u8", length: 1 });
  }

  set swarmMapGroup(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xC93, type: "u8", length: 1 }, value);
  }

  get swarmLevel(): number {
    return this.#store.number({ space: this.#space, offset: 0xC94, type: "u8", length: 1 });
  }

  set swarmLevel(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xC94, type: "u8", length: 1 }, value);
  }

  get swarmMoves(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0xC98 + i * 2, type: "u16le", length: 2 }));
  }

  set swarmMoves(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xC98 + i * 2, type: "u16le", length: 2 }, value));
  }

  get swarmEncounterRate(): number {
    return this.#store.number({ space: this.#space, offset: 0xCA1, type: "u8", length: 1 });
  }

  set swarmEncounterRate(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xCA1, type: "u8", length: 1 }, value);
  }

  get swarmDaysLeft(): number {
    return this.#store.number({ space: this.#space, offset: 0xCA2, type: "u16le", length: 2 });
  }

  set swarmDaysLeft(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xCA2, type: "u16le", length: 2 }, value);
  }

  get mailWords(): readonly (Uint8Array)[] {
    return repeat(16, (i) => this.#store.raw({ space: this.#space, offset: 0xCE0 + i * 36, type: "bytes", length: 18 }));
  }

  set mailWords(values: readonly (Uint8Array)[]) {
    setEach(16, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0xCE0 + i * 36, type: "bytes", length: 18 }, value));
  }

  get mailAuthorName(): readonly (string)[] {
    return repeat(16, (i) => this.#store.text({ space: this.#space, offset: 0xCF2 + i * 36, type: "text-gen3-intl", length: 8 }));
  }

  set mailAuthorName(values: readonly (string)[]) {
    setEach(16, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0xCF2 + i * 36, type: "text-gen3-intl", length: 8 }, value));
  }

  get mailAuthorTrainerId(): readonly (number)[] {
    return repeat(16, (i) => this.#store.number({ space: this.#space, offset: 0xCFA + i * 36, type: "u16le", length: 2 }));
  }

  set mailAuthorTrainerId(values: readonly (number)[]) {
    setEach(16, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xCFA + i * 36, type: "u16le", length: 2 }, value));
  }

  get mailAuthorSecretId(): readonly (number)[] {
    return repeat(16, (i) => this.#store.number({ space: this.#space, offset: 0xCFC + i * 36, type: "u16le", length: 2 }));
  }

  set mailAuthorSecretId(values: readonly (number)[]) {
    setEach(16, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xCFC + i * 36, type: "u16le", length: 2 }, value));
  }

  get mailPokemonSpecies(): readonly (number)[] {
    return repeat(16, (i) => this.#store.number({ space: this.#space, offset: 0xCFE + i * 36, type: "u16le", length: 2 }));
  }

  set mailPokemonSpecies(values: readonly (number)[]) {
    setEach(16, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xCFE + i * 36, type: "u16le", length: 2 }, value));
  }

  get mailItem(): readonly (number)[] {
    return repeat(16, (i) => this.#store.number({ space: this.#space, offset: 0xD00 + i * 36, type: "u16le", length: 2 }));
  }

  set mailItem(values: readonly (number)[]) {
    setEach(16, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xD00 + i * 36, type: "u16le", length: 2 }, value));
  }

  get trendyWordsUnlocked(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0xF20, type: "flags", length: 5 });
  }

  set trendyWordsUnlocked(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0xF20, type: "flags", length: 5 }, value);
  }
}

export class Section3SecretBaseOwnerFlags {
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

  get trainerGender(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 1 });
  }

  set trainerGender(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 1 }, value);
  }

  get battledToday(): number {
    return this.#store.number({ ...this.#read, bit: 5, width: 1 });
  }

  set battledToday(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 5, width: 1 }, value);
  }

  get registryStatus(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 2 });
  }

  set registryStatus(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 2 }, value);
  }
}

export class Section4 {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get paintingPid(): readonly (number)[] {
    return repeat(5, (i) => this.#store.number({ space: this.#space, offset: 0x110 + i * 32, type: "u32le", length: 4 }));
  }

  set paintingPid(values: readonly (number)[]) {
    setEach(5, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x110 + i * 32, type: "u32le", length: 4 }, value));
  }

  get paintingTrainerId(): readonly (number)[] {
    return repeat(5, (i) => this.#store.number({ space: this.#space, offset: 0x114 + i * 32, type: "u16le", length: 2 }));
  }

  set paintingTrainerId(values: readonly (number)[]) {
    setEach(5, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x114 + i * 32, type: "u16le", length: 2 }, value));
  }

  get paintingSecretId(): readonly (number)[] {
    return repeat(5, (i) => this.#store.number({ space: this.#space, offset: 0x116 + i * 32, type: "u16le", length: 2 }));
  }

  set paintingSecretId(values: readonly (number)[]) {
    setEach(5, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x116 + i * 32, type: "u16le", length: 2 }, value));
  }

  get paintingSpecies(): readonly (number)[] {
    return repeat(5, (i) => this.#store.number({ space: this.#space, offset: 0x118 + i * 32, type: "u16le", length: 2 }));
  }

  set paintingSpecies(values: readonly (number)[]) {
    setEach(5, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x118 + i * 32, type: "u16le", length: 2 }, value));
  }

  get paintingCaption(): readonly (number)[] {
    return repeat(5, (i) => this.#store.number({ space: this.#space, offset: 0x11A + i * 32, type: "u8", length: 1 }));
  }

  set paintingCaption(values: readonly (number)[]) {
    setEach(5, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x11A + i * 32, type: "u8", length: 1 }, value));
  }

  get paintingNickname(): readonly (string)[] {
    return repeat(5, (i) => this.#store.text({ space: this.#space, offset: 0x11B + i * 32, type: "text-gen3-intl", length: 10 }));
  }

  set paintingNickname(values: readonly (string)[]) {
    setEach(5, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0x11B + i * 32, type: "text-gen3-intl", length: 10 }, value));
  }

  get paintingTrainerName(): readonly (string)[] {
    return repeat(5, (i) => this.#store.text({ space: this.#space, offset: 0x126 + i * 32, type: "text-gen3-intl", length: 7 }));
  }

  set paintingTrainerName(values: readonly (string)[]) {
    setEach(5, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0x126 + i * 32, type: "text-gen3-intl", length: 7 }, value));
  }

  get daycarePokemon(): readonly (Uint8Array)[] {
    return repeat(2, (i) => this.#store.raw({ space: this.#space, offset: 0x1B0 + i * 140, type: "bytes", length: 80 }));
  }

  set daycarePokemon(values: readonly (Uint8Array)[]) {
    setEach(2, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0x1B0 + i * 140, type: "bytes", length: 80 }, value));
  }

  get daycareMail(): readonly (Uint8Array)[] {
    return repeat(2, (i) => this.#store.raw({ space: this.#space, offset: 0x200 + i * 140, type: "bytes", length: 56 }));
  }

  set daycareMail(values: readonly (Uint8Array)[]) {
    setEach(2, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0x200 + i * 140, type: "bytes", length: 56 }, value));
  }

  get daycareExperienceGained(): readonly (number)[] {
    return repeat(2, (i) => this.#store.number({ space: this.#space, offset: 0x238 + i * 140, type: "u32le", length: 4 }));
  }

  set daycareExperienceGained(values: readonly (number)[]) {
    setEach(2, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x238 + i * 140, type: "u32le", length: 4 }, value));
  }

  get daycareSeed(): number {
    return this.#store.number({ space: this.#space, offset: 0x2C8, type: "u32le", length: 4 });
  }

  set daycareSeed(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2C8, type: "u32le", length: 4 }, value);
  }

  get giftRibbons(): readonly (number)[] {
    return repeat(11, (i) => this.#store.number({ space: this.#space, offset: 0x328 + i * 1, type: "u8", length: 1 }));
  }

  set giftRibbons(values: readonly (number)[]) {
    setEach(11, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x328 + i * 1, type: "u8", length: 1 }, value));
  }

  get colosseumPokecoupons(): Section4ColosseumPokecoupons {
    return new Section4ColosseumPokecoupons(this.#store, { space: this.#space, offset: 0x33A, type: "u32le", length: 4 });
  }

  get colosseumBonusDiscRewards(): Section4ColosseumBonusDiscRewards {
    return new Section4ColosseumBonusDiscRewards(this.#store, { space: this.#space, offset: 0x33E, type: "u32le", length: 4 });
  }

  get pokemonBoxFlags(): Section4PokemonBoxFlags {
    return new Section4PokemonBoxFlags(this.#store, { space: this.#space, offset: 0x347, type: "u8", length: 1 });
  }

  get receivedBonusDiscJirachi(): Section4ReceivedBonusDiscJirachi {
    return new Section4ReceivedBonusDiscJirachi(this.#store, { space: this.#space, offset: 0x349, type: "u8", length: 1 });
  }

  get roamerIvs(): Section4RoamerIvs {
    return new Section4RoamerIvs(this.#store, { space: this.#space, offset: 0x35C, type: "u32le", length: 4 });
  }

  get roamerPid(): number {
    return this.#store.number({ space: this.#space, offset: 0x360, type: "u32le", length: 4 });
  }

  set roamerPid(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x360, type: "u32le", length: 4 }, value);
  }

  get roamerSpecies(): number {
    return this.#store.number({ space: this.#space, offset: 0x364, type: "u16le", length: 2 });
  }

  set roamerSpecies(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x364, type: "u16le", length: 2 }, value);
  }

  get roamerCurrentHp(): number {
    return this.#store.number({ space: this.#space, offset: 0x366, type: "u16le", length: 2 });
  }

  set roamerCurrentHp(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x366, type: "u16le", length: 2 }, value);
  }

  get roamerLevel(): number {
    return this.#store.number({ space: this.#space, offset: 0x368, type: "u8", length: 1 });
  }

  set roamerLevel(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x368, type: "u8", length: 1 }, value);
  }

  get roamerStatus(): number {
    return this.#store.number({ space: this.#space, offset: 0x369, type: "u8", length: 1 });
  }

  set roamerStatus(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x369, type: "u8", length: 1 }, value);
  }

  get roamerContestStats(): readonly (number)[] {
    return repeat(5, (i) => this.#store.number({ space: this.#space, offset: 0x36A + i * 1, type: "u8", length: 1 }));
  }

  set roamerContestStats(values: readonly (number)[]) {
    setEach(5, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x36A + i * 1, type: "u8", length: 1 }, value));
  }

  get roamerActive(): number {
    return this.#store.number({ space: this.#space, offset: 0x36F, type: "u8", length: 1 });
  }

  set roamerActive(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x36F, type: "u8", length: 1 }, value);
  }

  get eReaderBerryName(): string {
    return this.#store.text({ space: this.#space, offset: 0x378, type: "text-gen3-intl", length: 7 });
  }

  set eReaderBerryName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x378, type: "text-gen3-intl", length: 7 }, value);
  }

  get eReaderBerryData(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x37F, type: "bytes", length: 45 });
  }

  set eReaderBerryData(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x37F, type: "bytes", length: 45 }, value);
  }

  get wonderNewsChecksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x3AC, type: "u16le", length: 2 });
  }

  set wonderNewsChecksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x3AC, type: "u16le", length: 2 }, value);
  }

  get wonderNewsId(): number {
    return this.#store.number({ space: this.#space, offset: 0x3B0, type: "u16le", length: 2 });
  }

  set wonderNewsId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x3B0, type: "u16le", length: 2 }, value);
  }

  get wonderNewsFlag(): number {
    return this.#store.number({ space: this.#space, offset: 0x3B2, type: "u8", length: 1 });
  }

  set wonderNewsFlag(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x3B2, type: "u8", length: 1 }, value);
  }

  get wonderNewsColor(): number {
    return this.#store.number({ space: this.#space, offset: 0x3B3, type: "u8", length: 1 });
  }

  set wonderNewsColor(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x3B3, type: "u8", length: 1 }, value);
  }

  get wonderNewsTitle(): string {
    return this.#store.text({ space: this.#space, offset: 0x3B4, type: "text-gen3-intl", length: 40 });
  }

  set wonderNewsTitle(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x3B4, type: "text-gen3-intl", length: 40 }, value);
  }

  get wonderNewsBody(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x3DC, type: "bytes", length: 400 });
  }

  set wonderNewsBody(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x3DC, type: "bytes", length: 400 }, value);
  }

  get wonderCardChecksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x56C, type: "u16le", length: 2 });
  }

  set wonderCardChecksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x56C, type: "u16le", length: 2 }, value);
  }

  get wonderCardId(): number {
    return this.#store.number({ space: this.#space, offset: 0x570, type: "u16le", length: 2 });
  }

  set wonderCardId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x570, type: "u16le", length: 2 }, value);
  }

  get wonderCardIcon(): number {
    return this.#store.number({ space: this.#space, offset: 0x572, type: "u16le", length: 2 });
  }

  set wonderCardIcon(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x572, type: "u16le", length: 2 }, value);
  }

  get wonderCardCount(): number {
    return this.#store.number({ space: this.#space, offset: 0x574, type: "u32le", length: 4 });
  }

  set wonderCardCount(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x574, type: "u32le", length: 4 }, value);
  }

  get wonderCardStyle(): Section4WonderCardStyle {
    return new Section4WonderCardStyle(this.#store, { space: this.#space, offset: 0x578, type: "u8", length: 1 });
  }

  get wonderCardSecondCount(): number {
    return this.#store.number({ space: this.#space, offset: 0x579, type: "u8", length: 1 });
  }

  set wonderCardSecondCount(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x579, type: "u8", length: 1 }, value);
  }

  get wonderCardTitle(): string {
    return this.#store.text({ space: this.#space, offset: 0x57A, type: "text-gen3-intl", length: 40 });
  }

  set wonderCardTitle(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x57A, type: "text-gen3-intl", length: 40 }, value);
  }

  get wonderCardBody(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x5A2, type: "bytes", length: 282 });
  }

  set wonderCardBody(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x5A2, type: "bytes", length: 282 }, value);
  }

  get wonderCardStatsChecksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6BC, type: "u16le", length: 2 });
  }

  set wonderCardStatsChecksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6BC, type: "u16le", length: 2 }, value);
  }

  get wonderCardWins(): number {
    return this.#store.number({ space: this.#space, offset: 0x6C0, type: "u16le", length: 2 });
  }

  set wonderCardWins(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6C0, type: "u16le", length: 2 }, value);
  }

  get wonderCardLosses(): number {
    return this.#store.number({ space: this.#space, offset: 0x6C2, type: "u16le", length: 2 });
  }

  set wonderCardLosses(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6C2, type: "u16le", length: 2 }, value);
  }

  get wonderCardTrades(): number {
    return this.#store.number({ space: this.#space, offset: 0x6C4, type: "u16le", length: 2 });
  }

  set wonderCardTrades(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6C4, type: "u16le", length: 2 }, value);
  }

  get wonderCardUnknown(): number {
    return this.#store.number({ space: this.#space, offset: 0x6C6, type: "u16le", length: 2 });
  }

  set wonderCardUnknown(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6C6, type: "u16le", length: 2 }, value);
  }

  get wonderCardDistributedPokemon(): readonly (number)[] {
    return repeat(14, (i) => this.#store.number({ space: this.#space, offset: 0x6C8 + i * 2, type: "u16le", length: 2 }));
  }

  set wonderCardDistributedPokemon(values: readonly (number)[]) {
    setEach(14, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x6C8 + i * 2, type: "u16le", length: 2 }, value));
  }

  get trainerHillBestTimes(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x898 + i * 4, type: "u32le", length: 4 }));
  }

  set trainerHillBestTimes(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x898 + i * 4, type: "u32le", length: 4 }, value));
  }

  get mysteryEventScriptChecksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x8A8, type: "u16le", length: 2 });
  }

  set mysteryEventScriptChecksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x8A8, type: "u16le", length: 2 }, value);
  }

  get mysteryEventScriptMagic(): number {
    return this.#store.number({ space: this.#space, offset: 0x8AC, type: "u8", length: 1 });
  }

  set mysteryEventScriptMagic(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x8AC, type: "u8", length: 1 }, value);
  }

  get mysteryEventScriptMapGroup(): number {
    return this.#store.number({ space: this.#space, offset: 0x8AD, type: "u8", length: 1 });
  }

  set mysteryEventScriptMapGroup(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x8AD, type: "u8", length: 1 }, value);
  }

  get mysteryEventScriptMapNumber(): number {
    return this.#store.number({ space: this.#space, offset: 0x8AE, type: "u8", length: 1 });
  }

  set mysteryEventScriptMapNumber(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x8AE, type: "u8", length: 1 }, value);
  }

  get mysteryEventScriptObjectId(): number {
    return this.#store.number({ space: this.#space, offset: 0x8AF, type: "u8", length: 1 });
  }

  set mysteryEventScriptObjectId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x8AF, type: "u8", length: 1 }, value);
  }

  get mysteryEventScriptData(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x8B0, type: "bytes", length: 996 });
  }

  set mysteryEventScriptData(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x8B0, type: "bytes", length: 996 }, value);
  }

  get recordMixingGiftChecksum(): number {
    return this.#store.number({ space: this.#space, offset: 0xC94, type: "u16le", length: 2 });
  }

  set recordMixingGiftChecksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xC94, type: "u16le", length: 2 }, value);
  }

  get recordMixingGiftMax(): number {
    return this.#store.number({ space: this.#space, offset: 0xC98, type: "u8", length: 1 });
  }

  set recordMixingGiftMax(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xC98, type: "u8", length: 1 }, value);
  }

  get recordMixingGiftCount(): number {
    return this.#store.number({ space: this.#space, offset: 0xC99, type: "u8", length: 1 });
  }

  set recordMixingGiftCount(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xC99, type: "u8", length: 1 }, value);
  }

  get recordMixingGiftItem(): number {
    return this.#store.number({ space: this.#space, offset: 0xC9A, type: "u16le", length: 2 });
  }

  set recordMixingGiftItem(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xC9A, type: "u16le", length: 2 }, value);
  }

  get pokedexSeenFlagsCopy3(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0xCA4, type: "flags", length: 49 });
  }

  set pokedexSeenFlagsCopy3(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0xCA4, type: "flags", length: 49 }, value);
  }

  get waldaBackgroundColor(): number {
    return this.#store.number({ space: this.#space, offset: 0xEF0, type: "u16le", length: 2 });
  }

  set waldaBackgroundColor(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xEF0, type: "u16le", length: 2 }, value);
  }

  get waldaForegroundColor(): number {
    return this.#store.number({ space: this.#space, offset: 0xEF2, type: "u16le", length: 2 });
  }

  set waldaForegroundColor(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xEF2, type: "u16le", length: 2 }, value);
  }

  get waldaIcon(): number {
    return this.#store.number({ space: this.#space, offset: 0xF04, type: "u8", length: 1 });
  }

  set waldaIcon(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xF04, type: "u8", length: 1 }, value);
  }

  get waldaPattern(): number {
    return this.#store.number({ space: this.#space, offset: 0xF05, type: "u8", length: 1 });
  }

  set waldaPattern(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xF05, type: "u8", length: 1 }, value);
  }

  get waldaPhraseUnlocked(): number {
    return this.#store.number({ space: this.#space, offset: 0xF06, type: "u8", length: 1 });
  }

  set waldaPhraseUnlocked(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xF06, type: "u8", length: 1 }, value);
  }
}

export class Section4ColosseumPokecoupons {
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

  get pokecoupons(): number {
    return this.#store.number({ ...this.#read, bit: 8, width: 24 });
  }

  set pokecoupons(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 8, width: 24 }, value);
  }
}

export class Section4ColosseumBonusDiscRewards {
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

  get goldTitle(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set goldTitle(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get silverTitle(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set silverTitle(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }

  get bronzeTitle(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 1 });
  }

  set bronzeTitle(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 1 }, value);
  }

  get receivedCelebi(): number {
    return this.#store.number({ ...this.#read, bit: 3, width: 1 });
  }

  set receivedCelebi(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 3, width: 1 }, value);
  }

  get totalPokecoupons(): number {
    return this.#store.number({ ...this.#read, bit: 8, width: 24 });
  }

  set totalPokecoupons(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 8, width: 24 }, value);
  }
}

export class Section4PokemonBoxFlags {
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

  get usedPokemonBox(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set usedPokemonBox(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get depositEggsUnlocked(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 2 });
  }

  set depositEggsUnlocked(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 2 }, value);
  }
}

export class Section4ReceivedBonusDiscJirachi {
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
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set received(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }
}

export class Section4RoamerIvs {
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

export class Section4WonderCardStyle {
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

  get type(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 2 });
  }

  set type(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 2 }, value);
  }

  get color(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 4 });
  }

  set color(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 4 }, value);
  }

  get shareState(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 2 });
  }

  set shareState(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 2 }, value);
  }
}

export class Section5 {
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
    return this.#store.raw({ space: this.#space, offset: 0x4, type: "bytes", length: 3964 });
  }

  set boxPokemon(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x4, type: "bytes", length: 3964 }, value);
  }
}

export class Section6 {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get boxPokemon(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x0, type: "bytes", length: 3968 });
  }

  set boxPokemon(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x0, type: "bytes", length: 3968 }, value);
  }
}

export class Section7 {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get boxPokemon(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x0, type: "bytes", length: 3968 });
  }

  set boxPokemon(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x0, type: "bytes", length: 3968 }, value);
  }
}

export class Section8 {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get boxPokemon(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x0, type: "bytes", length: 3968 });
  }

  set boxPokemon(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x0, type: "bytes", length: 3968 }, value);
  }
}

export class Section9 {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get boxPokemon(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x0, type: "bytes", length: 3968 });
  }

  set boxPokemon(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x0, type: "bytes", length: 3968 }, value);
  }
}

export class Section10 {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get boxPokemon(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x0, type: "bytes", length: 3968 });
  }

  set boxPokemon(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x0, type: "bytes", length: 3968 }, value);
  }
}

export class Section11 {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get boxPokemon(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x0, type: "bytes", length: 3968 });
  }

  set boxPokemon(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x0, type: "bytes", length: 3968 }, value);
  }
}

export class Section12 {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get boxPokemon(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x0, type: "bytes", length: 3968 });
  }

  set boxPokemon(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x0, type: "bytes", length: 3968 }, value);
  }
}

export class Section13 {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get boxPokemon(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x0, type: "bytes", length: 1860 });
  }

  set boxPokemon(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x0, type: "bytes", length: 1860 }, value);
  }

  get boxNames(): readonly (string)[] {
    return repeat(14, (i) => this.#store.text({ space: this.#space, offset: 0x744 + i * 9, type: "text-gen3-intl", length: 9 }));
  }

  set boxNames(values: readonly (string)[]) {
    setEach(14, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0x744 + i * 9, type: "text-gen3-intl", length: 9 }, value));
  }

  get boxWallpapers(): readonly (number)[] {
    return repeat(14, (i) => this.#store.number({ space: this.#space, offset: 0x7C2 + i * 1, type: "u8", length: 1 }));
  }

  set boxWallpapers(values: readonly (number)[]) {
    setEach(14, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x7C2 + i * 1, type: "u8", length: 1 }, value));
  }
}

export class Sector28 {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get hallOfFameTrainerId(): readonly (number)[] {
    return repeat(199, (i) => this.#store.number({ space: this.#space, offset: 0x0 + i * 20, type: "u16le", length: 2 }));
  }

  set hallOfFameTrainerId(values: readonly (number)[]) {
    setEach(199, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x0 + i * 20, type: "u16le", length: 2 }, value));
  }

  get hallOfFameSecretId(): readonly (number)[] {
    return repeat(199, (i) => this.#store.number({ space: this.#space, offset: 0x2 + i * 20, type: "u16le", length: 2 }));
  }

  set hallOfFameSecretId(values: readonly (number)[]) {
    setEach(199, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x2 + i * 20, type: "u16le", length: 2 }, value));
  }

  get hallOfFamePid(): readonly (number)[] {
    return repeat(199, (i) => this.#store.number({ space: this.#space, offset: 0x4 + i * 20, type: "u32le", length: 4 }));
  }

  set hallOfFamePid(values: readonly (number)[]) {
    setEach(199, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x4 + i * 20, type: "u32le", length: 4 }, value));
  }

  get hallOfFameSpeciesAndLevel(): readonly Sector28HallOfFameSpeciesAndLevel[] {
    return repeat(198, (i) => new Sector28HallOfFameSpeciesAndLevel(this.#store, { space: this.#space, offset: 0x8 + i * 20, type: "u16le", length: 2 }));
  }

  get hallOfFameNickname(): readonly (string)[] {
    return repeat(198, (i) => this.#store.text({ space: this.#space, offset: 0xA + i * 20, type: "text-gen3-intl", length: 10 }));
  }

  set hallOfFameNickname(values: readonly (string)[]) {
    setEach(198, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0xA + i * 20, type: "text-gen3-intl", length: 10 }, value));
  }
}

export class Sector28HallOfFameSpeciesAndLevel {
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

  get species(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 9 });
  }

  set species(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 9 }, value);
  }

  get level(): number {
    return this.#store.number({ ...this.#read, bit: 9, width: 7 });
  }

  set level(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 9, width: 7 }, value);
  }
}

export class Sector29 {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get hallOfFameSpeciesAndLevel(): readonly Sector29HallOfFameSpeciesAndLevel[] {
    return repeat(102, (i) => new Sector29HallOfFameSpeciesAndLevel(this.#store, { space: this.#space, offset: 0x0 + i * 20, type: "u16le", length: 2 }));
  }

  get hallOfFameNickname(): readonly (string)[] {
    return repeat(102, (i) => this.#store.text({ space: this.#space, offset: 0x2 + i * 20, type: "text-gen3-intl", length: 10 }));
  }

  set hallOfFameNickname(values: readonly (string)[]) {
    setEach(102, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0x2 + i * 20, type: "text-gen3-intl", length: 10 }, value));
  }

  get hallOfFameTrainerId(): readonly (number)[] {
    return repeat(101, (i) => this.#store.number({ space: this.#space, offset: 0xC + i * 20, type: "u16le", length: 2 }));
  }

  set hallOfFameTrainerId(values: readonly (number)[]) {
    setEach(101, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xC + i * 20, type: "u16le", length: 2 }, value));
  }

  get hallOfFameSecretId(): readonly (number)[] {
    return repeat(101, (i) => this.#store.number({ space: this.#space, offset: 0xE + i * 20, type: "u16le", length: 2 }));
  }

  set hallOfFameSecretId(values: readonly (number)[]) {
    setEach(101, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xE + i * 20, type: "u16le", length: 2 }, value));
  }

  get hallOfFamePid(): readonly (number)[] {
    return repeat(101, (i) => this.#store.number({ space: this.#space, offset: 0x10 + i * 20, type: "u32le", length: 4 }));
  }

  set hallOfFamePid(values: readonly (number)[]) {
    setEach(101, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x10 + i * 20, type: "u32le", length: 4 }, value));
  }
}

export class Sector29HallOfFameSpeciesAndLevel {
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

  get species(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 9 });
  }

  set species(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 9 }, value);
  }

  get level(): number {
    return this.#store.number({ ...this.#read, bit: 9, width: 7 });
  }

  set level(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 9, width: 7 }, value);
  }
}

export class Sector30 {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get eReaderData(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x0, type: "bytes", length: 3968 });
  }

  set eReaderData(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x0, type: "bytes", length: 3968 }, value);
  }
}

export class Sector31 {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get recordedBattleMarker(): number {
    return this.#store.number({ space: this.#space, offset: 0x0, type: "u32le", length: 4 });
  }

  set recordedBattleMarker(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x0, type: "u32le", length: 4 }, value);
  }

  get recordedBattlePokemon(): readonly (Uint8Array)[] {
    return repeat(12, (i) => this.#store.raw({ space: this.#space, offset: 0x4 + i * 100, type: "bytes", length: 100 }));
  }

  set recordedBattlePokemon(values: readonly (Uint8Array)[]) {
    setEach(12, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0x4 + i * 100, type: "bytes", length: 100 }, value));
  }

  get recordedBattleTrainerNames(): readonly (string)[] {
    return repeat(4, (i) => this.#store.text({ space: this.#space, offset: 0x4B4 + i * 8, type: "text-gen3-intl", length: 8 }));
  }

  set recordedBattleTrainerNames(values: readonly (string)[]) {
    setEach(4, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0x4B4 + i * 8, type: "text-gen3-intl", length: 8 }, value));
  }

  get recordedBattleTrainerGenders(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x4D4 + i * 1, type: "u8", length: 1 }));
  }

  set recordedBattleTrainerGenders(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x4D4 + i * 1, type: "u8", length: 1 }, value));
  }

  get recordedBattleTrainerIds(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x4D8 + i * 4, type: "u32le", length: 4 }));
  }

  set recordedBattleTrainerIds(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x4D8 + i * 4, type: "u32le", length: 4 }, value));
  }

  get recordedBattleTrainerLanguages(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x4E8 + i * 1, type: "u8", length: 1 }));
  }

  set recordedBattleTrainerLanguages(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x4E8 + i * 1, type: "u8", length: 1 }, value));
  }

  get recordedBattleSeed(): number {
    return this.#store.number({ space: this.#space, offset: 0x4EC, type: "u32le", length: 4 });
  }

  set recordedBattleSeed(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x4EC, type: "u32le", length: 4 }, value);
  }

  get recordedBattleMode(): number {
    return this.#store.number({ space: this.#space, offset: 0x4F0, type: "u32le", length: 4 });
  }

  set recordedBattleMode(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x4F0, type: "u32le", length: 4 }, value);
  }

  get recordedBattleChecksum(): number {
    return this.#store.number({ space: this.#space, offset: 0xF7C, type: "u32le", length: 4 });
  }

  set recordedBattleChecksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xF7C, type: "u32le", length: 4 }, value);
  }
}

export class Pk3Party {
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

  get originalTrainerId(): Pk3PartyOriginalTrainerId {
    return new Pk3PartyOriginalTrainerId(this.#store, { space: this.#space, offset: 0x4, type: "u32le", length: 4 });
  }

  get nickname(): string {
    return this.#store.text({ space: this.#space, offset: 0x8, type: "text-gen3-intl", length: 10 });
  }

  set nickname(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x8, type: "text-gen3-intl", length: 10 }, value);
  }

  get language(): number {
    return this.#store.number({ space: this.#space, offset: 0x12, type: "u8", length: 1 });
  }

  set language(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x12, type: "u8", length: 1 }, value);
  }

  get eggAndSpeciesFlags(): Pk3PartyEggAndSpeciesFlags {
    return new Pk3PartyEggAndSpeciesFlags(this.#store, { space: this.#space, offset: 0x13, type: "u8", length: 1 });
  }

  get originalTrainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x14, type: "text-gen3-intl", length: 7 });
  }

  set originalTrainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x14, type: "text-gen3-intl", length: 7 }, value);
  }

  get markings(): number {
    return this.#store.number({ space: this.#space, offset: 0x1B, type: "u8", length: 1 });
  }

  set markings(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1B, type: "u8", length: 1 }, value);
  }

  get checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x1C, type: "u16le", length: 2 });
  }

  set checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1C, type: "u16le", length: 2 }, value);
  }

  get sanity(): number {
    return this.#store.number({ space: this.#space, offset: 0x1E, type: "u16le", length: 2 });
  }

  set sanity(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1E, type: "u16le", length: 2 }, value);
  }

  get species(): number {
    return this.#store.number({ space: this.#space, offset: 0x20, type: "u16le", length: 2 });
  }

  set species(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x20, type: "u16le", length: 2 }, value);
  }

  get heldItem(): number {
    return this.#store.number({ space: this.#space, offset: 0x22, type: "u16le", length: 2 });
  }

  set heldItem(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x22, type: "u16le", length: 2 }, value);
  }

  get experience(): number {
    return this.#store.number({ space: this.#space, offset: 0x24, type: "u32le", length: 4 });
  }

  set experience(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x24, type: "u32le", length: 4 }, value);
  }

  get ppUps(): Pk3PartyPpUps {
    return new Pk3PartyPpUps(this.#store, { space: this.#space, offset: 0x28, type: "u8", length: 1 });
  }

  get friendship(): number {
    return this.#store.number({ space: this.#space, offset: 0x29, type: "u8", length: 1 });
  }

  set friendship(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x29, type: "u8", length: 1 }, value);
  }

  get unused(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x2A, type: "bytes", length: 2 });
  }

  set unused(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x2A, type: "bytes", length: 2 }, value);
  }

  get moves(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x2C + i * 2, type: "u16le", length: 2 }));
  }

  set moves(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x2C + i * 2, type: "u16le", length: 2 }, value));
  }

  get pp(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x34 + i * 1, type: "u8", length: 1 }));
  }

  set pp(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x34 + i * 1, type: "u8", length: 1 }, value));
  }

  get evs(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x38 + i * 1, type: "u8", length: 1 }));
  }

  set evs(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x38 + i * 1, type: "u8", length: 1 }, value));
  }

  get contestStats(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x3E + i * 1, type: "u8", length: 1 }));
  }

  set contestStats(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x3E + i * 1, type: "u8", length: 1 }, value));
  }

  get pokerus(): Pk3PartyPokerus {
    return new Pk3PartyPokerus(this.#store, { space: this.#space, offset: 0x44, type: "u8", length: 1 });
  }

  get metLocation(): number {
    return this.#store.number({ space: this.#space, offset: 0x45, type: "u8", length: 1 });
  }

  set metLocation(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x45, type: "u8", length: 1 }, value);
  }

  get origins(): Pk3PartyOrigins {
    return new Pk3PartyOrigins(this.#store, { space: this.#space, offset: 0x46, type: "u16le", length: 2 });
  }

  get ivsEggAndAbility(): Pk3PartyIvsEggAndAbility {
    return new Pk3PartyIvsEggAndAbility(this.#store, { space: this.#space, offset: 0x48, type: "u32le", length: 4 });
  }

  get ribbons(): Pk3PartyRibbons {
    return new Pk3PartyRibbons(this.#store, { space: this.#space, offset: 0x4C, type: "u32le", length: 4 });
  }

  get statusCondition(): number {
    return this.#store.number({ space: this.#space, offset: 0x50, type: "u32le", length: 4 });
  }

  set statusCondition(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x50, type: "u32le", length: 4 }, value);
  }

  get level(): number {
    return this.#store.number({ space: this.#space, offset: 0x54, type: "u8", length: 1 });
  }

  set level(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x54, type: "u8", length: 1 }, value);
  }

  get mailId(): number {
    return this.#store.number({ space: this.#space, offset: 0x55, type: "u8", length: 1 });
  }

  set mailId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x55, type: "u8", length: 1 }, value);
  }

  get currentHp(): number {
    return this.#store.number({ space: this.#space, offset: 0x56, type: "u16le", length: 2 });
  }

  set currentHp(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x56, type: "u16le", length: 2 }, value);
  }

  get stats(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x58 + i * 2, type: "u16le", length: 2 }));
  }

  set stats(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x58 + i * 2, type: "u16le", length: 2 }, value));
  }
}

export class Pk3PartyOriginalTrainerId {
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

export class Pk3PartyEggAndSpeciesFlags {
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

  get badEgg(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set badEgg(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get hasSpecies(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set hasSpecies(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }

  get isEgg(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 1 });
  }

  set isEgg(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 1 }, value);
  }
}

export class Pk3PartyPpUps {
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

  get move1(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 2 });
  }

  set move1(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 2 }, value);
  }

  get move2(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 2 });
  }

  set move2(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 2 }, value);
  }

  get move3(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 2 });
  }

  set move3(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 2 }, value);
  }

  get move4(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 2 });
  }

  set move4(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 2 }, value);
  }
}

export class Pk3PartyPokerus {
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

export class Pk3PartyOrigins {
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

  get originGame(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 4 });
  }

  set originGame(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 4 }, value);
  }

  get ball(): number {
    return this.#store.number({ ...this.#read, bit: 11, width: 4 });
  }

  set ball(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 11, width: 4 }, value);
  }

  get trainerGender(): number {
    return this.#store.number({ ...this.#read, bit: 15, width: 1 });
  }

  set trainerGender(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 15, width: 1 }, value);
  }
}

export class Pk3PartyIvsEggAndAbility {
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

  get ability(): number {
    return this.#store.number({ ...this.#read, bit: 31, width: 1 });
  }

  set ability(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 31, width: 1 }, value);
  }
}

export class Pk3PartyRibbons {
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
    return this.#store.number({ ...this.#read, bit: 0, width: 3 });
  }

  set cool(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 3 }, value);
  }

  get beauty(): number {
    return this.#store.number({ ...this.#read, bit: 3, width: 3 });
  }

  set beauty(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 3, width: 3 }, value);
  }

  get cute(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 3 });
  }

  set cute(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 3 }, value);
  }

  get smart(): number {
    return this.#store.number({ ...this.#read, bit: 9, width: 3 });
  }

  set smart(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 9, width: 3 }, value);
  }

  get tough(): number {
    return this.#store.number({ ...this.#read, bit: 12, width: 3 });
  }

  set tough(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 12, width: 3 }, value);
  }

  get champion(): number {
    return this.#store.number({ ...this.#read, bit: 15, width: 1 });
  }

  set champion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 15, width: 1 }, value);
  }

  get winning(): number {
    return this.#store.number({ ...this.#read, bit: 16, width: 1 });
  }

  set winning(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 16, width: 1 }, value);
  }

  get victory(): number {
    return this.#store.number({ ...this.#read, bit: 17, width: 1 });
  }

  set victory(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 17, width: 1 }, value);
  }

  get artist(): number {
    return this.#store.number({ ...this.#read, bit: 18, width: 1 });
  }

  set artist(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 18, width: 1 }, value);
  }

  get effort(): number {
    return this.#store.number({ ...this.#read, bit: 19, width: 1 });
  }

  set effort(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 19, width: 1 }, value);
  }

  get battleChampion(): number {
    return this.#store.number({ ...this.#read, bit: 20, width: 1 });
  }

  set battleChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 20, width: 1 }, value);
  }

  get regionalChampion(): number {
    return this.#store.number({ ...this.#read, bit: 21, width: 1 });
  }

  set regionalChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 21, width: 1 }, value);
  }

  get nationalChampion(): number {
    return this.#store.number({ ...this.#read, bit: 22, width: 1 });
  }

  set nationalChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 22, width: 1 }, value);
  }

  get country(): number {
    return this.#store.number({ ...this.#read, bit: 23, width: 1 });
  }

  set country(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 23, width: 1 }, value);
  }

  get national(): number {
    return this.#store.number({ ...this.#read, bit: 24, width: 1 });
  }

  set national(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 24, width: 1 }, value);
  }

  get earth(): number {
    return this.#store.number({ ...this.#read, bit: 25, width: 1 });
  }

  set earth(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 25, width: 1 }, value);
  }

  get world(): number {
    return this.#store.number({ ...this.#read, bit: 26, width: 1 });
  }

  set world(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 26, width: 1 }, value);
  }

  get fatefulEncounter(): number {
    return this.#store.number({ ...this.#read, bit: 31, width: 1 });
  }

  set fatefulEncounter(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 31, width: 1 }, value);
  }
}

export class Pk3 {
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

  get originalTrainerId(): Pk3OriginalTrainerId {
    return new Pk3OriginalTrainerId(this.#store, { space: this.#space, offset: 0x4, type: "u32le", length: 4 });
  }

  get nickname(): string {
    return this.#store.text({ space: this.#space, offset: 0x8, type: "text-gen3-intl", length: 10 });
  }

  set nickname(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x8, type: "text-gen3-intl", length: 10 }, value);
  }

  get language(): number {
    return this.#store.number({ space: this.#space, offset: 0x12, type: "u8", length: 1 });
  }

  set language(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x12, type: "u8", length: 1 }, value);
  }

  get eggAndSpeciesFlags(): Pk3EggAndSpeciesFlags {
    return new Pk3EggAndSpeciesFlags(this.#store, { space: this.#space, offset: 0x13, type: "u8", length: 1 });
  }

  get originalTrainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x14, type: "text-gen3-intl", length: 7 });
  }

  set originalTrainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x14, type: "text-gen3-intl", length: 7 }, value);
  }

  get markings(): number {
    return this.#store.number({ space: this.#space, offset: 0x1B, type: "u8", length: 1 });
  }

  set markings(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1B, type: "u8", length: 1 }, value);
  }

  get checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x1C, type: "u16le", length: 2 });
  }

  set checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1C, type: "u16le", length: 2 }, value);
  }

  get sanity(): number {
    return this.#store.number({ space: this.#space, offset: 0x1E, type: "u16le", length: 2 });
  }

  set sanity(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1E, type: "u16le", length: 2 }, value);
  }

  get species(): number {
    return this.#store.number({ space: this.#space, offset: 0x20, type: "u16le", length: 2 });
  }

  set species(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x20, type: "u16le", length: 2 }, value);
  }

  get heldItem(): number {
    return this.#store.number({ space: this.#space, offset: 0x22, type: "u16le", length: 2 });
  }

  set heldItem(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x22, type: "u16le", length: 2 }, value);
  }

  get experience(): number {
    return this.#store.number({ space: this.#space, offset: 0x24, type: "u32le", length: 4 });
  }

  set experience(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x24, type: "u32le", length: 4 }, value);
  }

  get ppUps(): Pk3PpUps {
    return new Pk3PpUps(this.#store, { space: this.#space, offset: 0x28, type: "u8", length: 1 });
  }

  get friendship(): number {
    return this.#store.number({ space: this.#space, offset: 0x29, type: "u8", length: 1 });
  }

  set friendship(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x29, type: "u8", length: 1 }, value);
  }

  get unused(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x2A, type: "bytes", length: 2 });
  }

  set unused(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x2A, type: "bytes", length: 2 }, value);
  }

  get moves(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x2C + i * 2, type: "u16le", length: 2 }));
  }

  set moves(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x2C + i * 2, type: "u16le", length: 2 }, value));
  }

  get pp(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x34 + i * 1, type: "u8", length: 1 }));
  }

  set pp(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x34 + i * 1, type: "u8", length: 1 }, value));
  }

  get evs(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x38 + i * 1, type: "u8", length: 1 }));
  }

  set evs(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x38 + i * 1, type: "u8", length: 1 }, value));
  }

  get contestStats(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x3E + i * 1, type: "u8", length: 1 }));
  }

  set contestStats(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x3E + i * 1, type: "u8", length: 1 }, value));
  }

  get pokerus(): Pk3Pokerus {
    return new Pk3Pokerus(this.#store, { space: this.#space, offset: 0x44, type: "u8", length: 1 });
  }

  get metLocation(): number {
    return this.#store.number({ space: this.#space, offset: 0x45, type: "u8", length: 1 });
  }

  set metLocation(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x45, type: "u8", length: 1 }, value);
  }

  get origins(): Pk3Origins {
    return new Pk3Origins(this.#store, { space: this.#space, offset: 0x46, type: "u16le", length: 2 });
  }

  get ivsEggAndAbility(): Pk3IvsEggAndAbility {
    return new Pk3IvsEggAndAbility(this.#store, { space: this.#space, offset: 0x48, type: "u32le", length: 4 });
  }

  get ribbons(): Pk3Ribbons {
    return new Pk3Ribbons(this.#store, { space: this.#space, offset: 0x4C, type: "u32le", length: 4 });
  }
}

export class Pk3OriginalTrainerId {
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

export class Pk3EggAndSpeciesFlags {
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

  get badEgg(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set badEgg(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get hasSpecies(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set hasSpecies(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }

  get isEgg(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 1 });
  }

  set isEgg(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 1 }, value);
  }
}

export class Pk3PpUps {
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

  get move1(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 2 });
  }

  set move1(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 2 }, value);
  }

  get move2(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 2 });
  }

  set move2(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 2 }, value);
  }

  get move3(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 2 });
  }

  set move3(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 2 }, value);
  }

  get move4(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 2 });
  }

  set move4(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 2 }, value);
  }
}

export class Pk3Pokerus {
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

export class Pk3Origins {
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

  get originGame(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 4 });
  }

  set originGame(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 4 }, value);
  }

  get ball(): number {
    return this.#store.number({ ...this.#read, bit: 11, width: 4 });
  }

  set ball(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 11, width: 4 }, value);
  }

  get trainerGender(): number {
    return this.#store.number({ ...this.#read, bit: 15, width: 1 });
  }

  set trainerGender(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 15, width: 1 }, value);
  }
}

export class Pk3IvsEggAndAbility {
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

  get ability(): number {
    return this.#store.number({ ...this.#read, bit: 31, width: 1 });
  }

  set ability(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 31, width: 1 }, value);
  }
}

export class Pk3Ribbons {
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
    return this.#store.number({ ...this.#read, bit: 0, width: 3 });
  }

  set cool(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 3 }, value);
  }

  get beauty(): number {
    return this.#store.number({ ...this.#read, bit: 3, width: 3 });
  }

  set beauty(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 3, width: 3 }, value);
  }

  get cute(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 3 });
  }

  set cute(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 3 }, value);
  }

  get smart(): number {
    return this.#store.number({ ...this.#read, bit: 9, width: 3 });
  }

  set smart(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 9, width: 3 }, value);
  }

  get tough(): number {
    return this.#store.number({ ...this.#read, bit: 12, width: 3 });
  }

  set tough(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 12, width: 3 }, value);
  }

  get champion(): number {
    return this.#store.number({ ...this.#read, bit: 15, width: 1 });
  }

  set champion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 15, width: 1 }, value);
  }

  get winning(): number {
    return this.#store.number({ ...this.#read, bit: 16, width: 1 });
  }

  set winning(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 16, width: 1 }, value);
  }

  get victory(): number {
    return this.#store.number({ ...this.#read, bit: 17, width: 1 });
  }

  set victory(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 17, width: 1 }, value);
  }

  get artist(): number {
    return this.#store.number({ ...this.#read, bit: 18, width: 1 });
  }

  set artist(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 18, width: 1 }, value);
  }

  get effort(): number {
    return this.#store.number({ ...this.#read, bit: 19, width: 1 });
  }

  set effort(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 19, width: 1 }, value);
  }

  get battleChampion(): number {
    return this.#store.number({ ...this.#read, bit: 20, width: 1 });
  }

  set battleChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 20, width: 1 }, value);
  }

  get regionalChampion(): number {
    return this.#store.number({ ...this.#read, bit: 21, width: 1 });
  }

  set regionalChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 21, width: 1 }, value);
  }

  get nationalChampion(): number {
    return this.#store.number({ ...this.#read, bit: 22, width: 1 });
  }

  set nationalChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 22, width: 1 }, value);
  }

  get country(): number {
    return this.#store.number({ ...this.#read, bit: 23, width: 1 });
  }

  set country(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 23, width: 1 }, value);
  }

  get national(): number {
    return this.#store.number({ ...this.#read, bit: 24, width: 1 });
  }

  set national(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 24, width: 1 }, value);
  }

  get earth(): number {
    return this.#store.number({ ...this.#read, bit: 25, width: 1 });
  }

  set earth(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 25, width: 1 }, value);
  }

  get world(): number {
    return this.#store.number({ ...this.#read, bit: 26, width: 1 });
  }

  set world(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 26, width: 1 }, value);
  }

  get fatefulEncounter(): number {
    return this.#store.number({ ...this.#read, bit: 31, width: 1 });
  }

  set fatefulEncounter(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 31, width: 1 }, value);
  }
}

const views: [string, new (store: Store, space: string) => unknown][] = [
  ["section:0", Section0],
  ["section:1", Section1],
  ["section:2", Section2],
  ["section:3", Section3],
  ["section:4", Section4],
  ["section:5", Section5],
  ["section:6", Section6],
  ["section:7", Section7],
  ["section:8", Section8],
  ["section:9", Section9],
  ["section:10", Section10],
  ["section:11", Section11],
  ["section:12", Section12],
  ["section:13", Section13],
  ["sector:28", Sector28],
  ["sector:29", Sector29],
  ["sector:30", Sector30],
  ["sector:31", Sector31],
  ["party:{1..6}", Pk3Party],
  ["box:{1..14}:{1..30}", Pk3],
];

export const read = (file: Uint8Array) => new Save(file);
