// Generated from known/gs-1.0.json by tools/parser/generate.ts. Run npm run parsers after changing either.
import { counted, expand, repeat, setEach, spaceView, Store, type At, type ContainerDef, type Counted, type Read, type SpaceDef } from "../tools/parser/runtime.ts";

export const target = {"schema":"1.0","format":"gs","version":"1.0"};

const container: ContainerDef[] = [{"transform":"gen2-backup","args":{"copies":[{"from":"0x2009","to":"0x15C7","length":"0x0226"},{"from":"0x222F","to":"0x3D69","length":"0x01AA"},{"from":"0x23D9","to":"0x0C6B","length":"0x047D"},{"from":"0x2856","to":"0x7E39","length":"0x0034"},{"from":"0x288A","to":"0x10E8","length":"0x04DF"}]}}];

const spaces: SpaceDef[] = [
  {"name":"sram","length":32768,"checksums":[{"step":"gen2-checksum","start":8201,"end":11625,"at":11625},{"step":"gen2-checksum","start":8201,"end":11625,"at":32365}]},
  {"name":"box:{1..14}","length":1102,"transform":"gen2-box-banks","args":{"banks":["0x4000","0x6000"],"boxes":14,"length":"0x44E","stride":"0x450","current":"0x2D6C","selected":"0x2724"},"source":{"regions":[{"space":"sram","start":0,"end":32768}],"offset":0,"length":32768}},
  {"name":"party:{1..6}","length":73,"transform":"gen1-list","args":{"capacity":6,"stored":48,"party":48,"names":11},"source":{"regions":[{"space":"sram","start":0,"end":32768}],"offset":10378,"length":428}},
  {"name":"box:{1..14}:{1..20}","length":73,"transform":"gen1-list","args":{"capacity":20,"stored":32,"party":48,"names":11},"source":{"regions":[{"space":"box:1","start":0,"end":1102},{"space":"box:2","start":0,"end":1102},{"space":"box:3","start":0,"end":1102},{"space":"box:4","start":0,"end":1102},{"space":"box:5","start":0,"end":1102},{"space":"box:6","start":0,"end":1102},{"space":"box:7","start":0,"end":1102},{"space":"box:8","start":0,"end":1102},{"space":"box:9","start":0,"end":1102},{"space":"box:10","start":0,"end":1102},{"space":"box:11","start":0,"end":1102},{"space":"box:12","start":0,"end":1102},{"space":"box:13","start":0,"end":1102},{"space":"box:14","start":0,"end":1102}],"offset":0,"length":15428}},
];

export type Spaces =
  { "sram": Sram } &
  { [Name in `box:${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14}`]: BoxSpace } &
  { [Name in `party:${1 | 2 | 3 | 4 | 5 | 6}`]: Pk2 } &
  { [Name in `box:${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14}:${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20}`]: Pk2Boxed };

export type SpaceName = keyof Spaces;

export class Trainer {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get name(): string {
    return this.#store.text({ space: "sram", offset: 0x200B, type: "text-gen2-intl", length: 11 });
  }

  set name(value: string) {
    this.#store.setText({ space: "sram", offset: 0x200B, type: "text-gen2-intl", length: 11 }, value);
  }

  get tid(): number {
    return this.#store.number({ space: "sram", offset: 0x2009, type: "u16be", length: 2 });
  }

  set tid(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x2009, type: "u16be", length: 2 }, value);
  }

  get money(): number {
    return this.#store.number({ space: "sram", offset: 0x23DB, type: "u24be", length: 3 });
  }

  set money(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x23DB, type: "u24be", length: 3 }, value);
  }

  get rivalName(): string {
    return this.#store.text({ space: "sram", offset: 0x2021, type: "text-gen2-intl", length: 11 });
  }

  set rivalName(value: string) {
    this.#store.setText({ space: "sram", offset: 0x2021, type: "text-gen2-intl", length: 11 }, value);
  }

  get coins(): number {
    return this.#store.number({ space: "sram", offset: 0x23E2, type: "u16be", length: 2 });
  }

  set coins(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x23E2, type: "u16be", length: 2 }, value);
  }
}

export class PlayTime {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get hours(): number {
    return this.#store.number({ space: "sram", offset: 0x2053, type: "u16be", length: 2 });
  }

  set hours(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x2053, type: "u16be", length: 2 }, value);
  }

  get minutes(): number {
    return this.#store.number({ space: "sram", offset: 0x2055, type: "u8", length: 1 });
  }

  set minutes(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x2055, type: "u8", length: 1 }, value);
  }

  get seconds(): number {
    return this.#store.number({ space: "sram", offset: 0x2056, type: "u8", length: 1 });
  }

  set seconds(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x2056, type: "u8", length: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0xE, type: "u16be", length: 2 });
  }

  set health(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xE, type: "u16be", length: 2 }, value);
  }

  get attack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x10, type: "u16be", length: 2 });
  }

  set attack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x10, type: "u16be", length: 2 }, value);
  }

  get defense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x12, type: "u16be", length: 2 });
  }

  set defense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x12, type: "u16be", length: 2 }, value);
  }

  get speed(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x14, type: "u16be", length: 2 });
  }

  set speed(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x14, type: "u16be", length: 2 }, value);
  }

  get specialAttack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x16, type: "u16be", length: 2 });
  }

  set specialAttack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x16, type: "u16be", length: 2 }, value);
  }

  get specialDefense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x16, type: "u16be", length: 2 });
  }

  set specialDefense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x16, type: "u16be", length: 2 }, value);
  }
}

