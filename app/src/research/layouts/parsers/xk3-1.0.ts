// Generated from known/xk3-1.0.json by tools/parser/generate.ts. Run npm run parsers after changing either.
import { repeat, setEach, Store, type At, type Read, type SpaceDef } from "../tools/parser/runtime.ts";

export const target = {"schema":"1.0","format":"xk3","version":"1.0"};

const spaces: SpaceDef[] = [
  {"name":"xk3","length":196},
];

export class PokemonEvs {
  readonly #store: Store;
  readonly #at: At;

  constructor(store: Store, at: At) {
    this.#store = store;
    this.#at = at;
  }

  get health(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x9C, type: "u16be", length: 2 });
  }

  set health(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x9C, type: "u16be", length: 2 }, value);
  }

  get attack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x9E, type: "u16be", length: 2 });
  }

  set attack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x9E, type: "u16be", length: 2 }, value);
  }

  get defense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xA0, type: "u16be", length: 2 });
  }

  set defense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xA0, type: "u16be", length: 2 }, value);
  }

  get specialAttack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xA2, type: "u16be", length: 2 });
  }

  set specialAttack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xA2, type: "u16be", length: 2 }, value);
  }

  get specialDefense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xA4, type: "u16be", length: 2 });
  }

  set specialDefense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xA4, type: "u16be", length: 2 }, value);
  }

  get speed(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xA6, type: "u16be", length: 2 });
  }

  set speed(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xA6, type: "u16be", length: 2 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0xA8, type: "u8", length: 1 });
  }

  set health(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xA8, type: "u8", length: 1 }, value);
  }

  get attack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xA9, type: "u8", length: 1 });
  }

  set attack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xA9, type: "u8", length: 1 }, value);
  }

  get defense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xAA, type: "u8", length: 1 });
  }

  set defense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xAA, type: "u8", length: 1 }, value);
  }

  get specialAttack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xAB, type: "u8", length: 1 });
  }

  set specialAttack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xAB, type: "u8", length: 1 }, value);
  }

  get specialDefense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xAC, type: "u8", length: 1 });
  }

  set specialDefense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xAC, type: "u8", length: 1 }, value);
  }

  get speed(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xAD, type: "u8", length: 1 });
  }

  set speed(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xAD, type: "u8", length: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x80 + this.#at.index * 4, type: "u16be", length: 2 });
  }

  set move(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x80 + this.#at.index * 4, type: "u16be", length: 2 }, value);
  }

  get pp(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x82 + this.#at.index * 4, type: "u8", length: 1 });
  }

  set pp(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x82 + this.#at.index * 4, type: "u8", length: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x24, type: "u32be", length: 4, bit: 0, width: 16 });
  }

  set tid(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x24, type: "u32be", length: 4, bit: 0, width: 16 }, value);
  }

  get sid(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x24, type: "u32be", length: 4, bit: 16, width: 16 });
  }

  set sid(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x24, type: "u32be", length: 4, bit: 16, width: 16 }, value);
  }

  get name(): string {
    return this.#store.text({ space: this.#at.space, offset: 0x38, type: "text-gen3-gc", length: 22 });
  }

  set name(value: string) {
    this.#store.setText({ space: this.#at.space, offset: 0x38, type: "text-gen3-gc", length: 22 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x8, type: "u16be", length: 2 });
  }

  set location(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x8, type: "u16be", length: 2 }, value);
  }

  get level(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xE, type: "u8", length: 1 });
  }

  set level(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xE, type: "u8", length: 1 }, value);
  }

  get version(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x34, type: "u8", length: 1 });
  }

  set version(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x34, type: "u8", length: 1 }, value);
  }

  get fatefulEncounter(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x33, type: "u8", length: 1, bit: 0, width: 1 });
  }

  set fatefulEncounter(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x33, type: "u8", length: 1, bit: 0, width: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x1D, type: "u8", length: 1, bit: 7, width: 1 });
  }

  set isEgg(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x1D, type: "u8", length: 1, bit: 7, width: 1 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x13, type: "u8", length: 1, bit: 0, width: 4 });
  }

  set strain(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x13, type: "u8", length: 1, bit: 0, width: 4 }, value);
  }

  get days(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x15, type: "i8", length: 1 });
  }

  set days(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x15, type: "i8", length: 1 }, value);
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
    this.moves = repeat(4, (index) => new PokemonMove(store, { space: this.#at.space, index, offset: 0x80 + index * 4 }));
    this.owner = new PokemonOwner(store, this.#at);
    this.metConditions = new PokemonMetConditions(store, this.#at);
    this.egg = new PokemonEgg(store, this.#at);
    this.pokerus = new PokemonPokerus(store, this.#at);
  }

  get pid(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x28, type: "u32be", length: 4 });
  }

  set pid(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x28, type: "u32be", length: 4 }, value);
  }

  get species(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x0, type: "u16be", length: 2 });
  }

  set species(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x0, type: "u16be", length: 2 }, value);
  }

  get nickname(): string {
    return this.#store.text({ space: this.#at.space, offset: 0x64, type: "text-gen3-gc", length: 22 });
  }

  set nickname(value: string) {
    this.#store.setText({ space: this.#at.space, offset: 0x64, type: "text-gen3-gc", length: 22 }, value);
  }

  get level(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x11, type: "u8", length: 1 });
  }

  set level(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x11, type: "u8", length: 1 }, value);
  }

  get experience(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x20, type: "u32be", length: 4 });
  }

  set experience(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x20, type: "u32be", length: 4 }, value);
  }

  get heldItem(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x2, type: "u16be", length: 2 });
  }

  set heldItem(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x2, type: "u16be", length: 2 }, value);
  }

  get friendship(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x6, type: "u16be", length: 2 });
  }

  set friendship(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x6, type: "u16be", length: 2 }, value);
  }

  get ball(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xF, type: "u8", length: 1 });
  }

  set ball(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xF, type: "u8", length: 1 }, value);
  }

  get language(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x37, type: "u8", length: 1 });
  }

  set language(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x37, type: "u8", length: 1 }, value);
  }

  get shadowId(): number {
    return this.#store.number({ space: this.#at.space, offset: 0xBA, type: "u16be", length: 2 });
  }

  set shadowId(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0xBA, type: "u16be", length: 2 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x90, type: "u16be", length: 2 });
  }

  set health(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x90, type: "u16be", length: 2 }, value);
  }

  get attack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x92, type: "u16be", length: 2 });
  }

  set attack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x92, type: "u16be", length: 2 }, value);
  }

  get defense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x94, type: "u16be", length: 2 });
  }

  set defense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x94, type: "u16be", length: 2 }, value);
  }

  get specialAttack(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x96, type: "u16be", length: 2 });
  }

  set specialAttack(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x96, type: "u16be", length: 2 }, value);
  }

  get specialDefense(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x98, type: "u16be", length: 2 });
  }

  set specialDefense(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x98, type: "u16be", length: 2 }, value);
  }

  get speed(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x9A, type: "u16be", length: 2 });
  }

  set speed(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x9A, type: "u16be", length: 2 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x4, type: "u16be", length: 2 });
  }

  set currentHp(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x4, type: "u16be", length: 2 }, value);
  }
}

