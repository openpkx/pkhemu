// Generated from known/usum-1.0.json by tools/parser/generate.ts. Run npm run parsers after changing either.
import { counted, expand, repeat, setEach, spaceView, Store, type At, type Counted, type Read, type SpaceDef } from "../tools/parser/runtime.ts";

export const target = {"schema":"1.0","format":"usum","version":"1.0"};

const spaces: SpaceDef[] = [
  {"name":"save","length":445440,"checksums":[{"step":"crc16-usb","start":0,"end":3624,"at":444954},{"step":"crc16-usb","start":4096,"end":4220,"at":444962},{"step":"crc16-usb","start":4608,"end":4628,"at":444970},{"step":"crc16-usb","start":5120,"end":5312,"at":444978},{"step":"crc16-usb","start":5632,"end":7196,"at":444986},{"step":"crc16-usb","start":7680,"end":11264,"at":444994},{"step":"crc16-usb","start":11264,"end":15224,"at":445002},{"step":"crc16-usb","start":15360,"end":15912,"at":445010},{"step":"crc16-usb","start":16384,"end":17164,"at":445018},{"step":"crc16-usb","start":17408,"end":17916,"at":445026},{"step":"crc16-usb","start":17920,"end":17996,"at":445034},{"step":"crc16-usb","start":18432,"end":18436,"at":445042},{"step":"crc16-usb","start":18944,"end":19032,"at":445050},{"step":"crc16-usb","start":19456,"end":20966,"at":445058},{"step":"crc16-usb","start":20992,"end":243712,"at":445066},{"step":"crc16-usb","start":243712,"end":266028,"at":445074},{"step":"crc16-usb","start":266240,"end":266248,"at":445082},{"step":"crc16-usb","start":266752,"end":271384,"at":445090},{"step":"crc16-usb","start":271872,"end":278536,"at":445098},{"step":"crc16-usb","start":279040,"end":304648,"at":445106},{"step":"crc16-usb","start":305152,"end":330760,"at":445114},{"step":"crc16-usb","start":331264,"end":346008,"at":445122},{"step":"crc16-usb","start":346112,"end":346368,"at":445130},{"step":"crc16-usb","start":346624,"end":346880,"at":445138},{"step":"crc16-usb","start":347136,"end":413992,"at":445146},{"step":"crc16-usb","start":414208,"end":414724,"at":445154},{"step":"crc16-usb","start":415232,"end":418144,"at":445162},{"step":"crc16-usb","start":418304,"end":434512,"at":445170},{"step":"crc16-usb","start":434688,"end":435544,"at":445178},{"step":"crc16-usb","start":435712,"end":437544,"at":445186},{"step":"crc16-usb","start":437760,"end":438272,"at":445194},{"step":"crc16-usb","start":438272,"end":440088,"at":445202},{"step":"crc16-usb","start":440320,"end":440828,"at":445210},{"step":"crc16-usb","start":440832,"end":441344,"at":445218},{"step":"crc16-usb","start":441344,"end":441632,"at":445226},{"step":"crc16-usb","start":441856,"end":442312,"at":445234},{"step":"crc16-usb","start":442368,"end":442880,"at":445242},{"step":"crc16-usb","start":442880,"end":443804,"at":445250},{"step":"crc16-usb","start":443904,"end":444928,"at":445258},{"step":"memecrypto-sign","start":444928,"end":445264,"at":442624}]},
  {"name":"my-item","length":3624,"source":{"regions":[{"space":"save","start":0,"end":3624}],"offset":0}},
  {"name":"my-status","length":192,"source":{"regions":[{"space":"save","start":5120,"end":5312}],"offset":0}},
  {"name":"poke-party","length":1564,"source":{"regions":[{"space":"save","start":5632,"end":7196}],"offset":0}},
  {"name":"event-work","length":3584,"source":{"regions":[{"space":"save","start":7680,"end":11264}],"offset":0}},
  {"name":"zukan","length":3960,"source":{"regions":[{"space":"save","start":11264,"end":15224}],"offset":0}},
  {"name":"misc","length":508,"source":{"regions":[{"space":"save","start":17408,"end":17916}],"offset":0}},
  {"name":"game-time","length":88,"source":{"regions":[{"space":"save","start":18944,"end":19032}],"offset":0}},
  {"name":"box-layout","length":1510,"source":{"regions":[{"space":"save","start":19456,"end":20966}],"offset":0}},
  {"name":"boxes","length":222720,"source":{"regions":[{"space":"save","start":20992,"end":243712}],"offset":0}},
  {"name":"play-time","length":8,"source":{"regions":[{"space":"save","start":266240,"end":266248}],"offset":0}},
  {"name":"party:{1..6}","length":260,"transform":"pk67-crypt","source":{"regions":[{"space":"poke-party","start":0,"end":1560}],"offset":0,"stride":260},"checksums":[{"step":"sum16le","start":8,"end":232,"at":6}]},
  {"name":"box:{1..32}:{1..30}","length":232,"transform":"pk67-crypt","source":{"regions":[{"space":"boxes","start":0,"end":222720}],"offset":0,"stride":232},"checksums":[{"step":"sum16le","start":8,"end":232,"at":6}]},
];

export type Spaces =
  { "save": SaveSpace } &
  { "my-item": MyItem } &
  { "my-status": MyStatus } &
  { "poke-party": PokeParty } &
  { "event-work": EventWork } &
  { "zukan": Zukan } &
  { "misc": Misc } &
  { "game-time": GameTime } &
  { "box-layout": BoxLayout } &
  { "boxes": Boxes } &
  { "play-time": PlayTimeSpace } &
  { [Name in `party:${1 | 2 | 3 | 4 | 5 | 6}`]: Pk7Party } &
  { [Name in `box:${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32}:${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30}`]: Pk7 };

export type SpaceName = keyof Spaces;

export class Trainer {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get name(): string {
    return this.#store.text({ space: "my-status", offset: 0x38, type: "text-gen7", length: 26 });
  }

  set name(value: string) {
    this.#store.setText({ space: "my-status", offset: 0x38, type: "text-gen7", length: 26 }, value);
  }

  get gender(): number {
    return this.#store.number({ space: "my-status", offset: 0x5, type: "u8", length: 1 });
  }

  set gender(value: number) {
    this.#store.setNumber({ space: "my-status", offset: 0x5, type: "u8", length: 1 }, value);
  }

  get tid(): number {
    return this.#store.number({ space: "my-status", offset: 0x0, type: "u16le", length: 2 });
  }

  set tid(value: number) {
    this.#store.setNumber({ space: "my-status", offset: 0x0, type: "u16le", length: 2 }, value);
  }

  get sid(): number {
    return this.#store.number({ space: "my-status", offset: 0x2, type: "u16le", length: 2 });
  }

  set sid(value: number) {
    this.#store.setNumber({ space: "my-status", offset: 0x2, type: "u16le", length: 2 }, value);
  }

  get money(): number {
    return this.#store.number({ space: "misc", offset: 0x4, type: "u32le", length: 4 });
  }

  set money(value: number) {
    this.#store.setNumber({ space: "misc", offset: 0x4, type: "u32le", length: 4 }, value);
  }

  get battlePoints(): number {
    return this.#store.number({ space: "misc", offset: 0x11C, type: "u32le", length: 4 });
  }

  set battlePoints(value: number) {
    this.#store.setNumber({ space: "misc", offset: 0x11C, type: "u32le", length: 4 }, value);
  }
}

export class PlayTime {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get hours(): number {
    return this.#store.number({ space: "play-time", offset: 0x0, type: "u16le", length: 2 });
  }

  set hours(value: number) {
    this.#store.setNumber({ space: "play-time", offset: 0x0, type: "u16le", length: 2 }, value);
  }

  get minutes(): number {
    return this.#store.number({ space: "play-time", offset: 0x2, type: "u8", length: 1 });
  }

  set minutes(value: number) {
    this.#store.setNumber({ space: "play-time", offset: 0x2, type: "u8", length: 1 }, value);
  }

  get seconds(): number {
    return this.#store.number({ space: "play-time", offset: 0x3, type: "u8", length: 1 });
  }

  set seconds(value: number) {
    this.#store.setNumber({ space: "play-time", offset: 0x3, type: "u8", length: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x1E, type: "u8", length: 1 });
  }

  set health(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x1E, type: "u8", length: 1 }, value);
  }

  get attack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x1F, type: "u8", length: 1 });
  }

  set attack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x1F, type: "u8", length: 1 }, value);
  }

  get defense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x20, type: "u8", length: 1 });
  }

  set defense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x20, type: "u8", length: 1 }, value);
  }

  get speed(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x21, type: "u8", length: 1 });
  }

  set speed(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x21, type: "u8", length: 1 }, value);
  }

  get specialAttack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x22, type: "u8", length: 1 });
  }

  set specialAttack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x22, type: "u8", length: 1 }, value);
  }

  get specialDefense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x23, type: "u8", length: 1 });
  }

  set specialDefense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x23, type: "u8", length: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x74, type: "u32le", length: 4, bit: 0, width: 5 });
  }

  set health(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x74, type: "u32le", length: 4, bit: 0, width: 5 }, value);
  }

  get attack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x74, type: "u32le", length: 4, bit: 5, width: 5 });
  }

  set attack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x74, type: "u32le", length: 4, bit: 5, width: 5 }, value);
  }

  get defense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x74, type: "u32le", length: 4, bit: 10, width: 5 });
  }

  set defense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x74, type: "u32le", length: 4, bit: 10, width: 5 }, value);
  }

  get speed(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x74, type: "u32le", length: 4, bit: 15, width: 5 });
  }

  set speed(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x74, type: "u32le", length: 4, bit: 15, width: 5 }, value);
  }

  get specialAttack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x74, type: "u32le", length: 4, bit: 20, width: 5 });
  }

  set specialAttack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x74, type: "u32le", length: 4, bit: 20, width: 5 }, value);
  }

  get specialDefense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x74, type: "u32le", length: 4, bit: 25, width: 5 });
  }

  set specialDefense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x74, type: "u32le", length: 4, bit: 25, width: 5 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x5A + this.#at.index * 2, type: "u16le", length: 2 });
  }

  set move(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x5A + this.#at.index * 2, type: "u16le", length: 2 }, value);
  }

  get pp(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x62 + this.#at.index * 1, type: "u8", length: 1 });
  }

  set pp(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x62 + this.#at.index * 1, type: "u8", length: 1 }, value);
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
    return this.#store.text({ space: this.#at.space, offset: 0xB0, type: "text-gen7", length: 26 });
  }

  set name(value: string) {
    this.#store.setText({ space: this.#at.space, offset: 0xB0, type: "text-gen7", length: 26 }, value);
  }

  get gender(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xDD, type: "u8", length: 1, bit: 7, width: 1 });
  }

  set gender(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xDD, type: "u8", length: 1, bit: 7, width: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0xDA, type: "u16le", length: 2 });
  }

  set location(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xDA, type: "u16le", length: 2 }, value);
  }

  get level(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xDD, type: "u8", length: 1, bit: 0, width: 7 });
  }

  set level(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xDD, type: "u8", length: 1, bit: 0, width: 7 }, value);
  }

  get version(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xDF, type: "u8", length: 1 });
  }

  set version(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xDF, type: "u8", length: 1 }, value);
  }

  get fatefulEncounter(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x1D, type: "u8", length: 1, bit: 0, width: 1 });
  }

  set fatefulEncounter(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x1D, type: "u8", length: 1, bit: 0, width: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x74, type: "u32le", length: 4, bit: 30, width: 1 });
  }

  set isEgg(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x74, type: "u32le", length: 4, bit: 30, width: 1 }, value);
  }

  get hatchCounter(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xCA, type: "u8", length: 1 });
  }

  set hatchCounter(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xCA, type: "u8", length: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x2B, type: "u8", length: 1, bit: 4, width: 4 });
  }

  set strain(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x2B, type: "u8", length: 1, bit: 4, width: 4 }, value);
  }

  get days(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x2B, type: "u8", length: 1, bit: 0, width: 4 });
  }

  set days(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x2B, type: "u8", length: 1, bit: 0, width: 4 }, value);
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
    this.moves = repeat(4, (index) => new PokemonMove(store, { space: this.#at.space, index, offset: 0x5A + index * 2 }));
    this.owner = new PokemonOwner(store, this.#at);
    this.metConditions = new PokemonMetConditions(store, this.#at);
    this.egg = new PokemonEgg(store, this.#at);
    this.pokerus = new PokemonPokerus(store, this.#at);
  }

  get pid(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x18, type: "u32le", length: 4 });
  }

  set pid(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x18, type: "u32le", length: 4 }, value);
  }

  get species(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x8, type: "u16le", length: 2 });
  }

  set species(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x8, type: "u16le", length: 2 }, value);
  }

  get nickname(): string {
    return this.#store.text({ space: this.#at.space, offset: 0x40, type: "text-gen7", length: 26 });
  }

  set nickname(value: string) {
    this.#store.setText({ space: this.#at.space, offset: 0x40, type: "text-gen7", length: 26 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0xCA, type: "u8", length: 1 });
  }

  set friendship(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xCA, type: "u8", length: 1 }, value);
  }

  get ball(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xDC, type: "u8", length: 1 });
  }

  set ball(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xDC, type: "u8", length: 1 }, value);
  }

  get language(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xE3, type: "u8", length: 1 });
  }

  set language(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xE3, type: "u8", length: 1 }, value);
  }

  get nature(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x1C, type: "u8", length: 1 });
  }

  set nature(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x1C, type: "u8", length: 1 }, value);
  }

  get form(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x1D, type: "u8", length: 1, bit: 3, width: 5 });
  }

  set form(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x1D, type: "u8", length: 1, bit: 3, width: 5 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0xF2, type: "u16le", length: 2 });
  }

  set health(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xF2, type: "u16le", length: 2 }, value);
  }

  get attack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xF4, type: "u16le", length: 2 });
  }

  set attack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xF4, type: "u16le", length: 2 }, value);
  }

  get defense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xF6, type: "u16le", length: 2 });
  }

  set defense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xF6, type: "u16le", length: 2 }, value);
  }

  get speed(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xF8, type: "u16le", length: 2 });
  }

  set speed(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xF8, type: "u16le", length: 2 }, value);
  }

  get specialAttack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xFA, type: "u16le", length: 2 });
  }

  set specialAttack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xFA, type: "u16le", length: 2 }, value);
  }

  get specialDefense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xFC, type: "u16le", length: 2 });
  }

  set specialDefense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xFC, type: "u16le", length: 2 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0xEC, type: "u8", length: 1 });
  }

  set level(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xEC, type: "u8", length: 1 }, value);
  }

  get currentHp(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xF0, type: "u16le", length: 2 });
  }

  set currentHp(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xF0, type: "u16le", length: 2 }, value);
  }

  get statusCondition(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xE8, type: "u32le", length: 4 });
  }

  set statusCondition(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xE8, type: "u32le", length: 4 }, value);
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
    return this.#store.text({ space: "box-layout", offset: 0x0 + this.#at.index * 34, type: "text-gen7", length: 34 });
  }

  set name(value: string) {
    this.#store.setText({ space: "box-layout", offset: 0x0 + this.#at.index * 34, type: "text-gen7", length: 34 }, value);
  }

  get wallpaper(): number {
    return this.#store.number({ space: "box-layout", offset: 0x5C0 + this.#at.index * 1, type: "u8", length: 1 });
  }

  set wallpaper(value: number) {
    this.#store.setNumber({ space: "box-layout", offset: 0x5C0 + this.#at.index * 1, type: "u8", length: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: this.#at.offset, type: "u32le", length: 4, bit: 0, width: 10 });
  }

  set item(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: this.#at.offset, type: "u32le", length: 4, bit: 0, width: 10 }, value);
  }

  get count(): number {
    return this.#store.number({ space: this.#at.space, offset: this.#at.offset, type: "u32le", length: 4, bit: 10, width: 10 });
  }

  set count(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: this.#at.offset, type: "u32le", length: 4, bit: 10, width: 10 }, value);
  }
}