export class PokemonIvs {
  readonly #store: Store;
  readonly #at: At;

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
  }

  get attack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x18, type: "u16be", length: 2, bit: 12, width: 4 });
  }

  set attack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x18, type: "u16be", length: 2, bit: 12, width: 4 }, value);
  }

  get defense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x18, type: "u16be", length: 2, bit: 8, width: 4 });
  }

  set defense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x18, type: "u16be", length: 2, bit: 8, width: 4 }, value);
  }

  get speed(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x18, type: "u16be", length: 2, bit: 4, width: 4 });
  }

  set speed(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x18, type: "u16be", length: 2, bit: 4, width: 4 }, value);
  }

  get specialAttack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x18, type: "u16be", length: 2, bit: 0, width: 4 });
  }

  set specialAttack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x18, type: "u16be", length: 2, bit: 0, width: 4 }, value);
  }

  get specialDefense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x18, type: "u16be", length: 2, bit: 0, width: 4 });
  }

  set specialDefense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x18, type: "u16be", length: 2, bit: 0, width: 4 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x5 + this.#at.index * 1, type: "u8", length: 1 });
  }

  set move(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x5 + this.#at.index * 1, type: "u8", length: 1 }, value);
  }

  get pp(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x1A + this.#at.index * 1, type: "u8", length: 1, bit: 0, width: 6 });
  }

  set pp(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x1A + this.#at.index * 1, type: "u8", length: 1, bit: 0, width: 6 }, value);
  }

  get ppUps(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x1A + this.#at.index * 1, type: "u8", length: 1, bit: 6, width: 2 });
  }

  set ppUps(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x1A + this.#at.index * 1, type: "u8", length: 1, bit: 6, width: 2 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x9, type: "u16be", length: 2 });
  }

  set tid(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x9, type: "u16be", length: 2 }, value);
  }

  get name(): string {
    return this.#store.text({ space: this.#at.space, offset: 0x33, type: "text-gen2-intl", length: 11 });
  }

  set name(value: string) {
    this.#store.setText({ space: this.#at.space, offset: 0x33, type: "text-gen2-intl", length: 11 }, value);
  }

  get gender(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x20, type: "u16be", length: 2, bit: 7, width: 1 });
  }

  set gender(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x20, type: "u16be", length: 2, bit: 7, width: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x20, type: "u16be", length: 2, bit: 0, width: 7 });
  }

  set location(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x20, type: "u16be", length: 2, bit: 0, width: 7 }, value);
  }

  get level(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x20, type: "u16be", length: 2, bit: 8, width: 6 });
  }

  set level(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x20, type: "u16be", length: 2, bit: 8, width: 6 }, value);
  }

  get timeOfDay(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x20, type: "u16be", length: 2, bit: 14, width: 2 });
  }

  set timeOfDay(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x20, type: "u16be", length: 2, bit: 14, width: 2 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x1F, type: "u8", length: 1, bit: 4, width: 4 });
  }

  set strain(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x1F, type: "u8", length: 1, bit: 4, width: 4 }, value);
  }

  get days(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x1F, type: "u8", length: 1, bit: 0, width: 4 });
  }

  set days(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x1F, type: "u8", length: 1, bit: 0, width: 4 }, value);
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
  readonly pokerus: PokemonPokerus;

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
    this.evs = new PokemonEvs(store, this.#at);
    this.ivs = new PokemonIvs(store, this.#at);
    this.moves = repeat(4, (index) => new PokemonMove(store, { space: this.#at.space, index, offset: 0x5 + index * 1 }));
    this.owner = new PokemonOwner(store, this.#at);
    this.metConditions = new PokemonMetConditions(store, this.#at);
    this.pokerus = new PokemonPokerus(store, this.#at);
  }

  get species(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x3, type: "u8", length: 1 });
  }

  set species(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x3, type: "u8", length: 1 }, value);
  }

  get nickname(): string {
    return this.#store.text({ space: this.#at.space, offset: 0x3E, type: "text-gen2-intl", length: 11 });
  }

  set nickname(value: string) {
    this.#store.setText({ space: this.#at.space, offset: 0x3E, type: "text-gen2-intl", length: 11 }, value);
  }

  get level(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x22, type: "u8", length: 1 });
  }

  set level(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x22, type: "u8", length: 1 }, value);
  }

  get experience(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xB, type: "u24be", length: 3 });
  }

  set experience(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xB, type: "u24be", length: 3 }, value);
  }

  get heldItem(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x4, type: "u8", length: 1 });
  }

  set heldItem(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x4, type: "u8", length: 1 }, value);
  }

  get friendship(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x1E, type: "u8", length: 1 });
  }

  set friendship(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x1E, type: "u8", length: 1 }, value);
  }

  get listSpecies(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x1, type: "u8", length: 1 });
  }

  set listSpecies(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x1, type: "u8", length: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x27, type: "u16be", length: 2 });
  }

  set health(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x27, type: "u16be", length: 2 }, value);
  }

  get attack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x29, type: "u16be", length: 2 });
  }

  set attack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x29, type: "u16be", length: 2 }, value);
  }

  get defense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x2B, type: "u16be", length: 2 });
  }

  set defense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x2B, type: "u16be", length: 2 }, value);
  }

  get speed(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x2D, type: "u16be", length: 2 });
  }

  set speed(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x2D, type: "u16be", length: 2 }, value);
  }

  get specialAttack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x2F, type: "u16be", length: 2 });
  }

  set specialAttack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x2F, type: "u16be", length: 2 }, value);
  }

  get specialDefense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x31, type: "u16be", length: 2 });
  }

  set specialDefense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x31, type: "u16be", length: 2 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x25, type: "u16be", length: 2 });
  }

  set currentHp(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x25, type: "u16be", length: 2 }, value);
  }

  get statusCondition(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x23, type: "u8", length: 1 });
  }

  set statusCondition(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x23, type: "u8", length: 1 }, value);
  }
}

export class Box {
  readonly #store: Store;
  readonly #at: At;
  readonly slots: Counted<Pokemon>;

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
    this.slots = counted(expand(`${this.#at.space}:{1..20}`).map((space, index) => new Pokemon(store, { space, index, offset: 0 })), store, { space: this.#at.space, offset: 0x0, type: "u8", length: 1 });
  }

  get name(): string {
    return this.#store.text({ space: "sram", offset: 0x2727 + this.#at.index * 9, type: "text-gen2-intl", length: 9 });
  }

  set name(value: string) {
    this.#store.setText({ space: "sram", offset: 0x2727 + this.#at.index * 9, type: "text-gen2-intl", length: 9 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: this.#at.offset, type: "u16le", length: 2, bit: 0, width: 8 });
  }

  set item(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: this.#at.offset, type: "u16le", length: 2, bit: 0, width: 8 }, value);
  }

  get count(): number {
    return this.#store.number({ space: this.#at.space, offset: this.#at.offset, type: "u16le", length: 2, bit: 8, width: 8 });
  }

  set count(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: this.#at.offset, type: "u16le", length: 2, bit: 8, width: 8 }, value);
  }
}

export class KeyItem {
  readonly #store: Store;
  readonly #at: At;

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
  }

  get item(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x244A + this.#at.index * 1, type: "u8", length: 1 });
  }

  set item(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x244A + this.#at.index * 1, type: "u8", length: 1 }, value);
  }
}

export class Machine {
  readonly #store: Store;
  readonly #at: At;

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
  }

  get count(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x23E6 + this.#at.index * 1, type: "u8", length: 1 });
  }

  set count(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x23E6 + this.#at.index * 1, type: "u8", length: 1 }, value);
  }
}

export class Bag {
  readonly items: Counted<Item>;
  readonly keyItems: Counted<KeyItem>;
  readonly tmsHms: readonly Machine[];
  readonly balls: Counted<Item>;
  readonly pcItems: Counted<Item>;

