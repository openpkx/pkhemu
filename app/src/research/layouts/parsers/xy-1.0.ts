// Generated from known/xy-1.0.json by tools/parser/generate.ts. Run npm run parsers after changing either.
import { counted, expand, repeat, setEach, spaceView, Store, type At, type Counted, type Read, type SpaceDef } from "../tools/parser/runtime.ts";

export const target = {"schema":"1.0","format":"xy","version":"1.0"};

const spaces: SpaceDef[] = [
  {"name":"save","length":415232,"checksums":[{"step":"crc16-ccitt","start":0,"end":712,"at":414746},{"step":"crc16-ccitt","start":1024,"end":3976,"at":414754},{"step":"crc16-ccitt","start":4096,"end":4140,"at":414762},{"step":"crc16-ccitt","start":4608,"end":4664,"at":414770},{"step":"crc16-ccitt","start":5120,"end":5456,"at":414778},{"step":"crc16-ccitt","start":5632,"end":5636,"at":414786},{"step":"crc16-ccitt","start":6144,"end":6152,"at":414794},{"step":"crc16-ccitt","start":6656,"end":7104,"at":414802},{"step":"crc16-ccitt","start":7168,"end":7358,"at":414810},{"step":"crc16-ccitt","start":7680,"end":7716,"at":414818},{"step":"crc16-ccitt","start":8192,"end":16640,"at":414826},{"step":"crc16-ccitt","start":16896,"end":17216,"at":414834},{"step":"crc16-ccitt","start":17408,"end":18496,"at":414842},{"step":"crc16-ccitt","start":18944,"end":20340,"at":414850},{"step":"crc16-ccitt","start":20480,"end":40488,"at":414858},{"step":"crc16-ccitt","start":40960,"end":60968,"at":414866},{"step":"crc16-ccitt","start":61440,"end":81448,"at":414874},{"step":"crc16-ccitt","start":81920,"end":82288,"at":414882},{"step":"crc16-ccitt","start":82432,"end":83996,"at":414890},{"step":"crc16-ccitt","start":84480,"end":85764,"at":414898},{"step":"crc16-ccitt","start":86016,"end":87712,"at":414906},{"step":"crc16-ccitt","start":88064,"end":89668,"at":414914},{"step":"crc16-ccitt","start":90112,"end":90372,"at":414922},{"step":"crc16-ccitt","start":90624,"end":90628,"at":414930},{"step":"crc16-ccitt","start":91136,"end":92192,"at":414938},{"step":"crc16-ccitt","start":92672,"end":92772,"at":414946},{"step":"crc16-ccitt","start":93184,"end":94192,"at":414954},{"step":"crc16-ccitt","start":94208,"end":96012,"at":414962},{"step":"crc16-ccitt","start":96256,"end":96640,"at":414970},{"step":"crc16-ccitt","start":96768,"end":96772,"at":414978},{"step":"crc16-ccitt","start":97280,"end":97292,"at":414986},{"step":"crc16-ccitt","start":97792,"end":97864,"at":414994},{"step":"crc16-ccitt","start":98304,"end":98388,"at":415002},{"step":"crc16-ccitt","start":98816,"end":100420,"at":415010},{"step":"crc16-ccitt","start":100864,"end":102344,"at":415018},{"step":"crc16-ccitt","start":102400,"end":103160,"at":415026},{"step":"crc16-ccitt","start":103424,"end":110400,"at":415034},{"step":"crc16-ccitt","start":110592,"end":111092,"at":415042},{"step":"crc16-ccitt","start":111104,"end":111600,"at":415050},{"step":"crc16-ccitt","start":111616,"end":112150,"at":415058},{"step":"crc16-ccitt","start":112640,"end":113552,"at":415066},{"step":"crc16-ccitt","start":113664,"end":120464,"at":415074},{"step":"crc16-ccitt","start":120832,"end":121608,"at":415082},{"step":"crc16-ccitt","start":121856,"end":123416,"at":415090},{"step":"crc16-ccitt","start":123904,"end":124508,"at":415098},{"step":"crc16-ccitt","start":124928,"end":127028,"at":415106},{"step":"crc16-ccitt","start":127488,"end":128280,"at":415114},{"step":"crc16-ccitt","start":128512,"end":130512,"at":415122},{"step":"crc16-ccitt","start":130560,"end":133704,"at":415130},{"step":"crc16-ccitt","start":134144,"end":134264,"at":415138},{"step":"crc16-ccitt","start":134656,"end":135168,"at":415146},{"step":"crc16-ccitt","start":135168,"end":138372,"at":415154},{"step":"crc16-ccitt","start":138752,"end":140328,"at":415162},{"step":"crc16-ccitt","start":140800,"end":356560,"at":415170},{"step":"crc16-ccitt","start":356864,"end":414296,"at":415178}]},
  {"name":"my-item","length":2952,"source":{"regions":[{"space":"save","start":1024,"end":3976}],"offset":0}},
  {"name":"game-time","length":56,"source":{"regions":[{"space":"save","start":4608,"end":4664}],"offset":0}},
  {"name":"play-time","length":8,"source":{"regions":[{"space":"save","start":6144,"end":6152}],"offset":0}},
  {"name":"misc","length":320,"source":{"regions":[{"space":"save","start":16896,"end":17216}],"offset":0}},
  {"name":"box-layout","length":1088,"source":{"regions":[{"space":"save","start":17408,"end":18496}],"offset":0}},
  {"name":"my-status","length":368,"source":{"regions":[{"space":"save","start":81920,"end":82288}],"offset":0}},
  {"name":"poke-party","length":1564,"source":{"regions":[{"space":"save","start":82432,"end":83996}],"offset":0}},
  {"name":"event-work","length":1284,"source":{"regions":[{"space":"save","start":84480,"end":85764}],"offset":0}},
  {"name":"zukan","length":1696,"source":{"regions":[{"space":"save","start":86016,"end":87712}],"offset":0}},
  {"name":"boxes","length":215760,"source":{"regions":[{"space":"save","start":140800,"end":356560}],"offset":0}},
  {"name":"party:{1..6}","length":260,"transform":"pk67-crypt","source":{"regions":[{"space":"poke-party","start":0,"end":1560}],"offset":0,"stride":260},"checksums":[{"step":"sum16le","start":8,"end":232,"at":6}]},
  {"name":"box:{1..31}:{1..30}","length":232,"transform":"pk67-crypt","source":{"regions":[{"space":"boxes","start":0,"end":215760}],"offset":0,"stride":232},"checksums":[{"step":"sum16le","start":8,"end":232,"at":6}]},
];

export type Spaces =
  { "save": SaveSpace } &
  { "my-item": MyItem } &
  { "game-time": GameTime } &
  { "play-time": PlayTimeSpace } &
  { "misc": Misc } &
  { "box-layout": BoxLayout } &
  { "my-status": MyStatus } &
  { "poke-party": PokeParty } &
  { "event-work": EventWork } &
  { "zukan": Zukan } &
  { "boxes": Boxes } &
  { [Name in `party:${1 | 2 | 3 | 4 | 5 | 6}`]: Pk6Party } &
  { [Name in `box:${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31}:${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30}`]: Pk6 };

export type SpaceName = keyof Spaces;

export class Trainer {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get name(): string {
    return this.#store.text({ space: "my-status", offset: 0x48, type: "text-gen6", length: 26 });
  }