export class Bag {
  readonly items: readonly Item[];
  readonly keyItems: readonly Item[];
  readonly tmsHms: readonly Item[];
  readonly medicine: readonly Item[];
  readonly berries: readonly Item[];
  readonly zCrystals: readonly Item[];
  readonly battleItems: readonly Item[];

  constructor(store: Store, _at: At) {
    this.items = repeat(427, (index) => new Item(store, { space: "my-item", index, offset: 0x0 + index * 4 }));
    this.keyItems = repeat(198, (index) => new Item(store, { space: "my-item", index, offset: 0x6AC + index * 4 }));
    this.tmsHms = repeat(108, (index) => new Item(store, { space: "my-item", index, offset: 0x9C4 + index * 4 }));
    this.medicine = repeat(60, (index) => new Item(store, { space: "my-item", index, offset: 0xB74 + index * 4 }));
    this.berries = repeat(67, (index) => new Item(store, { space: "my-item", index, offset: 0xC64 + index * 4 }));
    this.zCrystals = repeat(35, (index) => new Item(store, { space: "my-item", index, offset: 0xD70 + index * 4 }));
    this.battleItems = repeat(11, (index) => new Item(store, { space: "my-item", index, offset: 0xDFC + index * 4 }));
  }
}

export class Pokedex {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get owned(): readonly boolean[] {
    return this.#store.flags({ space: "zukan", offset: 0x88, type: "flags", length: 104 });
  }

  set owned(value: readonly boolean[]) {
    this.#store.setFlags({ space: "zukan", offset: 0x88, type: "flags", length: 104 }, value);
  }

  get seen(): readonly boolean[] {
    return this.#store.flags({ space: "zukan", offset: 0xF0, type: "flags", length: 140 });
  }

  set seen(value: readonly boolean[]) {
    this.#store.setFlags({ space: "zukan", offset: 0xF0, type: "flags", length: 140 }, value);
  }

  get seenFemale(): readonly boolean[] {
    return this.#store.flags({ space: "zukan", offset: 0x17C, type: "flags", length: 140 });
  }

  set seenFemale(value: readonly boolean[]) {
    this.#store.setFlags({ space: "zukan", offset: 0x17C, type: "flags", length: 140 }, value);
  }

  get seenShiny(): readonly boolean[] {
    return this.#store.flags({ space: "zukan", offset: 0x208, type: "flags", length: 140 });
  }

  set seenShiny(value: readonly boolean[]) {
    this.#store.setFlags({ space: "zukan", offset: 0x208, type: "flags", length: 140 }, value);
  }

  get seenShinyFemale(): readonly boolean[] {
    return this.#store.flags({ space: "zukan", offset: 0x294, type: "flags", length: 140 });
  }

  set seenShinyFemale(value: readonly boolean[]) {
    this.#store.setFlags({ space: "zukan", offset: 0x294, type: "flags", length: 140 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x0 + this.#at.index * 2, type: "u16le", length: 2 });
  }

  set value(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x0 + this.#at.index * 2, type: "u16le", length: 2 }, value);
  }
}

export class Events {
  readonly #store: Store;
  readonly work: readonly EventsEventWork[];

  constructor(store: Store, _at: At) {
    this.#store = store;
    this.work = repeat(1000, (index) => new EventsEventWork(store, { space: "event-work", index, offset: 0x0 + index * 2 }));
  }

  get flags(): readonly boolean[] {
    return this.#store.flags({ space: "event-work", offset: 0x7D0, type: "flags", length: 620 });
  }

