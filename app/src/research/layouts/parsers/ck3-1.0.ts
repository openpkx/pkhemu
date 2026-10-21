// Generated from known/ck3-1.0.json by tools/parser/generate.ts. Run npm run parsers after changing either.
import { repeat, setEach, Store, type At, type Read, type SpaceDef } from "../tools/parser/runtime.ts";

export const target = {"schema":"1.0","format":"ck3","version":"1.0"};

const spaces: SpaceDef[] = [
  {"name":"ck3","length":312},
];

export class PokemonEvs {
  readonly #store: Store;
  readonly #at: At;

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
  }

  get health(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x98, type: "u16be", length: 2 });
  }

  set health(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x98, type: "u16be", length: 2 }, value);
  }

  get attack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x9A, type: "u16be", length: 2 });
  }

  set attack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x9A, type: "u16be", length: 2 }, value);
  }

  get defense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x9C, type: "u16be", length: 2 });
  }

  set defense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x9C, type: "u16be", length: 2 }, value);
  }

  get specialAttack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x9E, type: "u16be", length: 2 });
  }

  set specialAttack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x9E, type: "u16be", length: 2 }, value);
  }

  get specialDefense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xA0, type: "u16be", length: 2 });
  }

  set specialDefense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xA0, type: "u16be", length: 2 }, value);
  }

  get speed(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xA2, type: "u16be", length: 2 });
  }

  set speed(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xA2, type: "u16be", length: 2 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0xA4, type: "u16be", length: 2 });
  }

  set health(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xA4, type: "u16be", length: 2 }, value);
  }

  get attack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xA6, type: "u16be", length: 2 });
  }

  set attack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xA6, type: "u16be", length: 2 }, value);
  }

  get defense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xA8, type: "u16be", length: 2 });
  }

  set defense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xA8, type: "u16be", length: 2 }, value);
  }

  get specialAttack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xAA, type: "u16be", length: 2 });
  }

  set specialAttack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xAA, type: "u16be", length: 2 }, value);
  }

  get specialDefense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xAC, type: "u16be", length: 2 });
  }

  set specialDefense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xAC, type: "u16be", length: 2 }, value);
  }

  get speed(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xAE, type: "u16be", length: 2 });
  }

  set speed(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xAE, type: "u16be", length: 2 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x78 + this.#at.index * 4, type: "u16be", length: 2 });
  }

  set move(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x78 + this.#at.index * 4, type: "u16be", length: 2 }, value);
  }

  get pp(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x7A + this.#at.index * 4, type: "u8", length: 1 });
  }

  set pp(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x7A + this.#at.index * 4, type: "u8", length: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x14, type: "u32be", length: 4, bit: 0, width: 16 });
  }

  set tid(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x14, type: "u32be", length: 4, bit: 0, width: 16 }, value);
  }

  get sid(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x14, type: "u32be", length: 4, bit: 16, width: 16 });
  }

  set sid(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x14, type: "u32be", length: 4, bit: 16, width: 16 }, value);
  }

  get name(): string {
    return this.#store.text({ space: this.#at.space, offset: 0x18, type: "text-gen3-gc", length: 22 });
  }

  set name(value: string) {
    this.#store.setText({ space: this.#at.space, offset: 0x18, type: "text-gen3-gc", length: 22 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0xC, type: "u16be", length: 2 });
  }

  set location(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xC, type: "u16be", length: 2 }, value);
  }

  get level(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xE, type: "u8", length: 1 });
  }

  set level(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xE, type: "u8", length: 1 }, value);
  }

  get version(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x8, type: "u8", length: 1 });
  }

  set version(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x8, type: "u8", length: 1 }, value);
  }

  get fatefulEncounter(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xFB, type: "u8", length: 1, bit: 0, width: 1 });
  }

  set fatefulEncounter(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xFB, type: "u8", length: 1, bit: 0, width: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0xCB, type: "u8", length: 1 });
  }

  set isEgg(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xCB, type: "u8", length: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0xCA, type: "u8", length: 1, bit: 0, width: 4 });
  }

  set strain(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xCA, type: "u8", length: 1, bit: 0, width: 4 }, value);
  }

  get days(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xD0, type: "i8", length: 1 });
  }

  set days(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xD0, type: "i8", length: 1 }, value);
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
    this.moves = repeat(4, (index) => new PokemonMove(store, { space: this.#at.space, index, offset: 0x78 + index * 4 }));
    this.owner = new PokemonOwner(store, this.#at);
    this.metConditions = new PokemonMetConditions(store, this.#at);
    this.egg = new PokemonEgg(store, this.#at);
    this.pokerus = new PokemonPokerus(store, this.#at);
  }

  get pid(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x4, type: "u32be", length: 4 });
  }

  set pid(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x4, type: "u32be", length: 4 }, value);
  }

  get species(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x0, type: "u16be", length: 2 });
  }

  set species(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x0, type: "u16be", length: 2 }, value);
  }

  get nickname(): string {
    return this.#store.text({ space: this.#at.space, offset: 0x44, type: "text-gen3-gc", length: 22 });
  }

  set nickname(value: string) {
    this.#store.setText({ space: this.#at.space, offset: 0x44, type: "text-gen3-gc", length: 22 }, value);
  }

  get level(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x60, type: "u8", length: 1 });
  }

  set level(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x60, type: "u8", length: 1 }, value);
  }

  get experience(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x5C, type: "u32be", length: 4 });
  }

  set experience(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x5C, type: "u32be", length: 4 }, value);
  }

  get heldItem(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x88, type: "u16be", length: 2 });
  }

  set heldItem(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x88, type: "u16be", length: 2 }, value);
  }

  get friendship(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xB0, type: "u16be", length: 2 });
  }

  set friendship(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xB0, type: "u16be", length: 2 }, value);
  }

  get ball(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xF, type: "u8", length: 1 });
  }

  set ball(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xF, type: "u8", length: 1 }, value);
  }

  get language(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xB, type: "u8", length: 1 });
  }

  set language(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xB, type: "u8", length: 1 }, value);
  }

  get shadowId(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xD8, type: "u16be", length: 2 });
  }

  set shadowId(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xD8, type: "u16be", length: 2 }, value);
  }

  get purification(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xDC, type: "i32be", length: 4 });
  }

  set purification(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xDC, type: "i32be", length: 4 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x8C, type: "u16be", length: 2 });
  }

  set health(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x8C, type: "u16be", length: 2 }, value);
  }

  get attack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x8E, type: "u16be", length: 2 });
  }

  set attack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x8E, type: "u16be", length: 2 }, value);
  }

  get defense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x90, type: "u16be", length: 2 });
  }

  set defense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x90, type: "u16be", length: 2 }, value);
  }

  get specialAttack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x92, type: "u16be", length: 2 });
  }

  set specialAttack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x92, type: "u16be", length: 2 }, value);
  }

  get specialDefense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x94, type: "u16be", length: 2 });
  }

  set specialDefense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x94, type: "u16be", length: 2 }, value);
  }

  get speed(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x96, type: "u16be", length: 2 });
  }

  set speed(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x96, type: "u16be", length: 2 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x8A, type: "u16be", length: 2 });
  }

  set currentHp(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x8A, type: "u16be", length: 2 }, value);
  }
}

