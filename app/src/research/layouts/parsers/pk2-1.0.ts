// Generated from known/pk2-1.0.json by tools/parser/generate.ts. Run npm run parsers after changing either.
import { repeat, setEach, Store, type At, type Read, type SpaceDef } from "../tools/parser/runtime.ts";

export const target = {"schema":"1.0","format":"pk2","version":"1.0"};

const spaces: SpaceDef[] = [
  {"name":"pk2","length":73},
];

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

export class Pk2File extends PartyPokemon {
  readonly #store: Store;

  constructor(file: Uint8Array) {
    const store = new Store(file, spaces.filter(({ name }) => name === "pk2"));
    super(store, { space: "pk2", index: 0, offset: 0 });
    this.#store = store;
  }

  get ranges(): Pk2 {
    return new Pk2(this.#store, "pk2");
  }

  write(): Uint8Array {
    return this.#store.write();
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

export function read(file: Uint8Array): Pk2File {
  if (file.length === 73) return new Pk2File(file);
  throw new Error(`a pk2 file is 73 bytes, not ${file.length}`);
}
