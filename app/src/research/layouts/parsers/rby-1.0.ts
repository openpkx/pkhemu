// Generated from known/rby-1.0.json by tools/parser/generate.ts. Run npm run parsers after changing either.
import { counted, expand, repeat, setEach, spaceView, Store, type At, type Counted, type Read, type SpaceDef } from "../tools/parser/runtime.ts";

export const target = {"schema":"1.0","format":"rby","version":"1.0"};

const spaces: SpaceDef[] = [
  {"name":"sram","length":32768,"checksums":[{"step":"gen1-checksum","start":9624,"end":13603,"at":13603}]},
  {"name":"box:{1..12}","length":1122,"transform":"gen1-box-banks","args":{"banks":["0x4000","0x6000"],"boxes":12,"length":"0x462","current":"0x30C0","selected":"0x284C"},"source":{"regions":[{"space":"sram","start":0,"end":32768}],"offset":0,"length":32768}},
  {"name":"party:{1..6}","length":69,"transform":"gen1-list","args":{"capacity":6,"stored":44,"party":44,"names":11},"source":{"regions":[{"space":"sram","start":0,"end":32768}],"offset":12076,"length":404}},
  {"name":"box:{1..12}:{1..20}","length":69,"transform":"gen1-list","args":{"capacity":20,"stored":33,"party":44,"names":11},"source":{"regions":[{"space":"box:1","start":0,"end":1122},{"space":"box:2","start":0,"end":1122},{"space":"box:3","start":0,"end":1122},{"space":"box:4","start":0,"end":1122},{"space":"box:5","start":0,"end":1122},{"space":"box:6","start":0,"end":1122},{"space":"box:7","start":0,"end":1122},{"space":"box:8","start":0,"end":1122},{"space":"box:9","start":0,"end":1122},{"space":"box:10","start":0,"end":1122},{"space":"box:11","start":0,"end":1122},{"space":"box:12","start":0,"end":1122}],"offset":0,"length":13464}},
];

export type Spaces =
  { "sram": Sram } &
  { [Name in `box:${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12}`]: BoxSpace } &
  { [Name in `party:${1 | 2 | 3 | 4 | 5 | 6}`]: Pk1 } &
  { [Name in `box:${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12}:${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20}`]: Pk1Boxed };

export type SpaceName = keyof Spaces;

export class Trainer {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get name(): string {
    return this.#store.text({ space: "sram", offset: 0x2598, type: "text-gen1-intl", length: 11 });
  }

  set name(value: string) {
    this.#store.setText({ space: "sram", offset: 0x2598, type: "text-gen1-intl", length: 11 }, value);
  }

  get tid(): number {
    return this.#store.number({ space: "sram", offset: 0x2605, type: "u16be", length: 2 });
  }

  set tid(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x2605, type: "u16be", length: 2 }, value);
  }

  get money(): number {
    return this.#store.number({ space: "sram", offset: 0x25F3, type: "bcd24be", length: 3 });
  }

  set money(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x25F3, type: "bcd24be", length: 3 }, value);
  }

  get rivalName(): string {
    return this.#store.text({ space: "sram", offset: 0x25F6, type: "text-gen1-intl", length: 11 });
  }

  set rivalName(value: string) {
    this.#store.setText({ space: "sram", offset: 0x25F6, type: "text-gen1-intl", length: 11 }, value);
  }

  get coins(): number {
    return this.#store.number({ space: "sram", offset: 0x2850, type: "bcd16be", length: 2 });
  }

  set coins(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x2850, type: "bcd16be", length: 2 }, value);
  }
}

export class PlayTime {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get hours(): number {
    return this.#store.number({ space: "sram", offset: 0x2CED, type: "u8", length: 1 });
  }

