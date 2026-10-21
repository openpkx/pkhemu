// Generated from known/memory-card-box-1.0.json by tools/parser/generate.ts. Run npm run parsers after changing either.
import { expand, repeat, setEach, spaceView, Store, type At, type ContainerDef, type Read, type SpaceDef } from "../tools/parser/runtime.ts";

export const target = {"schema":"1.0","format":"memory-card-box","version":"1.0"};

const container: ContainerDef[] = [{"transform":"gc-memory-card","args":{"gameCodes":["GPXE","GPXP"]}},{"transform":"box-slots"}];

const spaces: SpaceDef[] = [
  {"name":"block:0","length":8192,"transform":"box-blocks","args":{"block":0},"checksums":[{"step":"box-sum","start":4,"end":8188,"at":0}]},
  {"name":"block:1","length":8192,"transform":"box-blocks","args":{"block":1},"checksums":[{"step":"box-sum","start":4,"end":8188,"at":0}]},
  {"name":"block:2","length":8192,"transform":"box-blocks","args":{"block":2},"checksums":[{"step":"box-sum","start":4,"end":8188,"at":0}]},
  {"name":"block:3","length":8192,"transform":"box-blocks","args":{"block":3},"checksums":[{"step":"box-sum","start":4,"end":8188,"at":0}]},
  {"name":"block:4","length":8192,"transform":"box-blocks","args":{"block":4},"checksums":[{"step":"box-sum","start":4,"end":8188,"at":0}]},
  {"name":"block:5","length":8192,"transform":"box-blocks","args":{"block":5},"checksums":[{"step":"box-sum","start":4,"end":8188,"at":0}]},
  {"name":"block:6","length":8192,"transform":"box-blocks","args":{"block":6},"checksums":[{"step":"box-sum","start":4,"end":8188,"at":0}]},
  {"name":"block:7","length":8192,"transform":"box-blocks","args":{"block":7},"checksums":[{"step":"box-sum","start":4,"end":8188,"at":0}]},
  {"name":"block:8","length":8192,"transform":"box-blocks","args":{"block":8},"checksums":[{"step":"box-sum","start":4,"end":8188,"at":0}]},
  {"name":"block:9","length":8192,"transform":"box-blocks","args":{"block":9},"checksums":[{"step":"box-sum","start":4,"end":8188,"at":0}]},
  {"name":"block:10","length":8192,"transform":"box-blocks","args":{"block":10},"checksums":[{"step":"box-sum","start":4,"end":8188,"at":0}]},
  {"name":"block:11","length":8192,"transform":"box-blocks","args":{"block":11},"checksums":[{"step":"box-sum","start":4,"end":8188,"at":0}]},
  {"name":"block:12","length":8192,"transform":"box-blocks","args":{"block":12},"checksums":[{"step":"box-sum","start":4,"end":8188,"at":0}]},
  {"name":"block:13","length":8192,"transform":"box-blocks","args":{"block":13},"checksums":[{"step":"box-sum","start":4,"end":8188,"at":0}]},
  {"name":"block:14","length":8192,"transform":"box-blocks","args":{"block":14},"checksums":[{"step":"box-sum","start":4,"end":8188,"at":0}]},
  {"name":"block:15","length":8192,"transform":"box-blocks","args":{"block":15},"checksums":[{"step":"box-sum","start":4,"end":8188,"at":0}]},
  {"name":"block:16","length":8192,"transform":"box-blocks","args":{"block":16},"checksums":[{"step":"box-sum","start":4,"end":8188,"at":0}]},
  {"name":"block:17","length":8192,"transform":"box-blocks","args":{"block":17},"checksums":[{"step":"box-sum","start":4,"end":8188,"at":0}]},
  {"name":"block:18","length":8192,"transform":"box-blocks","args":{"block":18},"checksums":[{"step":"box-sum","start":4,"end":8188,"at":0}]},
  {"name":"block:19","length":8192,"transform":"box-blocks","args":{"block":19},"checksums":[{"step":"box-sum","start":4,"end":8188,"at":0}]},
  {"name":"block:20","length":8192,"transform":"box-blocks","args":{"block":20},"checksums":[{"step":"box-sum","start":4,"end":8188,"at":0}]},
  {"name":"block:21","length":8192,"transform":"box-blocks","args":{"block":21},"checksums":[{"step":"box-sum","start":4,"end":8188,"at":0}]},
  {"name":"block:22","length":8192,"transform":"box-blocks","args":{"block":22},"checksums":[{"step":"box-sum","start":4,"end":8188,"at":0}]},
  {"name":"pc","length":8,"source":{"regions":[{"space":"block:0","start":12,"end":8188},{"space":"block:1","start":12,"end":8188},{"space":"block:2","start":12,"end":8188},{"space":"block:3","start":12,"end":8188},{"space":"block:4","start":12,"end":8188},{"space":"block:5","start":12,"end":8188},{"space":"block:6","start":12,"end":8188},{"space":"block:7","start":12,"end":8188},{"space":"block:8","start":12,"end":8188},{"space":"block:9","start":12,"end":8188},{"space":"block:10","start":12,"end":8188},{"space":"block:11","start":12,"end":8188},{"space":"block:12","start":12,"end":8188},{"space":"block:13","start":12,"end":8188},{"space":"block:14","start":12,"end":8188},{"space":"block:15","start":12,"end":8188},{"space":"block:16","start":12,"end":8188},{"space":"block:17","start":12,"end":8188},{"space":"block:18","start":12,"end":8188},{"space":"block:19","start":12,"end":8188},{"space":"block:20","start":12,"end":8188},{"space":"block:21","start":12,"end":8188},{"space":"block:22","start":12,"end":8188}],"offset":0}},
  {"name":"box:{1..25}:{1..60}","length":80,"transform":"pk3-crypt","source":{"regions":[{"space":"block:0","start":12,"end":8188},{"space":"block:1","start":12,"end":8188},{"space":"block:2","start":12,"end":8188},{"space":"block:3","start":12,"end":8188},{"space":"block:4","start":12,"end":8188},{"space":"block:5","start":12,"end":8188},{"space":"block:6","start":12,"end":8188},{"space":"block:7","start":12,"end":8188},{"space":"block:8","start":12,"end":8188},{"space":"block:9","start":12,"end":8188},{"space":"block:10","start":12,"end":8188},{"space":"block:11","start":12,"end":8188},{"space":"block:12","start":12,"end":8188},{"space":"block:13","start":12,"end":8188},{"space":"block:14","start":12,"end":8188},{"space":"block:15","start":12,"end":8188},{"space":"block:16","start":12,"end":8188},{"space":"block:17","start":12,"end":8188},{"space":"block:18","start":12,"end":8188},{"space":"block:19","start":12,"end":8188},{"space":"block:20","start":12,"end":8188},{"space":"block:21","start":12,"end":8188},{"space":"block:22","start":12,"end":8188}],"offset":8,"stride":84},"checksums":[{"step":"sum16le","start":32,"end":80,"at":28}]},
  {"name":"depositor:{1..25}:{1..60}","length":4,"source":{"regions":[{"space":"block:0","start":12,"end":8188},{"space":"block:1","start":12,"end":8188},{"space":"block:2","start":12,"end":8188},{"space":"block:3","start":12,"end":8188},{"space":"block:4","start":12,"end":8188},{"space":"block:5","start":12,"end":8188},{"space":"block:6","start":12,"end":8188},{"space":"block:7","start":12,"end":8188},{"space":"block:8","start":12,"end":8188},{"space":"block:9","start":12,"end":8188},{"space":"block:10","start":12,"end":8188},{"space":"block:11","start":12,"end":8188},{"space":"block:12","start":12,"end":8188},{"space":"block:13","start":12,"end":8188},{"space":"block:14","start":12,"end":8188},{"space":"block:15","start":12,"end":8188},{"space":"block:16","start":12,"end":8188},{"space":"block:17","start":12,"end":8188},{"space":"block:18","start":12,"end":8188},{"space":"block:19","start":12,"end":8188},{"space":"block:20","start":12,"end":8188},{"space":"block:21","start":12,"end":8188},{"space":"block:22","start":12,"end":8188}],"offset":88,"stride":84}},
  {"name":"box-settings","length":250,"source":{"regions":[{"space":"block:0","start":12,"end":8188},{"space":"block:1","start":12,"end":8188},{"space":"block:2","start":12,"end":8188},{"space":"block:3","start":12,"end":8188},{"space":"block:4","start":12,"end":8188},{"space":"block:5","start":12,"end":8188},{"space":"block:6","start":12,"end":8188},{"space":"block:7","start":12,"end":8188},{"space":"block:8","start":12,"end":8188},{"space":"block:9","start":12,"end":8188},{"space":"block:10","start":12,"end":8188},{"space":"block:11","start":12,"end":8188},{"space":"block:12","start":12,"end":8188},{"space":"block:13","start":12,"end":8188},{"space":"block:14","start":12,"end":8188},{"space":"block:15","start":12,"end":8188},{"space":"block:16","start":12,"end":8188},{"space":"block:17","start":12,"end":8188},{"space":"block:18","start":12,"end":8188},{"space":"block:19","start":12,"end":8188},{"space":"block:20","start":12,"end":8188},{"space":"block:21","start":12,"end":8188},{"space":"block:22","start":12,"end":8188}],"offset":126008}},
];