  set name(value: string) {
    this.#store.setText({ space: "my-status", offset: 0x48, type: "text-gen6", length: 26 }, value);
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
    return this.#store.number({ space: "misc", offset: 0x8, type: "u32le", length: 4 });
  }

  set money(value: number) {
    this.#store.setNumber({ space: "misc", offset: 0x8, type: "u32le", length: 4 }, value);
  }

  get battlePoints(): number {
    return this.#store.number({ space: "misc", offset: 0x3C, type: "u16le", length: 2 });
  }

  set battlePoints(value: number) {
    this.#store.setNumber({ space: "misc", offset: 0x3C, type: "u16le", length: 2 }, value);
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
    return this.#store.text({ space: this.#at.space, offset: 0xB0, type: "text-gen6", length: 26 });
  }

  set name(value: string) {
    this.#store.setText({ space: this.#at.space, offset: 0xB0, type: "text-gen6", length: 26 }, value);
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
    return this.#store.text({ space: this.#at.space, offset: 0x40, type: "text-gen6", length: 26 });
  }

  set nickname(value: string) {
    this.#store.setText({ space: this.#at.space, offset: 0x40, type: "text-gen6", length: 26 }, value);
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
    return this.#store.text({ space: "box-layout", offset: 0x0 + this.#at.index * 34, type: "text-gen6", length: 34 });
  }

  set name(value: string) {
    this.#store.setText({ space: "box-layout", offset: 0x0 + this.#at.index * 34, type: "text-gen6", length: 34 }, value);
  }

  get wallpaper(): number {
    return this.#store.number({ space: "box-layout", offset: 0x41E + this.#at.index * 1, type: "u8", length: 1 });
  }

  set wallpaper(value: number) {
    this.#store.setNumber({ space: "box-layout", offset: 0x41E + this.#at.index * 1, type: "u8", length: 1 }, value);
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
  readonly medicine: readonly Item[];
  readonly berries: readonly Item[];

  constructor(store: Store, _at: At) {
    this.items = repeat(400, (index) => new Item(store, { space: "my-item", index, offset: 0x0 + index * 4 }));
    this.keyItems = repeat(96, (index) => new Item(store, { space: "my-item", index, offset: 0x640 + index * 4 }));
    this.tmsHms = repeat(106, (index) => new Item(store, { space: "my-item", index, offset: 0x7C0 + index * 4 }));
    this.medicine = repeat(64, (index) => new Item(store, { space: "my-item", index, offset: 0x968 + index * 4 }));
    this.berries = repeat(72, (index) => new Item(store, { space: "my-item", index, offset: 0xA68 + index * 4 }));
  }
}

export class Badges {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get badge1(): number {
    return this.#store.number({ space: "misc", offset: 0xC, type: "u8", length: 1, bit: 0, width: 1 });
  }

  set badge1(value: number) {
    this.#store.setNumber({ space: "misc", offset: 0xC, type: "u8", length: 1, bit: 0, width: 1 }, value);
  }

  get badge2(): number {
    return this.#store.number({ space: "misc", offset: 0xC, type: "u8", length: 1, bit: 1, width: 1 });
  }

  set badge2(value: number) {
    this.#store.setNumber({ space: "misc", offset: 0xC, type: "u8", length: 1, bit: 1, width: 1 }, value);
  }

  get badge3(): number {
    return this.#store.number({ space: "misc", offset: 0xC, type: "u8", length: 1, bit: 2, width: 1 });
  }

  set badge3(value: number) {
    this.#store.setNumber({ space: "misc", offset: 0xC, type: "u8", length: 1, bit: 2, width: 1 }, value);
  }

  get badge4(): number {
    return this.#store.number({ space: "misc", offset: 0xC, type: "u8", length: 1, bit: 3, width: 1 });
  }

  set badge4(value: number) {
    this.#store.setNumber({ space: "misc", offset: 0xC, type: "u8", length: 1, bit: 3, width: 1 }, value);
  }

  get badge5(): number {
    return this.#store.number({ space: "misc", offset: 0xC, type: "u8", length: 1, bit: 4, width: 1 });
  }

  set badge5(value: number) {
    this.#store.setNumber({ space: "misc", offset: 0xC, type: "u8", length: 1, bit: 4, width: 1 }, value);
  }

  get badge6(): number {
    return this.#store.number({ space: "misc", offset: 0xC, type: "u8", length: 1, bit: 5, width: 1 });
  }

  set badge6(value: number) {
    this.#store.setNumber({ space: "misc", offset: 0xC, type: "u8", length: 1, bit: 5, width: 1 }, value);
  }

  get badge7(): number {
    return this.#store.number({ space: "misc", offset: 0xC, type: "u8", length: 1, bit: 6, width: 1 });
  }

  set badge7(value: number) {
    this.#store.setNumber({ space: "misc", offset: 0xC, type: "u8", length: 1, bit: 6, width: 1 }, value);
  }

  get badge8(): number {
    return this.#store.number({ space: "misc", offset: 0xC, type: "u8", length: 1, bit: 7, width: 1 });
  }

  set badge8(value: number) {
    this.#store.setNumber({ space: "misc", offset: 0xC, type: "u8", length: 1, bit: 7, width: 1 }, value);
  }
}

export class Pokedex {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get owned(): readonly boolean[] {
    return this.#store.flags({ space: "zukan", offset: 0x8, type: "flags", length: 96 });
  }

  set owned(value: readonly boolean[]) {
    this.#store.setFlags({ space: "zukan", offset: 0x8, type: "flags", length: 96 }, value);
  }

  get seen(): readonly boolean[] {
    return this.#store.flags({ space: "zukan", offset: 0x68, type: "flags", length: 96 });
  }

  set seen(value: readonly boolean[]) {
    this.#store.setFlags({ space: "zukan", offset: 0x68, type: "flags", length: 96 }, value);
  }

  get seenFemale(): readonly boolean[] {
    return this.#store.flags({ space: "zukan", offset: 0xC8, type: "flags", length: 96 });
  }

  set seenFemale(value: readonly boolean[]) {
    this.#store.setFlags({ space: "zukan", offset: 0xC8, type: "flags", length: 96 }, value);
  }

  get seenShiny(): readonly boolean[] {
    return this.#store.flags({ space: "zukan", offset: 0x128, type: "flags", length: 96 });
  }

  set seenShiny(value: readonly boolean[]) {
    this.#store.setFlags({ space: "zukan", offset: 0x128, type: "flags", length: 96 }, value);
  }

  get seenShinyFemale(): readonly boolean[] {
    return this.#store.flags({ space: "zukan", offset: 0x188, type: "flags", length: 96 });
  }

  set seenShinyFemale(value: readonly boolean[]) {
    this.#store.setFlags({ space: "zukan", offset: 0x188, type: "flags", length: 96 }, value);
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
    this.work = repeat(376, (index) => new EventsEventWork(store, { space: "event-work", index, offset: 0x0 + index * 2 }));
  }

  get flags(): readonly boolean[] {
    return this.#store.flags({ space: "event-work", offset: 0x2F0, type: "flags", length: 416 });
  }