  set hours(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x2CED, type: "u8", length: 1 }, value);
  }

  get minutes(): number {
    return this.#store.number({ space: "sram", offset: 0x2CEF, type: "u8", length: 1 });
  }

  set minutes(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x2CEF, type: "u8", length: 1 }, value);
  }

  get seconds(): number {
    return this.#store.number({ space: "sram", offset: 0x2CF0, type: "u8", length: 1 });
  }

  set seconds(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x2CF0, type: "u8", length: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x14, type: "u16be", length: 2 });
  }

  set health(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x14, type: "u16be", length: 2 }, value);
  }

  get attack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x16, type: "u16be", length: 2 });
  }

  set attack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x16, type: "u16be", length: 2 }, value);
  }

  get defense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x18, type: "u16be", length: 2 });
  }

  set defense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x18, type: "u16be", length: 2 }, value);
  }

  get speed(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x1A, type: "u16be", length: 2 });
  }

  set speed(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x1A, type: "u16be", length: 2 }, value);
  }

  get specialAttack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x1C, type: "u16be", length: 2 });
  }

  set specialAttack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x1C, type: "u16be", length: 2 }, value);
  }

  get specialDefense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x1C, type: "u16be", length: 2 });
  }

  set specialDefense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x1C, type: "u16be", length: 2 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x1E, type: "u16be", length: 2, bit: 12, width: 4 });
  }

  set attack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x1E, type: "u16be", length: 2, bit: 12, width: 4 }, value);
  }

  get defense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x1E, type: "u16be", length: 2, bit: 8, width: 4 });
  }

  set defense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x1E, type: "u16be", length: 2, bit: 8, width: 4 }, value);
  }

  get speed(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x1E, type: "u16be", length: 2, bit: 4, width: 4 });
  }

  set speed(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x1E, type: "u16be", length: 2, bit: 4, width: 4 }, value);
  }

  get specialAttack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x1E, type: "u16be", length: 2, bit: 0, width: 4 });
  }

  set specialAttack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x1E, type: "u16be", length: 2, bit: 0, width: 4 }, value);
  }

  get specialDefense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x1E, type: "u16be", length: 2, bit: 0, width: 4 });
  }

  set specialDefense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x1E, type: "u16be", length: 2, bit: 0, width: 4 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0xB + this.#at.index * 1, type: "u8", length: 1 });
  }

  set move(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xB + this.#at.index * 1, type: "u8", length: 1 }, value);
  }

  get pp(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x20 + this.#at.index * 1, type: "u8", length: 1, bit: 0, width: 6 });
  }

  set pp(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x20 + this.#at.index * 1, type: "u8", length: 1, bit: 0, width: 6 }, value);
  }

  get ppUps(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x20 + this.#at.index * 1, type: "u8", length: 1, bit: 6, width: 2 });
  }

  set ppUps(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x20 + this.#at.index * 1, type: "u8", length: 1, bit: 6, width: 2 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0xF, type: "u16be", length: 2 });
  }

  set tid(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xF, type: "u16be", length: 2 }, value);
  }

  get name(): string {
    return this.#store.text({ space: this.#at.space, offset: 0x2F, type: "text-gen1-intl", length: 11 });
  }

  set name(value: string) {
    this.#store.setText({ space: this.#at.space, offset: 0x2F, type: "text-gen1-intl", length: 11 }, value);
  }
}

export class Pokemon {
  readonly #store: Store;
  readonly #at: At;
  readonly evs: PokemonEvs;
  readonly ivs: PokemonIvs;
  readonly moves: readonly PokemonMove[];
  readonly owner: PokemonOwner;

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
    this.evs = new PokemonEvs(store, this.#at);
    this.ivs = new PokemonIvs(store, this.#at);
    this.moves = repeat(4, (index) => new PokemonMove(store, { space: this.#at.space, index, offset: 0xB + index * 1 }));
    this.owner = new PokemonOwner(store, this.#at);
  }

  get species(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x3, type: "u8", length: 1 });
  }

  set species(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x3, type: "u8", length: 1 }, value);
  }

  get nickname(): string {
    return this.#store.text({ space: this.#at.space, offset: 0x3A, type: "text-gen1-intl", length: 11 });
  }

  set nickname(value: string) {
    this.#store.setText({ space: this.#at.space, offset: 0x3A, type: "text-gen1-intl", length: 11 }, value);
  }

  get experience(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x11, type: "u24be", length: 3 });
  }

  set experience(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x11, type: "u24be", length: 3 }, value);
  }

  get boxLevel(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x6, type: "u8", length: 1 });
  }

  set boxLevel(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x6, type: "u8", length: 1 }, value);
  }

  get currentHp(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x4, type: "u16be", length: 2 });
  }

  set currentHp(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x4, type: "u16be", length: 2 }, value);
  }

  get statusCondition(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x7, type: "u8", length: 1 });
  }

  set statusCondition(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x7, type: "u8", length: 1 }, value);
  }

  get catchRate(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xA, type: "u8", length: 1 });
  }

  set catchRate(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xA, type: "u8", length: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x25, type: "u16be", length: 2 });
  }

  set health(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x25, type: "u16be", length: 2 }, value);
  }

  get attack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x27, type: "u16be", length: 2 });
  }

  set attack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x27, type: "u16be", length: 2 }, value);
  }

  get defense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x29, type: "u16be", length: 2 });
  }

  set defense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x29, type: "u16be", length: 2 }, value);
  }

  get speed(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x2B, type: "u16be", length: 2 });
  }

  set speed(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x2B, type: "u16be", length: 2 }, value);
  }

  get specialAttack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x2D, type: "u16be", length: 2 });
  }

  set specialAttack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x2D, type: "u16be", length: 2 }, value);
  }

  get specialDefense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x2D, type: "u16be", length: 2 });
  }

  set specialDefense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x2D, type: "u16be", length: 2 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x24, type: "u8", length: 1 });
  }

  set level(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x24, type: "u8", length: 1 }, value);
  }
}