  set flags(value: readonly boolean[]) {
    this.#store.setFlags({ space: "event-work", offset: 0x7D0, type: "flags", length: 620 }, value);
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
  readonly pokedex: Pokedex;
  readonly events: Events;

  constructor(file: Uint8Array) {
    const store = new Store(file, spaces);
    this.#store = store;
    this.#at = { space: "", index: 0, offset: 0 };
    this.trainer = new Trainer(store, this.#at);
    this.playTime = new PlayTime(store, this.#at);
    this.party = counted(expand("party:{1..6}").map((space, index) => new PartyPokemon(store, { space, index, offset: 0 })), store, { space: "poke-party", offset: 0x618, type: "u8", length: 1 });
    this.boxes = expand("box:{1..32}").map((space, index) => new Box(store, { space, index, offset: 0 }));
    this.bag = new Bag(store, this.#at);
    this.pokedex = new Pokedex(store, this.#at);
    this.events = new Events(store, this.#at);
  }

  space<Name extends SpaceName>(name: Name): Spaces[Name] {
    return spaceView(this.#store, name, views) as Spaces[Name];
  }

  write(key?: Uint8Array): Uint8Array {
    return this.#store.write(key);
  }
}

export class SaveSpace {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get signature(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x6C100, type: "bytes", length: 128 });
  }

  set signature(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x6C100, type: "bytes", length: 128 }, value);
  }

  get savedAt(): bigint {
    return this.#store.bigint({ space: this.#space, offset: 0x6CA00, type: "u64le", length: 8 });
  }

  set savedAt(value: bigint) {
    this.#store.setBigint({ space: this.#space, offset: 0x6CA00, type: "u64le", length: 8 }, value);
  }

  get savedAtBefore(): bigint {
    return this.#store.bigint({ space: this.#space, offset: 0x6CA08, type: "u64le", length: 8 });
  }

  set savedAtBefore(value: bigint) {
    this.#store.setBigint({ space: this.#space, offset: 0x6CA08, type: "u64le", length: 8 }, value);
  }

  get blockTableMagic(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA10, type: "u32le", length: 4 });
  }

  set blockTableMagic(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA10, type: "u32le", length: 4 }, value);
  }

  get block0Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA14, type: "u32le", length: 4 });
  }

  set block0Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA14, type: "u32le", length: 4 }, value);
  }

  get block0Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA18, type: "u16le", length: 2 });
  }

  set block0Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA18, type: "u16le", length: 2 }, value);
  }

  get block0Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA1A, type: "u16le", length: 2 });
  }

  set block0Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA1A, type: "u16le", length: 2 }, value);
  }

  get block1Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA1C, type: "u32le", length: 4 });
  }

  set block1Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA1C, type: "u32le", length: 4 }, value);
  }

  get block1Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA20, type: "u16le", length: 2 });
  }

  set block1Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA20, type: "u16le", length: 2 }, value);
  }

  get block1Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA22, type: "u16le", length: 2 });
  }

  set block1Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA22, type: "u16le", length: 2 }, value);
  }

  get block2Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA24, type: "u32le", length: 4 });
  }

  set block2Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA24, type: "u32le", length: 4 }, value);
  }

  get block2Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA28, type: "u16le", length: 2 });
  }

  set block2Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA28, type: "u16le", length: 2 }, value);
  }

  get block2Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA2A, type: "u16le", length: 2 });
  }

  set block2Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA2A, type: "u16le", length: 2 }, value);
  }

  get block3Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA2C, type: "u32le", length: 4 });
  }

  set block3Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA2C, type: "u32le", length: 4 }, value);
  }

  get block3Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA30, type: "u16le", length: 2 });
  }

  set block3Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA30, type: "u16le", length: 2 }, value);
  }

  get block3Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA32, type: "u16le", length: 2 });
  }

  set block3Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA32, type: "u16le", length: 2 }, value);
  }

  get block4Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA34, type: "u32le", length: 4 });
  }

  set block4Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA34, type: "u32le", length: 4 }, value);
  }

  get block4Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA38, type: "u16le", length: 2 });
  }

  set block4Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA38, type: "u16le", length: 2 }, value);
  }

  get block4Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA3A, type: "u16le", length: 2 });
  }

  set block4Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA3A, type: "u16le", length: 2 }, value);
  }

  get block5Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA3C, type: "u32le", length: 4 });
  }

  set block5Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA3C, type: "u32le", length: 4 }, value);
  }

  get block5Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA40, type: "u16le", length: 2 });
  }

  set block5Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA40, type: "u16le", length: 2 }, value);
  }

  get block5Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA42, type: "u16le", length: 2 });
  }

  set block5Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA42, type: "u16le", length: 2 }, value);
  }

  get block6Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA44, type: "u32le", length: 4 });
  }

  set block6Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA44, type: "u32le", length: 4 }, value);
  }

  get block6Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA48, type: "u16le", length: 2 });
  }

  set block6Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA48, type: "u16le", length: 2 }, value);
  }

  get block6Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA4A, type: "u16le", length: 2 });
  }

  set block6Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA4A, type: "u16le", length: 2 }, value);
  }

  get block7Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA4C, type: "u32le", length: 4 });
  }

  set block7Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA4C, type: "u32le", length: 4 }, value);
  }

  get block7Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA50, type: "u16le", length: 2 });
  }

  set block7Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA50, type: "u16le", length: 2 }, value);
  }

  get block7Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA52, type: "u16le", length: 2 });
  }

  set block7Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA52, type: "u16le", length: 2 }, value);
  }

  get block8Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA54, type: "u32le", length: 4 });
  }

  set block8Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA54, type: "u32le", length: 4 }, value);
  }

  get block8Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA58, type: "u16le", length: 2 });
  }

  set block8Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA58, type: "u16le", length: 2 }, value);
  }

  get block8Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA5A, type: "u16le", length: 2 });
  }

  set block8Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA5A, type: "u16le", length: 2 }, value);
  }

  get block9Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA5C, type: "u32le", length: 4 });
  }

  set block9Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA5C, type: "u32le", length: 4 }, value);
  }

  get block9Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA60, type: "u16le", length: 2 });
  }

  set block9Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA60, type: "u16le", length: 2 }, value);
  }

  get block9Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA62, type: "u16le", length: 2 });
  }

  set block9Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA62, type: "u16le", length: 2 }, value);
  }

  get block10Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA64, type: "u32le", length: 4 });
  }

  set block10Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA64, type: "u32le", length: 4 }, value);
  }

  get block10Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA68, type: "u16le", length: 2 });
  }

  set block10Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA68, type: "u16le", length: 2 }, value);
  }

  get block10Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA6A, type: "u16le", length: 2 });
  }

  set block10Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA6A, type: "u16le", length: 2 }, value);
  }

  get block11Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA6C, type: "u32le", length: 4 });
  }

  set block11Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA6C, type: "u32le", length: 4 }, value);
  }

  get block11Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA70, type: "u16le", length: 2 });
  }

  set block11Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA70, type: "u16le", length: 2 }, value);
  }

  get block11Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA72, type: "u16le", length: 2 });
  }

  set block11Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA72, type: "u16le", length: 2 }, value);
  }

  get block12Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA74, type: "u32le", length: 4 });
  }

  set block12Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA74, type: "u32le", length: 4 }, value);
  }

  get block12Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA78, type: "u16le", length: 2 });
  }

  set block12Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA78, type: "u16le", length: 2 }, value);
  }

  get block12Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA7A, type: "u16le", length: 2 });
  }

  set block12Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA7A, type: "u16le", length: 2 }, value);
  }

  get block13Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA7C, type: "u32le", length: 4 });
  }

  set block13Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA7C, type: "u32le", length: 4 }, value);
  }

  get block13Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA80, type: "u16le", length: 2 });
  }

  set block13Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA80, type: "u16le", length: 2 }, value);
  }

  get block13Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA82, type: "u16le", length: 2 });
  }

  set block13Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA82, type: "u16le", length: 2 }, value);
  }

  get block14Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA84, type: "u32le", length: 4 });
  }

  set block14Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA84, type: "u32le", length: 4 }, value);
  }

  get block14Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA88, type: "u16le", length: 2 });
  }

  set block14Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA88, type: "u16le", length: 2 }, value);
  }

  get block14Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA8A, type: "u16le", length: 2 });
  }

  set block14Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA8A, type: "u16le", length: 2 }, value);
  }

  get block15Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA8C, type: "u32le", length: 4 });
  }

  set block15Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA8C, type: "u32le", length: 4 }, value);
  }

  get block15Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA90, type: "u16le", length: 2 });
  }

  set block15Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA90, type: "u16le", length: 2 }, value);
  }

  get block15Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA92, type: "u16le", length: 2 });
  }

  set block15Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA92, type: "u16le", length: 2 }, value);
  }

  get block16Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA94, type: "u32le", length: 4 });
  }

  set block16Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA94, type: "u32le", length: 4 }, value);
  }

  get block16Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA98, type: "u16le", length: 2 });
  }

  set block16Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA98, type: "u16le", length: 2 }, value);
  }

  get block16Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA9A, type: "u16le", length: 2 });
  }

  set block16Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA9A, type: "u16le", length: 2 }, value);
  }

  get block17Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CA9C, type: "u32le", length: 4 });
  }

  set block17Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CA9C, type: "u32le", length: 4 }, value);
  }

  get block17Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAA0, type: "u16le", length: 2 });
  }

  set block17Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAA0, type: "u16le", length: 2 }, value);
  }

  get block17Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAA2, type: "u16le", length: 2 });
  }

  set block17Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAA2, type: "u16le", length: 2 }, value);
  }

  get block18Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAA4, type: "u32le", length: 4 });
  }

  set block18Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAA4, type: "u32le", length: 4 }, value);
  }

  get block18Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAA8, type: "u16le", length: 2 });
  }

  set block18Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAA8, type: "u16le", length: 2 }, value);
  }

  get block18Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAAA, type: "u16le", length: 2 });
  }

  set block18Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAAA, type: "u16le", length: 2 }, value);
  }

  get block19Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAAC, type: "u32le", length: 4 });
  }

  set block19Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAAC, type: "u32le", length: 4 }, value);
  }

  get block19Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAB0, type: "u16le", length: 2 });
  }

  set block19Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAB0, type: "u16le", length: 2 }, value);
  }

  get block19Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAB2, type: "u16le", length: 2 });
  }

  set block19Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAB2, type: "u16le", length: 2 }, value);
  }

  get block20Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAB4, type: "u32le", length: 4 });
  }

  set block20Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAB4, type: "u32le", length: 4 }, value);
  }

  get block20Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAB8, type: "u16le", length: 2 });
  }

  set block20Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAB8, type: "u16le", length: 2 }, value);
  }

  get block20Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CABA, type: "u16le", length: 2 });
  }

  set block20Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CABA, type: "u16le", length: 2 }, value);
  }

  get block21Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CABC, type: "u32le", length: 4 });
  }

  set block21Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CABC, type: "u32le", length: 4 }, value);
  }

  get block21Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAC0, type: "u16le", length: 2 });
  }

  set block21Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAC0, type: "u16le", length: 2 }, value);
  }

  get block21Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAC2, type: "u16le", length: 2 });
  }

  set block21Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAC2, type: "u16le", length: 2 }, value);
  }

  get block22Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAC4, type: "u32le", length: 4 });
  }

  set block22Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAC4, type: "u32le", length: 4 }, value);
  }

  get block22Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAC8, type: "u16le", length: 2 });
  }

  set block22Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAC8, type: "u16le", length: 2 }, value);
  }

  get block22Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CACA, type: "u16le", length: 2 });
  }

  set block22Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CACA, type: "u16le", length: 2 }, value);
  }

  get block23Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CACC, type: "u32le", length: 4 });
  }

  set block23Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CACC, type: "u32le", length: 4 }, value);
  }

  get block23Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAD0, type: "u16le", length: 2 });
  }

  set block23Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAD0, type: "u16le", length: 2 }, value);
  }

  get block23Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAD2, type: "u16le", length: 2 });
  }

  set block23Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAD2, type: "u16le", length: 2 }, value);
  }

  get block24Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAD4, type: "u32le", length: 4 });
  }

  set block24Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAD4, type: "u32le", length: 4 }, value);
  }

  get block24Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAD8, type: "u16le", length: 2 });
  }

  set block24Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAD8, type: "u16le", length: 2 }, value);
  }

  get block24Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CADA, type: "u16le", length: 2 });
  }

  set block24Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CADA, type: "u16le", length: 2 }, value);
  }

  get block25Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CADC, type: "u32le", length: 4 });
  }

  set block25Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CADC, type: "u32le", length: 4 }, value);
  }

  get block25Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAE0, type: "u16le", length: 2 });
  }

  set block25Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAE0, type: "u16le", length: 2 }, value);
  }

  get block25Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAE2, type: "u16le", length: 2 });
  }

  set block25Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAE2, type: "u16le", length: 2 }, value);
  }

  get block26Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAE4, type: "u32le", length: 4 });
  }

  set block26Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAE4, type: "u32le", length: 4 }, value);
  }

  get block26Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAE8, type: "u16le", length: 2 });
  }

  set block26Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAE8, type: "u16le", length: 2 }, value);
  }

  get block26Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAEA, type: "u16le", length: 2 });
  }

  set block26Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAEA, type: "u16le", length: 2 }, value);
  }

  get block27Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAEC, type: "u32le", length: 4 });
  }

  set block27Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAEC, type: "u32le", length: 4 }, value);
  }

  get block27Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAF0, type: "u16le", length: 2 });
  }

  set block27Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAF0, type: "u16le", length: 2 }, value);
  }

  get block27Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAF2, type: "u16le", length: 2 });
  }

  set block27Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAF2, type: "u16le", length: 2 }, value);
  }

  get block28Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAF4, type: "u32le", length: 4 });
  }

  set block28Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAF4, type: "u32le", length: 4 }, value);
  }

  get block28Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAF8, type: "u16le", length: 2 });
  }

  set block28Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAF8, type: "u16le", length: 2 }, value);
  }

  get block28Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAFA, type: "u16le", length: 2 });
  }

  set block28Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAFA, type: "u16le", length: 2 }, value);
  }

  get block29Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CAFC, type: "u32le", length: 4 });
  }

  set block29Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CAFC, type: "u32le", length: 4 }, value);
  }

  get block29Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CB00, type: "u16le", length: 2 });
  }

  set block29Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CB00, type: "u16le", length: 2 }, value);
  }

  get block29Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CB02, type: "u16le", length: 2 });
  }

  set block29Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CB02, type: "u16le", length: 2 }, value);
  }

  get block30Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CB04, type: "u32le", length: 4 });
  }

  set block30Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CB04, type: "u32le", length: 4 }, value);
  }

  get block30Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CB08, type: "u16le", length: 2 });
  }

  set block30Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CB08, type: "u16le", length: 2 }, value);
  }

  get block30Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CB0A, type: "u16le", length: 2 });
  }

  set block30Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CB0A, type: "u16le", length: 2 }, value);
  }

  get block31Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CB0C, type: "u32le", length: 4 });
  }

  set block31Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CB0C, type: "u32le", length: 4 }, value);
  }

  get block31Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CB10, type: "u16le", length: 2 });
  }

  set block31Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CB10, type: "u16le", length: 2 }, value);
  }

  get block31Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CB12, type: "u16le", length: 2 });
  }

  set block31Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CB12, type: "u16le", length: 2 }, value);
  }

  get block32Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CB14, type: "u32le", length: 4 });
  }

  set block32Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CB14, type: "u32le", length: 4 }, value);
  }

  get block32Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CB18, type: "u16le", length: 2 });
  }

  set block32Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CB18, type: "u16le", length: 2 }, value);
  }

  get block32Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CB1A, type: "u16le", length: 2 });
  }

  set block32Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CB1A, type: "u16le", length: 2 }, value);
  }

  get block33Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CB1C, type: "u32le", length: 4 });
  }

  set block33Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CB1C, type: "u32le", length: 4 }, value);
  }

  get block33Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CB20, type: "u16le", length: 2 });
  }

  set block33Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CB20, type: "u16le", length: 2 }, value);
  }

  get block33Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CB22, type: "u16le", length: 2 });
  }

  set block33Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CB22, type: "u16le", length: 2 }, value);
  }

  get block34Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CB24, type: "u32le", length: 4 });
  }

  set block34Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CB24, type: "u32le", length: 4 }, value);
  }

  get block34Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CB28, type: "u16le", length: 2 });
  }

  set block34Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CB28, type: "u16le", length: 2 }, value);
  }

  get block34Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CB2A, type: "u16le", length: 2 });
  }

  set block34Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CB2A, type: "u16le", length: 2 }, value);
  }

  get block35Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CB2C, type: "u32le", length: 4 });
  }

  set block35Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CB2C, type: "u32le", length: 4 }, value);
  }

  get block35Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CB30, type: "u16le", length: 2 });
  }

  set block35Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CB30, type: "u16le", length: 2 }, value);
  }

  get block35Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CB32, type: "u16le", length: 2 });
  }

  set block35Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CB32, type: "u16le", length: 2 }, value);
  }

  get block36Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CB34, type: "u32le", length: 4 });
  }

  set block36Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CB34, type: "u32le", length: 4 }, value);
  }

  get block36Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CB38, type: "u16le", length: 2 });
  }

  set block36Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CB38, type: "u16le", length: 2 }, value);
  }

  get block36Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CB3A, type: "u16le", length: 2 });
  }

  set block36Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CB3A, type: "u16le", length: 2 }, value);
  }

  get block37Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CB3C, type: "u32le", length: 4 });
  }

  set block37Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CB3C, type: "u32le", length: 4 }, value);
  }

  get block37Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CB40, type: "u16le", length: 2 });
  }

  set block37Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CB40, type: "u16le", length: 2 }, value);
  }

  get block37Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CB42, type: "u16le", length: 2 });
  }

  set block37Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CB42, type: "u16le", length: 2 }, value);
  }

  get block38Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CB44, type: "u32le", length: 4 });
  }

  set block38Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CB44, type: "u32le", length: 4 }, value);
  }

  get block38Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CB48, type: "u16le", length: 2 });
  }

  set block38Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CB48, type: "u16le", length: 2 }, value);
  }

  get block38Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6CB4A, type: "u16le", length: 2 });
  }

  set block38Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6CB4A, type: "u16le", length: 2 }, value);
  }
}

export class MyItem {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get itemsPocket(): readonly MyItemItemsPocket[] {
    return repeat(427, (i) => new MyItemItemsPocket(this.#store, { space: this.#space, offset: 0x0 + i * 4, type: "u32le", length: 4 }));
  }

  get keyItemsPocket(): readonly MyItemKeyItemsPocket[] {
    return repeat(198, (i) => new MyItemKeyItemsPocket(this.#store, { space: this.#space, offset: 0x6AC + i * 4, type: "u32le", length: 4 }));
  }

  get tmsAndHmsPocket(): readonly MyItemTmsAndHmsPocket[] {
    return repeat(108, (i) => new MyItemTmsAndHmsPocket(this.#store, { space: this.#space, offset: 0x9C4 + i * 4, type: "u32le", length: 4 }));
  }

  get medicinePocket(): readonly MyItemMedicinePocket[] {
    return repeat(60, (i) => new MyItemMedicinePocket(this.#store, { space: this.#space, offset: 0xB74 + i * 4, type: "u32le", length: 4 }));
  }

  get berriesPocket(): readonly MyItemBerriesPocket[] {
    return repeat(67, (i) => new MyItemBerriesPocket(this.#store, { space: this.#space, offset: 0xC64 + i * 4, type: "u32le", length: 4 }));
  }

  get zCrystalsPocket(): readonly MyItemZCrystalsPocket[] {
    return repeat(35, (i) => new MyItemZCrystalsPocket(this.#store, { space: this.#space, offset: 0xD70 + i * 4, type: "u32le", length: 4 }));
  }

  get battleItemsPocket(): readonly MyItemBattleItemsPocket[] {
    return repeat(11, (i) => new MyItemBattleItemsPocket(this.#store, { space: this.#space, offset: 0xDFC + i * 4, type: "u32le", length: 4 }));
  }
}

export class MyItemItemsPocket {
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
    return this.#store.number({ ...this.#read, bit: 0, width: 10 });
  }

  set item(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 10 }, value);
  }

  get quantity(): number {
    return this.#store.number({ ...this.#read, bit: 10, width: 10 });
  }

  set quantity(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 10, width: 10 }, value);
  }

  get freeSpaceIndex(): number {
    return this.#store.number({ ...this.#read, bit: 20, width: 10 });
  }

  set freeSpaceIndex(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 20, width: 10 }, value);
  }

  get new(): number {
    return this.#store.number({ ...this.#read, bit: 30, width: 1 });
  }

  set new(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 30, width: 1 }, value);
  }
}

export class MyItemKeyItemsPocket {
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
    return this.#store.number({ ...this.#read, bit: 0, width: 10 });
  }

  set item(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 10 }, value);
  }

  get quantity(): number {
    return this.#store.number({ ...this.#read, bit: 10, width: 10 });
  }

  set quantity(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 10, width: 10 }, value);
  }