  set flags(value: readonly boolean[]) {
    this.#store.setFlags({ space: "event-work", offset: 0x2F0, type: "flags", length: 416 }, value);
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
    this.party = counted(expand("party:{1..6}").map((space, index) => new PartyPokemon(store, { space, index, offset: 0 })), store, { space: "poke-party", offset: 0x618, type: "u8", length: 1 });
    this.boxes = expand("box:{1..31}").map((space, index) => new Box(store, { space, index, offset: 0 }));
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

  get savedAt(): bigint {
    return this.#store.bigint({ space: this.#space, offset: 0x65400, type: "u64le", length: 8 });
  }

  set savedAt(value: bigint) {
    this.#store.setBigint({ space: this.#space, offset: 0x65400, type: "u64le", length: 8 }, value);
  }

  get savedAtBefore(): bigint {
    return this.#store.bigint({ space: this.#space, offset: 0x65408, type: "u64le", length: 8 });
  }

  set savedAtBefore(value: bigint) {
    this.#store.setBigint({ space: this.#space, offset: 0x65408, type: "u64le", length: 8 }, value);
  }

  get blockTableMagic(): number {
    return this.#store.number({ space: this.#space, offset: 0x65410, type: "u32le", length: 4 });
  }

  set blockTableMagic(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65410, type: "u32le", length: 4 }, value);
  }