  constructor(store: Store, _at: At) {
    this.items = counted(repeat(20, (index) => new Item(store, { space: "sram", index, offset: 0x2420 + index * 2 })), store, { space: "sram", offset: 0x241F, type: "u8", length: 1 });
    this.keyItems = counted(repeat(25, (index) => new KeyItem(store, { space: "sram", index, offset: 0x244A + index * 1 })), store, { space: "sram", offset: 0x2449, type: "u8", length: 1 });
    this.tmsHms = repeat(57, (index) => new Machine(store, { space: "sram", index, offset: 0x23E6 + index * 1 }));
    this.balls = counted(repeat(12, (index) => new Item(store, { space: "sram", index, offset: 0x2465 + index * 2 })), store, { space: "sram", offset: 0x2464, type: "u8", length: 1 });
    this.pcItems = counted(repeat(50, (index) => new Item(store, { space: "sram", index, offset: 0x247F + index * 2 })), store, { space: "sram", offset: 0x247E, type: "u8", length: 1 });
  }
}

export class Badges {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get badge1(): number {
    return this.#store.number({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 0, width: 1 });
  }

  set badge1(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 0, width: 1 }, value);
  }

  get badge2(): number {
    return this.#store.number({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 1, width: 1 });
  }

  set badge2(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 1, width: 1 }, value);
  }

  get badge3(): number {
    return this.#store.number({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 2, width: 1 });
  }

  set badge3(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 2, width: 1 }, value);
  }

  get badge4(): number {
    return this.#store.number({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 3, width: 1 });
  }

  set badge4(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 3, width: 1 }, value);
  }

  get badge5(): number {
    return this.#store.number({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 4, width: 1 });
  }

  set badge5(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 4, width: 1 }, value);
  }

  get badge6(): number {
    return this.#store.number({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 5, width: 1 });
  }

  set badge6(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 5, width: 1 }, value);
  }

  get badge7(): number {
    return this.#store.number({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 6, width: 1 });
  }

  set badge7(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 6, width: 1 }, value);
  }

  get badge8(): number {
    return this.#store.number({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 7, width: 1 });
  }

  set badge8(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 7, width: 1 }, value);
  }

  get badge9(): number {
    return this.#store.number({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 8, width: 1 });
  }

  set badge9(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 8, width: 1 }, value);
  }

  get badge10(): number {
    return this.#store.number({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 9, width: 1 });
  }

  set badge10(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 9, width: 1 }, value);
  }

  get badge11(): number {
    return this.#store.number({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 10, width: 1 });
  }

  set badge11(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 10, width: 1 }, value);
  }

  get badge12(): number {
    return this.#store.number({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 11, width: 1 });
  }

  set badge12(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 11, width: 1 }, value);
  }

  get badge13(): number {
    return this.#store.number({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 12, width: 1 });
  }

  set badge13(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 12, width: 1 }, value);
  }

  get badge14(): number {
    return this.#store.number({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 13, width: 1 });
  }

  set badge14(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 13, width: 1 }, value);
  }

  get badge15(): number {
    return this.#store.number({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 14, width: 1 });
  }

  set badge15(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 14, width: 1 }, value);
  }

  get badge16(): number {
    return this.#store.number({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 15, width: 1 });
  }

  set badge16(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x23E4, type: "u16le", length: 2, bit: 15, width: 1 }, value);
  }
}

export class Pokedex {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get owned(): readonly boolean[] {
    return this.#store.flags({ space: "sram", offset: 0x2A4C, type: "flags", length: 32 });
  }

  set owned(value: readonly boolean[]) {
    this.#store.setFlags({ space: "sram", offset: 0x2A4C, type: "flags", length: 32 }, value);
  }

  get seen(): readonly boolean[] {
    return this.#store.flags({ space: "sram", offset: 0x2A6C, type: "flags", length: 32 });
  }

  set seen(value: readonly boolean[]) {
    this.#store.setFlags({ space: "sram", offset: 0x2A6C, type: "flags", length: 32 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x251F + this.#at.index * 1, type: "u8", length: 1 });
  }

  set value(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x251F + this.#at.index * 1, type: "u8", length: 1 }, value);
  }
}

export class Events {
  readonly #store: Store;
  readonly work: readonly EventsEventWork[];

  constructor(store: Store, _at: At) {
    this.#store = store;
    this.work = repeat(256, (index) => new EventsEventWork(store, { space: "sram", index, offset: 0x251F + index * 1 }));
  }

  get flags(): readonly boolean[] {
    return this.#store.flags({ space: "sram", offset: 0x261F, type: "flags", length: 250 });
  }

  set flags(value: readonly boolean[]) {
    this.#store.setFlags({ space: "sram", offset: 0x261F, type: "flags", length: 250 }, value);
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
    const store = new Store(file, spaces, container);
    this.#store = store;
    this.#at = { space: "", index: 0, offset: 0 };
    this.trainer = new Trainer(store, this.#at);
    this.playTime = new PlayTime(store, this.#at);
    this.party = counted(expand("party:{1..6}").map((space, index) => new PartyPokemon(store, { space, index, offset: 0 })), store, { space: "sram", offset: 0x288A, type: "u8", length: 1 });
    this.boxes = expand("box:{1..14}").map((space, index) => new Box(store, { space, index, offset: 0 }));
    this.bag = new Bag(store, this.#at);
    this.badges = new Badges(store, this.#at);
    this.pokedex = new Pokedex(store, this.#at);
    this.events = new Events(store, this.#at);
  }

  get currentBox(): number {
    return this.#store.number({ space: "sram", offset: 0x2724, type: "u8", length: 1 });
  }

  set currentBox(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x2724, type: "u8", length: 1 }, value);
  }

  space<Name extends SpaceName>(name: Name): Spaces[Name] {
    return spaceView(this.#store, name, views) as Spaces[Name];
  }

  write(): Uint8Array {
    return this.#store.write();
  }
}

export class Sram {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get mysteryGiftUnlocked(): number {
    return this.#store.number({ space: this.#space, offset: 0xBE3, type: "u8", length: 1 });
  }

  set mysteryGiftUnlocked(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xBE3, type: "u8", length: 1 }, value);
  }

  get mysteryGiftUnlockedCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0xBE5, type: "u8", length: 1 });
  }

  set mysteryGiftUnlockedCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xBE5, type: "u8", length: 1 }, value);
  }

  get rtcFlags(): SramRtcFlags {
    return new SramRtcFlags(this.#store, { space: this.#space, offset: 0xC60, type: "u8", length: 1 });
  }

  get backup3(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0xC6B, type: "bytes", length: 1149 });
  }

  set backup3(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0xC6B, type: "bytes", length: 1149 }, value);
  }

  get backup5(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x10E8, type: "bytes", length: 1247 });
  }

  set backup5(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x10E8, type: "bytes", length: 1247 }, value);
  }

  get backup1(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x15C7, type: "bytes", length: 550 });
  }

  set backup1(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x15C7, type: "bytes", length: 550 }, value);
  }

  get options(): SramOptions {
    return new SramOptions(this.#store, { space: this.#space, offset: 0x2000, type: "u8", length: 1 });
  }

  get saveFileExists(): number {
    return this.#store.number({ space: this.#space, offset: 0x2001, type: "u8", length: 1 });
  }

  set saveFileExists(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2001, type: "u8", length: 1 }, value);
  }

  get textBoxFrame(): SramTextBoxFrame {
    return new SramTextBoxFrame(this.#store, { space: this.#space, offset: 0x2002, type: "u8", length: 1 });
  }

  get textBoxFlags(): SramTextBoxFlags {
    return new SramTextBoxFlags(this.#store, { space: this.#space, offset: 0x2003, type: "u8", length: 1 });
  }

  get printerBrightness(): number {
    return this.#store.number({ space: this.#space, offset: 0x2004, type: "u8", length: 1 });
  }

  set printerBrightness(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2004, type: "u8", length: 1 }, value);
  }

  get menuAccount(): number {
    return this.#store.number({ space: this.#space, offset: 0x2005, type: "u8", length: 1 });
  }

  set menuAccount(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2005, type: "u8", length: 1 }, value);
  }

  get trainerId(): number {
    return this.#store.number({ space: this.#space, offset: 0x2009, type: "u16be", length: 2 });
  }

  set trainerId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2009, type: "u16be", length: 2 }, value);
  }

  get trainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x200B, type: "text-gen2-intl", length: 11 });
  }

  set trainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x200B, type: "text-gen2-intl", length: 11 }, value);
  }

  get rivalName(): string {
    return this.#store.text({ space: this.#space, offset: 0x2021, type: "text-gen2-intl", length: 11 });
  }

  set rivalName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x2021, type: "text-gen2-intl", length: 11 }, value);
  }

  get playTimeHours(): number {
    return this.#store.number({ space: this.#space, offset: 0x2053, type: "u16be", length: 2 });
  }

  set playTimeHours(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2053, type: "u16be", length: 2 }, value);
  }

  get playTimeMinutes(): number {
    return this.#store.number({ space: this.#space, offset: 0x2055, type: "u8", length: 1 });
  }

  set playTimeMinutes(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2055, type: "u8", length: 1 }, value);
  }

  get playTimeSeconds(): number {
    return this.#store.number({ space: this.#space, offset: 0x2056, type: "u8", length: 1 });
  }

  set playTimeSeconds(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2056, type: "u8", length: 1 }, value);
  }

  get palette(): number {
    return this.#store.number({ space: this.#space, offset: 0x206B, type: "u8", length: 1 });
  }

  set palette(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x206B, type: "u8", length: 1 }, value);
  }

  get money(): number {
    return this.#store.number({ space: this.#space, offset: 0x23DB, type: "u24be", length: 3 });
  }

  set money(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23DB, type: "u24be", length: 3 }, value);
  }

  get coins(): number {
    return this.#store.number({ space: this.#space, offset: 0x23E2, type: "u16be", length: 2 });
  }

  set coins(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23E2, type: "u16be", length: 2 }, value);
  }

  get badges(): SramBadges {
    return new SramBadges(this.#store, { space: this.#space, offset: 0x23E4, type: "u16le", length: 2 });
  }

  get tmsAndHmsPocket(): readonly (number)[] {
    return repeat(57, (i) => this.#store.number({ space: this.#space, offset: 0x23E6 + i * 1, type: "u8", length: 1 }));
  }

  set tmsAndHmsPocket(values: readonly (number)[]) {
    setEach(57, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x23E6 + i * 1, type: "u8", length: 1 }, value));
  }

  get itemsCount(): number {
    return this.#store.number({ space: this.#space, offset: 0x241F, type: "u8", length: 1 });
  }

  set itemsCount(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x241F, type: "u8", length: 1 }, value);
  }

  get itemsPocket(): readonly SramItemsPocket[] {
    return repeat(20, (i) => new SramItemsPocket(this.#store, { space: this.#space, offset: 0x2420 + i * 2, type: "u16le", length: 2 }));
  }

  get itemsEnd(): number {
    return this.#store.number({ space: this.#space, offset: 0x2448, type: "u8", length: 1 });
  }

  set itemsEnd(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2448, type: "u8", length: 1 }, value);
  }

  get keyItemsCount(): number {
    return this.#store.number({ space: this.#space, offset: 0x2449, type: "u8", length: 1 });
  }

  set keyItemsCount(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2449, type: "u8", length: 1 }, value);
  }

  get keyItemsPocket(): readonly (number)[] {
    return repeat(25, (i) => this.#store.number({ space: this.#space, offset: 0x244A + i * 1, type: "u8", length: 1 }));
  }

  set keyItemsPocket(values: readonly (number)[]) {
    setEach(25, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x244A + i * 1, type: "u8", length: 1 }, value));
  }

  get keyItemsEnd(): number {
    return this.#store.number({ space: this.#space, offset: 0x2463, type: "u8", length: 1 });
  }

  set keyItemsEnd(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2463, type: "u8", length: 1 }, value);
  }

  get pokeBallsCount(): number {
    return this.#store.number({ space: this.#space, offset: 0x2464, type: "u8", length: 1 });
  }

  set pokeBallsCount(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2464, type: "u8", length: 1 }, value);
  }

  get pokeBallsPocket(): readonly SramPokeBallsPocket[] {
    return repeat(12, (i) => new SramPokeBallsPocket(this.#store, { space: this.#space, offset: 0x2465 + i * 2, type: "u16le", length: 2 }));
  }

  get pokeBallsEnd(): number {
    return this.#store.number({ space: this.#space, offset: 0x247D, type: "u8", length: 1 });
  }

  set pokeBallsEnd(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x247D, type: "u8", length: 1 }, value);
  }

  get pcItemsCount(): number {
    return this.#store.number({ space: this.#space, offset: 0x247E, type: "u8", length: 1 });
  }

  set pcItemsCount(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x247E, type: "u8", length: 1 }, value);
  }

  get pcItems(): readonly SramPcItems[] {
    return repeat(50, (i) => new SramPcItems(this.#store, { space: this.#space, offset: 0x247F + i * 2, type: "u16le", length: 2 }));
  }

  get pcItemsEnd(): number {
    return this.#store.number({ space: this.#space, offset: 0x24E3, type: "u8", length: 1 });
  }

  set pcItemsEnd(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x24E3, type: "u8", length: 1 }, value);
  }

  get eventWork(): readonly (number)[] {
    return repeat(256, (i) => this.#store.number({ space: this.#space, offset: 0x251F + i * 1, type: "u8", length: 1 }));
  }

  set eventWork(values: readonly (number)[]) {
    setEach(256, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x251F + i * 1, type: "u8", length: 1 }, value));
  }

  get eventFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x261F, type: "flags", length: 250 });
  }

  set eventFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x261F, type: "flags", length: 250 }, value);
  }

  get currentBox(): number {
    return this.#store.number({ space: this.#space, offset: 0x2724, type: "u8", length: 1 });
  }

  set currentBox(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2724, type: "u8", length: 1 }, value);
  }

  get boxNames(): readonly (string)[] {
    return repeat(14, (i) => this.#store.text({ space: this.#space, offset: 0x2727 + i * 9, type: "text-gen2-intl", length: 9 }));
  }

  set boxNames(values: readonly (string)[]) {
    setEach(14, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0x2727 + i * 9, type: "text-gen2-intl", length: 9 }, value));
  }

  get partyCount(): number {
    return this.#store.number({ space: this.#space, offset: 0x288A, type: "u8", length: 1 });
  }

  set partyCount(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x288A, type: "u8", length: 1 }, value);
  }

  get partySpecies(): readonly (number)[] {
    return repeat(7, (i) => this.#store.number({ space: this.#space, offset: 0x288B + i * 1, type: "u8", length: 1 }));
  }

  set partySpecies(values: readonly (number)[]) {
    setEach(7, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x288B + i * 1, type: "u8", length: 1 }, value));
  }

  get partyPokemon(): readonly (Uint8Array)[] {
    return repeat(6, (i) => this.#store.raw({ space: this.#space, offset: 0x2892 + i * 48, type: "bytes", length: 48 }));
  }

  set partyPokemon(values: readonly (Uint8Array)[]) {
    setEach(6, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0x2892 + i * 48, type: "bytes", length: 48 }, value));
  }

  get partyOriginalTrainerNames(): readonly (string)[] {
    return repeat(6, (i) => this.#store.text({ space: this.#space, offset: 0x29B2 + i * 11, type: "text-gen2-intl", length: 11 }));
  }

  set partyOriginalTrainerNames(values: readonly (string)[]) {
    setEach(6, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0x29B2 + i * 11, type: "text-gen2-intl", length: 11 }, value));
  }

  get partyNicknames(): readonly (string)[] {
    return repeat(6, (i) => this.#store.text({ space: this.#space, offset: 0x29F4 + i * 11, type: "text-gen2-intl", length: 11 }));
  }

  set partyNicknames(values: readonly (string)[]) {
    setEach(6, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0x29F4 + i * 11, type: "text-gen2-intl", length: 11 }, value));
  }

  get pokedexOwnedFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x2A4C, type: "flags", length: 32 });
  }

  set pokedexOwnedFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x2A4C, type: "flags", length: 32 }, value);
  }

  get pokedexSeenFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x2A6C, type: "flags", length: 32 });
  }

  set pokedexSeenFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x2A6C, type: "flags", length: 32 }, value);
  }

  get unownCaught(): readonly (number)[] {
    return repeat(26, (i) => this.#store.number({ space: this.#space, offset: 0x2A8C + i * 1, type: "u8", length: 1 }));
  }

  set unownCaught(values: readonly (number)[]) {
    setEach(26, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x2A8C + i * 1, type: "u8", length: 1 }, value));
  }

  get unownUnlocked(): SramUnownUnlocked {
    return new SramUnownUnlocked(this.#store, { space: this.#space, offset: 0x2AA6, type: "u8", length: 1 });
  }

  get unownFirstSeen(): number {
    return this.#store.number({ space: this.#space, offset: 0x2AA7, type: "u8", length: 1 });
  }

  set unownFirstSeen(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2AA7, type: "u8", length: 1 }, value);
  }

  get daycareMan(): SramDaycareMan {
    return new SramDaycareMan(this.#store, { space: this.#space, offset: 0x2AA8, type: "u8", length: 1 });
  }

  get daycare1Nickname(): string {
    return this.#store.text({ space: this.#space, offset: 0x2AA9, type: "text-gen2-intl", length: 11 });
  }

  set daycare1Nickname(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x2AA9, type: "text-gen2-intl", length: 11 }, value);
  }

  get daycare1OriginalTrainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x2AB4, type: "text-gen2-intl", length: 11 });
  }

  set daycare1OriginalTrainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x2AB4, type: "text-gen2-intl", length: 11 }, value);
  }

  get daycare1Pokemon(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x2ABF, type: "bytes", length: 32 });
  }

  set daycare1Pokemon(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x2ABF, type: "bytes", length: 32 }, value);
  }

  get daycareLady(): SramDaycareLady {
    return new SramDaycareLady(this.#store, { space: this.#space, offset: 0x2ADF, type: "u8", length: 1 });
  }

  get daycareStepsToEgg(): number {
    return this.#store.number({ space: this.#space, offset: 0x2AE0, type: "u8", length: 1 });
  }

  set daycareStepsToEgg(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2AE0, type: "u8", length: 1 }, value);
  }

  get daycareCompatibility(): number {
    return this.#store.number({ space: this.#space, offset: 0x2AE1, type: "u8", length: 1 });
  }

  set daycareCompatibility(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2AE1, type: "u8", length: 1 }, value);
  }

  get daycare2Nickname(): string {
    return this.#store.text({ space: this.#space, offset: 0x2AE2, type: "text-gen2-intl", length: 11 });
  }

  set daycare2Nickname(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x2AE2, type: "text-gen2-intl", length: 11 }, value);
  }

  get daycare2OriginalTrainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x2AED, type: "text-gen2-intl", length: 11 });
  }

  set daycare2OriginalTrainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x2AED, type: "text-gen2-intl", length: 11 }, value);
  }

  get daycare2Pokemon(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x2AF8, type: "bytes", length: 32 });
  }

  set daycare2Pokemon(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x2AF8, type: "bytes", length: 32 }, value);
  }

  get daycareEggNickname(): string {
    return this.#store.text({ space: this.#space, offset: 0x2B18, type: "text-gen2-intl", length: 11 });
  }

  set daycareEggNickname(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x2B18, type: "text-gen2-intl", length: 11 }, value);
  }

  get daycareEggOriginalTrainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x2B23, type: "text-gen2-intl", length: 11 });
  }

  set daycareEggOriginalTrainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x2B23, type: "text-gen2-intl", length: 11 }, value);
  }

  get daycareEggPokemon(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x2B2E, type: "bytes", length: 32 });
  }

  set daycareEggPokemon(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x2B2E, type: "bytes", length: 32 }, value);
  }

  get checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x2D69, type: "u16le", length: 2 });
  }

  set checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2D69, type: "u16le", length: 2 }, value);
  }

  get currentBoxCount(): number {
    return this.#store.number({ space: this.#space, offset: 0x2D6C, type: "u8", length: 1 });
  }

  set currentBoxCount(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2D6C, type: "u8", length: 1 }, value);
  }

  get currentBoxSpecies(): readonly (number)[] {
    return repeat(21, (i) => this.#store.number({ space: this.#space, offset: 0x2D6D + i * 1, type: "u8", length: 1 }));
  }

  set currentBoxSpecies(values: readonly (number)[]) {
    setEach(21, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x2D6D + i * 1, type: "u8", length: 1 }, value));
  }

  get currentBoxPokemon(): readonly (Uint8Array)[] {
    return repeat(20, (i) => this.#store.raw({ space: this.#space, offset: 0x2D82 + i * 32, type: "bytes", length: 32 }));
  }

  set currentBoxPokemon(values: readonly (Uint8Array)[]) {
    setEach(20, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0x2D82 + i * 32, type: "bytes", length: 32 }, value));
  }

  get currentBoxOriginalTrainerNames(): readonly (string)[] {
    return repeat(20, (i) => this.#store.text({ space: this.#space, offset: 0x3002 + i * 11, type: "text-gen2-intl", length: 11 }));
  }

  set currentBoxOriginalTrainerNames(values: readonly (string)[]) {
    setEach(20, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0x3002 + i * 11, type: "text-gen2-intl", length: 11 }, value));
  }

  get currentBoxNicknames(): readonly (string)[] {
    return repeat(20, (i) => this.#store.text({ space: this.#space, offset: 0x30DE + i * 11, type: "text-gen2-intl", length: 11 }));
  }

  set currentBoxNicknames(values: readonly (string)[]) {
    setEach(20, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0x30DE + i * 11, type: "text-gen2-intl", length: 11 }, value));
  }

  get backup2(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x3D69, type: "bytes", length: 426 });
  }

  set backup2(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x3D69, type: "bytes", length: 426 }, value);
  }

  get boxes1To7(): readonly (Uint8Array)[] {
    return repeat(7, (i) => this.#store.raw({ space: this.#space, offset: 0x4000 + i * 1104, type: "bytes", length: 1102 }));
  }

  set boxes1To7(values: readonly (Uint8Array)[]) {
    setEach(7, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0x4000 + i * 1104, type: "bytes", length: 1102 }, value));
  }

  get boxes8To14(): readonly (Uint8Array)[] {
    return repeat(7, (i) => this.#store.raw({ space: this.#space, offset: 0x6000 + i * 1104, type: "bytes", length: 1102 }));
  }

  set boxes8To14(values: readonly (Uint8Array)[]) {
    setEach(7, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0x6000 + i * 1104, type: "bytes", length: 1102 }, value));
  }

  get backup4(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x7E39, type: "bytes", length: 52 });
  }

  set backup4(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x7E39, type: "bytes", length: 52 }, value);
  }

  get backupChecksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x7E6D, type: "u16le", length: 2 });
  }

  set backupChecksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x7E6D, type: "u16le", length: 2 }, value);
  }
}