  get freeSpaceIndex(): number {
    return this.#store.number({ ...this.#read, bit: 20, width: 10 });
  }

  set freeSpaceIndex(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 20, width: 10 }, value);
  }

  get new(): number {
    return this.#store.number({ ...this.#read, bit: 30, width: 1 });
  }

  set new(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 30, width: 1 }, value);
  }
}

export class MyItemTmsAndHmsPocket {
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
    return this.#store.number({ ...this.#read, bit: 0, width: 10 });
  }

  set item(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 10 }, value);
  }

  get quantity(): number {
    return this.#store.number({ ...this.#read, bit: 10, width: 10 });
  }

  set quantity(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 10, width: 10 }, value);
  }

  get freeSpaceIndex(): number {
    return this.#store.number({ ...this.#read, bit: 20, width: 10 });
  }

  set freeSpaceIndex(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 20, width: 10 }, value);
  }

  get new(): number {
    return this.#store.number({ ...this.#read, bit: 30, width: 1 });
  }

  set new(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 30, width: 1 }, value);
  }
}

export class MyItemMedicinePocket {
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
    return this.#store.number({ ...this.#read, bit: 0, width: 10 });
  }

  set item(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 10 }, value);
  }

  get quantity(): number {
    return this.#store.number({ ...this.#read, bit: 10, width: 10 });
  }

  set quantity(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 10, width: 10 }, value);
  }

  get freeSpaceIndex(): number {
    return this.#store.number({ ...this.#read, bit: 20, width: 10 });
  }

  set freeSpaceIndex(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 20, width: 10 }, value);
  }

  get new(): number {
    return this.#store.number({ ...this.#read, bit: 30, width: 1 });
  }

  set new(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 30, width: 1 }, value);
  }
}

export class MyItemBerriesPocket {
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
    return this.#store.number({ ...this.#read, bit: 0, width: 10 });
  }

  set item(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 10 }, value);
  }

  get quantity(): number {
    return this.#store.number({ ...this.#read, bit: 10, width: 10 });
  }

  set quantity(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 10, width: 10 }, value);
  }

  get freeSpaceIndex(): number {
    return this.#store.number({ ...this.#read, bit: 20, width: 10 });
  }

  set freeSpaceIndex(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 20, width: 10 }, value);
  }

  get new(): number {
    return this.#store.number({ ...this.#read, bit: 30, width: 1 });
  }

  set new(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 30, width: 1 }, value);
  }
}

export class MyItemZCrystalsPocket {
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
    return this.#store.number({ ...this.#read, bit: 0, width: 10 });
  }

  set item(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 10 }, value);
  }

  get quantity(): number {
    return this.#store.number({ ...this.#read, bit: 10, width: 10 });
  }

  set quantity(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 10, width: 10 }, value);
  }

  get freeSpaceIndex(): number {
    return this.#store.number({ ...this.#read, bit: 20, width: 10 });
  }

  set freeSpaceIndex(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 20, width: 10 }, value);
  }

  get new(): number {
    return this.#store.number({ ...this.#read, bit: 30, width: 1 });
  }

  set new(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 30, width: 1 }, value);
  }
}

export class MyItemBattleItemsPocket {
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
    return this.#store.number({ ...this.#read, bit: 0, width: 10 });
  }

  set item(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 10 }, value);
  }

  get quantity(): number {
    return this.#store.number({ ...this.#read, bit: 10, width: 10 });
  }

  set quantity(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 10, width: 10 }, value);
  }

  get freeSpaceIndex(): number {
    return this.#store.number({ ...this.#read, bit: 20, width: 10 });
  }

  set freeSpaceIndex(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 20, width: 10 }, value);
  }

  get new(): number {
    return this.#store.number({ ...this.#read, bit: 30, width: 1 });
  }

  set new(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 30, width: 1 }, value);
  }
}

export class MyStatus {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get trainerId(): number {
    return this.#store.number({ space: this.#space, offset: 0x0, type: "u16le", length: 2 });
  }

  set trainerId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x0, type: "u16le", length: 2 }, value);
  }

  get secretId(): number {
    return this.#store.number({ space: this.#space, offset: 0x2, type: "u16le", length: 2 });
  }

  set secretId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2, type: "u16le", length: 2 }, value);
  }

  get game(): number {
    return this.#store.number({ space: this.#space, offset: 0x4, type: "u8", length: 1 });
  }

  set game(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x4, type: "u8", length: 1 }, value);
  }

  get trainerGender(): number {
    return this.#store.number({ space: this.#space, offset: 0x5, type: "u8", length: 1 });
  }

  set trainerGender(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x5, type: "u8", length: 1 }, value);
  }

  get gameSyncId(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x10, type: "bytes", length: 8 });
  }

  set gameSyncId(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x10, type: "bytes", length: 8 }, value);
  }

  get nexUniqueId(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x18, type: "bytes", length: 16 });
  }

  set nexUniqueId(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x18, type: "bytes", length: 16 }, value);
  }

  get festaId(): number {
    return this.#store.number({ space: this.#space, offset: 0x28, type: "u32le", length: 4 });
  }

  set festaId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x28, type: "u32le", length: 4 }, value);
  }

  get region(): number {
    return this.#store.number({ space: this.#space, offset: 0x2E, type: "u8", length: 1 });
  }

  set region(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2E, type: "u8", length: 1 }, value);
  }

  get country(): number {
    return this.#store.number({ space: this.#space, offset: 0x2F, type: "u8", length: 1 });
  }

  set country(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2F, type: "u8", length: 1 }, value);
  }

  get consoleRegion(): number {
    return this.#store.number({ space: this.#space, offset: 0x34, type: "u8", length: 1 });
  }

  set consoleRegion(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x34, type: "u8", length: 1 }, value);
  }

  get language(): number {
    return this.#store.number({ space: this.#space, offset: 0x35, type: "u8", length: 1 });
  }

  set language(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x35, type: "u8", length: 1 }, value);
  }

  get trainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x38, type: "text-gen7", length: 26 });
  }

  set trainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x38, type: "text-gen7", length: 26 }, value);
  }

  get skinColor(): MyStatusSkinColor {
    return new MyStatusSkinColor(this.#store, { space: this.#space, offset: 0x54, type: "u8", length: 1 });
  }

  get multiplayerSprite(): number {
    return this.#store.number({ space: this.#space, offset: 0x58, type: "u8", length: 1 });
  }

  set multiplayerSprite(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x58, type: "u8", length: 1 }, value);
  }

  get battleUnlocks(): MyStatusBattleUnlocks {
    return new MyStatusBattleUnlocks(this.#store, { space: this.#space, offset: 0x78, type: "u8", length: 1 });
  }

  get ballThrowType(): number {
    return this.#store.number({ space: this.#space, offset: 0x7A, type: "u8", length: 1 });
  }

  set ballThrowType(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x7A, type: "u8", length: 1 }, value);
  }
}

export class MyStatusSkinColor {
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

  get skinColor(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 3 });
  }

  set skinColor(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 3 }, value);
  }
}

export class MyStatusBattleUnlocks {
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

  get megaEvolutionUnlocked(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set megaEvolutionUnlocked(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get zMovesUnlocked(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set zMovesUnlocked(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }
}

export class PokeParty {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get partyPokemon(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x0, type: "bytes", length: 1560 });
  }

  set partyPokemon(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x0, type: "bytes", length: 1560 }, value);
  }

  get partyCount(): number {
    return this.#store.number({ space: this.#space, offset: 0x618, type: "u8", length: 1 });
  }

  set partyCount(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x618, type: "u8", length: 1 }, value);
  }
}

export class EventWork {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get eventWork(): readonly (number)[] {
    return repeat(1000, (i) => this.#store.number({ space: this.#space, offset: 0x0 + i * 2, type: "u16le", length: 2 }));
  }

  set eventWork(values: readonly (number)[]) {
    setEach(1000, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x0 + i * 2, type: "u16le", length: 2 }, value));
  }

  get eventFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x7D0, type: "flags", length: 620 });
  }

  set eventFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x7D0, type: "flags", length: 620 }, value);
  }
}

export class Zukan {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get pokedexMagic(): number {
    return this.#store.number({ space: this.#space, offset: 0x0, type: "u32le", length: 4 });
  }

  set pokedexMagic(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x0, type: "u32le", length: 4 }, value);
  }

  get pokedexFlags(): ZukanPokedexFlags {
    return new ZukanPokedexFlags(this.#store, { space: this.#space, offset: 0x4, type: "u32le", length: 4 });
  }

  get spindaFlags(): number {
    return this.#store.number({ space: this.#space, offset: 0x84, type: "u8", length: 1 });
  }

  set spindaFlags(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x84, type: "u8", length: 1 }, value);
  }

  get pokedexOwnedFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x88, type: "flags", length: 104 });
  }

  set pokedexOwnedFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x88, type: "flags", length: 104 }, value);
  }

  get pokedexSeenFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0xF0, type: "flags", length: 140 });
  }

  set pokedexSeenFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0xF0, type: "flags", length: 140 }, value);
  }

  get pokedexSeenFemaleFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x17C, type: "flags", length: 140 });
  }

  set pokedexSeenFemaleFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x17C, type: "flags", length: 140 }, value);
  }

  get pokedexSeenShinyFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x208, type: "flags", length: 140 });
  }

  set pokedexSeenShinyFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x208, type: "flags", length: 140 }, value);
  }

  get pokedexSeenShinyFemaleFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x294, type: "flags", length: 140 });
  }

  set pokedexSeenShinyFemaleFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x294, type: "flags", length: 140 }, value);
  }

  get pokedexDisplayedFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x320, type: "flags", length: 140 });
  }

  set pokedexDisplayedFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x320, type: "flags", length: 140 }, value);
  }

  get pokedexDisplayedFemaleFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x3AC, type: "flags", length: 140 });
  }

  set pokedexDisplayedFemaleFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x3AC, type: "flags", length: 140 }, value);
  }

  get pokedexDisplayedShinyFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x438, type: "flags", length: 140 });
  }

  set pokedexDisplayedShinyFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x438, type: "flags", length: 140 }, value);
  }

  get pokedexDisplayedShinyFemaleFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x4C4, type: "flags", length: 140 });
  }

  set pokedexDisplayedShinyFemaleFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x4C4, type: "flags", length: 140 }, value);
  }

  get pokedexLanguageFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x550, type: "flags", length: 920 });
  }

  set pokedexLanguageFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x550, type: "flags", length: 920 }, value);
  }

  get spindaPids(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x8E8 + i * 4, type: "u32le", length: 4 }));
  }

  set spindaPids(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x8E8 + i * 4, type: "u32le", length: 4 }, value));
  }
}

export class ZukanPokedexFlags {
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

  get nationalPokedexUnlocked(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set nationalPokedexUnlocked(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get currentViewed(): number {
    return this.#store.number({ ...this.#read, bit: 9, width: 10 });
  }

  set currentViewed(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 9, width: 10 }, value);
  }
}

export class Misc {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get money(): number {
    return this.#store.number({ space: this.#space, offset: 0x4, type: "u32le", length: 4 });
  }

  set money(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x4, type: "u32le", length: 4 }, value);
  }

  get stamps(): MiscStamps {
    return new MiscStamps(this.#store, { space: this.#space, offset: 0x8, type: "u32le", length: 4 });
  }

  get battlePoints(): number {
    return this.#store.number({ space: this.#space, offset: 0x11C, type: "u32le", length: 4 });
  }

  set battlePoints(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x11C, type: "u32le", length: 4 }, value);
  }

  get daysFromRefreshed(): number {
    return this.#store.number({ space: this.#space, offset: 0x123, type: "u8", length: 1 });
  }

  set daysFromRefreshed(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x123, type: "u8", length: 1 }, value);
  }

  get vivillonPattern(): MiscVivillonPattern {
    return new MiscVivillonPattern(this.#store, { space: this.#space, offset: 0x130, type: "u8", length: 1 });
  }

  get wormholeShiny(): number {
    return this.#store.number({ space: this.#space, offset: 0x135, type: "u8", length: 1 });
  }

  set wormholeShiny(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x135, type: "u8", length: 1 }, value);
  }
}