export class Box {
  readonly #at: At;
  readonly slots: Counted<Pokemon>;

  constructor(store: Store, at: At) {
    this.#at = at;
    this.slots = counted(expand(`${this.#at.space}:{1..20}`).map((space, index) => new Pokemon(store, { space, index, offset: 0 })), store, { space: this.#at.space, offset: 0x0, type: "u8", length: 1 });
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

export class Bag {
  readonly items: Counted<Item>;
  readonly pcItems: Counted<Item>;

  constructor(store: Store, _at: At) {
    this.items = counted(repeat(20, (index) => new Item(store, { space: "sram", index, offset: 0x25CA + index * 2 })), store, { space: "sram", offset: 0x25C9, type: "u8", length: 1 });
    this.pcItems = counted(repeat(50, (index) => new Item(store, { space: "sram", index, offset: 0x27E7 + index * 2 })), store, { space: "sram", offset: 0x27E6, type: "u8", length: 1 });
  }
}

export class Badges {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get badge1(): number {
    return this.#store.number({ space: "sram", offset: 0x2602, type: "u8", length: 1, bit: 0, width: 1 });
  }

  set badge1(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x2602, type: "u8", length: 1, bit: 0, width: 1 }, value);
  }

  get badge2(): number {
    return this.#store.number({ space: "sram", offset: 0x2602, type: "u8", length: 1, bit: 1, width: 1 });
  }

  set badge2(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x2602, type: "u8", length: 1, bit: 1, width: 1 }, value);
  }

  get badge3(): number {
    return this.#store.number({ space: "sram", offset: 0x2602, type: "u8", length: 1, bit: 2, width: 1 });
  }

  set badge3(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x2602, type: "u8", length: 1, bit: 2, width: 1 }, value);
  }

  get badge4(): number {
    return this.#store.number({ space: "sram", offset: 0x2602, type: "u8", length: 1, bit: 3, width: 1 });
  }

  set badge4(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x2602, type: "u8", length: 1, bit: 3, width: 1 }, value);
  }

  get badge5(): number {
    return this.#store.number({ space: "sram", offset: 0x2602, type: "u8", length: 1, bit: 4, width: 1 });
  }

  set badge5(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x2602, type: "u8", length: 1, bit: 4, width: 1 }, value);
  }

  get badge6(): number {
    return this.#store.number({ space: "sram", offset: 0x2602, type: "u8", length: 1, bit: 5, width: 1 });
  }

  set badge6(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x2602, type: "u8", length: 1, bit: 5, width: 1 }, value);
  }

  get badge7(): number {
    return this.#store.number({ space: "sram", offset: 0x2602, type: "u8", length: 1, bit: 6, width: 1 });
  }

  set badge7(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x2602, type: "u8", length: 1, bit: 6, width: 1 }, value);
  }

  get badge8(): number {
    return this.#store.number({ space: "sram", offset: 0x2602, type: "u8", length: 1, bit: 7, width: 1 });
  }

  set badge8(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x2602, type: "u8", length: 1, bit: 7, width: 1 }, value);
  }
}

export class Pokedex {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get owned(): readonly boolean[] {
    return this.#store.flags({ space: "sram", offset: 0x25A3, type: "flags", length: 19 });
  }

  set owned(value: readonly boolean[]) {
    this.#store.setFlags({ space: "sram", offset: 0x25A3, type: "flags", length: 19 }, value);
  }

  get seen(): readonly boolean[] {
    return this.#store.flags({ space: "sram", offset: 0x25B6, type: "flags", length: 19 });
  }

  set seen(value: readonly boolean[]) {
    this.#store.setFlags({ space: "sram", offset: 0x25B6, type: "flags", length: 19 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x289C + this.#at.index * 1, type: "u8", length: 1 });
  }

  set value(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x289C + this.#at.index * 1, type: "u8", length: 1 }, value);
  }
}

export class Events {
  readonly #store: Store;
  readonly work: readonly EventsEventWork[];

  constructor(store: Store, _at: At) {
    this.#store = store;
    this.work = repeat(256, (index) => new EventsEventWork(store, { space: "sram", index, offset: 0x289C + index * 1 }));
  }

  get flags(): readonly boolean[] {
    return this.#store.flags({ space: "sram", offset: 0x29F3, type: "flags", length: 320 });
  }

  set flags(value: readonly boolean[]) {
    this.#store.setFlags({ space: "sram", offset: 0x29F3, type: "flags", length: 320 }, value);
  }
}

export class Yellow {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get pikachuFriendship(): number {
    return this.#store.number({ space: "sram", offset: 0x271C, type: "u8", length: 1 });
  }