export class SramRtcFlags {
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

  get timeNotSet(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 1 });
  }

  set timeNotSet(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 1 }, value);
  }
}

export class SramOptions {
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

  get sound(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 2 });
  }

  set sound(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 2 }, value);
  }

  get battleStyleSet(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 1 });
  }

  set battleStyleSet(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 1 }, value);
  }

  get battleEffectsOff(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 1 });
  }

  set battleEffectsOff(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 1 }, value);
  }
}

export class SramTextBoxFrame {
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

  get frame(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 3 });
  }

  set frame(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 3 }, value);
  }
}

export class SramTextBoxFlags {
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

  get frameDelay1(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set frameDelay1(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get frameDelayNone(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 1 });
  }

  set frameDelayNone(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 1 }, value);
  }
}

export class SramBadges {
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

  get zephyr(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set zephyr(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get hive(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set hive(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }

  get plain(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 1 });
  }

  set plain(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 1 }, value);
  }

  get fog(): number {
    return this.#store.number({ ...this.#read, bit: 3, width: 1 });
  }

  set fog(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 3, width: 1 }, value);
  }

  get storm(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 1 });
  }

  set storm(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 1 }, value);
  }

  get mineral(): number {
    return this.#store.number({ ...this.#read, bit: 5, width: 1 });
  }

  set mineral(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 5, width: 1 }, value);
  }

  get glacier(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 1 });
  }

  set glacier(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 1 }, value);
  }

  get rising(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 1 });
  }

  set rising(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 1 }, value);
  }

  get boulder(): number {
    return this.#store.number({ ...this.#read, bit: 8, width: 1 });
  }

  set boulder(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 8, width: 1 }, value);
  }

  get cascade(): number {
    return this.#store.number({ ...this.#read, bit: 9, width: 1 });
  }

  set cascade(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 9, width: 1 }, value);
  }

  get thunder(): number {
    return this.#store.number({ ...this.#read, bit: 10, width: 1 });
  }

  set thunder(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 10, width: 1 }, value);
  }

  get rainbow(): number {
    return this.#store.number({ ...this.#read, bit: 11, width: 1 });
  }

  set rainbow(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 11, width: 1 }, value);
  }

  get soul(): number {
    return this.#store.number({ ...this.#read, bit: 12, width: 1 });
  }

  set soul(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 12, width: 1 }, value);
  }

  get marsh(): number {
    return this.#store.number({ ...this.#read, bit: 13, width: 1 });
  }

  set marsh(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 13, width: 1 }, value);
  }

  get volcano(): number {
    return this.#store.number({ ...this.#read, bit: 14, width: 1 });
  }

  set volcano(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 14, width: 1 }, value);
  }

  get earth(): number {
    return this.#store.number({ ...this.#read, bit: 15, width: 1 });
  }

  set earth(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 15, width: 1 }, value);
  }
}