export class MiscStamps {
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

  get stamps(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 15 });
  }

  set stamps(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 15 }, value);
  }
}

export class MiscVivillonPattern {
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

  get vivillonPattern(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 5 });
  }

  set vivillonPattern(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 5 }, value);
  }
}

export class GameTime {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get resumeYear(): number {
    return this.#store.number({ space: this.#space, offset: 0x4, type: "i32le", length: 4 });
  }

  set resumeYear(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x4, type: "i32le", length: 4 }, value);
  }

  get resumeMonth(): number {
    return this.#store.number({ space: this.#space, offset: 0x8, type: "u8", length: 1 });
  }

  set resumeMonth(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x8, type: "u8", length: 1 }, value);
  }

  get resumeDay(): number {
    return this.#store.number({ space: this.#space, offset: 0xC, type: "u8", length: 1 });
  }

  set resumeDay(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xC, type: "u8", length: 1 }, value);
  }

  get resumeHour(): number {
    return this.#store.number({ space: this.#space, offset: 0x14, type: "u8", length: 1 });
  }

  set resumeHour(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x14, type: "u8", length: 1 }, value);
  }

  get resumeMinute(): number {
    return this.#store.number({ space: this.#space, offset: 0x18, type: "u8", length: 1 });
  }

  set resumeMinute(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x18, type: "u8", length: 1 }, value);
  }

  get resumeSecond(): number {
    return this.#store.number({ space: this.#space, offset: 0x1C, type: "u8", length: 1 });
  }

  set resumeSecond(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1C, type: "u8", length: 1 }, value);
  }

  get adventureStarted(): number {
    return this.#store.number({ space: this.#space, offset: 0x28, type: "u32le", length: 4 });
  }

  set adventureStarted(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x28, type: "u32le", length: 4 }, value);
  }

  get hallOfFameEntered(): number {
    return this.#store.number({ space: this.#space, offset: 0x30, type: "u32le", length: 4 });
  }

  set hallOfFameEntered(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x30, type: "u32le", length: 4 }, value);
  }

  get alolaTime(): bigint {
    return this.#store.bigint({ space: this.#space, offset: 0x48, type: "u64le", length: 8 });
  }

  set alolaTime(value: bigint) {
    this.#store.setBigint({ space: this.#space, offset: 0x48, type: "u64le", length: 8 }, value);
  }
}

export class BoxLayout {
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
    return repeat(32, (i) => this.#store.text({ space: this.#space, offset: 0x0 + i * 34, type: "text-gen7", length: 34 }));
  }

  set boxNames(values: readonly (string)[]) {
    setEach(32, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0x0 + i * 34, type: "text-gen7", length: 34 }, value));
  }

  get battleTeams(): readonly (number)[] {
    return repeat(36, (i) => this.#store.number({ space: this.#space, offset: 0x4C4 + i * 2, type: "i16le", length: 2 }));
  }

  set battleTeams(values: readonly (number)[]) {
    setEach(36, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x4C4 + i * 2, type: "i16le", length: 2 }, value));
  }

  get battleTeamLocks(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x5B5 + i * 1, type: "u8", length: 1 }));
  }

  set battleTeamLocks(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x5B5 + i * 1, type: "u8", length: 1 }, value));
  }

  get boxWallpapers(): readonly (number)[] {
    return repeat(32, (i) => this.#store.number({ space: this.#space, offset: 0x5C0 + i * 1, type: "u8", length: 1 }));
  }

  set boxWallpapers(values: readonly (number)[]) {
    setEach(32, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x5C0 + i * 1, type: "u8", length: 1 }, value));
  }

  get boxFlags(): number {
    return this.#store.number({ space: this.#space, offset: 0x5E0, type: "u8", length: 1 });
  }

  set boxFlags(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x5E0, type: "u8", length: 1 }, value);
  }

  get boxesUnlocked(): number {
    return this.#store.number({ space: this.#space, offset: 0x5E1, type: "u8", length: 1 });
  }

  set boxesUnlocked(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x5E1, type: "u8", length: 1 }, value);
  }

  get currentBox(): number {
    return this.#store.number({ space: this.#space, offset: 0x5E3, type: "u8", length: 1 });
  }

  set currentBox(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x5E3, type: "u8", length: 1 }, value);
  }
}

export class Boxes {
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
    return this.#store.raw({ space: this.#space, offset: 0x0, type: "bytes", length: 222720 });
  }

  set boxPokemon(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x0, type: "bytes", length: 222720 }, value);
  }
}

export class PlayTimeSpace {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get playTimeHours(): number {
    return this.#store.number({ space: this.#space, offset: 0x0, type: "u16le", length: 2 });
  }

  set playTimeHours(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x0, type: "u16le", length: 2 }, value);
  }

  get playTimeMinutes(): number {
    return this.#store.number({ space: this.#space, offset: 0x2, type: "u8", length: 1 });
  }

  set playTimeMinutes(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2, type: "u8", length: 1 }, value);
  }

  get playTimeSeconds(): number {
    return this.#store.number({ space: this.#space, offset: 0x3, type: "u8", length: 1 });
  }

  set playTimeSeconds(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x3, type: "u8", length: 1 }, value);
  }

  get lastSaved(): number {
    return this.#store.number({ space: this.#space, offset: 0x4, type: "u32le", length: 4 });
  }

  set lastSaved(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x4, type: "u32le", length: 4 }, value);
  }
}

export class Pk7Party {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get encryptionConstant(): number {
    return this.#store.number({ space: this.#space, offset: 0x0, type: "u32le", length: 4 });
  }

  set encryptionConstant(value: number) {
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

  get originalTrainerId(): Pk7PartyOriginalTrainerId {
    return new Pk7PartyOriginalTrainerId(this.#store, { space: this.#space, offset: 0xC, type: "u32le", length: 4 });
  }

  get experience(): number {
    return this.#store.number({ space: this.#space, offset: 0x10, type: "u32le", length: 4 });
  }

  set experience(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x10, type: "u32le", length: 4 }, value);
  }

  get ability(): number {
    return this.#store.number({ space: this.#space, offset: 0x14, type: "u8", length: 1 });
  }