export type Spaces =
  { "block:0": BoxBlock } &
  { "block:1": BoxBlock } &
  { "block:2": BoxBlock } &
  { "block:3": BoxBlock } &
  { "block:4": BoxBlock } &
  { "block:5": BoxBlock } &
  { "block:6": BoxBlock } &
  { "block:7": BoxBlock } &
  { "block:8": BoxBlock } &
  { "block:9": BoxBlock } &
  { "block:10": BoxBlock } &
  { "block:11": BoxBlock } &
  { "block:12": BoxBlock } &
  { "block:13": BoxBlock } &
  { "block:14": BoxBlock } &
  { "block:15": BoxBlock } &
  { "block:16": BoxBlock } &
  { "block:17": BoxBlock } &
  { "block:18": BoxBlock } &
  { "block:19": BoxBlock } &
  { "block:20": BoxBlock } &
  { "block:21": BoxBlock } &
  { "block:22": BoxBlock } &
  { "pc": Pc } &
  { [Name in `box:${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25}:${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40 | 41 | 42 | 43 | 44 | 45 | 46 | 47 | 48 | 49 | 50 | 51 | 52 | 53 | 54 | 55 | 56 | 57 | 58 | 59 | 60}`]: Pk3 } &
  { [Name in `depositor:${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25}:${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40 | 41 | 42 | 43 | 44 | 45 | 46 | 47 | 48 | 49 | 50 | 51 | 52 | 53 | 54 | 55 | 56 | 57 | 58 | 59 | 60}`]: Depositor } &
  { "box-settings": BoxSettings };