export class Xk3File extends PartyPokemon {
  readonly #store: Store;

  constructor(file: Uint8Array) {
    const store = new Store(file, spaces.filter(({ name }) => name === "xk3"));
    super(store, { space: "xk3", index: 0, offset: 0 });
    this.#store = store;
  }

  get ranges(): Xk3 {
    return new Xk3(this.#store, "xk3");
  }

  write(): Uint8Array {
    return this.#store.write();
  }
}

export class Xk3 {
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

  get heldItem(): number {
    return this.#store.number({ space: this.#space, offset: 0x2, type: "u16be", length: 2 });
  }

  set heldItem(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2, type: "u16be", length: 2 }, value);
  }

  get currentHp(): number {
    return this.#store.number({ space: this.#space, offset: 0x4, type: "u16be", length: 2 });
  }

  set currentHp(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x4, type: "u16be", length: 2 }, value);
  }

  get friendship(): number {
    return this.#store.number({ space: this.#space, offset: 0x6, type: "u16be", length: 2 });
  }

  set friendship(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x6, type: "u16be", length: 2 }, value);
  }

  get metLocation(): number {
    return this.#store.number({ space: this.#space, offset: 0x8, type: "u16be", length: 2 });
  }

  set metLocation(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x8, type: "u16be", length: 2 }, value);
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

  get level(): number {
    return this.#store.number({ space: this.#space, offset: 0x11, type: "u8", length: 1 });
  }

  set level(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x11, type: "u8", length: 1 }, value);
  }

  get sheen(): number {
    return this.#store.number({ space: this.#space, offset: 0x12, type: "u8", length: 1 });
  }

  set sheen(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x12, type: "u8", length: 1 }, value);
  }

  get pokerusStrain(): Xk3PokerusStrain {
    return new Xk3PokerusStrain(this.#store, { space: this.#space, offset: 0x13, type: "u8", length: 1 });
  }

  get markings(): number {
    return this.#store.number({ space: this.#space, offset: 0x14, type: "u8", length: 1 });
  }

  set markings(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x14, type: "u8", length: 1 }, value);
  }

  get pokerusDays(): number {
    return this.#store.number({ space: this.#space, offset: 0x15, type: "i8", length: 1 });
  }

  set pokerusDays(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x15, type: "i8", length: 1 }, value);
  }

  get flags(): Xk3Flags {
    return new Xk3Flags(this.#store, { space: this.#space, offset: 0x1D, type: "u8", length: 1 });
  }

  get experience(): number {
    return this.#store.number({ space: this.#space, offset: 0x20, type: "u32be", length: 4 });
  }

  set experience(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x20, type: "u32be", length: 4 }, value);
  }

  get originalTrainerId(): Xk3OriginalTrainerId {
    return new Xk3OriginalTrainerId(this.#store, { space: this.#space, offset: 0x24, type: "u32be", length: 4 });
  }

  get pid(): number {
    return this.#store.number({ space: this.#space, offset: 0x28, type: "u32be", length: 4 });
  }

  set pid(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x28, type: "u32be", length: 4 }, value);
  }

  get obedient(): number {
    return this.#store.number({ space: this.#space, offset: 0x30, type: "u8", length: 1 });
  }

  set obedient(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x30, type: "u8", length: 1 }, value);
  }

  get encounterInfo(): Xk3EncounterInfo {
    return new Xk3EncounterInfo(this.#store, { space: this.#space, offset: 0x33, type: "u8", length: 1 });
  }

  get originGame(): number {
    return this.#store.number({ space: this.#space, offset: 0x34, type: "u8", length: 1 });
  }

  set originGame(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x34, type: "u8", length: 1 }, value);
  }

  get currentRegion(): number {
    return this.#store.number({ space: this.#space, offset: 0x35, type: "u8", length: 1 });
  }

  set currentRegion(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x35, type: "u8", length: 1 }, value);
  }

  get originalRegion(): number {
    return this.#store.number({ space: this.#space, offset: 0x36, type: "u8", length: 1 });
  }

  set originalRegion(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x36, type: "u8", length: 1 }, value);
  }

  get language(): number {
    return this.#store.number({ space: this.#space, offset: 0x37, type: "u8", length: 1 });
  }

  set language(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x37, type: "u8", length: 1 }, value);
  }

  get originalTrainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x38, type: "text-gen3-gc", length: 22 });
  }

  set originalTrainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x38, type: "text-gen3-gc", length: 22 }, value);
  }

  get nicknameDisplay(): string {
    return this.#store.text({ space: this.#space, offset: 0x4E, type: "text-gen3-gc", length: 22 });
  }

  set nicknameDisplay(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x4E, type: "text-gen3-gc", length: 22 }, value);
  }

  get nickname(): string {
    return this.#store.text({ space: this.#space, offset: 0x64, type: "text-gen3-gc", length: 22 });
  }

  set nickname(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x64, type: "text-gen3-gc", length: 22 }, value);
  }

  get ribbons(): Xk3Ribbons {
    return new Xk3Ribbons(this.#store, { space: this.#space, offset: 0x7C, type: "u16be", length: 2 });
  }

  get moves(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x80 + i * 4, type: "u16be", length: 2 }));
  }

  set moves(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x80 + i * 4, type: "u16be", length: 2 }, value));
  }

  get pp(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x82 + i * 4, type: "u8", length: 1 }));
  }

  set pp(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x82 + i * 4, type: "u8", length: 1 }, value));
  }

  get ppUps(): readonly (number)[] {
    return repeat(4, (i) => this.#store.number({ space: this.#space, offset: 0x83 + i * 4, type: "u8", length: 1 }));
  }

  set ppUps(values: readonly (number)[]) {
    setEach(4, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x83 + i * 4, type: "u8", length: 1 }, value));
  }

  get stats(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x90 + i * 2, type: "u16be", length: 2 }));
  }

  set stats(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x90 + i * 2, type: "u16be", length: 2 }, value));
  }

  get evs(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0x9C + i * 2, type: "u16be", length: 2 }));
  }

  set evs(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x9C + i * 2, type: "u16be", length: 2 }, value));
  }

  get ivs(): readonly (number)[] {
    return repeat(6, (i) => this.#store.number({ space: this.#space, offset: 0xA8 + i * 1, type: "u8", length: 1 }));
  }

  set ivs(values: readonly (number)[]) {
    setEach(6, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xA8 + i * 1, type: "u8", length: 1 }, value));
  }

  get contestStats(): readonly (number)[] {
    return repeat(5, (i) => this.#store.number({ space: this.#space, offset: 0xAE + i * 1, type: "u8", length: 1 }));
  }

  set contestStats(values: readonly (number)[]) {
    setEach(5, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xAE + i * 1, type: "u8", length: 1 }, value));
  }

  get contestRibbons(): readonly (number)[] {
    return repeat(5, (i) => this.#store.number({ space: this.#space, offset: 0xB3 + i * 1, type: "u8", length: 1 }));
  }

  set contestRibbons(values: readonly (number)[]) {
    setEach(5, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0xB3 + i * 1, type: "u8", length: 1 }, value));
  }

  get shadowId(): number {
    return this.#store.number({ space: this.#space, offset: 0xBA, type: "u16be", length: 2 });
  }

  set shadowId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xBA, type: "u16be", length: 2 }, value);
  }
}