  set pikachuFriendship(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x271C, type: "u8", length: 1 }, value);
  }

  get pikachuBeachScore(): number {
    return this.#store.number({ space: "sram", offset: 0x2741, type: "bcd16le", length: 2 });
  }

  set pikachuBeachScore(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x2741, type: "bcd16le", length: 2 }, value);
  }

  get printerBrightness(): number {
    return this.#store.number({ space: "sram", offset: 0x2744, type: "u8", length: 1 });
  }

  set printerBrightness(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x2744, type: "u8", length: 1 }, value);
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
  readonly yellow: Yellow;

  constructor(file: Uint8Array) {
    const store = new Store(file, spaces);
    this.#store = store;
    this.#at = { space: "", index: 0, offset: 0 };
    this.trainer = new Trainer(store, this.#at);
    this.playTime = new PlayTime(store, this.#at);
    this.party = counted(expand("party:{1..6}").map((space, index) => new PartyPokemon(store, { space, index, offset: 0 })), store, { space: "sram", offset: 0x2F2C, type: "u8", length: 1 });
    this.boxes = expand("box:{1..12}").map((space, index) => new Box(store, { space, index, offset: 0 }));
    this.bag = new Bag(store, this.#at);
    this.badges = new Badges(store, this.#at);
    this.pokedex = new Pokedex(store, this.#at);
    this.events = new Events(store, this.#at);
    this.yellow = new Yellow(store, this.#at);
  }

  get currentBox(): number {
    return this.#store.number({ space: "sram", offset: 0x284C, type: "u8", length: 1, bit: 0, width: 7 });
  }

  set currentBox(value: number) {
    this.#store.setNumber({ space: "sram", offset: 0x284C, type: "u8", length: 1, bit: 0, width: 7 }, value);
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

  get hallOfFameSpecies(): readonly (number)[] {
    return repeat(300, (i) => this.#store.number({ space: this.#space, offset: 0x598 + i * 16, type: "u8", length: 1 }));
  }

  set hallOfFameSpecies(values: readonly (number)[]) {
    setEach(300, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x598 + i * 16, type: "u8", length: 1 }, value));
  }

  get hallOfFameLevel(): readonly (number)[] {
    return repeat(300, (i) => this.#store.number({ space: this.#space, offset: 0x599 + i * 16, type: "u8", length: 1 }));
  }

  set hallOfFameLevel(values: readonly (number)[]) {
    setEach(300, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x599 + i * 16, type: "u8", length: 1 }, value));
  }

  get hallOfFameNickname(): readonly (string)[] {
    return repeat(300, (i) => this.#store.text({ space: this.#space, offset: 0x59A + i * 16, type: "text-gen1-intl", length: 11 }));
  }

  set hallOfFameNickname(values: readonly (string)[]) {
    setEach(300, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0x59A + i * 16, type: "text-gen1-intl", length: 11 }, value));
  }

  get trainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x2598, type: "text-gen1-intl", length: 11 });
  }

  set trainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x2598, type: "text-gen1-intl", length: 11 }, value);
  }

  get pokedexOwnedFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x25A3, type: "flags", length: 19 });
  }

  set pokedexOwnedFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x25A3, type: "flags", length: 19 }, value);
  }

  get pokedexSeenFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x25B6, type: "flags", length: 19 });
  }

  set pokedexSeenFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x25B6, type: "flags", length: 19 }, value);
  }

  get itemsCount(): number {
    return this.#store.number({ space: this.#space, offset: 0x25C9, type: "u8", length: 1 });
  }

  set itemsCount(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x25C9, type: "u8", length: 1 }, value);
  }

  get itemsPocket(): readonly SramItemsPocket[] {
    return repeat(20, (i) => new SramItemsPocket(this.#store, { space: this.#space, offset: 0x25CA + i * 2, type: "u16le", length: 2 }));
  }

  get itemsEnd(): number {
    return this.#store.number({ space: this.#space, offset: 0x25F2, type: "u8", length: 1 });
  }

  set itemsEnd(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x25F2, type: "u8", length: 1 }, value);
  }

  get money(): number {
    return this.#store.number({ space: this.#space, offset: 0x25F3, type: "bcd24be", length: 3 });
  }

  set money(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x25F3, type: "bcd24be", length: 3 }, value);
  }

  get rivalName(): string {
    return this.#store.text({ space: this.#space, offset: 0x25F6, type: "text-gen1-intl", length: 11 });
  }

  set rivalName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x25F6, type: "text-gen1-intl", length: 11 }, value);
  }

  get options(): SramOptions {
    return new SramOptions(this.#store, { space: this.#space, offset: 0x2601, type: "u8", length: 1 });
  }

  get badges(): SramBadges {
    return new SramBadges(this.#store, { space: this.#space, offset: 0x2602, type: "u8", length: 1 });
  }

  get trainerId(): number {
    return this.#store.number({ space: this.#space, offset: 0x2605, type: "u16be", length: 2 });
  }

  set trainerId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2605, type: "u16be", length: 2 }, value);
  }

  get pikachuFriendship(): number {
    return this.#store.number({ space: this.#space, offset: 0x271C, type: "u8", length: 1 });
  }

  set pikachuFriendship(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x271C, type: "u8", length: 1 }, value);
  }

  get pikachuBeachScore(): number {
    return this.#store.number({ space: this.#space, offset: 0x2741, type: "bcd16le", length: 2 });
  }

  set pikachuBeachScore(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2741, type: "bcd16le", length: 2 }, value);
  }

  get printerBrightness(): number {
    return this.#store.number({ space: this.#space, offset: 0x2744, type: "u8", length: 1 });
  }

  set printerBrightness(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2744, type: "u8", length: 1 }, value);
  }

  get pcItemsCount(): number {
    return this.#store.number({ space: this.#space, offset: 0x27E6, type: "u8", length: 1 });
  }

  set pcItemsCount(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x27E6, type: "u8", length: 1 }, value);
  }

  get pcItems(): readonly SramPcItems[] {
    return repeat(50, (i) => new SramPcItems(this.#store, { space: this.#space, offset: 0x27E7 + i * 2, type: "u16le", length: 2 }));
  }

  get pcItemsEnd(): number {
    return this.#store.number({ space: this.#space, offset: 0x284B, type: "u8", length: 1 });
  }

  set pcItemsEnd(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x284B, type: "u8", length: 1 }, value);
  }

  get currentBox(): SramCurrentBox {
    return new SramCurrentBox(this.#store, { space: this.#space, offset: 0x284C, type: "u8", length: 1 });
  }

  get hallOfFameCount(): number {
    return this.#store.number({ space: this.#space, offset: 0x284E, type: "u8", length: 1 });
  }

  set hallOfFameCount(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x284E, type: "u8", length: 1 }, value);
  }

  get coins(): number {
    return this.#store.number({ space: this.#space, offset: 0x2850, type: "bcd16be", length: 2 });
  }

  set coins(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2850, type: "bcd16be", length: 2 }, value);
  }

  get objectSpawnFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x2852, type: "flags", length: 30 });
  }

  set objectSpawnFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x2852, type: "flags", length: 30 }, value);
  }

  get eventWork(): readonly (number)[] {
    return repeat(256, (i) => this.#store.number({ space: this.#space, offset: 0x289C + i * 1, type: "u8", length: 1 }));
  }

  set eventWork(values: readonly (number)[]) {
    setEach(256, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x289C + i * 1, type: "u8", length: 1 }, value));
  }

  get rivalStarter(): number {
    return this.#store.number({ space: this.#space, offset: 0x29C1, type: "u8", length: 1 });
  }

  set rivalStarter(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x29C1, type: "u8", length: 1 }, value);
  }

  get playerStarter(): number {
    return this.#store.number({ space: this.#space, offset: 0x29C3, type: "u8", length: 1 });
  }

  set playerStarter(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x29C3, type: "u8", length: 1 }, value);
  }

  get wramD72e(): SramWramD72e {
    return new SramWramD72e(this.#store, { space: this.#space, offset: 0x29DA, type: "u8", length: 1 });
  }

  get eventFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x29F3, type: "flags", length: 320 });
  }

  set eventFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x29F3, type: "flags", length: 320 }, value);
  }

  get playTimeHours(): number {
    return this.#store.number({ space: this.#space, offset: 0x2CED, type: "u8", length: 1 });
  }

  set playTimeHours(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2CED, type: "u8", length: 1 }, value);
  }

  get playTimeMaxed(): number {
    return this.#store.number({ space: this.#space, offset: 0x2CEE, type: "u8", length: 1 });
  }

  set playTimeMaxed(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2CEE, type: "u8", length: 1 }, value);
  }

  get playTimeMinutes(): number {
    return this.#store.number({ space: this.#space, offset: 0x2CEF, type: "u8", length: 1 });
  }

  set playTimeMinutes(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2CEF, type: "u8", length: 1 }, value);
  }

  get playTimeSeconds(): number {
    return this.#store.number({ space: this.#space, offset: 0x2CF0, type: "u8", length: 1 });
  }

  set playTimeSeconds(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2CF0, type: "u8", length: 1 }, value);
  }

  get playTimeFrames(): number {
    return this.#store.number({ space: this.#space, offset: 0x2CF1, type: "u8", length: 1 });
  }

  set playTimeFrames(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2CF1, type: "u8", length: 1 }, value);
  }

  get daycareInUse(): number {
    return this.#store.number({ space: this.#space, offset: 0x2CF4, type: "u8", length: 1 });
  }

  set daycareInUse(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2CF4, type: "u8", length: 1 }, value);
  }

  get daycareNickname(): string {
    return this.#store.text({ space: this.#space, offset: 0x2CF5, type: "text-gen1-intl", length: 11 });
  }

  set daycareNickname(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x2CF5, type: "text-gen1-intl", length: 11 }, value);
  }

  get daycareOriginalTrainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x2D00, type: "text-gen1-intl", length: 11 });
  }

  set daycareOriginalTrainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x2D00, type: "text-gen1-intl", length: 11 }, value);
  }

  get daycarePokemon(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x2D0B, type: "bytes", length: 33 });
  }

  set daycarePokemon(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x2D0B, type: "bytes", length: 33 }, value);
  }

  get partyCount(): number {
    return this.#store.number({ space: this.#space, offset: 0x2F2C, type: "u8", length: 1 });
  }

  set partyCount(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2F2C, type: "u8", length: 1 }, value);
  }

  get partySpecies(): readonly (number)[] {
    return repeat(7, (i) => this.#store.number({ space: this.#space, offset: 0x2F2D + i * 1, type: "u8", length: 1 }));
  }

  set partySpecies(values: readonly (number)[]) {
    setEach(7, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x2F2D + i * 1, type: "u8", length: 1 }, value));
  }

  get partyPokemon(): readonly (Uint8Array)[] {
    return repeat(6, (i) => this.#store.raw({ space: this.#space, offset: 0x2F34 + i * 44, type: "bytes", length: 44 }));
  }

  set partyPokemon(values: readonly (Uint8Array)[]) {
    setEach(6, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0x2F34 + i * 44, type: "bytes", length: 44 }, value));
  }

  get partyOriginalTrainerNames(): readonly (string)[] {
    return repeat(6, (i) => this.#store.text({ space: this.#space, offset: 0x303C + i * 11, type: "text-gen1-intl", length: 11 }));
  }

  set partyOriginalTrainerNames(values: readonly (string)[]) {
    setEach(6, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0x303C + i * 11, type: "text-gen1-intl", length: 11 }, value));
  }

  get partyNicknames(): readonly (string)[] {
    return repeat(6, (i) => this.#store.text({ space: this.#space, offset: 0x307E + i * 11, type: "text-gen1-intl", length: 11 }));
  }

  set partyNicknames(values: readonly (string)[]) {
    setEach(6, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0x307E + i * 11, type: "text-gen1-intl", length: 11 }, value));
  }

  get currentBoxCount(): number {
    return this.#store.number({ space: this.#space, offset: 0x30C0, type: "u8", length: 1 });
  }

  set currentBoxCount(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x30C0, type: "u8", length: 1 }, value);
  }

  get currentBoxSpecies(): readonly (number)[] {
    return repeat(21, (i) => this.#store.number({ space: this.#space, offset: 0x30C1 + i * 1, type: "u8", length: 1 }));
  }

  set currentBoxSpecies(values: readonly (number)[]) {
    setEach(21, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x30C1 + i * 1, type: "u8", length: 1 }, value));
  }

  get currentBoxPokemon(): readonly (Uint8Array)[] {
    return repeat(20, (i) => this.#store.raw({ space: this.#space, offset: 0x30D6 + i * 33, type: "bytes", length: 33 }));
  }

  set currentBoxPokemon(values: readonly (Uint8Array)[]) {
    setEach(20, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0x30D6 + i * 33, type: "bytes", length: 33 }, value));
  }

  get currentBoxOriginalTrainerNames(): readonly (string)[] {
    return repeat(20, (i) => this.#store.text({ space: this.#space, offset: 0x336A + i * 11, type: "text-gen1-intl", length: 11 }));
  }

  set currentBoxOriginalTrainerNames(values: readonly (string)[]) {
    setEach(20, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0x336A + i * 11, type: "text-gen1-intl", length: 11 }, value));
  }

  get currentBoxNicknames(): readonly (string)[] {
    return repeat(20, (i) => this.#store.text({ space: this.#space, offset: 0x3446 + i * 11, type: "text-gen1-intl", length: 11 }));
  }

  set currentBoxNicknames(values: readonly (string)[]) {
    setEach(20, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0x3446 + i * 11, type: "text-gen1-intl", length: 11 }, value));
  }

  get checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x3523, type: "u8", length: 1 });
  }

  set checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x3523, type: "u8", length: 1 }, value);
  }

  get boxes1To6(): readonly (Uint8Array)[] {
    return repeat(6, (i) => this.#store.raw({ space: this.#space, offset: 0x4000 + i * 1122, type: "bytes", length: 1122 }));
  }

  set boxes1To6(values: readonly (Uint8Array)[]) {
    setEach(6, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0x4000 + i * 1122, type: "bytes", length: 1122 }, value));
  }

  get boxes7To12(): readonly (Uint8Array)[] {
    return repeat(6, (i) => this.#store.raw({ space: this.#space, offset: 0x6000 + i * 1122, type: "bytes", length: 1122 }));
  }

  set boxes7To12(values: readonly (Uint8Array)[]) {
    setEach(6, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0x6000 + i * 1122, type: "bytes", length: 1122 }, value));
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

  get boulder(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set boulder(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get cascade(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set cascade(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }

  get thunder(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 1 });
  }

  set thunder(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 1 }, value);
  }

  get rainbow(): number {
    return this.#store.number({ ...this.#read, bit: 3, width: 1 });
  }

  set rainbow(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 3, width: 1 }, value);
  }

  get soul(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 1 });
  }

  set soul(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 1 }, value);
  }

  get marsh(): number {
    return this.#store.number({ ...this.#read, bit: 5, width: 1 });
  }

  set marsh(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 5, width: 1 }, value);
  }

  get volcano(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 1 });
  }

  set volcano(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 1 }, value);
  }

  get earth(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 1 });
  }

  set earth(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 1 }, value);
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