  set ability(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x14, type: "u8", length: 1 }, value);
  }

  get abilityNumber(): Pk7PartyAbilityNumber {
    return new Pk7PartyAbilityNumber(this.#store, { space: this.#space, offset: 0x15, type: "u8", length: 1 });
  }

  get markings(): number {
    return this.#store.number({ space: this.#space, offset: 0x16, type: "u16le", length: 2 });
  }

  set markings(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x16, type: "u16le", length: 2 }, value);
  }

  get pid(): number {
    return this.#store.number({ space: this.#space, offset: 0x18, type: "u32le", length: 4 });
  }

  set pid(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x18, type: "u32le", length: 4 }, value);
  }

  get nature(): number {
    return this.#store.number({ space: this.#space, offset: 0x1C, type: "u8", length: 1 });
  }

  set nature(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1C, type: "u8", length: 1 }, value);
  }

  get fatefulEncounterGenderAndForm(): Pk7PartyFatefulEncounterGenderAndForm {
    return new Pk7PartyFatefulEncounterGenderAndForm(this.#store, { space: this.#space, offset: 0x1D, type: "u8", length: 1 });
  }

  get evs(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x1E + i * 1, type: "u8", length: 1 }));
  }

  set evs(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x1E + i * 1, type: "u8", length: 1 }, value));
  }

  get contestStats(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x24 + i * 1, type: "u8", length: 1 }));
  }

  set contestStats(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x24 + i * 1, type: "u8", length: 1 }, value));
  }

  get resortEventStatus(): number {
    return this.#store.number({ space: this.#space, offset: 0x2A, type: "u8", length: 1 });
  }

  set resortEventStatus(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2A, type: "u8", length: 1 }, value);
  }

  get pokerus(): Pk7PartyPokerus {
    return new Pk7PartyPokerus(this.#store, { space: this.#space, offset: 0x2B, type: "u8", length: 1 });
  }

  get superTrainingFlags(): number {
    return this.#store.number({ space: this.#space, offset: 0x2C, type: "u32le", length: 4 });
  }

  set superTrainingFlags(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2C, type: "u32le", length: 4 }, value);
  }

  get ribbons(): Pk7PartyRibbons {
    return new Pk7PartyRibbons(this.#store, { space: this.#space, offset: 0x30, type: "u32le", length: 4 });
  }

  get ribbons2(): Pk7PartyRibbons2 {
    return new Pk7PartyRibbons2(this.#store, { space: this.#space, offset: 0x34, type: "u16le", length: 2 });
  }

  get ribbons3(): Pk7PartyRibbons3 {
    return new Pk7PartyRibbons3(this.#store, { space: this.#space, offset: 0x36, type: "u8", length: 1 });
  }

  get unused1(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x37, type: "bytes", length: 1 });
  }

  set unused1(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x37, type: "bytes", length: 1 }, value);
  }

  get contestMemoryRibbons(): number {
    return this.#store.number({ space: this.#space, offset: 0x38, type: "u8", length: 1 });
  }

  set contestMemoryRibbons(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x38, type: "u8", length: 1 }, value);
  }

  get battleMemoryRibbons(): number {
    return this.#store.number({ space: this.#space, offset: 0x39, type: "u8", length: 1 });
  }

  set battleMemoryRibbons(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x39, type: "u8", length: 1 }, value);
  }

  get distributionSuperTrainingFlags(): number {
    return this.#store.number({ space: this.#space, offset: 0x3A, type: "u16le", length: 2 });
  }

  set distributionSuperTrainingFlags(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x3A, type: "u16le", length: 2 }, value);
  }

  get formArgument(): number {
    return this.#store.number({ space: this.#space, offset: 0x3C, type: "u32le", length: 4 });
  }

  set formArgument(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x3C, type: "u32le", length: 4 }, value);
  }

  get nickname(): string {
    return this.#store.text({ space: this.#space, offset: 0x40, type: "text-gen7", length: 26 });
  }

  set nickname(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x40, type: "text-gen7", length: 26 }, value);
  }

  get moves(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x5A + i * 2, type: "u16le", length: 2 }));
  }

  set moves(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x5A + i * 2, type: "u16le", length: 2 }, value));
  }

  get pp(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x62 + i * 1, type: "u8", length: 1 }));
  }

  set pp(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x62 + i * 1, type: "u8", length: 1 }, value));
  }

  get ppUps(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x66 + i * 1, type: "u8", length: 1 }));
  }

  set ppUps(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x66 + i * 1, type: "u8", length: 1 }, value));
  }

  get relearnMoves(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x6A + i * 2, type: "u16le", length: 2 }));
  }

  set relearnMoves(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x6A + i * 2, type: "u16le", length: 2 }, value));
  }

  get secretSuperTraining(): Pk7PartySecretSuperTraining {
    return new Pk7PartySecretSuperTraining(this.#store, { space: this.#space, offset: 0x72, type: "u8", length: 1 });
  }

  get unused2(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x73, type: "bytes", length: 1 });
  }

  set unused2(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x73, type: "bytes", length: 1 }, value);
  }

  get ivsEggAndNicknamed(): Pk7PartyIvsEggAndNicknamed {
    return new Pk7PartyIvsEggAndNicknamed(this.#store, { space: this.#space, offset: 0x74, type: "u32le", length: 4 });
  }

  get handlingTrainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x78, type: "text-gen7", length: 26 });
  }

  set handlingTrainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x78, type: "text-gen7", length: 26 }, value);
  }

  get handlingTrainerGender(): number {
    return this.#store.number({ space: this.#space, offset: 0x92, type: "u8", length: 1 });
  }

  set handlingTrainerGender(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x92, type: "u8", length: 1 }, value);
  }

  get currentHandler(): number {
    return this.#store.number({ space: this.#space, offset: 0x93, type: "u8", length: 1 });
  }

  set currentHandler(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x93, type: "u8", length: 1 }, value);
  }

  get geoLocations(): readonly Pk7PartyGeoLocations[] {
    return repeat(5, (i) => new Pk7PartyGeoLocations(this.#store, { space: this.#space, offset: 0x94 + i * 2, type: "u16le", length: 2 }));
  }

  get unused3(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x9E, type: "bytes", length: 4 });
  }

  set unused3(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x9E, type: "bytes", length: 4 }, value);
  }

  get handlingTrainerFriendship(): number {
    return this.#store.number({ space: this.#space, offset: 0xA2, type: "u8", length: 1 });
  }

  set handlingTrainerFriendship(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA2, type: "u8", length: 1 }, value);
  }

  get handlingTrainerAffection(): number {
    return this.#store.number({ space: this.#space, offset: 0xA3, type: "u8", length: 1 });
  }

  set handlingTrainerAffection(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA3, type: "u8", length: 1 }, value);
  }

  get handlingTrainerMemoryIntensity(): number {
    return this.#store.number({ space: this.#space, offset: 0xA4, type: "u8", length: 1 });
  }

  set handlingTrainerMemoryIntensity(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA4, type: "u8", length: 1 }, value);
  }

  get handlingTrainerMemory(): number {
    return this.#store.number({ space: this.#space, offset: 0xA5, type: "u8", length: 1 });
  }

  set handlingTrainerMemory(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA5, type: "u8", length: 1 }, value);
  }

  get handlingTrainerMemoryFeeling(): number {
    return this.#store.number({ space: this.#space, offset: 0xA6, type: "u8", length: 1 });
  }

  set handlingTrainerMemoryFeeling(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA6, type: "u8", length: 1 }, value);
  }

  get unused4(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0xA7, type: "bytes", length: 1 });
  }

  set unused4(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0xA7, type: "bytes", length: 1 }, value);
  }

  get handlingTrainerMemoryVariable(): number {
    return this.#store.number({ space: this.#space, offset: 0xA8, type: "u16le", length: 2 });
  }

  set handlingTrainerMemoryVariable(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA8, type: "u16le", length: 2 }, value);
  }

  get unused5(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0xAA, type: "bytes", length: 4 });
  }

  set unused5(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0xAA, type: "bytes", length: 4 }, value);
  }

  get fullness(): number {
    return this.#store.number({ space: this.#space, offset: 0xAE, type: "u8", length: 1 });
  }

  set fullness(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xAE, type: "u8", length: 1 }, value);
  }

  get enjoyment(): number {
    return this.#store.number({ space: this.#space, offset: 0xAF, type: "u8", length: 1 });
  }

  set enjoyment(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xAF, type: "u8", length: 1 }, value);
  }

  get originalTrainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0xB0, type: "text-gen7", length: 26 });
  }

  set originalTrainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0xB0, type: "text-gen7", length: 26 }, value);
  }

  get originalTrainerFriendship(): number {
    return this.#store.number({ space: this.#space, offset: 0xCA, type: "u8", length: 1 });
  }

  set originalTrainerFriendship(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xCA, type: "u8", length: 1 }, value);
  }

  get originalTrainerAffection(): number {
    return this.#store.number({ space: this.#space, offset: 0xCB, type: "u8", length: 1 });
  }

  set originalTrainerAffection(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xCB, type: "u8", length: 1 }, value);
  }

  get originalTrainerMemoryIntensity(): number {
    return this.#store.number({ space: this.#space, offset: 0xCC, type: "u8", length: 1 });
  }

  set originalTrainerMemoryIntensity(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xCC, type: "u8", length: 1 }, value);
  }

  get originalTrainerMemory(): number {
    return this.#store.number({ space: this.#space, offset: 0xCD, type: "u8", length: 1 });
  }

  set originalTrainerMemory(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xCD, type: "u8", length: 1 }, value);
  }

  get originalTrainerMemoryVariable(): number {
    return this.#store.number({ space: this.#space, offset: 0xCE, type: "u16le", length: 2 });
  }

  set originalTrainerMemoryVariable(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xCE, type: "u16le", length: 2 }, value);
  }

  get originalTrainerMemoryFeeling(): number {
    return this.#store.number({ space: this.#space, offset: 0xD0, type: "u8", length: 1 });
  }

  set originalTrainerMemoryFeeling(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xD0, type: "u8", length: 1 }, value);
  }

  get eggYear(): number {
    return this.#store.number({ space: this.#space, offset: 0xD1, type: "u8", length: 1 });
  }

  set eggYear(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xD1, type: "u8", length: 1 }, value);
  }

  get eggMonth(): number {
    return this.#store.number({ space: this.#space, offset: 0xD2, type: "u8", length: 1 });
  }

  set eggMonth(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xD2, type: "u8", length: 1 }, value);
  }

  get eggDay(): number {
    return this.#store.number({ space: this.#space, offset: 0xD3, type: "u8", length: 1 });
  }

  set eggDay(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xD3, type: "u8", length: 1 }, value);
  }

  get metYear(): number {
    return this.#store.number({ space: this.#space, offset: 0xD4, type: "u8", length: 1 });
  }

  set metYear(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xD4, type: "u8", length: 1 }, value);
  }

  get metMonth(): number {
    return this.#store.number({ space: this.#space, offset: 0xD5, type: "u8", length: 1 });
  }

  set metMonth(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xD5, type: "u8", length: 1 }, value);
  }

  get metDay(): number {
    return this.#store.number({ space: this.#space, offset: 0xD6, type: "u8", length: 1 });
  }

  set metDay(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xD6, type: "u8", length: 1 }, value);
  }

  get unused6(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0xD7, type: "bytes", length: 1 });
  }

  set unused6(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0xD7, type: "bytes", length: 1 }, value);
  }

  get eggLocation(): number {
    return this.#store.number({ space: this.#space, offset: 0xD8, type: "u16le", length: 2 });
  }

  set eggLocation(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xD8, type: "u16le", length: 2 }, value);
  }

  get metLocation(): number {
    return this.#store.number({ space: this.#space, offset: 0xDA, type: "u16le", length: 2 });
  }

  set metLocation(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xDA, type: "u16le", length: 2 }, value);
  }

  get ball(): number {
    return this.#store.number({ space: this.#space, offset: 0xDC, type: "u8", length: 1 });
  }

  set ball(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xDC, type: "u8", length: 1 }, value);
  }

  get metLevelAndTrainerGender(): Pk7PartyMetLevelAndTrainerGender {
    return new Pk7PartyMetLevelAndTrainerGender(this.#store, { space: this.#space, offset: 0xDD, type: "u8", length: 1 });
  }

  get hyperTraining(): Pk7PartyHyperTraining {
    return new Pk7PartyHyperTraining(this.#store, { space: this.#space, offset: 0xDE, type: "u8", length: 1 });
  }

  get originGame(): number {
    return this.#store.number({ space: this.#space, offset: 0xDF, type: "u8", length: 1 });
  }

  set originGame(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xDF, type: "u8", length: 1 }, value);
  }

  get country(): number {
    return this.#store.number({ space: this.#space, offset: 0xE0, type: "u8", length: 1 });
  }

  set country(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xE0, type: "u8", length: 1 }, value);
  }

  get region(): number {
    return this.#store.number({ space: this.#space, offset: 0xE1, type: "u8", length: 1 });
  }

  set region(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xE1, type: "u8", length: 1 }, value);
  }

  get consoleRegion(): number {
    return this.#store.number({ space: this.#space, offset: 0xE2, type: "u8", length: 1 });
  }

  set consoleRegion(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xE2, type: "u8", length: 1 }, value);
  }

  get language(): number {
    return this.#store.number({ space: this.#space, offset: 0xE3, type: "u8", length: 1 });
  }

  set language(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xE3, type: "u8", length: 1 }, value);
  }

  get unused7(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0xE4, type: "bytes", length: 4 });
  }

  set unused7(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0xE4, type: "bytes", length: 4 }, value);
  }

  get statusCondition(): number {
    return this.#store.number({ space: this.#space, offset: 0xE8, type: "u32le", length: 4 });
  }

  set statusCondition(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xE8, type: "u32le", length: 4 }, value);
  }

  get level(): number {
    return this.#store.number({ space: this.#space, offset: 0xEC, type: "u8", length: 1 });
  }

  set level(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xEC, type: "u8", length: 1 }, value);
  }

  get dirtType(): number {
    return this.#store.number({ space: this.#space, offset: 0xED, type: "u8", length: 1 });
  }

  set dirtType(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xED, type: "u8", length: 1 }, value);
  }

  get dirtLocation(): number {
    return this.#store.number({ space: this.#space, offset: 0xEE, type: "u8", length: 1 });
  }

  set dirtLocation(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xEE, type: "u8", length: 1 }, value);
  }

  get unused8(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0xEF, type: "bytes", length: 1 });
  }

  set unused8(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0xEF, type: "bytes", length: 1 }, value);
  }

  get currentHp(): number {
    return this.#store.number({ space: this.#space, offset: 0xF0, type: "u16le", length: 2 });
  }

  set currentHp(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xF0, type: "u16le", length: 2 }, value);
  }

  get stats(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0xF2 + i * 2, type: "u16le", length: 2 }));
  }

  set stats(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xF2 + i * 2, type: "u16le", length: 2 }, value));
  }
}

export class Pk7PartyOriginalTrainerId {
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

export class Pk7PartyAbilityNumber {
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

  get abilityNumber(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 3 });
  }

  set abilityNumber(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 3 }, value);
  }
}

export class Pk7PartyFatefulEncounterGenderAndForm {
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

export class Pk7PartyPokerus {
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

export class Pk7PartyRibbons {
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

  get kalosChampion(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set kalosChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get hoennChampion(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set hoennChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }

  get sinnohChampion(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 1 });
  }

  set sinnohChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 1 }, value);
  }

  get bestFriends(): number {
    return this.#store.number({ ...this.#read, bit: 3, width: 1 });
  }

  set bestFriends(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 3, width: 1 }, value);
  }

  get training(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 1 });
  }

  set training(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 1 }, value);
  }

  get skillfulBattler(): number {
    return this.#store.number({ ...this.#read, bit: 5, width: 1 });
  }

  set skillfulBattler(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 5, width: 1 }, value);
  }

  get expertBattler(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 1 });
  }

  set expertBattler(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 1 }, value);
  }

  get effort(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 1 });
  }

  set effort(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 1 }, value);
  }

  get alert(): number {
    return this.#store.number({ ...this.#read, bit: 8, width: 1 });
  }

  set alert(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 8, width: 1 }, value);
  }

  get shock(): number {
    return this.#store.number({ ...this.#read, bit: 9, width: 1 });
  }

  set shock(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 9, width: 1 }, value);
  }

  get downcast(): number {
    return this.#store.number({ ...this.#read, bit: 10, width: 1 });
  }

  set downcast(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 10, width: 1 }, value);
  }

  get careless(): number {
    return this.#store.number({ ...this.#read, bit: 11, width: 1 });
  }

  set careless(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 11, width: 1 }, value);
  }

  get relax(): number {
    return this.#store.number({ ...this.#read, bit: 12, width: 1 });
  }

  set relax(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 12, width: 1 }, value);
  }

  get snooze(): number {
    return this.#store.number({ ...this.#read, bit: 13, width: 1 });
  }

  set snooze(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 13, width: 1 }, value);
  }

  get smile(): number {
    return this.#store.number({ ...this.#read, bit: 14, width: 1 });
  }

  set smile(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 14, width: 1 }, value);
  }

  get gorgeous(): number {
    return this.#store.number({ ...this.#read, bit: 15, width: 1 });
  }

  set gorgeous(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 15, width: 1 }, value);
  }

  get royal(): number {
    return this.#store.number({ ...this.#read, bit: 16, width: 1 });
  }

  set royal(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 16, width: 1 }, value);
  }

  get gorgeousRoyal(): number {
    return this.#store.number({ ...this.#read, bit: 17, width: 1 });
  }

  set gorgeousRoyal(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 17, width: 1 }, value);
  }

  get artist(): number {
    return this.#store.number({ ...this.#read, bit: 18, width: 1 });
  }

  set artist(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 18, width: 1 }, value);
  }

  get footprint(): number {
    return this.#store.number({ ...this.#read, bit: 19, width: 1 });
  }

  set footprint(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 19, width: 1 }, value);
  }

  get record(): number {
    return this.#store.number({ ...this.#read, bit: 20, width: 1 });
  }

  set record(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 20, width: 1 }, value);
  }

  get legend(): number {
    return this.#store.number({ ...this.#read, bit: 21, width: 1 });
  }

  set legend(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 21, width: 1 }, value);
  }

  get country(): number {
    return this.#store.number({ ...this.#read, bit: 22, width: 1 });
  }

  set country(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 22, width: 1 }, value);
  }

  get national(): number {
    return this.#store.number({ ...this.#read, bit: 23, width: 1 });
  }

  set national(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 23, width: 1 }, value);
  }

  get earth(): number {
    return this.#store.number({ ...this.#read, bit: 24, width: 1 });
  }

  set earth(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 24, width: 1 }, value);
  }

  get world(): number {
    return this.#store.number({ ...this.#read, bit: 25, width: 1 });
  }

  set world(value: number) {
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

  get event(): number {
    return this.#store.number({ ...this.#read, bit: 28, width: 1 });
  }

  set event(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 28, width: 1 }, value);
  }

  get birthday(): number {
    return this.#store.number({ ...this.#read, bit: 29, width: 1 });
  }

  set birthday(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 29, width: 1 }, value);
  }

  get special(): number {
    return this.#store.number({ ...this.#read, bit: 30, width: 1 });
  }

  set special(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 30, width: 1 }, value);
  }

  get souvenir(): number {
    return this.#store.number({ ...this.#read, bit: 31, width: 1 });
  }

  set souvenir(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 31, width: 1 }, value);
  }
}

export class Pk7PartyRibbons2 {
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

  get wishing(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set wishing(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get battleChampion(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set battleChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }

  get regionalChampion(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 1 });
  }