export type SpaceName = keyof Spaces;

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

export class Box {
  readonly #store: Store;
  readonly #at: At;
  readonly slots: readonly Pokemon[];

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
    this.slots = expand(`${this.#at.space}:{1..60}`).map((space, index) => new Pokemon(store, { space, index, offset: 0 }));
  }

  get name(): string {
    return this.#store.text({ space: "box-settings", offset: 0x0 + this.#at.index * 9, type: "text-gen3-intl", length: 9 });
  }

  set name(value: string) {
    this.#store.setText({ space: "box-settings", offset: 0x0 + this.#at.index * 9, type: "text-gen3-intl", length: 9 }, value);
  }

  get wallpaper(): number {
    return this.#store.number({ space: "box-settings", offset: 0xE1 + this.#at.index * 1, type: "u8", length: 1 });
  }

  set wallpaper(value: number) {
    this.#store.setNumber({ space: "box-settings", offset: 0xE1 + this.#at.index * 1, type: "u8", length: 1 }, value);
  }
}

export class Save {
  readonly #store: Store;
  readonly boxes: readonly Box[];

  constructor(file: Uint8Array) {
    const store = new Store(file, spaces, container);
    this.#store = store;
    this.boxes = expand("box:{1..25}").map((space, index) => new Box(store, { space, index, offset: 0 }));
  }

