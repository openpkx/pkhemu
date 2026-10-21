// Generated from known/pk7-1.0.json by tools/parser/generate.ts. Run npm run parsers after changing either.
import { repeat, setEach, Store, type At, type Read, type SpaceDef } from "../tools/parser/runtime.ts";

export const target = {"schema":"1.0","format":"pk7","version":"1.0"};

const spaces: SpaceDef[] = [
  {"name":"pk7","length":232,"checksums":[{"step":"sum16le","start":8,"end":232,"at":6}]},
  {"name":"pk7-party","length":260,"checksums":[{"step":"sum16le","start":8,"end":232,"at":6}]},
];

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

export class Pk7File extends Pokemon {
  readonly #store: Store;

  constructor(file: Uint8Array) {
    const store = new Store(file, spaces.filter(({ name }) => name === "pk7"));
    super(store, { space: "pk7", index: 0, offset: 0 });
    this.#store = store;
  }

  get ranges(): Pk7 {
    return new Pk7(this.#store, "pk7");
  }

  write(): Uint8Array {
    return this.#store.write();
  }
}

export class Pk7PartyFile extends PartyPokemon {
  readonly #store: Store;

  constructor(file: Uint8Array) {
    const store = new Store(file, spaces.filter(({ name }) => name === "pk7-party"));
    super(store, { space: "pk7-party", index: 0, offset: 0 });
    this.#store = store;
  }

  get ranges(): Pk7Party {
    return new Pk7Party(this.#store, "pk7-party");
  }

  write(): Uint8Array {
    return this.#store.write();
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

export function read(file: Uint8Array): Pk7File | Pk7PartyFile {
  if (file.length === 232) return new Pk7File(file);
  if (file.length === 260) return new Pk7PartyFile(file);
  throw new Error(`a pk7 file is 232 or 260 bytes, not ${file.length}`);
}