export class Ck3File extends PartyPokemon {
  readonly #store: Store;

  constructor(file: Uint8Array) {
    const store = new Store(file, spaces.filter(({ name }) => name === "ck3"));
    super(store, { space: "ck3", index: 0, offset: 0 });
    this.#store = store;
  }

  get ranges(): Ck3 {
    return new Ck3(this.#store, "ck3");
  }

  write(): Uint8Array {
    return this.#store.write();
  }
}

export class Ck3 {
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

  get pid(): number {
    return this.#store.number({ space: this.#space, offset: 0x4, type: "u32be", length: 4 });
  }

  set pid(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x4, type: "u32be", length: 4 }, value);
  }

  get originGame(): number {
    return this.#store.number({ space: this.#space, offset: 0x8, type: "u8", length: 1 });
  }

  set originGame(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x8, type: "u8", length: 1 }, value);
  }

  get currentRegion(): number {
    return this.#store.number({ space: this.#space, offset: 0x9, type: "u8", length: 1 });
  }

  set currentRegion(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x9, type: "u8", length: 1 }, value);
  }

  get originalRegion(): number {
    return this.#store.number({ space: this.#space, offset: 0xA, type: "u8", length: 1 });
  }

  set originalRegion(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA, type: "u8", length: 1 }, value);
  }

  get language(): number {
    return this.#store.number({ space: this.#space, offset: 0xB, type: "u8", length: 1 });
  }

  set language(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xB, type: "u8", length: 1 }, value);
  }

  get metLocation(): number {
    return this.#store.number({ space: this.#space, offset: 0xC, type: "u16be", length: 2 });
  }

  set metLocation(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xC, type: "u16be", length: 2 }, value);
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

  get originalTrainerId(): Ck3OriginalTrainerId {
    return new Ck3OriginalTrainerId(this.#store, { space: this.#space, offset: 0x14, type: "u32be", length: 4 });
  }

  get originalTrainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x18, type: "text-gen3-gc", length: 22 });
  }

  set originalTrainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x18, type: "text-gen3-gc", length: 22 }, value);
  }

  get nicknameDisplay(): string {
    return this.#store.text({ space: this.#space, offset: 0x2E, type: "text-gen3-gc", length: 22 });
  }

  set nicknameDisplay(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x2E, type: "text-gen3-gc", length: 22 }, value);
  }

  get nickname(): string {
    return this.#store.text({ space: this.#space, offset: 0x44, type: "text-gen3-gc", length: 22 });
  }

  set nickname(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x44, type: "text-gen3-gc", length: 22 }, value);
  }

  get experience(): number {
    return this.#store.number({ space: this.#space, offset: 0x5C, type: "u32be", length: 4 });
  }

  set experience(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x5C, type: "u32be", length: 4 }, value);
  }

  get level(): number {
    return this.#store.number({ space: this.#space, offset: 0x60, type: "u8", length: 1 });
  }

  set level(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x60, type: "u8", length: 1 }, value);
  }

  get moves(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x78 + i * 4, type: "u16be", length: 2 }));
  }

  set moves(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x78 + i * 4, type: "u16be", length: 2 }, value));
  }

  get pp(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x7A + i * 4, type: "u8", length: 1 }));
  }

  set pp(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x7A + i * 4, type: "u8", length: 1 }, value));
  }

  get ppUps(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x7B + i * 4, type: "u8", length: 1 }));
  }

  set ppUps(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x7B + i * 4, type: "u8", length: 1 }, value));
  }

  get heldItem(): number {
    return this.#store.number({ space: this.#space, offset: 0x88, type: "u16be", length: 2 });
  }

  set heldItem(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x88, type: "u16be", length: 2 }, value);
  }

  get currentHp(): number {
    return this.#store.number({ space: this.#space, offset: 0x8A, type: "u16be", length: 2 });
  }

  set currentHp(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x8A, type: "u16be", length: 2 }, value);
  }

  get stats(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x8C + i * 2, type: "u16be", length: 2 }));
  }

  set stats(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x8C + i * 2, type: "u16be", length: 2 }, value));
  }

  get evs(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x98 + i * 2, type: "u16be", length: 2 }));
  }

  set evs(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x98 + i * 2, type: "u16be", length: 2 }, value));
  }

  get ivs(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0xA4 + i * 2, type: "u16be", length: 2 }));
  }

  set ivs(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xA4 + i * 2, type: "u16be", length: 2 }, value));
  }

  get friendship(): number {
    return this.#store.number({ space: this.#space, offset: 0xB0, type: "u16be", length: 2 });
  }

  set friendship(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xB0, type: "u16be", length: 2 }, value);
  }

  get contestStats(): readonly (number)[] {
    return repeat(5, (i) => this.#store.number({ space: this.#space, offset: 0xB2 + i * 1, type: "u8", length: 1 }));
  }

  set contestStats(values: readonly (number)[]) {
    setEach(5, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xB2 + i * 1, type: "u8", length: 1 }, value));
  }

  get contestRibbons(): readonly (number)[] {
    return repeat(5, (i) => this.#store.number({ space: this.#space, offset: 0xB7 + i * 1, type: "u8", length: 1 }));
  }

  set contestRibbons(values: readonly (number)[]) {
    setEach(5, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xB7 + i * 1, type: "u8", length: 1 }, value));
  }

  get sheen(): number {
    return this.#store.number({ space: this.#space, offset: 0xBC, type: "u8", length: 1 });
  }

  set sheen(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xBC, type: "u8", length: 1 }, value);
  }

  get ribbons(): readonly (number)[] {
    return repeat(12, (i) => this.#store.number({ space: this.#space, offset: 0xBD + i * 1, type: "u8", length: 1 }));
  }

  set ribbons(values: readonly (number)[]) {
    setEach(12, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xBD + i * 1, type: "u8", length: 1 }, value));
  }

  get ribbonFlags(): Ck3RibbonFlags {
    return new Ck3RibbonFlags(this.#store, { space: this.#space, offset: 0xC9, type: "u8", length: 1 });
  }

  get pokerusStrain(): Ck3PokerusStrain {
    return new Ck3PokerusStrain(this.#store, { space: this.#space, offset: 0xCA, type: "u8", length: 1 });
  }

  get isEgg(): number {
    return this.#store.number({ space: this.#space, offset: 0xCB, type: "u8", length: 1 });
  }

  set isEgg(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xCB, type: "u8", length: 1 }, value);
  }

  get ability(): number {
    return this.#store.number({ space: this.#space, offset: 0xCC, type: "u8", length: 1 });
  }

  set ability(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xCC, type: "u8", length: 1 }, value);
  }

  get invalid(): number {
    return this.#store.number({ space: this.#space, offset: 0xCD, type: "u8", length: 1 });
  }

  set invalid(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xCD, type: "u8", length: 1 }, value);
  }

  get markings(): number {
    return this.#store.number({ space: this.#space, offset: 0xCF, type: "u8", length: 1 });
  }

  set markings(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xCF, type: "u8", length: 1 }, value);
  }

  get pokerusDays(): number {
    return this.#store.number({ space: this.#space, offset: 0xD0, type: "i8", length: 1 });
  }

  set pokerusDays(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xD0, type: "i8", length: 1 }, value);
  }

  get partySlot(): number {
    return this.#store.number({ space: this.#space, offset: 0xD7, type: "u8", length: 1 });
  }

  set partySlot(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xD7, type: "u8", length: 1 }, value);
  }

  get shadowId(): number {
    return this.#store.number({ space: this.#space, offset: 0xD8, type: "u16be", length: 2 });
  }

  set shadowId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xD8, type: "u16be", length: 2 }, value);
  }

  get purification(): number {
    return this.#store.number({ space: this.#space, offset: 0xDC, type: "i32be", length: 4 });
  }

  set purification(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xDC, type: "i32be", length: 4 }, value);
  }

  get fatefulEncounter(): Ck3FatefulEncounter {
    return new Ck3FatefulEncounter(this.#store, { space: this.#space, offset: 0xFB, type: "u8", length: 1 });
  }
}

export class Ck3OriginalTrainerId {
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

export class Ck3RibbonFlags {
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

  get unused1(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set unused1(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get unused2(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set unused2(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }

  get unused3(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 1 });
  }

  set unused3(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 1 }, value);
  }

  get unused4(): number {
    return this.#store.number({ ...this.#read, bit: 3, width: 1 });
  }

  set unused4(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 3, width: 1 }, value);
  }

  get fatefulEncounterJapanese(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 1 });
  }

  set fatefulEncounterJapanese(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 1 }, value);
  }
}

export class Ck3PokerusStrain {
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

export class Ck3FatefulEncounter {
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

export function read(file: Uint8Array): Ck3File {
  if (file.length === 312) return new Ck3File(file);
  throw new Error(`a ck3 file is 312 bytes, not ${file.length}`);
}