export class Xk3PokerusStrain {
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

export class Xk3Flags {
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

  get captured(): number {
    return this.#store.number({ ...this.#read, bit: 2, width: 1 });
  }

  set captured(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 2, width: 1 }, value);
  }

  get blockTrades(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 1 });
  }

  set blockTrades(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 1 }, value);
  }

  get invalid(): number {
    return this.#store.number({ ...this.#read, bit: 5, width: 1 });
  }

  set invalid(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 5, width: 1 }, value);
  }

  get ability(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 1 });
  }

  set ability(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 1 }, value);
  }

  get isEgg(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 1 });
  }

  set isEgg(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 1 }, value);
  }
}

export class Xk3OriginalTrainerId {
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

export class Xk3EncounterInfo {
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

export class Xk3Ribbons {
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

  get world(): number {
    return this.#store.number({ ...this.#read, bit: 4, width: 1 });
  }

  set world(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 4, width: 1 }, value);
  }

  get earth(): number {
    return this.#store.number({ ...this.#read, bit: 5, width: 1 });
  }

  set earth(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 5, width: 1 }, value);
  }

  get national(): number {
    return this.#store.number({ ...this.#read, bit: 6, width: 1 });
  }

  set national(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 6, width: 1 }, value);
  }

  get country(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 1 });
  }

  set country(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 1 }, value);
  }

  get nationalChampion(): number {
    return this.#store.number({ ...this.#read, bit: 8, width: 1 });
  }

  set nationalChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 8, width: 1 }, value);
  }

  get regionalChampion(): number {
    return this.#store.number({ ...this.#read, bit: 9, width: 1 });
  }

  set regionalChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 9, width: 1 }, value);
  }

  get battleChampion(): number {
    return this.#store.number({ ...this.#read, bit: 10, width: 1 });
  }

  set battleChampion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 10, width: 1 }, value);
  }

  get effort(): number {
    return this.#store.number({ ...this.#read, bit: 11, width: 1 });
  }

  set effort(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 11, width: 1 }, value);
  }

  get artist(): number {
    return this.#store.number({ ...this.#read, bit: 12, width: 1 });
  }

  set artist(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 12, width: 1 }, value);
  }

  get victory(): number {
    return this.#store.number({ ...this.#read, bit: 13, width: 1 });
  }

  set victory(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 13, width: 1 }, value);
  }

  get winning(): number {
    return this.#store.number({ ...this.#read, bit: 14, width: 1 });
  }

  set winning(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 14, width: 1 }, value);
  }

  get champion(): number {
    return this.#store.number({ ...this.#read, bit: 15, width: 1 });
  }

  set champion(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 15, width: 1 }, value);
  }
}

export function read(file: Uint8Array): Xk3File {
  if (file.length === 196) return new Xk3File(file);
  throw new Error(`a xk3 file is 196 bytes, not ${file.length}`);
}