  get block0Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x65414, type: "u32le", length: 4 });
  }

  set block0Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65414, type: "u32le", length: 4 }, value);
  }

  get block0Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65418, type: "u16le", length: 2 });
  }

  set block0Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65418, type: "u16le", length: 2 }, value);
  }

  get block0Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6541A, type: "u16le", length: 2 });
  }

  set block0Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6541A, type: "u16le", length: 2 }, value);
  }

  get block1Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6541C, type: "u32le", length: 4 });
  }

  set block1Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6541C, type: "u32le", length: 4 }, value);
  }

  get block1Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65420, type: "u16le", length: 2 });
  }

  set block1Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65420, type: "u16le", length: 2 }, value);
  }

  get block1Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x65422, type: "u16le", length: 2 });
  }

  set block1Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65422, type: "u16le", length: 2 }, value);
  }

  get block2Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x65424, type: "u32le", length: 4 });
  }

  set block2Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65424, type: "u32le", length: 4 }, value);
  }

  get block2Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65428, type: "u16le", length: 2 });
  }

  set block2Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65428, type: "u16le", length: 2 }, value);
  }

  get block2Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6542A, type: "u16le", length: 2 });
  }

  set block2Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6542A, type: "u16le", length: 2 }, value);
  }

  get block3Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6542C, type: "u32le", length: 4 });
  }

  set block3Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6542C, type: "u32le", length: 4 }, value);
  }

  get block3Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65430, type: "u16le", length: 2 });
  }

  set block3Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65430, type: "u16le", length: 2 }, value);
  }

  get block3Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x65432, type: "u16le", length: 2 });
  }

  set block3Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65432, type: "u16le", length: 2 }, value);
  }

  get block4Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x65434, type: "u32le", length: 4 });
  }

  set block4Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65434, type: "u32le", length: 4 }, value);
  }

  get block4Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65438, type: "u16le", length: 2 });
  }

  set block4Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65438, type: "u16le", length: 2 }, value);
  }

  get block4Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6543A, type: "u16le", length: 2 });
  }

  set block4Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6543A, type: "u16le", length: 2 }, value);
  }

  get block5Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6543C, type: "u32le", length: 4 });
  }

  set block5Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6543C, type: "u32le", length: 4 }, value);
  }

  get block5Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65440, type: "u16le", length: 2 });
  }

  set block5Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65440, type: "u16le", length: 2 }, value);
  }

  get block5Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x65442, type: "u16le", length: 2 });
  }

  set block5Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65442, type: "u16le", length: 2 }, value);
  }

  get block6Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x65444, type: "u32le", length: 4 });
  }

  set block6Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65444, type: "u32le", length: 4 }, value);
  }

  get block6Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65448, type: "u16le", length: 2 });
  }

  set block6Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65448, type: "u16le", length: 2 }, value);
  }

  get block6Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6544A, type: "u16le", length: 2 });
  }

  set block6Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6544A, type: "u16le", length: 2 }, value);
  }

  get block7Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6544C, type: "u32le", length: 4 });
  }

  set block7Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6544C, type: "u32le", length: 4 }, value);
  }

  get block7Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65450, type: "u16le", length: 2 });
  }

  set block7Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65450, type: "u16le", length: 2 }, value);
  }

  get block7Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x65452, type: "u16le", length: 2 });
  }

  set block7Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65452, type: "u16le", length: 2 }, value);
  }

  get block8Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x65454, type: "u32le", length: 4 });
  }

  set block8Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65454, type: "u32le", length: 4 }, value);
  }

  get block8Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65458, type: "u16le", length: 2 });
  }

  set block8Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65458, type: "u16le", length: 2 }, value);
  }

  get block8Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6545A, type: "u16le", length: 2 });
  }

  set block8Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6545A, type: "u16le", length: 2 }, value);
  }

  get block9Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6545C, type: "u32le", length: 4 });
  }

  set block9Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6545C, type: "u32le", length: 4 }, value);
  }

  get block9Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65460, type: "u16le", length: 2 });
  }

  set block9Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65460, type: "u16le", length: 2 }, value);
  }

  get block9Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x65462, type: "u16le", length: 2 });
  }

  set block9Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65462, type: "u16le", length: 2 }, value);
  }

  get block10Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x65464, type: "u32le", length: 4 });
  }

  set block10Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65464, type: "u32le", length: 4 }, value);
  }

  get block10Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65468, type: "u16le", length: 2 });
  }

  set block10Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65468, type: "u16le", length: 2 }, value);
  }

  get block10Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6546A, type: "u16le", length: 2 });
  }

  set block10Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6546A, type: "u16le", length: 2 }, value);
  }

  get block11Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6546C, type: "u32le", length: 4 });
  }

  set block11Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6546C, type: "u32le", length: 4 }, value);
  }

  get block11Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65470, type: "u16le", length: 2 });
  }

  set block11Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65470, type: "u16le", length: 2 }, value);
  }

  get block11Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x65472, type: "u16le", length: 2 });
  }

  set block11Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65472, type: "u16le", length: 2 }, value);
  }

  get block12Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x65474, type: "u32le", length: 4 });
  }

  set block12Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65474, type: "u32le", length: 4 }, value);
  }

  get block12Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65478, type: "u16le", length: 2 });
  }

  set block12Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65478, type: "u16le", length: 2 }, value);
  }

  get block12Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6547A, type: "u16le", length: 2 });
  }

  set block12Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6547A, type: "u16le", length: 2 }, value);
  }

  get block13Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6547C, type: "u32le", length: 4 });
  }

  set block13Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6547C, type: "u32le", length: 4 }, value);
  }

  get block13Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65480, type: "u16le", length: 2 });
  }

  set block13Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65480, type: "u16le", length: 2 }, value);
  }

  get block13Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x65482, type: "u16le", length: 2 });
  }

  set block13Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65482, type: "u16le", length: 2 }, value);
  }

  get block14Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x65484, type: "u32le", length: 4 });
  }

  set block14Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65484, type: "u32le", length: 4 }, value);
  }

  get block14Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65488, type: "u16le", length: 2 });
  }

  set block14Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65488, type: "u16le", length: 2 }, value);
  }

  get block14Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6548A, type: "u16le", length: 2 });
  }

  set block14Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6548A, type: "u16le", length: 2 }, value);
  }

  get block15Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6548C, type: "u32le", length: 4 });
  }

  set block15Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6548C, type: "u32le", length: 4 }, value);
  }

  get block15Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65490, type: "u16le", length: 2 });
  }

  set block15Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65490, type: "u16le", length: 2 }, value);
  }

  get block15Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x65492, type: "u16le", length: 2 });
  }

  set block15Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65492, type: "u16le", length: 2 }, value);
  }

  get block16Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x65494, type: "u32le", length: 4 });
  }

  set block16Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65494, type: "u32le", length: 4 }, value);
  }

  get block16Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65498, type: "u16le", length: 2 });
  }

  set block16Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65498, type: "u16le", length: 2 }, value);
  }

  get block16Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6549A, type: "u16le", length: 2 });
  }

  set block16Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6549A, type: "u16le", length: 2 }, value);
  }

  get block17Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6549C, type: "u32le", length: 4 });
  }

  set block17Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6549C, type: "u32le", length: 4 }, value);
  }

  get block17Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x654A0, type: "u16le", length: 2 });
  }

  set block17Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654A0, type: "u16le", length: 2 }, value);
  }

  get block17Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x654A2, type: "u16le", length: 2 });
  }

  set block17Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654A2, type: "u16le", length: 2 }, value);
  }

  get block18Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x654A4, type: "u32le", length: 4 });
  }

  set block18Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654A4, type: "u32le", length: 4 }, value);
  }

  get block18Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x654A8, type: "u16le", length: 2 });
  }

  set block18Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654A8, type: "u16le", length: 2 }, value);
  }

  get block18Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x654AA, type: "u16le", length: 2 });
  }

  set block18Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654AA, type: "u16le", length: 2 }, value);
  }

  get block19Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x654AC, type: "u32le", length: 4 });
  }

  set block19Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654AC, type: "u32le", length: 4 }, value);
  }

  get block19Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x654B0, type: "u16le", length: 2 });
  }

  set block19Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654B0, type: "u16le", length: 2 }, value);
  }

  get block19Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x654B2, type: "u16le", length: 2 });
  }

  set block19Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654B2, type: "u16le", length: 2 }, value);
  }

  get block20Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x654B4, type: "u32le", length: 4 });
  }

  set block20Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654B4, type: "u32le", length: 4 }, value);
  }

  get block20Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x654B8, type: "u16le", length: 2 });
  }

  set block20Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654B8, type: "u16le", length: 2 }, value);
  }

  get block20Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x654BA, type: "u16le", length: 2 });
  }

  set block20Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654BA, type: "u16le", length: 2 }, value);
  }

  get block21Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x654BC, type: "u32le", length: 4 });
  }

  set block21Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654BC, type: "u32le", length: 4 }, value);
  }

  get block21Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x654C0, type: "u16le", length: 2 });
  }

  set block21Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654C0, type: "u16le", length: 2 }, value);
  }

  get block21Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x654C2, type: "u16le", length: 2 });
  }

  set block21Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654C2, type: "u16le", length: 2 }, value);
  }

  get block22Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x654C4, type: "u32le", length: 4 });
  }

  set block22Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654C4, type: "u32le", length: 4 }, value);
  }

  get block22Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x654C8, type: "u16le", length: 2 });
  }

  set block22Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654C8, type: "u16le", length: 2 }, value);
  }

  get block22Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x654CA, type: "u16le", length: 2 });
  }

  set block22Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654CA, type: "u16le", length: 2 }, value);
  }

  get block23Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x654CC, type: "u32le", length: 4 });
  }

  set block23Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654CC, type: "u32le", length: 4 }, value);
  }

  get block23Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x654D0, type: "u16le", length: 2 });
  }

  set block23Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654D0, type: "u16le", length: 2 }, value);
  }

  get block23Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x654D2, type: "u16le", length: 2 });
  }

  set block23Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654D2, type: "u16le", length: 2 }, value);
  }

  get block24Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x654D4, type: "u32le", length: 4 });
  }

  set block24Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654D4, type: "u32le", length: 4 }, value);
  }

  get block24Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x654D8, type: "u16le", length: 2 });
  }

  set block24Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654D8, type: "u16le", length: 2 }, value);
  }

  get block24Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x654DA, type: "u16le", length: 2 });
  }

  set block24Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654DA, type: "u16le", length: 2 }, value);
  }

  get block25Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x654DC, type: "u32le", length: 4 });
  }

  set block25Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654DC, type: "u32le", length: 4 }, value);
  }

  get block25Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x654E0, type: "u16le", length: 2 });
  }

  set block25Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654E0, type: "u16le", length: 2 }, value);
  }

  get block25Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x654E2, type: "u16le", length: 2 });
  }

  set block25Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654E2, type: "u16le", length: 2 }, value);
  }

  get block26Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x654E4, type: "u32le", length: 4 });
  }

  set block26Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654E4, type: "u32le", length: 4 }, value);
  }

  get block26Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x654E8, type: "u16le", length: 2 });
  }

  set block26Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654E8, type: "u16le", length: 2 }, value);
  }

  get block26Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x654EA, type: "u16le", length: 2 });
  }

  set block26Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654EA, type: "u16le", length: 2 }, value);
  }

  get block27Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x654EC, type: "u32le", length: 4 });
  }

  set block27Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654EC, type: "u32le", length: 4 }, value);
  }

  get block27Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x654F0, type: "u16le", length: 2 });
  }

  set block27Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654F0, type: "u16le", length: 2 }, value);
  }

  get block27Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x654F2, type: "u16le", length: 2 });
  }

  set block27Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654F2, type: "u16le", length: 2 }, value);
  }

  get block28Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x654F4, type: "u32le", length: 4 });
  }

  set block28Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654F4, type: "u32le", length: 4 }, value);
  }

  get block28Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x654F8, type: "u16le", length: 2 });
  }

  set block28Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654F8, type: "u16le", length: 2 }, value);
  }

  get block28Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x654FA, type: "u16le", length: 2 });
  }

  set block28Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654FA, type: "u16le", length: 2 }, value);
  }

  get block29Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x654FC, type: "u32le", length: 4 });
  }

  set block29Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x654FC, type: "u32le", length: 4 }, value);
  }

  get block29Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65500, type: "u16le", length: 2 });
  }

  set block29Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65500, type: "u16le", length: 2 }, value);
  }

  get block29Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x65502, type: "u16le", length: 2 });
  }

  set block29Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65502, type: "u16le", length: 2 }, value);
  }

  get block30Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x65504, type: "u32le", length: 4 });
  }

  set block30Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65504, type: "u32le", length: 4 }, value);
  }

  get block30Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65508, type: "u16le", length: 2 });
  }

  set block30Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65508, type: "u16le", length: 2 }, value);
  }

  get block30Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6550A, type: "u16le", length: 2 });
  }

  set block30Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6550A, type: "u16le", length: 2 }, value);
  }

  get block31Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6550C, type: "u32le", length: 4 });
  }

  set block31Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6550C, type: "u32le", length: 4 }, value);
  }

  get block31Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65510, type: "u16le", length: 2 });
  }

  set block31Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65510, type: "u16le", length: 2 }, value);
  }

  get block31Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x65512, type: "u16le", length: 2 });
  }

  set block31Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65512, type: "u16le", length: 2 }, value);
  }

  get block32Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x65514, type: "u32le", length: 4 });
  }

  set block32Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65514, type: "u32le", length: 4 }, value);
  }

  get block32Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65518, type: "u16le", length: 2 });
  }

  set block32Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65518, type: "u16le", length: 2 }, value);
  }

  get block32Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6551A, type: "u16le", length: 2 });
  }

  set block32Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6551A, type: "u16le", length: 2 }, value);
  }

  get block33Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6551C, type: "u32le", length: 4 });
  }

  set block33Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6551C, type: "u32le", length: 4 }, value);
  }

  get block33Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65520, type: "u16le", length: 2 });
  }

  set block33Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65520, type: "u16le", length: 2 }, value);
  }

  get block33Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x65522, type: "u16le", length: 2 });
  }

  set block33Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65522, type: "u16le", length: 2 }, value);
  }

  get block34Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x65524, type: "u32le", length: 4 });
  }

  set block34Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65524, type: "u32le", length: 4 }, value);
  }

  get block34Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65528, type: "u16le", length: 2 });
  }

  set block34Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65528, type: "u16le", length: 2 }, value);
  }

  get block34Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6552A, type: "u16le", length: 2 });
  }

  set block34Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6552A, type: "u16le", length: 2 }, value);
  }

  get block35Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6552C, type: "u32le", length: 4 });
  }

  set block35Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6552C, type: "u32le", length: 4 }, value);
  }

  get block35Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65530, type: "u16le", length: 2 });
  }

  set block35Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65530, type: "u16le", length: 2 }, value);
  }

  get block35Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x65532, type: "u16le", length: 2 });
  }

  set block35Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65532, type: "u16le", length: 2 }, value);
  }

  get block36Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x65534, type: "u32le", length: 4 });
  }

  set block36Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65534, type: "u32le", length: 4 }, value);
  }

  get block36Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65538, type: "u16le", length: 2 });
  }

  set block36Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65538, type: "u16le", length: 2 }, value);
  }

  get block36Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6553A, type: "u16le", length: 2 });
  }

  set block36Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6553A, type: "u16le", length: 2 }, value);
  }

  get block37Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6553C, type: "u32le", length: 4 });
  }

  set block37Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6553C, type: "u32le", length: 4 }, value);
  }

  get block37Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65540, type: "u16le", length: 2 });
  }

  set block37Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65540, type: "u16le", length: 2 }, value);
  }

  get block37Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x65542, type: "u16le", length: 2 });
  }

  set block37Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65542, type: "u16le", length: 2 }, value);
  }

  get block38Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x65544, type: "u32le", length: 4 });
  }

  set block38Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65544, type: "u32le", length: 4 }, value);
  }

  get block38Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65548, type: "u16le", length: 2 });
  }

  set block38Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65548, type: "u16le", length: 2 }, value);
  }

  get block38Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6554A, type: "u16le", length: 2 });
  }

  set block38Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6554A, type: "u16le", length: 2 }, value);
  }

  get block39Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6554C, type: "u32le", length: 4 });
  }

  set block39Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6554C, type: "u32le", length: 4 }, value);
  }

  get block39Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65550, type: "u16le", length: 2 });
  }

  set block39Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65550, type: "u16le", length: 2 }, value);
  }

  get block39Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x65552, type: "u16le", length: 2 });
  }

  set block39Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65552, type: "u16le", length: 2 }, value);
  }

  get block40Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x65554, type: "u32le", length: 4 });
  }

  set block40Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65554, type: "u32le", length: 4 }, value);
  }

  get block40Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65558, type: "u16le", length: 2 });
  }

  set block40Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65558, type: "u16le", length: 2 }, value);
  }

  get block40Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6555A, type: "u16le", length: 2 });
  }

  set block40Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6555A, type: "u16le", length: 2 }, value);
  }

  get block41Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6555C, type: "u32le", length: 4 });
  }

  set block41Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6555C, type: "u32le", length: 4 }, value);
  }

  get block41Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65560, type: "u16le", length: 2 });
  }

  set block41Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65560, type: "u16le", length: 2 }, value);
  }

  get block41Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x65562, type: "u16le", length: 2 });
  }

  set block41Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65562, type: "u16le", length: 2 }, value);
  }

  get block42Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x65564, type: "u32le", length: 4 });
  }

  set block42Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65564, type: "u32le", length: 4 }, value);
  }

  get block42Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65568, type: "u16le", length: 2 });
  }

  set block42Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65568, type: "u16le", length: 2 }, value);
  }

  get block42Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6556A, type: "u16le", length: 2 });
  }

  set block42Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6556A, type: "u16le", length: 2 }, value);
  }

  get block43Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6556C, type: "u32le", length: 4 });
  }

  set block43Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6556C, type: "u32le", length: 4 }, value);
  }

  get block43Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65570, type: "u16le", length: 2 });
  }

  set block43Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65570, type: "u16le", length: 2 }, value);
  }

  get block43Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x65572, type: "u16le", length: 2 });
  }

  set block43Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65572, type: "u16le", length: 2 }, value);
  }

  get block44Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x65574, type: "u32le", length: 4 });
  }

  set block44Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65574, type: "u32le", length: 4 }, value);
  }

  get block44Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65578, type: "u16le", length: 2 });
  }

  set block44Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65578, type: "u16le", length: 2 }, value);
  }

  get block44Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6557A, type: "u16le", length: 2 });
  }

  set block44Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6557A, type: "u16le", length: 2 }, value);
  }

  get block45Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6557C, type: "u32le", length: 4 });
  }

  set block45Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6557C, type: "u32le", length: 4 }, value);
  }

  get block45Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65580, type: "u16le", length: 2 });
  }

  set block45Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65580, type: "u16le", length: 2 }, value);
  }

  get block45Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x65582, type: "u16le", length: 2 });
  }

  set block45Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65582, type: "u16le", length: 2 }, value);
  }

  get block46Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x65584, type: "u32le", length: 4 });
  }

  set block46Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65584, type: "u32le", length: 4 }, value);
  }

  get block46Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65588, type: "u16le", length: 2 });
  }

  set block46Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65588, type: "u16le", length: 2 }, value);
  }

  get block46Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6558A, type: "u16le", length: 2 });
  }

  set block46Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6558A, type: "u16le", length: 2 }, value);
  }

  get block47Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6558C, type: "u32le", length: 4 });
  }

  set block47Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6558C, type: "u32le", length: 4 }, value);
  }

  get block47Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65590, type: "u16le", length: 2 });
  }

  set block47Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65590, type: "u16le", length: 2 }, value);
  }

  get block47Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x65592, type: "u16le", length: 2 });
  }

  set block47Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65592, type: "u16le", length: 2 }, value);
  }

  get block48Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x65594, type: "u32le", length: 4 });
  }

  set block48Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65594, type: "u32le", length: 4 }, value);
  }

  get block48Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x65598, type: "u16le", length: 2 });
  }

  set block48Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x65598, type: "u16le", length: 2 }, value);
  }

  get block48Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x6559A, type: "u16le", length: 2 });
  }

  set block48Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6559A, type: "u16le", length: 2 }, value);
  }

  get block49Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x6559C, type: "u32le", length: 4 });
  }

  set block49Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6559C, type: "u32le", length: 4 }, value);
  }

  get block49Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x655A0, type: "u16le", length: 2 });
  }

  set block49Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x655A0, type: "u16le", length: 2 }, value);
  }

  get block49Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x655A2, type: "u16le", length: 2 });
  }

  set block49Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x655A2, type: "u16le", length: 2 }, value);
  }

  get block50Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x655A4, type: "u32le", length: 4 });
  }

  set block50Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x655A4, type: "u32le", length: 4 }, value);
  }

  get block50Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x655A8, type: "u16le", length: 2 });
  }

  set block50Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x655A8, type: "u16le", length: 2 }, value);
  }

  get block50Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x655AA, type: "u16le", length: 2 });
  }

  set block50Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x655AA, type: "u16le", length: 2 }, value);
  }

  get block51Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x655AC, type: "u32le", length: 4 });
  }

  set block51Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x655AC, type: "u32le", length: 4 }, value);
  }

  get block51Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x655B0, type: "u16le", length: 2 });
  }

  set block51Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x655B0, type: "u16le", length: 2 }, value);
  }

  get block51Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x655B2, type: "u16le", length: 2 });
  }

  set block51Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x655B2, type: "u16le", length: 2 }, value);
  }

  get block52Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x655B4, type: "u32le", length: 4 });
  }

  set block52Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x655B4, type: "u32le", length: 4 }, value);
  }

  get block52Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x655B8, type: "u16le", length: 2 });
  }

  set block52Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x655B8, type: "u16le", length: 2 }, value);
  }

  get block52Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x655BA, type: "u16le", length: 2 });
  }

  set block52Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x655BA, type: "u16le", length: 2 }, value);
  }

  get block53Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x655BC, type: "u32le", length: 4 });
  }

  set block53Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x655BC, type: "u32le", length: 4 }, value);
  }

  get block53Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x655C0, type: "u16le", length: 2 });
  }

  set block53Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x655C0, type: "u16le", length: 2 }, value);
  }

  get block53Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x655C2, type: "u16le", length: 2 });
  }

  set block53Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x655C2, type: "u16le", length: 2 }, value);
  }

  get block54Length(): number {
    return this.#store.number({ space: this.#space, offset: 0x655C4, type: "u32le", length: 4 });
  }

  set block54Length(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x655C4, type: "u32le", length: 4 }, value);
  }

  get block54Id(): number {
    return this.#store.number({ space: this.#space, offset: 0x655C8, type: "u16le", length: 2 });
  }

  set block54Id(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x655C8, type: "u16le", length: 2 }, value);
  }

  get block54Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x655CA, type: "u16le", length: 2 });
  }

  set block54Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x655CA, type: "u16le", length: 2 }, value);
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
    return repeat(400, (i) => new MyItemItemsPocket(this.#store, { space: this.#space, offset: 0x0 + i * 4, type: "u32le", length: 4 }));
  }

  get keyItemsPocket(): readonly MyItemKeyItemsPocket[] {
    return repeat(96, (i) => new MyItemKeyItemsPocket(this.#store, { space: this.#space, offset: 0x640 + i * 4, type: "u32le", length: 4 }));
  }

  get tmsAndHmsPocket(): readonly MyItemTmsAndHmsPocket[] {
    return repeat(106, (i) => new MyItemTmsAndHmsPocket(this.#store, { space: this.#space, offset: 0x7C0 + i * 4, type: "u32le", length: 4 }));
  }

  get medicinePocket(): readonly MyItemMedicinePocket[] {
    return repeat(64, (i) => new MyItemMedicinePocket(this.#store, { space: this.#space, offset: 0x968 + i * 4, type: "u32le", length: 4 }));
  }

  get berriesPocket(): readonly MyItemBerriesPocket[] {
    return repeat(72, (i) => new MyItemBerriesPocket(this.#store, { space: this.#space, offset: 0xA68 + i * 4, type: "u32le", length: 4 }));
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
    return this.#store.number({ space: this.#space, offset: 0x9, type: "u8", length: 1 });
  }

  set resumeDay(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x9, type: "u8", length: 1 }, value);
  }

  get resumeHour(): number {
    return this.#store.number({ space: this.#space, offset: 0xB, type: "u8", length: 1 });
  }

  set resumeHour(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xB, type: "u8", length: 1 }, value);
  }

  get resumeMinute(): number {
    return this.#store.number({ space: this.#space, offset: 0xC, type: "u8", length: 1 });
  }

  set resumeMinute(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xC, type: "u8", length: 1 }, value);
  }

  get resumeSecond(): number {
    return this.#store.number({ space: this.#space, offset: 0xD, type: "u8", length: 1 });
  }

  set resumeSecond(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xD, type: "u8", length: 1 }, value);
  }

  get adventureStarted(): number {
    return this.#store.number({ space: this.#space, offset: 0x18, type: "u32le", length: 4 });
  }

  set adventureStarted(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x18, type: "u32le", length: 4 }, value);
  }

  get hallOfFameEntered(): number {
    return this.#store.number({ space: this.#space, offset: 0x20, type: "u32le", length: 4 });
  }

  set hallOfFameEntered(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x20, type: "u32le", length: 4 }, value);
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
    return this.#store.number({ space: this.#space, offset: 0x8, type: "u32le", length: 4 });
  }

  set money(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x8, type: "u32le", length: 4 }, value);
  }

  get badges(): MiscBadges {
    return new MiscBadges(this.#store, { space: this.#space, offset: 0xC, type: "u8", length: 1 });
  }

  get battlePoints(): number {
    return this.#store.number({ space: this.#space, offset: 0x3C, type: "u16le", length: 2 });
  }

  set battlePoints(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x3C, type: "u16le", length: 2 }, value);
  }

  get vivillonPattern(): number {
    return this.#store.number({ space: this.#space, offset: 0x50, type: "u8", length: 1 });
  }

  set vivillonPattern(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x50, type: "u8", length: 1 }, value);
  }
}