export class SramCurrentBox {
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

  get number(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 7 });
  }

  set number(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 7 }, value);
  }

  get boxesSetUp(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 1 });
  }

  set boxesSetUp(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 1 }, value);
  }
}

export class SramWramD72e {
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

  get receivedLapras(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set receivedLapras(value: number) {
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
    return repeat(20, (i) => this.#store.raw({ space: this.#space, offset: 0x16 + i * 33, type: "bytes", length: 33 }));
  }

  set pokemon(values: readonly (Uint8Array)[]) {
    setEach(20, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0x16 + i * 33, type: "bytes", length: 33 }, value));
  }

  get originalTrainerNames(): readonly (string)[] {
    return repeat(20, (i) => this.#store.text({ space: this.#space, offset: 0x2AA + i * 11, type: "text-gen1-intl", length: 11 }));
  }

  set originalTrainerNames(values: readonly (string)[]) {
    setEach(20, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0x2AA + i * 11, type: "text-gen1-intl", length: 11 }, value));
  }

  get nicknames(): readonly (string)[] {
    return repeat(20, (i) => this.#store.text({ space: this.#space, offset: 0x386 + i * 11, type: "text-gen1-intl", length: 11 }));
  }

  set nicknames(values: readonly (string)[]) {
    setEach(20, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0x386 + i * 11, type: "text-gen1-intl", length: 11 }, value));
  }
}