export class SramItemsPocket {
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
    return this.#store.number({ ...this.#read, bit: 0, width: 8 });
  }

  set item(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 8 }, value);
  }

  get quantity(): number {
    return this.#store.number({ ...this.#read, bit: 8, width: 8 });
  }

  set quantity(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 8, width: 8 }, value);
  }
}

export class SramPokeBallsPocket {
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
    return this.#store.number({ ...this.#read, bit: 0, width: 8 });
  }

  set item(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 8 }, value);
  }

  get quantity(): number {
    return this.#store.number({ ...this.#read, bit: 8, width: 8 });
  }

  set quantity(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 8, width: 8 }, value);
  }
}

export class SramPcItems {
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
    return this.#store.number({ ...this.#read, bit: 0, width: 8 });
  }

  set item(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 8 }, value);
  }

  get quantity(): number {
    return this.#store.number({ ...this.#read, bit: 8, width: 8 });
  }

  set quantity(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 8, width: 8 }, value);
  }
}

export class SramUnownUnlocked {
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

  get aToK(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set aToK(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get lToR(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set lToR(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }

  get sToW(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 1 });
  }

  set sToW(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 1 }, value);
  }

  get xToZ(): number {
    return this.#store.number({ ...this.#read, bit: 3, width: 1 });
  }

  set xToZ(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 3, width: 1 }, value);
  }
}