export class MiscBadges {
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
    return repeat(31, (i) => this.#store.text({ space: this.#space, offset: 0x0 + i * 34, type: "text-gen6", length: 34 }));
  }

  set boxNames(values: readonly (string)[]) {
    setEach(31, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0x0 + i * 34, type: "text-gen6", length: 34 }, value));
  }

  get boxWallpapers(): readonly (number)[] {
    return repeat(31, (i) => this.#store.number({ space: this.#space, offset: 0x41E + i * 1, type: "u8", length: 1 }));
  }

  set boxWallpapers(values: readonly (number)[]) {
    setEach(31, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x41E + i * 1, type: "u8", length: 1 }, value));
  }

  get boxFlags(): number {
    return this.#store.number({ space: this.#space, offset: 0x43D, type: "u8", length: 1 });
  }

  set boxFlags(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x43D, type: "u8", length: 1 }, value);
  }

  get boxesUnlocked(): number {
    return this.#store.number({ space: this.#space, offset: 0x43E, type: "u8", length: 1 });
  }

  set boxesUnlocked(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x43E, type: "u8", length: 1 }, value);
  }

  get currentBox(): number {
    return this.#store.number({ space: this.#space, offset: 0x43F, type: "u8", length: 1 });
  }

  set currentBox(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x43F, type: "u8", length: 1 }, value);
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

  get multiplayerSprite(): number {
    return this.#store.number({ space: this.#space, offset: 0x6, type: "u8", length: 1 });
  }

  set multiplayerSprite(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6, type: "u8", length: 1 }, value);
  }

  get multiplayerSpriteCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x7, type: "u8", length: 1 });
  }

  set multiplayerSpriteCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x7, type: "u8", length: 1 }, value);
  }

  get gameSyncId(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x8, type: "bytes", length: 8 });
  }

  set gameSyncId(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x8, type: "bytes", length: 8 }, value);
  }

  get region(): number {
    return this.#store.number({ space: this.#space, offset: 0x26, type: "u8", length: 1 });
  }

  set region(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x26, type: "u8", length: 1 }, value);
  }

  get country(): number {
    return this.#store.number({ space: this.#space, offset: 0x27, type: "u8", length: 1 });
  }

  set country(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x27, type: "u8", length: 1 }, value);
  }

  get latitude(): number {
    return this.#store.number({ space: this.#space, offset: 0x28, type: "i16le", length: 2 });
  }

  set latitude(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x28, type: "i16le", length: 2 }, value);
  }

  get longitude(): number {
    return this.#store.number({ space: this.#space, offset: 0x2A, type: "i16le", length: 2 });
  }

  set longitude(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2A, type: "i16le", length: 2 }, value);
  }

  get consoleRegion(): number {
    return this.#store.number({ space: this.#space, offset: 0x2C, type: "u8", length: 1 });
  }

  set consoleRegion(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2C, type: "u8", length: 1 }, value);
  }

  get language(): number {
    return this.#store.number({ space: this.#space, offset: 0x2D, type: "u8", length: 1 });
  }

  set language(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2D, type: "u8", length: 1 }, value);
  }

  get fashion(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x30, type: "bytes", length: 16 });
  }

  set fashion(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x30, type: "bytes", length: 16 }, value);
  }

  get trainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x48, type: "text-gen6", length: 26 });
  }

  set trainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x48, type: "text-gen6", length: 26 }, value);
  }

  get trainerNickname(): string {
    return this.#store.text({ space: this.#space, offset: 0x62, type: "text-gen6", length: 26 });
  }

  set trainerNickname(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x62, type: "text-gen6", length: 26 }, value);
  }

  get sayings(): readonly (string)[] {
    return repeat(5, (i) => this.#store.text({ space: this.#space, offset: 0x7C + i * 34, type: "text-gen6", length: 34 }));
  }

  set sayings(values: readonly (string)[]) {
    setEach(5, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0x7C + i * 34, type: "text-gen6", length: 34 }, value));
  }

  get eyeColor(): number {
    return this.#store.number({ space: this.#space, offset: 0x148, type: "i16le", length: 2 });
  }

  set eyeColor(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x148, type: "i16le", length: 2 }, value);
  }

  get megaEvolutionFlags(): MyStatusMegaEvolutionFlags {
    return new MyStatusMegaEvolutionFlags(this.#store, { space: this.#space, offset: 0x14A, type: "u8", length: 1 });
  }
}