  space<Name extends SpaceName>(name: Name): Spaces[Name] {
    return spaceView(this.#store, name, views) as Spaces[Name];
  }

  write(): Uint8Array {
    return this.#store.write();
  }
}

export class BoxBlock {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x0, type: "u32be", length: 4 });
  }

  set checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x0, type: "u32be", length: 4 }, value);
  }

  get blockId(): number {
    return this.#store.number({ space: this.#space, offset: 0x4, type: "u32be", length: 4 });
  }

  set blockId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x4, type: "u32be", length: 4 }, value);
  }

  get saveCounter(): number {
    return this.#store.number({ space: this.#space, offset: 0x8, type: "i32be", length: 4 });
  }

  set saveCounter(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x8, type: "i32be", length: 4 }, value);
  }
}

export class Pc {
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
    return this.#store.number({ space: this.#space, offset: 0x4, type: "u8", length: 1 });
  }

  set currentBox(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x4, type: "u8", length: 1 }, value);
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

export class Depositor {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get depositorId(): DepositorDepositorId {
    return new DepositorDepositorId(this.#store, { space: this.#space, offset: 0x0, type: "u32le", length: 4 });
  }
}

export class DepositorDepositorId {
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

export class BoxSettings {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get boxNames(): readonly (string)[] {
    return repeat(25, (i) => this.#store.text({ space: this.#space, offset: 0x0 + i * 9, type: "text-gen3-intl", length: 9 }));
  }

  set boxNames(values: readonly (string)[]) {
    setEach(25, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0x0 + i * 9, type: "text-gen3-intl", length: 9 }, value));
  }

  get boxWallpapers(): readonly (number)[] {
    return repeat(25, (i) => this.#store.number({ space: this.#space, offset: 0xE1 + i * 1, type: "u8", length: 1 }));
  }

  set boxWallpapers(values: readonly (number)[]) {
    setEach(25, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xE1 + i * 1, type: "u8", length: 1 }, value));
  }
}

const views: [string, new (store: Store, space: string) => unknown][] = [
  ["block:0", BoxBlock],
  ["block:1", BoxBlock],
  ["block:2", BoxBlock],
  ["block:3", BoxBlock],
  ["block:4", BoxBlock],
  ["block:5", BoxBlock],
  ["block:6", BoxBlock],
  ["block:7", BoxBlock],
  ["block:8", BoxBlock],
  ["block:9", BoxBlock],
  ["block:10", BoxBlock],
  ["block:11", BoxBlock],
  ["block:12", BoxBlock],
  ["block:13", BoxBlock],
  ["block:14", BoxBlock],
  ["block:15", BoxBlock],
  ["block:16", BoxBlock],
  ["block:17", BoxBlock],
  ["block:18", BoxBlock],
  ["block:19", BoxBlock],
  ["block:20", BoxBlock],
  ["block:21", BoxBlock],
  ["block:22", BoxBlock],
  ["pc", Pc],
  ["box:{1..25}:{1..60}", Pk3],
  ["depositor:{1..25}:{1..60}", Depositor],
  ["box-settings", BoxSettings],
];

export const read = (file: Uint8Array) => new Save(file);