export class Pk1 {
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

  get currentHp(): number {
    return this.#store.number({ space: this.#space, offset: 0x4, type: "u16be", length: 2 });
  }

  set currentHp(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x4, type: "u16be", length: 2 }, value);
  }

  get boxLevel(): number {
    return this.#store.number({ space: this.#space, offset: 0x6, type: "u8", length: 1 });
  }

  set boxLevel(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6, type: "u8", length: 1 }, value);
  }

  get statusCondition(): number {
    return this.#store.number({ space: this.#space, offset: 0x7, type: "u8", length: 1 });
  }

  set statusCondition(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x7, type: "u8", length: 1 }, value);
  }

  get type1(): number {
    return this.#store.number({ space: this.#space, offset: 0x8, type: "u8", length: 1 });
  }

  set type1(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x8, type: "u8", length: 1 }, value);
  }

  get type2(): number {
    return this.#store.number({ space: this.#space, offset: 0x9, type: "u8", length: 1 });
  }

  set type2(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x9, type: "u8", length: 1 }, value);
  }

  get catchRate(): number {
    return this.#store.number({ space: this.#space, offset: 0xA, type: "u8", length: 1 });
  }

  set catchRate(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA, type: "u8", length: 1 }, value);
  }

  get moves(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0xB + i * 1, type: "u8", length: 1 }));
  }

  set moves(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xB + i * 1, type: "u8", length: 1 }, value));
  }

  get originalTrainerId(): number {
    return this.#store.number({ space: this.#space, offset: 0xF, type: "u16be", length: 2 });
  }

  set originalTrainerId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xF, type: "u16be", length: 2 }, value);
  }

  get experience(): number {
    return this.#store.number({ space: this.#space, offset: 0x11, type: "u24be", length: 3 });
  }

  set experience(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x11, type: "u24be", length: 3 }, value);
  }

  get evs(): readonly (number)[] {
    return repeat(5, (i) => this.#store.number({ space: this.#space, offset: 0x14 + i * 2, type: "u16be", length: 2 }));
  }

  set evs(values: readonly (number)[]) {
    setEach(5, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x14 + i * 2, type: "u16be", length: 2 }, value));
  }

  get dvs(): Pk1Dvs {
    return new Pk1Dvs(this.#store, { space: this.#space, offset: 0x1E, type: "u16be", length: 2 });
  }

  get pp(): readonly Pk1Pp[] {
    return repeat(4, (i) => new Pk1Pp(this.#store, { space: this.#space, offset: 0x20 + i * 1, type: "u8", length: 1 }));
  }

  get level(): number {
    return this.#store.number({ space: this.#space, offset: 0x24, type: "u8", length: 1 });
  }

  set level(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x24, type: "u8", length: 1 }, value);
  }

  get stats(): readonly (number)[] {
    return repeat(5, (i) => this.#store.number({ space: this.#space, offset: 0x25 + i * 2, type: "u16be", length: 2 }));
  }

  set stats(values: readonly (number)[]) {
    setEach(5, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x25 + i * 2, type: "u16be", length: 2 }, value));
  }

  get originalTrainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x2F, type: "text-gen1-intl", length: 11 });
  }

  set originalTrainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x2F, type: "text-gen1-intl", length: 11 }, value);
  }

  get nickname(): string {
    return this.#store.text({ space: this.#space, offset: 0x3A, type: "text-gen1-intl", length: 11 });
  }

  set nickname(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x3A, type: "text-gen1-intl", length: 11 }, value);
  }
}