export class SramDaycareMan {
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

  get occupied(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set occupied(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get eggReady(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 1 });
  }

  set eggReady(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 1 }, value);
  }
}

export class SramDaycareLady {
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

  get occupied(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set occupied(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }
}

export class BoxSpace {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get count(): number {
    return this.#store.number({ space: this.#space, offset: 0x0, type: "u8", length: 1 });
  }

  set count(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x0, type: "u8", length: 1 }, value);
  }

  get species(): readonly (number)[] {
    return repeat(21, (i) => this.#store.number({ space: this.#space, offset: 0x1 + i * 1, type: "u8", length: 1 }));
  }

  set species(values: readonly (number)[]) {
    setEach(21, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x1 + i * 1, type: "u8", length: 1 }, value));
  }

  get pokemon(): readonly (Uint8Array)[] {
    return repeat(20, (i) => this.#store.raw({ space: this.#space, offset: 0x16 + i * 32, type: "bytes", length: 32 }));
  }

  set pokemon(values: readonly (Uint8Array)[]) {
    setEach(20, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0x16 + i * 32, type: "bytes", length: 32 }, value));
  }

  get originalTrainerNames(): readonly (string)[] {
    return repeat(20, (i) => this.#store.text({ space: this.#space, offset: 0x296 + i * 11, type: "text-gen2-intl", length: 11 }));
  }

  set originalTrainerNames(values: readonly (string)[]) {
    setEach(20, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0x296 + i * 11, type: "text-gen2-intl", length: 11 }, value));
  }

  get nicknames(): readonly (string)[] {
    return repeat(20, (i) => this.#store.text({ space: this.#space, offset: 0x372 + i * 11, type: "text-gen2-intl", length: 11 }));
  }

  set nicknames(values: readonly (string)[]) {
    setEach(20, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0x372 + i * 11, type: "text-gen2-intl", length: 11 }, value));
  }
}

export class Pk2 {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get listCount(): number {
    return this.#store.number({ space: this.#space, offset: 0x0, type: "u8", length: 1 });
  }

  set listCount(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x0, type: "u8", length: 1 }, value);
  }

  get listSpecies(): number {
    return this.#store.number({ space: this.#space, offset: 0x1, type: "u8", length: 1 });
  }

  set listSpecies(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1, type: "u8", length: 1 }, value);
  }

  get listEnd(): number {
    return this.#store.number({ space: this.#space, offset: 0x2, type: "u8", length: 1 });
  }

  set listEnd(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2, type: "u8", length: 1 }, value);
  }

  get species(): number {
    return this.#store.number({ space: this.#space, offset: 0x3, type: "u8", length: 1 });
  }

  set species(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x3, type: "u8", length: 1 }, value);
  }

  get heldItem(): number {
    return this.#store.number({ space: this.#space, offset: 0x4, type: "u8", length: 1 });
  }

  set heldItem(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x4, type: "u8", length: 1 }, value);
  }

  get moves(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x5 + i * 1, type: "u8", length: 1 }));
  }

  set moves(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x5 + i * 1, type: "u8", length: 1 }, value));
  }

  get originalTrainerId(): number {
    return this.#store.number({ space: this.#space, offset: 0x9, type: "u16be", length: 2 });
  }

  set originalTrainerId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x9, type: "u16be", length: 2 }, value);
  }

  get experience(): number {
    return this.#store.number({ space: this.#space, offset: 0xB, type: "u24be", length: 3 });
  }

  set experience(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xB, type: "u24be", length: 3 }, value);
  }

  get evs(): readonly (number)[] {
    return repeat(5, (i) => this.#store.number({ space: this.#space, offset: 0xE + i * 2, type: "u16be", length: 2 }));
  }

  set evs(values: readonly (number)[]) {
    setEach(5, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xE + i * 2, type: "u16be", length: 2 }, value));
  }

  get dvs(): Pk2Dvs {
    return new Pk2Dvs(this.#store, { space: this.#space, offset: 0x18, type: "u16be", length: 2 });
  }

  get pp(): readonly Pk2Pp[] {
    return repeat(4, (i) => new Pk2Pp(this.#store, { space: this.#space, offset: 0x1A + i * 1, type: "u8", length: 1 }));
  }

  get friendship(): number {
    return this.#store.number({ space: this.#space, offset: 0x1E, type: "u8", length: 1 });
  }

  set friendship(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1E, type: "u8", length: 1 }, value);
  }

  get pokerus(): Pk2Pokerus {
    return new Pk2Pokerus(this.#store, { space: this.#space, offset: 0x1F, type: "u8", length: 1 });
  }

  get caughtData(): Pk2CaughtData {
    return new Pk2CaughtData(this.#store, { space: this.#space, offset: 0x20, type: "u16be", length: 2 });
  }

  get level(): number {
    return this.#store.number({ space: this.#space, offset: 0x22, type: "u8", length: 1 });
  }

  set level(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x22, type: "u8", length: 1 }, value);
  }

  get statusCondition(): number {
    return this.#store.number({ space: this.#space, offset: 0x23, type: "u8", length: 1 });
  }

  set statusCondition(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23, type: "u8", length: 1 }, value);
  }

  get currentHp(): number {
    return this.#store.number({ space: this.#space, offset: 0x25, type: "u16be", length: 2 });
  }

  set currentHp(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x25, type: "u16be", length: 2 }, value);
  }

  get stats(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x27 + i * 2, type: "u16be", length: 2 }));
  }

  set stats(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x27 + i * 2, type: "u16be", length: 2 }, value));
  }

  get originalTrainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x33, type: "text-gen2-intl", length: 11 });
  }

  set originalTrainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x33, type: "text-gen2-intl", length: 11 }, value);
  }

  get nickname(): string {
    return this.#store.text({ space: this.#space, offset: 0x3E, type: "text-gen2-intl", length: 11 });
  }

  set nickname(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x3E, type: "text-gen2-intl", length: 11 }, value);
  }
}

export class Pk2Dvs {
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

