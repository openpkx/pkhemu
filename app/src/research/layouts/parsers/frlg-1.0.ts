// Generated from known/frlg-1.0.json by tools/parser/generate.ts. Run npm run parsers after changing either.
import { counted, expand, repeat, setEach, spaceView, Store, type At, type Counted, type Read, type SpaceDef } from "../tools/parser/runtime.ts";

export const target = {"schema":"1.0","format":"frlg","version":"1.0"};

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
  {"name":"party:{1..6}","length":100,"transform":"pk3-crypt","source":{"regions":[{"space":"section:1","start":0,"end":3968}],"offset":56,"stride":100},"checksums":[{"step":"sum16le","start":32,"end":80,"at":28}]},
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

  get rivalName(): string {
    return this.#store.text({ space: "section:4", offset: 0xBCC, type: "text-gen3-intl", length: 8 });
  }

  set rivalName(value: string) {
    this.#store.setText({ space: "section:4", offset: 0xBCC, type: "text-gen3-intl", length: 8 }, value);
  }

  get money(): number {
    return this.#store.xorKey({ space: "section:1", offset: 0x290, type: "u32le", length: 4 }, { space: "section:0", offset: 0xF20, type: "u32le", length: 4 });
  }

  set money(value: number) {
    this.#store.setXorKey({ space: "section:1", offset: 0x290, type: "u32le", length: 4 }, { space: "section:0", offset: 0xF20, type: "u32le", length: 4 }, value);
  }

  get coins(): number {
    return this.#store.xorKey({ space: "section:1", offset: 0x294, type: "u16le", length: 2 }, { space: "section:0", offset: 0xF20, type: "u32le", length: 4 });
  }

  set coins(value: number) {
    this.#store.setXorKey({ space: "section:1", offset: 0x294, type: "u16le", length: 2 }, { space: "section:0", offset: 0xF20, type: "u32le", length: 4 }, value);
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

export class Pokemon {
  readonly #store: Store;
  readonly #at: At;
  readonly evs: PokemonEvs;
  readonly ivs: PokemonIvs;
  readonly moves: readonly PokemonMove[];
  readonly owner: PokemonOwner;
  readonly metConditions: PokemonMetConditions;
  readonly egg: PokemonEgg;

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
    this.evs = new PokemonEvs(store, this.#at);
    this.ivs = new PokemonIvs(store, this.#at);
    this.moves = repeat(4, (index) => new PokemonMove(store, { space: this.#at.space, index, offset: 0x2C + index * 2 }));
    this.owner = new PokemonOwner(store, this.#at);
    this.metConditions = new PokemonMetConditions(store, this.#at);
    this.egg = new PokemonEgg(store, this.#at);
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
    return this.#store.xorKey({ space: this.#at.space, offset: this.#at.offset, type: "u32le", length: 4, bit: 16, width: 16 }, { space: "section:0", offset: 0xF20, type: "u32le", length: 4 });
  }

  set count(value: number) {
    this.#store.setXorKey({ space: this.#at.space, offset: this.#at.offset, type: "u32le", length: 4, bit: 16, width: 16 }, { space: "section:0", offset: 0xF20, type: "u32le", length: 4 }, value);
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
    this.items = repeat(42, (index) => new PocketItem(store, { space: "section:1", index, offset: 0x310 + index * 4 }));
    this.keyItems = repeat(30, (index) => new PocketItem(store, { space: "section:1", index, offset: 0x3B8 + index * 4 }));
    this.balls = repeat(13, (index) => new PocketItem(store, { space: "section:1", index, offset: 0x430 + index * 4 }));
    this.tmsHms = repeat(58, (index) => new PocketItem(store, { space: "section:1", index, offset: 0x464 + index * 4 }));
    this.berries = repeat(43, (index) => new PocketItem(store, { space: "section:1", index, offset: 0x54C + index * 4 }));
    this.pcItems = repeat(30, (index) => new Item(store, { space: "section:1", index, offset: 0x298 + index * 4 }));
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

  constructor(file: Uint8Array) {
    const store = new Store(file, spaces);
    this.#store = store;
    this.#at = { space: "", index: 0, offset: 0 };
    this.trainer = new Trainer(store, this.#at);
    this.playTime = new PlayTime(store, this.#at);
    this.party = counted(expand("party:{1..6}").map((space, index) => new PartyPokemon(store, { space, index, offset: 0 })), store, { space: "section:1", offset: 0x34, type: "u8", length: 1 });
    this.boxes = expand("box:{1..14}").map((space, index) => new Box(store, { space, index, offset: 0 }));
    this.bag = new Bag(store, this.#at);
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

  get nationalPokedexMagicRubySapphireAndEmerald(): number {
    return this.#store.number({ space: this.#space, offset: 0x1A, type: "u8", length: 1 });
  }

  set nationalPokedexMagicRubySapphireAndEmerald(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1A, type: "u8", length: 1 }, value);
  }

  get nationalPokedexMagic(): number {
    return this.#store.number({ space: this.#space, offset: 0x1B, type: "u8", length: 1 });
  }

  set nationalPokedexMagic(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1B, type: "u8", length: 1 }, value);
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

  get linkFlags(): number {
    return this.#store.number({ space: this.#space, offset: 0xA8, type: "u32le", length: 4 });
  }

  set linkFlags(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA8, type: "u32le", length: 4 }, value);
  }

  get pokedexCheckWord1(): number {
    return this.#store.number({ space: this.#space, offset: 0xAC, type: "u16le", length: 2 });
  }

  set pokedexCheckWord1(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xAC, type: "u16le", length: 2 }, value);
  }

  get pokedexCheckWord0(): number {
    return this.#store.number({ space: this.#space, offset: 0xAE, type: "u16le", length: 2 });
  }

  set pokedexCheckWord0(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xAE, type: "u16le", length: 2 }, value);
  }

  get eReaderTrainer(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x4A0, type: "bytes", length: 188 });
  }

  set eReaderTrainer(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x4A0, type: "bytes", length: 188 }, value);
  }

  get berryCrushBestSpeeds(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0xAF0 + i * 2, type: "u16le", length: 2 }));
  }

  set berryCrushBestSpeeds(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xAF0 + i * 2, type: "u16le", length: 2 }, value));
  }

  get berryPowder(): number {
    return this.#store.number({ space: this.#space, offset: 0xAF8, type: "u32le", length: 4 });
  }

  set berryPowder(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xAF8, type: "u32le", length: 4 }, value);
  }

  get pokemonJumpBestPerfectJumpsInARow(): number {
    return this.#store.number({ space: this.#space, offset: 0xB00, type: "u16le", length: 2 });
  }

  set pokemonJumpBestPerfectJumpsInARow(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xB00, type: "u16le", length: 2 }, value);
  }

  get pokemonJumpBestFivePlayerJumpsInARow(): number {
    return this.#store.number({ space: this.#space, offset: 0xB04, type: "u16le", length: 2 });
  }

  set pokemonJumpBestFivePlayerJumpsInARow(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xB04, type: "u16le", length: 2 }, value);
  }

  get pokemonJumpGamesWithMostPlayers(): number {
    return this.#store.number({ space: this.#space, offset: 0xB06, type: "u16le", length: 2 });
  }

  set pokemonJumpGamesWithMostPlayers(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xB06, type: "u16le", length: 2 }, value);
  }

  get pokemonJumpBestScore(): number {
    return this.#store.number({ space: this.#space, offset: 0xB0C, type: "u32le", length: 4 });
  }

  set pokemonJumpBestScore(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xB0C, type: "u32le", length: 4 }, value);
  }

  get dodrioBerryPickingBestScore(): number {
    return this.#store.number({ space: this.#space, offset: 0xB10, type: "u32le", length: 4 });
  }

  set dodrioBerryPickingBestScore(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xB10, type: "u32le", length: 4 }, value);
  }

  get dodrioBerryPickingBestBerriesInARow(): number {
    return this.#store.number({ space: this.#space, offset: 0xB14, type: "u16le", length: 2 });
  }

  set dodrioBerryPickingBestBerriesInARow(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xB14, type: "u16le", length: 2 }, value);
  }

  get dodrioBerryPickingBestFivePlayerBerriesInARow(): number {
    return this.#store.number({ space: this.#space, offset: 0xB16, type: "u16le", length: 2 });
  }

  set dodrioBerryPickingBestFivePlayerBerriesInARow(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xB16, type: "u16le", length: 2 }, value);
  }

  get securityKey(): number {
    return this.#store.number({ space: this.#space, offset: 0xF20, type: "u32le", length: 4 });
  }

  set securityKey(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xF20, type: "u32le", length: 4 }, value);
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
    return this.#store.number({ space: this.#space, offset: 0x34, type: "u8", length: 1 });
  }

  set partyCount(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x34, type: "u8", length: 1 }, value);
  }

  get partyPokemon(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x38, type: "bytes", length: 600 });
  }

  set partyPokemon(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x38, type: "bytes", length: 600 }, value);
  }

  get money(): number {
    return this.#store.number({ space: this.#space, offset: 0x290, type: "u32le", length: 4 });
  }

  set money(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x290, type: "u32le", length: 4 }, value);
  }

  get coins(): number {
    return this.#store.number({ space: this.#space, offset: 0x294, type: "u16le", length: 2 });
  }

  set coins(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x294, type: "u16le", length: 2 }, value);
  }

  get registeredItem(): number {
    return this.#store.number({ space: this.#space, offset: 0x296, type: "u16le", length: 2 });
  }

  set registeredItem(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x296, type: "u16le", length: 2 }, value);
  }

  get pcItems(): readonly Section1PcItems[] {
    return repeat(30, (i) => new Section1PcItems(this.#store, { space: this.#space, offset: 0x298 + i * 4, type: "u32le", length: 4 }));
  }

  get itemsPocket(): readonly Section1ItemsPocket[] {
    return repeat(42, (i) => new Section1ItemsPocket(this.#store, { space: this.#space, offset: 0x310 + i * 4, type: "u32le", length: 4 }));
  }

  get keyItemsPocket(): readonly Section1KeyItemsPocket[] {
    return repeat(30, (i) => new Section1KeyItemsPocket(this.#store, { space: this.#space, offset: 0x3B8 + i * 4, type: "u32le", length: 4 }));
  }

  get pokeBallsPocket(): readonly Section1PokeBallsPocket[] {
    return repeat(13, (i) => new Section1PokeBallsPocket(this.#store, { space: this.#space, offset: 0x430 + i * 4, type: "u32le", length: 4 }));
  }

  get tmsAndHmsPocket(): readonly Section1TmsAndHmsPocket[] {
    return repeat(58, (i) => new Section1TmsAndHmsPocket(this.#store, { space: this.#space, offset: 0x464 + i * 4, type: "u32le", length: 4 }));
  }

  get berriesPocket(): readonly Section1BerriesPocket[] {
    return repeat(43, (i) => new Section1BerriesPocket(this.#store, { space: this.#space, offset: 0x54C + i * 4, type: "u32le", length: 4 }));
  }

  get pokedexSeenFlagsCopy2(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x5F8, type: "flags", length: 49 });
  }

  set pokedexSeenFlagsCopy2(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x5F8, type: "flags", length: 49 }, value);
  }

  get eventFlagsPart1(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0xEE0, type: "flags", length: 160 });
  }

  set eventFlagsPart1(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0xEE0, type: "flags", length: 160 }, value);
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

  get eventFlagsPart2(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x0, type: "flags", length: 128 });
  }

  set eventFlagsPart2(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x0, type: "flags", length: 128 }, value);
  }

  get eventWork(): readonly (number)[] {
    return repeat(256, (i) => this.#store.number({ space: this.#space, offset: 0x80 + i * 2, type: "u16le", length: 2 }));
  }

  set eventWork(values: readonly (number)[]) {
    setEach(256, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x80 + i * 2, type: "u16le", length: 2 }, value));
  }

  get gameStats(): readonly (number)[] {
    return repeat(64, (i) => this.#store.number({ space: this.#space, offset: 0x280 + i * 4, type: "u32le", length: 4 }));
  }

  set gameStats(values: readonly (number)[]) {
    setEach(64, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x280 + i * 4, type: "u32le", length: 4 }, value));
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

  get mailWords(): readonly (Uint8Array)[] {
    return repeat(12, (i) => this.#store.raw({ space: this.#space, offset: 0xDD0 + i * 36, type: "bytes", length: 18 }));
  }

  set mailWords(values: readonly (Uint8Array)[]) {
    setEach(12, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0xDD0 + i * 36, type: "bytes", length: 18 }, value));
  }

  get mailAuthorName(): readonly (string)[] {
    return repeat(12, (i) => this.#store.text({ space: this.#space, offset: 0xDE2 + i * 36, type: "text-gen3-intl", length: 8 }));
  }

  set mailAuthorName(values: readonly (string)[]) {
    setEach(12, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0xDE2 + i * 36, type: "text-gen3-intl", length: 8 }, value));
  }

  get mailAuthorTrainerId(): readonly (number)[] {
    return repeat(12, (i) => this.#store.number({ space: this.#space, offset: 0xDEA + i * 36, type: "u16le", length: 2 }));
  }

  set mailAuthorTrainerId(values: readonly (number)[]) {
    setEach(12, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xDEA + i * 36, type: "u16le", length: 2 }, value));
  }

  get mailAuthorSecretId(): readonly (number)[] {
    return repeat(12, (i) => this.#store.number({ space: this.#space, offset: 0xDEC + i * 36, type: "u16le", length: 2 }));
  }

  set mailAuthorSecretId(values: readonly (number)[]) {
    setEach(12, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xDEC + i * 36, type: "u16le", length: 2 }, value));
  }

  get mailPokemonSpecies(): readonly (number)[] {
    return repeat(12, (i) => this.#store.number({ space: this.#space, offset: 0xDEE + i * 36, type: "u16le", length: 2 }));
  }

  set mailPokemonSpecies(values: readonly (number)[]) {
    setEach(12, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xDEE + i * 36, type: "u16le", length: 2 }, value));
  }

  get mailItem(): readonly (number)[] {
    return repeat(12, (i) => this.#store.number({ space: this.#space, offset: 0xDF0 + i * 36, type: "u16le", length: 2 }));
  }

  set mailItem(values: readonly (number)[]) {
    setEach(12, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xDF0 + i * 36, type: "u16le", length: 2 }, value));
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

  get mailWords(): readonly (Uint8Array)[] {
    return repeat(4, (i) => this.#store.raw({ space: this.#space, offset: 0x0 + i * 36, type: "bytes", length: 18 }));
  }

  set mailWords(values: readonly (Uint8Array)[]) {
    setEach(4, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0x0 + i * 36, type: "bytes", length: 18 }, value));
  }

  get mailAuthorName(): readonly (string)[] {
    return repeat(4, (i) => this.#store.text({ space: this.#space, offset: 0x12 + i * 36, type: "text-gen3-intl", length: 8 }));
  }

  set mailAuthorName(values: readonly (string)[]) {
    setEach(4, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0x12 + i * 36, type: "text-gen3-intl", length: 8 }, value));
  }

  get mailAuthorTrainerId(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x1A + i * 36, type: "u16le", length: 2 }));
  }

  set mailAuthorTrainerId(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x1A + i * 36, type: "u16le", length: 2 }, value));
  }

  get mailAuthorSecretId(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x1C + i * 36, type: "u16le", length: 2 }));
  }

  set mailAuthorSecretId(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x1C + i * 36, type: "u16le", length: 2 }, value));
  }

  get mailPokemonSpecies(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x1E + i * 36, type: "u16le", length: 2 }));
  }

  set mailPokemonSpecies(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x1E + i * 36, type: "u16le", length: 2 }, value));
  }

  get mailItem(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x20 + i * 36, type: "u16le", length: 2 }));
  }

  set mailItem(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x20 + i * 36, type: "u16le", length: 2 }, value));
  }

  get daycarePokemon(): readonly (Uint8Array)[] {
    return repeat(2, (i) => this.#store.raw({ space: this.#space, offset: 0x100 + i * 140, type: "bytes", length: 80 }));
  }

  set daycarePokemon(values: readonly (Uint8Array)[]) {
    setEach(2, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0x100 + i * 140, type: "bytes", length: 80 }, value));
  }

  get daycarePokemonMail(): readonly (Uint8Array)[] {
    return repeat(2, (i) => this.#store.raw({ space: this.#space, offset: 0x150 + i * 140, type: "bytes", length: 56 }));
  }

  set daycarePokemonMail(values: readonly (Uint8Array)[]) {
    setEach(2, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0x150 + i * 140, type: "bytes", length: 56 }, value));
  }

  get daycareExperienceGained(): readonly (number)[] {
    return repeat(2, (i) => this.#store.number({ space: this.#space, offset: 0x188 + i * 140, type: "u32le", length: 4 }));
  }

  set daycareExperienceGained(values: readonly (number)[]) {
    setEach(2, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x188 + i * 140, type: "u32le", length: 4 }, value));
  }

  get daycareEggSeed(): number {
    return this.#store.number({ space: this.#space, offset: 0x218, type: "u16le", length: 2 });
  }

  set daycareEggSeed(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x218, type: "u16le", length: 2 }, value);
  }

  get giftRibbons(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x21C, type: "bytes", length: 11 });
  }

  set giftRibbons(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x21C, type: "bytes", length: 11 }, value);
  }

  get colosseumPokecoupons(): Section4ColosseumPokecoupons {
    return new Section4ColosseumPokecoupons(this.#store, { space: this.#space, offset: 0x22E, type: "u32le", length: 4 });
  }

  get colosseumBonusDiscRewards(): Section4ColosseumBonusDiscRewards {
    return new Section4ColosseumBonusDiscRewards(this.#store, { space: this.#space, offset: 0x232, type: "u32le", length: 4 });
  }

  get pokemonBoxFlags(): Section4PokemonBoxFlags {
    return new Section4PokemonBoxFlags(this.#store, { space: this.#space, offset: 0x23B, type: "u8", length: 1 });
  }

  get colosseumJirachiFlag(): Section4ColosseumJirachiFlag {
    return new Section4ColosseumJirachiFlag(this.#store, { space: this.#space, offset: 0x23D, type: "u8", length: 1 });
  }

  get roamerIvs(): Section4RoamerIvs {
    return new Section4RoamerIvs(this.#store, { space: this.#space, offset: 0x250, type: "u32le", length: 4 });
  }

  get roamerPid(): number {
    return this.#store.number({ space: this.#space, offset: 0x254, type: "u32le", length: 4 });
  }

  set roamerPid(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x254, type: "u32le", length: 4 }, value);
  }

  get roamerSpecies(): number {
    return this.#store.number({ space: this.#space, offset: 0x258, type: "u16le", length: 2 });
  }

  set roamerSpecies(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x258, type: "u16le", length: 2 }, value);
  }

  get roamerCurrentHp(): number {
    return this.#store.number({ space: this.#space, offset: 0x25A, type: "u16le", length: 2 });
  }

  set roamerCurrentHp(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x25A, type: "u16le", length: 2 }, value);
  }

  get roamerLevel(): number {
    return this.#store.number({ space: this.#space, offset: 0x25C, type: "u8", length: 1 });
  }

  set roamerLevel(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x25C, type: "u8", length: 1 }, value);
  }

  get roamerStatus(): number {
    return this.#store.number({ space: this.#space, offset: 0x25D, type: "u8", length: 1 });
  }

  set roamerStatus(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x25D, type: "u8", length: 1 }, value);
  }

  get roamerContestStats(): readonly (number)[] {
    return repeat(5, (i) => this.#store.number({ space: this.#space, offset: 0x25E + i * 1, type: "u8", length: 1 }));
  }

  set roamerContestStats(values: readonly (number)[]) {
    setEach(5, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x25E + i * 1, type: "u8", length: 1 }, value));
  }

  get roamerActive(): number {
    return this.#store.number({ space: this.#space, offset: 0x263, type: "u8", length: 1 });
  }

  set roamerActive(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x263, type: "u8", length: 1 }, value);
  }

  get eReaderBerryName(): string {
    return this.#store.text({ space: this.#space, offset: 0x26C, type: "text-gen3-intl", length: 7 });
  }

  set eReaderBerryName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x26C, type: "text-gen3-intl", length: 7 }, value);
  }

  get eReaderBerryData(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x273, type: "bytes", length: 45 });
  }

  set eReaderBerryData(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x273, type: "bytes", length: 45 }, value);
  }

  get wonderNewsChecksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x2A0, type: "u16le", length: 2 });
  }

  set wonderNewsChecksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2A0, type: "u16le", length: 2 }, value);
  }

  get wonderNewsId(): number {
    return this.#store.number({ space: this.#space, offset: 0x2A4, type: "u16le", length: 2 });
  }

  set wonderNewsId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2A4, type: "u16le", length: 2 }, value);
  }

  get wonderNewsFlag(): number {
    return this.#store.number({ space: this.#space, offset: 0x2A6, type: "u8", length: 1 });
  }

  set wonderNewsFlag(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2A6, type: "u8", length: 1 }, value);
  }

  get wonderNewsColor(): number {
    return this.#store.number({ space: this.#space, offset: 0x2A7, type: "u8", length: 1 });
  }

  set wonderNewsColor(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2A7, type: "u8", length: 1 }, value);
  }

  get wonderNewsTitle(): string {
    return this.#store.text({ space: this.#space, offset: 0x2A8, type: "text-gen3-intl", length: 40 });
  }

  set wonderNewsTitle(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x2A8, type: "text-gen3-intl", length: 40 }, value);
  }

  get wonderCardChecksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x460, type: "u16le", length: 2 });
  }

  set wonderCardChecksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x460, type: "u16le", length: 2 }, value);
  }

  get wonderCardId(): number {
    return this.#store.number({ space: this.#space, offset: 0x464, type: "u16le", length: 2 });
  }

  set wonderCardId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x464, type: "u16le", length: 2 }, value);
  }

  get wonderCardIcon(): number {
    return this.#store.number({ space: this.#space, offset: 0x466, type: "u16le", length: 2 });
  }

  set wonderCardIcon(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x466, type: "u16le", length: 2 }, value);
  }

  get wonderCardCount(): number {
    return this.#store.number({ space: this.#space, offset: 0x468, type: "u32le", length: 4 });
  }

  set wonderCardCount(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x468, type: "u32le", length: 4 }, value);
  }

  get wonderCardStyle(): Section4WonderCardStyle {
    return new Section4WonderCardStyle(this.#store, { space: this.#space, offset: 0x46C, type: "u8", length: 1 });
  }

  get wonderCardSecondCount(): number {
    return this.#store.number({ space: this.#space, offset: 0x46D, type: "u8", length: 1 });
  }

  set wonderCardSecondCount(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x46D, type: "u8", length: 1 }, value);
  }

  get wonderCardTitle(): string {
    return this.#store.text({ space: this.#space, offset: 0x46E, type: "text-gen3-intl", length: 40 });
  }

  set wonderCardTitle(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x46E, type: "text-gen3-intl", length: 40 }, value);
  }

  get wonderCardStatsChecksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x5B0, type: "u16le", length: 2 });
  }

  set wonderCardStatsChecksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x5B0, type: "u16le", length: 2 }, value);
  }

  get wonderCardWins(): number {
    return this.#store.number({ space: this.#space, offset: 0x5B4, type: "u16le", length: 2 });
  }

  set wonderCardWins(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x5B4, type: "u16le", length: 2 }, value);
  }

  get wonderCardLosses(): number {
    return this.#store.number({ space: this.#space, offset: 0x5B6, type: "u16le", length: 2 });
  }

  set wonderCardLosses(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x5B6, type: "u16le", length: 2 }, value);
  }

  get wonderCardTrades(): number {
    return this.#store.number({ space: this.#space, offset: 0x5B8, type: "u16le", length: 2 });
  }

  set wonderCardTrades(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x5B8, type: "u16le", length: 2 }, value);
  }

  get mysteryEventScriptChecksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x79C, type: "u16le", length: 2 });
  }

  set mysteryEventScriptChecksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x79C, type: "u16le", length: 2 }, value);
  }

  get mysteryEventScriptMagic(): number {
    return this.#store.number({ space: this.#space, offset: 0x7A0, type: "u8", length: 1 });
  }

  set mysteryEventScriptMagic(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x7A0, type: "u8", length: 1 }, value);
  }

  get mysteryEventScriptMapGroup(): number {
    return this.#store.number({ space: this.#space, offset: 0x7A1, type: "u8", length: 1 });
  }

  set mysteryEventScriptMapGroup(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x7A1, type: "u8", length: 1 }, value);
  }

  get mysteryEventScriptMapNumber(): number {
    return this.#store.number({ space: this.#space, offset: 0x7A2, type: "u8", length: 1 });
  }

  set mysteryEventScriptMapNumber(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x7A2, type: "u8", length: 1 }, value);
  }

  get mysteryEventScriptObjectId(): number {
    return this.#store.number({ space: this.#space, offset: 0x7A3, type: "u8", length: 1 });
  }

  set mysteryEventScriptObjectId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x7A3, type: "u8", length: 1 }, value);
  }

  get pokedexSeenFlagsCopy3(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0xB98, type: "flags", length: 49 });
  }

  set pokedexSeenFlagsCopy3(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0xB98, type: "flags", length: 49 }, value);
  }

  get rivalName(): string {
    return this.#store.text({ space: this.#space, offset: 0xBCC, type: "text-gen3-intl", length: 8 });
  }

  set rivalName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0xBCC, type: "text-gen3-intl", length: 8 }, value);
  }

  get route5DaycarePokemon(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0xE18, type: "bytes", length: 80 });
  }

  set route5DaycarePokemon(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0xE18, type: "bytes", length: 80 }, value);
  }

  get route5DaycarePokemonMail(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0xE68, type: "bytes", length: 56 });
  }

  set route5DaycarePokemonMail(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0xE68, type: "bytes", length: 56 }, value);
  }

  get route5DaycareExperienceGained(): number {
    return this.#store.number({ space: this.#space, offset: 0xEA0, type: "u32le", length: 4 });
  }

  set route5DaycareExperienceGained(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xEA0, type: "u32le", length: 4 }, value);
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

  get goldPokecouponTitle(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set goldPokecouponTitle(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get silverPokecouponTitle(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set silverPokecouponTitle(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }

  get bronzePokecouponTitle(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 1 });
  }

  set bronzePokecouponTitle(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 1 }, value);
  }

  get receivedAgetoCelebi(): number {
    return this.#store.number({ ...this.#read, bit: 3, width: 1 });
  }

  set receivedAgetoCelebi(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 3, width: 1 }, value);
  }

  get totalPokecouponsEarned(): number {
    return this.#store.number({ ...this.#read, bit: 8, width: 24 });
  }

  set totalPokecouponsEarned(value: number) {
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

  get depositEggRewardsUnlocked(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 2 });
  }

  set depositEggRewardsUnlocked(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 2 }, value);
  }
}

export class Section4ColosseumJirachiFlag {
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

  get receivedWishmkrJirachi(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set receivedWishmkrJirachi(value: number) {
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

  get specialAttack(): number {
    return this.#store.number({ ...this.#read, bit: 20, width: 5 });
  }

  set specialAttack(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 20, width: 5 }, value);
  }

  get specialDefense(): number {
    return this.#store.number({ ...this.#read, bit: 25, width: 5 });
  }

  set specialDefense(value: number) {
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
  ["party:{1..6}", Pk3Party],
  ["box:{1..14}:{1..30}", Pk3],
];

export const read = (file: Uint8Array) => new Save(file);
