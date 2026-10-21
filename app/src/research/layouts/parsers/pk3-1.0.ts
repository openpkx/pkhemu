// Generated from known/pk3-1.0.json by tools/parser/generate.ts. Run npm run parsers after changing either.
import { repeat, setEach, Store, type At, type Read, type SpaceDef } from "../tools/parser/runtime.ts";

export const target = {"schema":"1.0","format":"pk3","version":"1.0"};

const spaces: SpaceDef[] = [
  {"name":"pk3","length":80,"checksums":[{"step":"sum16le","start":32,"end":80,"at":28}]},
  {"name":"pk3-party","length":100,"checksums":[{"step":"sum16le","start":32,"end":80,"at":28}]},
];

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

export class Pk3File extends Pokemon {
  readonly #store: Store;

  constructor(file: Uint8Array) {
    const store = new Store(file, spaces.filter(({ name }) => name === "pk3"));
    super(store, { space: "pk3", index: 0, offset: 0 });
    this.#store = store;
  }

  get ranges(): Pk3 {
    return new Pk3(this.#store, "pk3");
  }

  write(): Uint8Array {
    return this.#store.write();
  }
}

export class Pk3PartyFile extends PartyPokemon {
  readonly #store: Store;

  constructor(file: Uint8Array) {
    const store = new Store(file, spaces.filter(({ name }) => name === "pk3-party"));
    super(store, { space: "pk3-party", index: 0, offset: 0 });
    this.#store = store;
  }

  get ranges(): Pk3Party {
    return new Pk3Party(this.#store, "pk3-party");
  }

  write(): Uint8Array {
    return this.#store.write();
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

export function read(file: Uint8Array): Pk3File | Pk3PartyFile {
  if (file.length === 80) return new Pk3File(file);
  if (file.length === 100) return new Pk3PartyFile(file);
  throw new Error(`a pk3 file is 80 or 100 bytes, not ${file.length}`);
}