  get special(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 4 });
  }

  set special(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 4 }, value);
  }

  get speed(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 4 });
  }

  set speed(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 4 }, value);
  }

  get defense(): number {
    return this.#store.number({ ...this.#read, bit: 8, width: 4 });
  }

  set defense(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 8, width: 4 }, value);
  }

  get attack(): number {
    return this.#store.number({ ...this.#read, bit: 12, width: 4 });
  }

  set attack(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 12, width: 4 }, value);
  }
}

export class Pk2Pp {
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

  get pp(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 6 });
  }

  set pp(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 6 }, value);
  }

  get ppUps(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 2 });
  }

  set ppUps(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 2 }, value);
  }
}

export class Pk2Pokerus {
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

export class Pk2CaughtData {
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

  get metLocation(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 7 });
  }

  set metLocation(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 7 }, value);
  }

  get trainerGender(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 1 });
  }

  set trainerGender(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 1 }, value);
  }

  get metLevel(): number {
    return this.#store.number({ ...this.#read, bit: 8, width: 6 });
  }

  set metLevel(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 8, width: 6 }, value);
  }

  get timeOfDay(): number {
    return this.#store.number({ ...this.#read, bit: 14, width: 2 });
  }

  set timeOfDay(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 14, width: 2 }, value);
  }
}

export class Pk2Boxed {
  readonly #store: Store;
  readonly #space: string;

  constructor(store: Store, space: string) {
    this.#store = store;
    this.#space = space;
  }

  get bytes(): Uint8Array {
    return this.#store.bytes(this.#space);
  }

  get listCount(): number {
    return this.#store.number({ space: this.#space, offset: 0x0, type: "u8", length: 1 });
  }

  set listCount(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x0, type: "u8", length: 1 }, value);
  }

  get listSpecies(): number {
    return this.#store.number({ space: this.#space, offset: 0x1, type: "u8", length: 1 });
  }

  set listSpecies(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1, type: "u8", length: 1 }, value);
  }

  get listEnd(): number {
    return this.#store.number({ space: this.#space, offset: 0x2, type: "u8", length: 1 });
  }

  set listEnd(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2, type: "u8", length: 1 }, value);
  }

  get species(): number {
    return this.#store.number({ space: this.#space, offset: 0x3, type: "u8", length: 1 });
  }

  set species(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x3, type: "u8", length: 1 }, value);
  }

  get heldItem(): number {
    return this.#store.number({ space: this.#space, offset: 0x4, type: "u8", length: 1 });
  }

  set heldItem(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x4, type: "u8", length: 1 }, value);
  }

  get moves(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x5 + i * 1, type: "u8", length: 1 }));
  }

  set moves(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x5 + i * 1, type: "u8", length: 1 }, value));
  }

  get originalTrainerId(): number {
    return this.#store.number({ space: this.#space, offset: 0x9, type: "u16be", length: 2 });
  }

  set originalTrainerId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x9, type: "u16be", length: 2 }, value);
  }

  get experience(): number {
    return this.#store.number({ space: this.#space, offset: 0xB, type: "u24be", length: 3 });
  }

  set experience(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xB, type: "u24be", length: 3 }, value);
  }

  get evs(): readonly (number)[] {
    return repeat(5, (i) => this.#store.number({ space: this.#space, offset: 0xE + i * 2, type: "u16be", length: 2 }));
  }

  set evs(values: readonly (number)[]) {
    setEach(5, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xE + i * 2, type: "u16be", length: 2 }, value));
  }

  get dvs(): Pk2BoxedDvs {
    return new Pk2BoxedDvs(this.#store, { space: this.#space, offset: 0x18, type: "u16be", length: 2 });
  }

  get pp(): readonly Pk2BoxedPp[] {
    return repeat(4, (i) => new Pk2BoxedPp(this.#store, { space: this.#space, offset: 0x1A + i * 1, type: "u8", length: 1 }));
  }

  get friendship(): number {
    return this.#store.number({ space: this.#space, offset: 0x1E, type: "u8", length: 1 });
  }

  set friendship(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1E, type: "u8", length: 1 }, value);
  }

  get pokerus(): Pk2BoxedPokerus {
    return new Pk2BoxedPokerus(this.#store, { space: this.#space, offset: 0x1F, type: "u8", length: 1 });
  }

  get caughtData(): Pk2BoxedCaughtData {
    return new Pk2BoxedCaughtData(this.#store, { space: this.#space, offset: 0x20, type: "u16be", length: 2 });
  }

  get level(): number {
    return this.#store.number({ space: this.#space, offset: 0x22, type: "u8", length: 1 });
  }

  set level(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x22, type: "u8", length: 1 }, value);
  }

  get originalTrainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x33, type: "text-gen2-intl", length: 11 });
  }

  set originalTrainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x33, type: "text-gen2-intl", length: 11 }, value);
  }

  get nickname(): string {
    return this.#store.text({ space: this.#space, offset: 0x3E, type: "text-gen2-intl", length: 11 });
  }

  set nickname(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x3E, type: "text-gen2-intl", length: 11 }, value);
  }
}

export class Pk2BoxedDvs {
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

  get special(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 4 });
  }

  set special(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 4 }, value);
  }

  get speed(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 4 });
  }

  set speed(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 4 }, value);
  }

  get defense(): number {
    return this.#store.number({ ...this.#read, bit: 8, width: 4 });
  }

  set defense(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 8, width: 4 }, value);
  }

  get attack(): number {
    return this.#store.number({ ...this.#read, bit: 12, width: 4 });
  }

  set attack(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 12, width: 4 }, value);
  }
}

export class Pk2BoxedPp {
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

  get pp(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 6 });
  }

  set pp(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 6 }, value);
  }

  get ppUps(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 2 });
  }

  set ppUps(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 2 }, value);
  }
}

export class Pk2BoxedPokerus {
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

export class Pk2BoxedCaughtData {
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

  get metLocation(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 7 });
  }

  set metLocation(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 7 }, value);
  }

  get trainerGender(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 1 });
  }

  set trainerGender(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 1 }, value);
  }

  get metLevel(): number {
    return this.#store.number({ ...this.#read, bit: 8, width: 6 });
  }

  set metLevel(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 8, width: 6 }, value);
  }

  get timeOfDay(): number {
    return this.#store.number({ ...this.#read, bit: 14, width: 2 });
  }

  set timeOfDay(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 14, width: 2 }, value);
  }
}

const views: [string, new (store: Store, space: string) => unknown][] = [
  ["sram", Sram],
  ["box:{1..14}", BoxSpace],
  ["party:{1..6}", Pk2],
  ["box:{1..14}:{1..20}", Pk2Boxed],
];

export const read = (file: Uint8Array) => new Save(file);
