// Generated from known/pk4-1.0.json by tools/parser/generate.ts. Run npm run parsers after changing either.
import { repeat, setEach, Store, type At, type Read, type SpaceDef } from "../tools/parser/runtime.ts";

export const target = {"schema":"1.0","format":"pk4","version":"1.0"};

const spaces: SpaceDef[] = [
  {"name":"pk4","length":136,"checksums":[{"step":"sum16le","start":8,"end":136,"at":6}]},
  {"name":"pk4-party","length":236,"checksums":[{"step":"sum16le","start":8,"end":136,"at":6}]},
];

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

export class Pk4File extends Pokemon {
  readonly #store: Store;

  constructor(file: Uint8Array) {
    const store = new Store(file, spaces.filter(({ name }) => name === "pk4"));
    super(store, { space: "pk4", index: 0, offset: 0 });
    this.#store = store;
  }

  get ranges(): Pk4 {
    return new Pk4(this.#store, "pk4");
  }

  write(): Uint8Array {
    return this.#store.write();
  }
}

export class Pk4PartyFile extends PartyPokemon {
  readonly #store: Store;

  constructor(file: Uint8Array) {
    const store = new Store(file, spaces.filter(({ name }) => name === "pk4-party"));
    super(store, { space: "pk4-party", index: 0, offset: 0 });
    this.#store = store;
  }

  get ranges(): Pk4Party {
    return new Pk4Party(this.#store, "pk4-party");
  }

  write(): Uint8Array {
    return this.#store.write();
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

export function read(file: Uint8Array): Pk4File | Pk4PartyFile {
  if (file.length === 136) return new Pk4File(file);
  if (file.length === 236) return new Pk4PartyFile(file);
  throw new Error(`a pk4 file is 136 or 236 bytes, not ${file.length}`);
}