export class Pk1Dvs {
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

export class Pk1Pp {
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

export class Pk1Boxed {
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

  get currentHp(): number {
    return this.#store.number({ space: this.#space, offset: 0x4, type: "u16be", length: 2 });
  }

  set currentHp(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x4, type: "u16be", length: 2 }, value);
  }

  get boxLevel(): number {
    return this.#store.number({ space: this.#space, offset: 0x6, type: "u8", length: 1 });
  }

  set boxLevel(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6, type: "u8", length: 1 }, value);
  }

  get statusCondition(): number {
    return this.#store.number({ space: this.#space, offset: 0x7, type: "u8", length: 1 });
  }

  set statusCondition(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x7, type: "u8", length: 1 }, value);
  }

  get type1(): number {
    return this.#store.number({ space: this.#space, offset: 0x8, type: "u8", length: 1 });
  }

  set type1(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x8, type: "u8", length: 1 }, value);
  }

  get type2(): number {
    return this.#store.number({ space: this.#space, offset: 0x9, type: "u8", length: 1 });
  }

  set type2(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x9, type: "u8", length: 1 }, value);
  }

  get catchRate(): number {
    return this.#store.number({ space: this.#space, offset: 0xA, type: "u8", length: 1 });
  }

  set catchRate(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA, type: "u8", length: 1 }, value);
  }

  get moves(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0xB + i * 1, type: "u8", length: 1 }));
  }

  set moves(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xB + i * 1, type: "u8", length: 1 }, value));
  }

  get originalTrainerId(): number {
    return this.#store.number({ space: this.#space, offset: 0xF, type: "u16be", length: 2 });
  }

  set originalTrainerId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xF, type: "u16be", length: 2 }, value);
  }

  get experience(): number {
    return this.#store.number({ space: this.#space, offset: 0x11, type: "u24be", length: 3 });
  }

  set experience(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x11, type: "u24be", length: 3 }, value);
  }

  get evs(): readonly (number)[] {
    return repeat(5, (i) => this.#store.number({ space: this.#space, offset: 0x14 + i * 2, type: "u16be", length: 2 }));
  }

  set evs(values: readonly (number)[]) {
    setEach(5, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x14 + i * 2, type: "u16be", length: 2 }, value));
  }

  get dvs(): Pk1BoxedDvs {
    return new Pk1BoxedDvs(this.#store, { space: this.#space, offset: 0x1E, type: "u16be", length: 2 });
  }

  get pp(): readonly Pk1BoxedPp[] {
    return repeat(4, (i) => new Pk1BoxedPp(this.#store, { space: this.#space, offset: 0x20 + i * 1, type: "u8", length: 1 }));
  }

  get originalTrainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x2F, type: "text-gen1-intl", length: 11 });
  }

  set originalTrainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x2F, type: "text-gen1-intl", length: 11 }, value);
  }

  get nickname(): string {
    return this.#store.text({ space: this.#space, offset: 0x3A, type: "text-gen1-intl", length: 11 });
  }

  set nickname(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x3A, type: "text-gen1-intl", length: 11 }, value);
  }
}

export class Pk1BoxedDvs {
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

export class Pk1BoxedPp {
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

const views: [string, new (store: Store, space: string) => unknown][] = [
  ["sram", Sram],
  ["box:{1..12}", BoxSpace],
  ["party:{1..6}", Pk1],
  ["box:{1..12}:{1..20}", Pk1Boxed],
];

export const read = (file: Uint8Array) => new Save(file);