export class MyStatusMegaEvolutionFlags {
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

  get megaRayquazaUnlocked(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set megaRayquazaUnlocked(value: number) {
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
    return repeat(376, (i) => this.#store.number({ space: this.#space, offset: 0x0 + i * 2, type: "u16le", length: 2 }));
  }

  set eventWork(values: readonly (number)[]) {
    setEach(376, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x0 + i * 2, type: "u16le", length: 2 }, value));
  }

  get eventFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x2F0, type: "flags", length: 416 });
  }

  set eventFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x2F0, type: "flags", length: 416 }, value);
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

  get pokedexOwnedFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x8, type: "flags", length: 96 });
  }

  set pokedexOwnedFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x8, type: "flags", length: 96 }, value);
  }

  get pokedexSeenFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x68, type: "flags", length: 96 });
  }

  set pokedexSeenFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x68, type: "flags", length: 96 }, value);
  }

  get pokedexSeenFemaleFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0xC8, type: "flags", length: 96 });
  }

  set pokedexSeenFemaleFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0xC8, type: "flags", length: 96 }, value);
  }

  get pokedexSeenShinyFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x128, type: "flags", length: 96 });
  }

  set pokedexSeenShinyFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x128, type: "flags", length: 96 }, value);
  }

  get pokedexSeenShinyFemaleFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x188, type: "flags", length: 96 });
  }

  set pokedexSeenShinyFemaleFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x188, type: "flags", length: 96 }, value);
  }

  get pokedexDisplayedFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x1E8, type: "flags", length: 96 });
  }

  set pokedexDisplayedFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x1E8, type: "flags", length: 96 }, value);
  }

  get pokedexDisplayedFemaleFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x248, type: "flags", length: 96 });
  }

  set pokedexDisplayedFemaleFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x248, type: "flags", length: 96 }, value);
  }

  get pokedexDisplayedShinyFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x2A8, type: "flags", length: 96 });
  }

  set pokedexDisplayedShinyFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x2A8, type: "flags", length: 96 }, value);
  }

  get pokedexDisplayedShinyFemaleFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x308, type: "flags", length: 96 });
  }

  set pokedexDisplayedShinyFemaleFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x308, type: "flags", length: 96 }, value);
  }

  get pokedexFormFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x368, type: "flags", length: 96 });
  }

  set pokedexFormFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x368, type: "flags", length: 96 }, value);
  }

  get pokedexLanguageFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x3C8, type: "flags", length: 640 });
  }

  set pokedexLanguageFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x3C8, type: "flags", length: 640 }, value);
  }

  get pokedexSpindaPid(): number {
    return this.#store.number({ space: this.#space, offset: 0x648, type: "u32le", length: 4 });
  }

  set pokedexSpindaPid(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x648, type: "u32le", length: 4 }, value);
  }

  get pokedexForeignFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x64C, type: "flags", length: 84 });
  }

  set pokedexForeignFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x64C, type: "flags", length: 84 }, value);
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

  get nationalPokedexMode(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set nationalPokedexMode(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }

  get initialSpecies(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 10 });
  }

  set initialSpecies(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 10 }, value);
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
    return this.#store.raw({ space: this.#space, offset: 0x0, type: "bytes", length: 215760 });
  }

  set boxPokemon(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x0, type: "bytes", length: 215760 }, value);
  }
}