  set regionalChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 1 }, value);
  }

  get nationalChampion(): number {
    return this.#store.number({ ...this.#read, bit: 3, width: 1 });
  }

  set nationalChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 3, width: 1 }, value);
  }

  get worldChampion(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 1 });
  }

  set worldChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 1 }, value);
  }

  get contestMemory(): number {
    return this.#store.number({ ...this.#read, bit: 5, width: 1 });
  }

  set contestMemory(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 5, width: 1 }, value);
  }

  get battleMemory(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 1 });
  }

  set battleMemory(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 1 }, value);
  }

  get hoennChampionOras(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 1 });
  }

  set hoennChampionOras(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 1 }, value);
  }

  get contestStar(): number {
    return this.#store.number({ ...this.#read, bit: 8, width: 1 });
  }

  set contestStar(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 8, width: 1 }, value);
  }

  get coolnessMaster(): number {
    return this.#store.number({ ...this.#read, bit: 9, width: 1 });
  }

  set coolnessMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 9, width: 1 }, value);
  }

  get beautyMaster(): number {
    return this.#store.number({ ...this.#read, bit: 10, width: 1 });
  }

  set beautyMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 10, width: 1 }, value);
  }

  get cutenessMaster(): number {
    return this.#store.number({ ...this.#read, bit: 11, width: 1 });
  }

  set cutenessMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 11, width: 1 }, value);
  }

  get clevernessMaster(): number {
    return this.#store.number({ ...this.#read, bit: 12, width: 1 });
  }

  set clevernessMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 12, width: 1 }, value);
  }

  get toughnessMaster(): number {
    return this.#store.number({ ...this.#read, bit: 13, width: 1 });
  }

  set toughnessMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 13, width: 1 }, value);
  }

  get alolaChampion(): number {
    return this.#store.number({ ...this.#read, bit: 14, width: 1 });
  }

  set alolaChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 14, width: 1 }, value);
  }

  get battleRoyalMaster(): number {
    return this.#store.number({ ...this.#read, bit: 15, width: 1 });
  }

  set battleRoyalMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 15, width: 1 }, value);
  }
}

export class Pk7PartyRibbons3 {
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

  get battleTreeGreat(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set battleTreeGreat(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get battleTreeMaster(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set battleTreeMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }
}

export class Pk7PartySecretSuperTraining {
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

  get unlocked(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set unlocked(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get supremelyTrained(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set supremelyTrained(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }
}

export class Pk7PartyIvsEggAndNicknamed {
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

export class Pk7PartyGeoLocations {
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

  get region(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 8 });
  }

  set region(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 8 }, value);
  }

  get country(): number {
    return this.#store.number({ ...this.#read, bit: 8, width: 8 });
  }

  set country(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 8, width: 8 }, value);
  }
}

export class Pk7PartyMetLevelAndTrainerGender {
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

export class Pk7PartyHyperTraining {
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
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set hp(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get attack(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set attack(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }

  get defense(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 1 });
  }

  set defense(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 1 }, value);
  }

  get spAtk(): number {
    return this.#store.number({ ...this.#read, bit: 3, width: 1 });
  }

  set spAtk(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 3, width: 1 }, value);
  }

  get spDef(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 1 });
  }

  set spDef(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 1 }, value);
  }

  get speed(): number {
    return this.#store.number({ ...this.#read, bit: 5, width: 1 });
  }

  set speed(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 5, width: 1 }, value);
  }
}

export class Pk7 {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get encryptionConstant(): number {
    return this.#store.number({ space: this.#space, offset: 0x0, type: "u32le", length: 4 });
  }

  set encryptionConstant(value: number) {
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

  get originalTrainerId(): Pk7OriginalTrainerId {
    return new Pk7OriginalTrainerId(this.#store, { space: this.#space, offset: 0xC, type: "u32le", length: 4 });
  }

  get experience(): number {
    return this.#store.number({ space: this.#space, offset: 0x10, type: "u32le", length: 4 });
  }

  set experience(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x10, type: "u32le", length: 4 }, value);
  }

  get ability(): number {
    return this.#store.number({ space: this.#space, offset: 0x14, type: "u8", length: 1 });
  }

  set ability(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x14, type: "u8", length: 1 }, value);
  }

  get abilityNumber(): Pk7AbilityNumber {
    return new Pk7AbilityNumber(this.#store, { space: this.#space, offset: 0x15, type: "u8", length: 1 });
  }

  get markings(): number {
    return this.#store.number({ space: this.#space, offset: 0x16, type: "u16le", length: 2 });
  }

  set markings(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x16, type: "u16le", length: 2 }, value);
  }

  get pid(): number {
    return this.#store.number({ space: this.#space, offset: 0x18, type: "u32le", length: 4 });
  }

  set pid(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x18, type: "u32le", length: 4 }, value);
  }

  get nature(): number {
    return this.#store.number({ space: this.#space, offset: 0x1C, type: "u8", length: 1 });
  }

  set nature(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1C, type: "u8", length: 1 }, value);
  }

  get fatefulEncounterGenderAndForm(): Pk7FatefulEncounterGenderAndForm {
    return new Pk7FatefulEncounterGenderAndForm(this.#store, { space: this.#space, offset: 0x1D, type: "u8", length: 1 });
  }

  get evs(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x1E + i * 1, type: "u8", length: 1 }));
  }

  set evs(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x1E + i * 1, type: "u8", length: 1 }, value));
  }

  get contestStats(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x24 + i * 1, type: "u8", length: 1 }));
  }

  set contestStats(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x24 + i * 1, type: "u8", length: 1 }, value));
  }

  get resortEventStatus(): number {
    return this.#store.number({ space: this.#space, offset: 0x2A, type: "u8", length: 1 });
  }

  set resortEventStatus(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2A, type: "u8", length: 1 }, value);
  }

  get pokerus(): Pk7Pokerus {
    return new Pk7Pokerus(this.#store, { space: this.#space, offset: 0x2B, type: "u8", length: 1 });
  }

  get superTrainingFlags(): number {
    return this.#store.number({ space: this.#space, offset: 0x2C, type: "u32le", length: 4 });
  }

  set superTrainingFlags(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2C, type: "u32le", length: 4 }, value);
  }

  get ribbons(): Pk7Ribbons {
    return new Pk7Ribbons(this.#store, { space: this.#space, offset: 0x30, type: "u32le", length: 4 });
  }

  get ribbons2(): Pk7Ribbons2 {
    return new Pk7Ribbons2(this.#store, { space: this.#space, offset: 0x34, type: "u16le", length: 2 });
  }

  get ribbons3(): Pk7Ribbons3 {
    return new Pk7Ribbons3(this.#store, { space: this.#space, offset: 0x36, type: "u8", length: 1 });
  }

  get unused1(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x37, type: "bytes", length: 1 });
  }

  set unused1(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x37, type: "bytes", length: 1 }, value);
  }

  get contestMemoryRibbons(): number {
    return this.#store.number({ space: this.#space, offset: 0x38, type: "u8", length: 1 });
  }

  set contestMemoryRibbons(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x38, type: "u8", length: 1 }, value);
  }

  get battleMemoryRibbons(): number {
    return this.#store.number({ space: this.#space, offset: 0x39, type: "u8", length: 1 });
  }

  set battleMemoryRibbons(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x39, type: "u8", length: 1 }, value);
  }

  get distributionSuperTrainingFlags(): number {
    return this.#store.number({ space: this.#space, offset: 0x3A, type: "u16le", length: 2 });
  }

  set distributionSuperTrainingFlags(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x3A, type: "u16le", length: 2 }, value);
  }

  get formArgument(): number {
    return this.#store.number({ space: this.#space, offset: 0x3C, type: "u32le", length: 4 });
  }

  set formArgument(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x3C, type: "u32le", length: 4 }, value);
  }

  get nickname(): string {
    return this.#store.text({ space: this.#space, offset: 0x40, type: "text-gen7", length: 26 });
  }

  set nickname(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x40, type: "text-gen7", length: 26 }, value);
  }

  get moves(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x5A + i * 2, type: "u16le", length: 2 }));
  }

  set moves(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x5A + i * 2, type: "u16le", length: 2 }, value));
  }

  get pp(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x62 + i * 1, type: "u8", length: 1 }));
  }

  set pp(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x62 + i * 1, type: "u8", length: 1 }, value));
  }

  get ppUps(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x66 + i * 1, type: "u8", length: 1 }));
  }

  set ppUps(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x66 + i * 1, type: "u8", length: 1 }, value));
  }

  get relearnMoves(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x6A + i * 2, type: "u16le", length: 2 }));
  }

  set relearnMoves(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x6A + i * 2, type: "u16le", length: 2 }, value));
  }

  get secretSuperTraining(): Pk7SecretSuperTraining {
    return new Pk7SecretSuperTraining(this.#store, { space: this.#space, offset: 0x72, type: "u8", length: 1 });
  }

  get unused2(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x73, type: "bytes", length: 1 });
  }

  set unused2(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x73, type: "bytes", length: 1 }, value);
  }

  get ivsEggAndNicknamed(): Pk7IvsEggAndNicknamed {
    return new Pk7IvsEggAndNicknamed(this.#store, { space: this.#space, offset: 0x74, type: "u32le", length: 4 });
  }

  get handlingTrainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x78, type: "text-gen7", length: 26 });
  }

  set handlingTrainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x78, type: "text-gen7", length: 26 }, value);
  }

  get handlingTrainerGender(): number {
    return this.#store.number({ space: this.#space, offset: 0x92, type: "u8", length: 1 });
  }

  set handlingTrainerGender(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x92, type: "u8", length: 1 }, value);
  }

  get currentHandler(): number {
    return this.#store.number({ space: this.#space, offset: 0x93, type: "u8", length: 1 });
  }

  set currentHandler(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x93, type: "u8", length: 1 }, value);
  }

  get geoLocations(): readonly Pk7GeoLocations[] {
    return repeat(5, (i) => new Pk7GeoLocations(this.#store, { space: this.#space, offset: 0x94 + i * 2, type: "u16le", length: 2 }));
  }

  get unused3(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x9E, type: "bytes", length: 4 });
  }

  set unused3(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x9E, type: "bytes", length: 4 }, value);
  }

  get handlingTrainerFriendship(): number {
    return this.#store.number({ space: this.#space, offset: 0xA2, type: "u8", length: 1 });
  }

  set handlingTrainerFriendship(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA2, type: "u8", length: 1 }, value);
  }

  get handlingTrainerAffection(): number {
    return this.#store.number({ space: this.#space, offset: 0xA3, type: "u8", length: 1 });
  }

  set handlingTrainerAffection(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA3, type: "u8", length: 1 }, value);
  }

  get handlingTrainerMemoryIntensity(): number {
    return this.#store.number({ space: this.#space, offset: 0xA4, type: "u8", length: 1 });
  }

  set handlingTrainerMemoryIntensity(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA4, type: "u8", length: 1 }, value);
  }

  get handlingTrainerMemory(): number {
    return this.#store.number({ space: this.#space, offset: 0xA5, type: "u8", length: 1 });
  }

  set handlingTrainerMemory(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA5, type: "u8", length: 1 }, value);
  }

  get handlingTrainerMemoryFeeling(): number {
    return this.#store.number({ space: this.#space, offset: 0xA6, type: "u8", length: 1 });
  }

  set handlingTrainerMemoryFeeling(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA6, type: "u8", length: 1 }, value);
  }

  get unused4(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0xA7, type: "bytes", length: 1 });
  }

  set unused4(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0xA7, type: "bytes", length: 1 }, value);
  }

  get handlingTrainerMemoryVariable(): number {
    return this.#store.number({ space: this.#space, offset: 0xA8, type: "u16le", length: 2 });
  }

  set handlingTrainerMemoryVariable(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA8, type: "u16le", length: 2 }, value);
  }

  get unused5(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0xAA, type: "bytes", length: 4 });
  }

  set unused5(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0xAA, type: "bytes", length: 4 }, value);
  }

  get fullness(): number {
    return this.#store.number({ space: this.#space, offset: 0xAE, type: "u8", length: 1 });
  }

  set fullness(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xAE, type: "u8", length: 1 }, value);
  }

  get enjoyment(): number {
    return this.#store.number({ space: this.#space, offset: 0xAF, type: "u8", length: 1 });
  }

  set enjoyment(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xAF, type: "u8", length: 1 }, value);
  }

  get originalTrainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0xB0, type: "text-gen7", length: 26 });
  }

  set originalTrainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0xB0, type: "text-gen7", length: 26 }, value);
  }

  get originalTrainerFriendship(): number {
    return this.#store.number({ space: this.#space, offset: 0xCA, type: "u8", length: 1 });
  }

  set originalTrainerFriendship(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xCA, type: "u8", length: 1 }, value);
  }

  get originalTrainerAffection(): number {
    return this.#store.number({ space: this.#space, offset: 0xCB, type: "u8", length: 1 });
  }

  set originalTrainerAffection(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xCB, type: "u8", length: 1 }, value);
  }

  get originalTrainerMemoryIntensity(): number {
    return this.#store.number({ space: this.#space, offset: 0xCC, type: "u8", length: 1 });
  }

  set originalTrainerMemoryIntensity(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xCC, type: "u8", length: 1 }, value);
  }

  get originalTrainerMemory(): number {
    return this.#store.number({ space: this.#space, offset: 0xCD, type: "u8", length: 1 });
  }

  set originalTrainerMemory(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xCD, type: "u8", length: 1 }, value);
  }

  get originalTrainerMemoryVariable(): number {
    return this.#store.number({ space: this.#space, offset: 0xCE, type: "u16le", length: 2 });
  }

  set originalTrainerMemoryVariable(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xCE, type: "u16le", length: 2 }, value);
  }

  get originalTrainerMemoryFeeling(): number {
    return this.#store.number({ space: this.#space, offset: 0xD0, type: "u8", length: 1 });
  }

  set originalTrainerMemoryFeeling(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xD0, type: "u8", length: 1 }, value);
  }

  get eggYear(): number {
    return this.#store.number({ space: this.#space, offset: 0xD1, type: "u8", length: 1 });
  }

  set eggYear(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xD1, type: "u8", length: 1 }, value);
  }

  get eggMonth(): number {
    return this.#store.number({ space: this.#space, offset: 0xD2, type: "u8", length: 1 });
  }

  set eggMonth(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xD2, type: "u8", length: 1 }, value);
  }

  get eggDay(): number {
    return this.#store.number({ space: this.#space, offset: 0xD3, type: "u8", length: 1 });
  }

  set eggDay(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xD3, type: "u8", length: 1 }, value);
  }

  get metYear(): number {
    return this.#store.number({ space: this.#space, offset: 0xD4, type: "u8", length: 1 });
  }

  set metYear(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xD4, type: "u8", length: 1 }, value);
  }

  get metMonth(): number {
    return this.#store.number({ space: this.#space, offset: 0xD5, type: "u8", length: 1 });
  }

  set metMonth(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xD5, type: "u8", length: 1 }, value);
  }

  get metDay(): number {
    return this.#store.number({ space: this.#space, offset: 0xD6, type: "u8", length: 1 });
  }

  set metDay(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xD6, type: "u8", length: 1 }, value);
  }

  get unused6(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0xD7, type: "bytes", length: 1 });
  }

  set unused6(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0xD7, type: "bytes", length: 1 }, value);
  }

  get eggLocation(): number {
    return this.#store.number({ space: this.#space, offset: 0xD8, type: "u16le", length: 2 });
  }

  set eggLocation(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xD8, type: "u16le", length: 2 }, value);
  }

  get metLocation(): number {
    return this.#store.number({ space: this.#space, offset: 0xDA, type: "u16le", length: 2 });
  }

  set metLocation(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xDA, type: "u16le", length: 2 }, value);
  }

  get ball(): number {
    return this.#store.number({ space: this.#space, offset: 0xDC, type: "u8", length: 1 });
  }

  set ball(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xDC, type: "u8", length: 1 }, value);
  }

  get metLevelAndTrainerGender(): Pk7MetLevelAndTrainerGender {
    return new Pk7MetLevelAndTrainerGender(this.#store, { space: this.#space, offset: 0xDD, type: "u8", length: 1 });
  }

  get hyperTraining(): Pk7HyperTraining {
    return new Pk7HyperTraining(this.#store, { space: this.#space, offset: 0xDE, type: "u8", length: 1 });
  }

  get originGame(): number {
    return this.#store.number({ space: this.#space, offset: 0xDF, type: "u8", length: 1 });
  }

  set originGame(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xDF, type: "u8", length: 1 }, value);
  }

  get country(): number {
    return this.#store.number({ space: this.#space, offset: 0xE0, type: "u8", length: 1 });
  }

  set country(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xE0, type: "u8", length: 1 }, value);
  }

  get region(): number {
    return this.#store.number({ space: this.#space, offset: 0xE1, type: "u8", length: 1 });
  }

  set region(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xE1, type: "u8", length: 1 }, value);
  }

  get consoleRegion(): number {
    return this.#store.number({ space: this.#space, offset: 0xE2, type: "u8", length: 1 });
  }

  set consoleRegion(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xE2, type: "u8", length: 1 }, value);
  }

  get language(): number {
    return this.#store.number({ space: this.#space, offset: 0xE3, type: "u8", length: 1 });
  }

  set language(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xE3, type: "u8", length: 1 }, value);
  }

  get unused7(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0xE4, type: "bytes", length: 4 });
  }

  set unused7(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0xE4, type: "bytes", length: 4 }, value);
  }
}