export class Pk6Party {
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

  get originalTrainerId(): Pk6PartyOriginalTrainerId {
    return new Pk6PartyOriginalTrainerId(this.#store, { space: this.#space, offset: 0xC, type: "u32le", length: 4 });
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

  get abilityNumber(): number {
    return this.#store.number({ space: this.#space, offset: 0x15, type: "u8", length: 1 });
  }

  set abilityNumber(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x15, type: "u8", length: 1 }, value);
  }

  get trainingBagHits(): number {
    return this.#store.number({ space: this.#space, offset: 0x16, type: "u8", length: 1 });
  }

  set trainingBagHits(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x16, type: "u8", length: 1 }, value);
  }

  get trainingBag(): number {
    return this.#store.number({ space: this.#space, offset: 0x17, type: "u8", length: 1 });
  }

  set trainingBag(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x17, type: "u8", length: 1 }, value);
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

  get fatefulEncounterGenderAndForm(): Pk6PartyFatefulEncounterGenderAndForm {
    return new Pk6PartyFatefulEncounterGenderAndForm(this.#store, { space: this.#space, offset: 0x1D, type: "u8", length: 1 });
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

  get markings(): number {
    return this.#store.number({ space: this.#space, offset: 0x2A, type: "u8", length: 1 });
  }

  set markings(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2A, type: "u8", length: 1 }, value);
  }

  get pokerus(): Pk6PartyPokerus {
    return new Pk6PartyPokerus(this.#store, { space: this.#space, offset: 0x2B, type: "u8", length: 1 });
  }

  get superTrainingFlags(): number {
    return this.#store.number({ space: this.#space, offset: 0x2C, type: "u32le", length: 4 });
  }

  set superTrainingFlags(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2C, type: "u32le", length: 4 }, value);
  }

  get ribbons(): Pk6PartyRibbons {
    return new Pk6PartyRibbons(this.#store, { space: this.#space, offset: 0x30, type: "u32le", length: 4 });
  }

  get ribbons2(): Pk6PartyRibbons2 {
    return new Pk6PartyRibbons2(this.#store, { space: this.#space, offset: 0x34, type: "u16le", length: 2 });
  }

  get unused1(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x36, type: "bytes", length: 2 });
  }

  set unused1(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x36, type: "bytes", length: 2 }, value);
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
    return this.#store.text({ space: this.#space, offset: 0x40, type: "text-gen6", length: 26 });
  }

  set nickname(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x40, type: "text-gen6", length: 26 }, value);
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

  get secretSuperTraining(): Pk6PartySecretSuperTraining {
    return new Pk6PartySecretSuperTraining(this.#store, { space: this.#space, offset: 0x72, type: "u8", length: 1 });
  }

  get unused2(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x73, type: "bytes", length: 1 });
  }

  set unused2(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x73, type: "bytes", length: 1 }, value);
  }

  get ivsEggAndNicknamed(): Pk6PartyIvsEggAndNicknamed {
    return new Pk6PartyIvsEggAndNicknamed(this.#store, { space: this.#space, offset: 0x74, type: "u32le", length: 4 });
  }

  get handlingTrainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x78, type: "text-gen6", length: 26 });
  }

  set handlingTrainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x78, type: "text-gen6", length: 26 }, value);
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

  get geoLocations(): readonly Pk6PartyGeoLocations[] {
    return repeat(5, (i) => new Pk6PartyGeoLocations(this.#store, { space: this.#space, offset: 0x94 + i * 2, type: "u16le", length: 2 }));
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
    return this.#store.text({ space: this.#space, offset: 0xB0, type: "text-gen6", length: 26 });
  }

  set originalTrainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0xB0, type: "text-gen6", length: 26 }, value);
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

  get metLevelAndTrainerGender(): Pk6PartyMetLevelAndTrainerGender {
    return new Pk6PartyMetLevelAndTrainerGender(this.#store, { space: this.#space, offset: 0xDD, type: "u8", length: 1 });
  }

  get encounterType(): number {
    return this.#store.number({ space: this.#space, offset: 0xDE, type: "u8", length: 1 });
  }

  set encounterType(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xDE, type: "u8", length: 1 }, value);
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

  get formArgumentRemain(): number {
    return this.#store.number({ space: this.#space, offset: 0xED, type: "u8", length: 1 });
  }

  set formArgumentRemain(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xED, type: "u8", length: 1 }, value);
  }

  get formArgumentElapsed(): number {
    return this.#store.number({ space: this.#space, offset: 0xEE, type: "u8", length: 1 });
  }

  set formArgumentElapsed(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xEE, type: "u8", length: 1 }, value);
  }

  get trainingBagEffect(): number {
    return this.#store.number({ space: this.#space, offset: 0xEF, type: "u8", length: 1 });
  }

  set trainingBagEffect(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xEF, type: "u8", length: 1 }, value);
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