export class Pk7OriginalTrainerId {
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

export class Pk7AbilityNumber {
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

  get abilityNumber(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 3 });
  }

  set abilityNumber(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 3 }, value);
  }
}

export class Pk7FatefulEncounterGenderAndForm {
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

export class Pk7Pokerus {
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

export class Pk7Ribbons {
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

  get kalosChampion(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set kalosChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get hoennChampion(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set hoennChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }

  get sinnohChampion(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 1 });
  }

  set sinnohChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 1 }, value);
  }

  get bestFriends(): number {
    return this.#store.number({ ...this.#read, bit: 3, width: 1 });
  }

  set bestFriends(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 3, width: 1 }, value);
  }

  get training(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 1 });
  }

  set training(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 1 }, value);
  }

  get skillfulBattler(): number {
    return this.#store.number({ ...this.#read, bit: 5, width: 1 });
  }

  set skillfulBattler(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 5, width: 1 }, value);
  }

  get expertBattler(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 1 });
  }

  set expertBattler(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 1 }, value);
  }

  get effort(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 1 });
  }

  set effort(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 1 }, value);
  }

  get alert(): number {
    return this.#store.number({ ...this.#read, bit: 8, width: 1 });
  }

  set alert(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 8, width: 1 }, value);
  }

  get shock(): number {
    return this.#store.number({ ...this.#read, bit: 9, width: 1 });
  }

  set shock(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 9, width: 1 }, value);
  }

  get downcast(): number {
    return this.#store.number({ ...this.#read, bit: 10, width: 1 });
  }

  set downcast(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 10, width: 1 }, value);
  }

  get careless(): number {
    return this.#store.number({ ...this.#read, bit: 11, width: 1 });
  }

  set careless(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 11, width: 1 }, value);
  }

  get relax(): number {
    return this.#store.number({ ...this.#read, bit: 12, width: 1 });
  }

  set relax(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 12, width: 1 }, value);
  }

  get snooze(): number {
    return this.#store.number({ ...this.#read, bit: 13, width: 1 });
  }

  set snooze(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 13, width: 1 }, value);
  }

  get smile(): number {
    return this.#store.number({ ...this.#read, bit: 14, width: 1 });
  }

  set smile(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 14, width: 1 }, value);
  }

  get gorgeous(): number {
    return this.#store.number({ ...this.#read, bit: 15, width: 1 });
  }

  set gorgeous(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 15, width: 1 }, value);
  }

  get royal(): number {
    return this.#store.number({ ...this.#read, bit: 16, width: 1 });
  }

  set royal(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 16, width: 1 }, value);
  }

  get gorgeousRoyal(): number {
    return this.#store.number({ ...this.#read, bit: 17, width: 1 });
  }

  set gorgeousRoyal(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 17, width: 1 }, value);
  }

  get artist(): number {
    return this.#store.number({ ...this.#read, bit: 18, width: 1 });
  }

  set artist(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 18, width: 1 }, value);
  }

  get footprint(): number {
    return this.#store.number({ ...this.#read, bit: 19, width: 1 });
  }

  set footprint(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 19, width: 1 }, value);
  }

  get record(): number {
    return this.#store.number({ ...this.#read, bit: 20, width: 1 });
  }

  set record(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 20, width: 1 }, value);
  }

  get legend(): number {
    return this.#store.number({ ...this.#read, bit: 21, width: 1 });
  }

  set legend(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 21, width: 1 }, value);
  }

  get country(): number {
    return this.#store.number({ ...this.#read, bit: 22, width: 1 });
  }

  set country(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 22, width: 1 }, value);
  }

  get national(): number {
    return this.#store.number({ ...this.#read, bit: 23, width: 1 });
  }

  set national(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 23, width: 1 }, value);
  }

  get earth(): number {
    return this.#store.number({ ...this.#read, bit: 24, width: 1 });
  }

  set earth(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 24, width: 1 }, value);
  }

  get world(): number {
    return this.#store.number({ ...this.#read, bit: 25, width: 1 });
  }

  set world(value: number) {
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

  get event(): number {
    return this.#store.number({ ...this.#read, bit: 28, width: 1 });
  }

  set event(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 28, width: 1 }, value);
  }

  get birthday(): number {
    return this.#store.number({ ...this.#read, bit: 29, width: 1 });
  }

  set birthday(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 29, width: 1 }, value);
  }

  get special(): number {
    return this.#store.number({ ...this.#read, bit: 30, width: 1 });
  }

  set special(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 30, width: 1 }, value);
  }

  get souvenir(): number {
    return this.#store.number({ ...this.#read, bit: 31, width: 1 });
  }

  set souvenir(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 31, width: 1 }, value);
  }
}

export class Pk7Ribbons2 {
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

  get wishing(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set wishing(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get battleChampion(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set battleChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }

  get regionalChampion(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 1 });
  }

  set regionalChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 1 }, value);
  }

  get nationalChampion(): number {
    return this.#store.number({ ...this.#read, bit: 3, width: 1 });
  }

  set nationalChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 3, width: 1 }, value);
  }

  get worldChampion(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 1 });
  }

  set worldChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 1 }, value);
  }

  get contestMemory(): number {
    return this.#store.number({ ...this.#read, bit: 5, width: 1 });
  }

  set contestMemory(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 5, width: 1 }, value);
  }

  get battleMemory(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 1 });
  }

  set battleMemory(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 1 }, value);
  }

  get hoennChampionOras(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 1 });
  }

  set hoennChampionOras(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 1 }, value);
  }

  get contestStar(): number {
    return this.#store.number({ ...this.#read, bit: 8, width: 1 });
  }

  set contestStar(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 8, width: 1 }, value);
  }

  get coolnessMaster(): number {
    return this.#store.number({ ...this.#read, bit: 9, width: 1 });
  }

  set coolnessMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 9, width: 1 }, value);
  }

  get beautyMaster(): number {
    return this.#store.number({ ...this.#read, bit: 10, width: 1 });
  }

  set beautyMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 10, width: 1 }, value);
  }

  get cutenessMaster(): number {
    return this.#store.number({ ...this.#read, bit: 11, width: 1 });
  }

  set cutenessMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 11, width: 1 }, value);
  }

  get clevernessMaster(): number {
    return this.#store.number({ ...this.#read, bit: 12, width: 1 });
  }

  set clevernessMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 12, width: 1 }, value);
  }

  get toughnessMaster(): number {
    return this.#store.number({ ...this.#read, bit: 13, width: 1 });
  }

  set toughnessMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 13, width: 1 }, value);
  }

  get alolaChampion(): number {
    return this.#store.number({ ...this.#read, bit: 14, width: 1 });
  }

  set alolaChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 14, width: 1 }, value);
  }

  get battleRoyalMaster(): number {
    return this.#store.number({ ...this.#read, bit: 15, width: 1 });
  }

  set battleRoyalMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 15, width: 1 }, value);
  }
}

export class Pk7Ribbons3 {
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

  get battleTreeGreat(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set battleTreeGreat(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get battleTreeMaster(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set battleTreeMaster(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }
}

export class Pk7SecretSuperTraining {
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

  get unlocked(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set unlocked(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get supremelyTrained(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set supremelyTrained(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }
}

export class Pk7IvsEggAndNicknamed {
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

export class Pk7GeoLocations {
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

  get region(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 8 });
  }

  set region(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 8 }, value);
  }

  get country(): number {
    return this.#store.number({ ...this.#read, bit: 8, width: 8 });
  }

  set country(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 8, width: 8 }, value);
  }
}

export class Pk7MetLevelAndTrainerGender {
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

export class Pk7HyperTraining {
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
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set hp(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get attack(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set attack(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }

  get defense(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 1 });
  }

  set defense(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 1 }, value);
  }

  get spAtk(): number {
    return this.#store.number({ ...this.#read, bit: 3, width: 1 });
  }

  set spAtk(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 3, width: 1 }, value);
  }

  get spDef(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 1 });
  }

  set spDef(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 1 }, value);
  }

  get speed(): number {
    return this.#store.number({ ...this.#read, bit: 5, width: 1 });
  }

  set speed(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 5, width: 1 }, value);
  }
}

const views: [string, new (store: Store, space: string) => unknown][] = [
  ["save", SaveSpace],
  ["my-item", MyItem],
  ["my-status", MyStatus],
  ["poke-party", PokeParty],
  ["event-work", EventWork],
  ["zukan", Zukan],
  ["misc", Misc],
  ["game-time", GameTime],
  ["box-layout", BoxLayout],
  ["boxes", Boxes],
  ["play-time", PlayTimeSpace],
  ["party:{1..6}", Pk7Party],
  ["box:{1..32}:{1..30}", Pk7],
];

export const read = (file: Uint8Array) => new Save(file);