export class Pk6PartyOriginalTrainerId {
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

export class Pk6PartyFatefulEncounterGenderAndForm {
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

export class Pk6PartyPokerus {
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

export class Pk6PartyRibbons {
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

export class Pk6PartyRibbons2 {
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
}

export class Pk6PartySecretSuperTraining {
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

export class Pk6PartyIvsEggAndNicknamed {
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

export class Pk6PartyGeoLocations {
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

export class Pk6PartyMetLevelAndTrainerGender {
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

export class Pk6 {
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

  get originalTrainerId(): Pk6OriginalTrainerId {
    return new Pk6OriginalTrainerId(this.#store, { space: this.#space, offset: 0xC, type: "u32le", length: 4 });
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

  get abilityNumber(): number {
    return this.#store.number({ space: this.#space, offset: 0x15, type: "u8", length: 1 });
  }

  set abilityNumber(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x15, type: "u8", length: 1 }, value);
  }

  get trainingBagHits(): number {
    return this.#store.number({ space: this.#space, offset: 0x16, type: "u8", length: 1 });
  }

  set trainingBagHits(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x16, type: "u8", length: 1 }, value);
  }

  get trainingBag(): number {
    return this.#store.number({ space: this.#space, offset: 0x17, type: "u8", length: 1 });
  }

  set trainingBag(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x17, type: "u8", length: 1 }, value);
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

  get fatefulEncounterGenderAndForm(): Pk6FatefulEncounterGenderAndForm {
    return new Pk6FatefulEncounterGenderAndForm(this.#store, { space: this.#space, offset: 0x1D, type: "u8", length: 1 });
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

  get markings(): number {
    return this.#store.number({ space: this.#space, offset: 0x2A, type: "u8", length: 1 });
  }

  set markings(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2A, type: "u8", length: 1 }, value);
  }

  get pokerus(): Pk6Pokerus {
    return new Pk6Pokerus(this.#store, { space: this.#space, offset: 0x2B, type: "u8", length: 1 });
  }

  get superTrainingFlags(): number {
    return this.#store.number({ space: this.#space, offset: 0x2C, type: "u32le", length: 4 });
  }

  set superTrainingFlags(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2C, type: "u32le", length: 4 }, value);
  }

  get ribbons(): Pk6Ribbons {
    return new Pk6Ribbons(this.#store, { space: this.#space, offset: 0x30, type: "u32le", length: 4 });
  }

  get ribbons2(): Pk6Ribbons2 {
    return new Pk6Ribbons2(this.#store, { space: this.#space, offset: 0x34, type: "u16le", length: 2 });
  }

  get unused1(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x36, type: "bytes", length: 2 });
  }

  set unused1(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x36, type: "bytes", length: 2 }, value);
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
    return this.#store.text({ space: this.#space, offset: 0x40, type: "text-gen6", length: 26 });
  }

  set nickname(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x40, type: "text-gen6", length: 26 }, value);
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

  get secretSuperTraining(): Pk6SecretSuperTraining {
    return new Pk6SecretSuperTraining(this.#store, { space: this.#space, offset: 0x72, type: "u8", length: 1 });
  }

  get unused2(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x73, type: "bytes", length: 1 });
  }

  set unused2(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x73, type: "bytes", length: 1 }, value);
  }

  get ivsEggAndNicknamed(): Pk6IvsEggAndNicknamed {
    return new Pk6IvsEggAndNicknamed(this.#store, { space: this.#space, offset: 0x74, type: "u32le", length: 4 });
  }

  get handlingTrainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x78, type: "text-gen6", length: 26 });
  }

  set handlingTrainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x78, type: "text-gen6", length: 26 }, value);
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

  get geoLocations(): readonly Pk6GeoLocations[] {
    return repeat(5, (i) => new Pk6GeoLocations(this.#store, { space: this.#space, offset: 0x94 + i * 2, type: "u16le", length: 2 }));
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
    return this.#store.text({ space: this.#space, offset: 0xB0, type: "text-gen6", length: 26 });
  }

  set originalTrainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0xB0, type: "text-gen6", length: 26 }, value);
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

  get metLevelAndTrainerGender(): Pk6MetLevelAndTrainerGender {
    return new Pk6MetLevelAndTrainerGender(this.#store, { space: this.#space, offset: 0xDD, type: "u8", length: 1 });
  }

  get encounterType(): number {
    return this.#store.number({ space: this.#space, offset: 0xDE, type: "u8", length: 1 });
  }

  set encounterType(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xDE, type: "u8", length: 1 }, value);
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

export class Pk6OriginalTrainerId {
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

export class Pk6FatefulEncounterGenderAndForm {
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

export class Pk6Pokerus {
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

export class Pk6Ribbons {
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

export class Pk6Ribbons2 {
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
}

export class Pk6SecretSuperTraining {
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

export class Pk6IvsEggAndNicknamed {
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

export class Pk6GeoLocations {
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

export class Pk6MetLevelAndTrainerGender {
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
  ["save", SaveSpace],
  ["my-item", MyItem],
  ["game-time", GameTime],
  ["play-time", PlayTimeSpace],
  ["misc", Misc],
  ["box-layout", BoxLayout],
  ["my-status", MyStatus],
  ["poke-party", PokeParty],
  ["event-work", EventWork],
  ["zukan", Zukan],
  ["boxes", Boxes],
  ["party:{1..6}", Pk6Party],
  ["box:{1..31}:{1..30}", Pk6],
];

export const read = (file: Uint8Array) => new Save(file);
