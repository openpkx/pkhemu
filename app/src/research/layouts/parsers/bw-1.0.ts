// Generated from known/bw-1.0.json by tools/parser/generate.ts. Run npm run parsers after changing either.
import { counted, expand, repeat, setEach, spaceView, Store, type At, type Counted, type Read, type SpaceDef } from "../tools/parser/runtime.ts";

export const target = {"schema":"1.0","format":"bw","version":"1.0"};

const spaces: SpaceDef[] = [
  {"name":"save","length":524288,"checksums":[{"step":"crc16-ccitt","start":0,"end":992,"at":994},{"step":"crc16-ccitt","start":0,"end":992,"at":147200},{"step":"crc16-ccitt","start":1024,"end":5104,"at":5106},{"step":"crc16-ccitt","start":1024,"end":5104,"at":147202},{"step":"crc16-ccitt","start":5120,"end":9200,"at":9202},{"step":"crc16-ccitt","start":5120,"end":9200,"at":147204},{"step":"crc16-ccitt","start":9216,"end":13296,"at":13298},{"step":"crc16-ccitt","start":9216,"end":13296,"at":147206},{"step":"crc16-ccitt","start":13312,"end":17392,"at":17394},{"step":"crc16-ccitt","start":13312,"end":17392,"at":147208},{"step":"crc16-ccitt","start":17408,"end":21488,"at":21490},{"step":"crc16-ccitt","start":17408,"end":21488,"at":147210},{"step":"crc16-ccitt","start":21504,"end":25584,"at":25586},{"step":"crc16-ccitt","start":21504,"end":25584,"at":147212},{"step":"crc16-ccitt","start":25600,"end":29680,"at":29682},{"step":"crc16-ccitt","start":25600,"end":29680,"at":147214},{"step":"crc16-ccitt","start":29696,"end":33776,"at":33778},{"step":"crc16-ccitt","start":29696,"end":33776,"at":147216},{"step":"crc16-ccitt","start":33792,"end":37872,"at":37874},{"step":"crc16-ccitt","start":33792,"end":37872,"at":147218},{"step":"crc16-ccitt","start":37888,"end":41968,"at":41970},{"step":"crc16-ccitt","start":37888,"end":41968,"at":147220},{"step":"crc16-ccitt","start":41984,"end":46064,"at":46066},{"step":"crc16-ccitt","start":41984,"end":46064,"at":147222},{"step":"crc16-ccitt","start":46080,"end":50160,"at":50162},{"step":"crc16-ccitt","start":46080,"end":50160,"at":147224},{"step":"crc16-ccitt","start":50176,"end":54256,"at":54258},{"step":"crc16-ccitt","start":50176,"end":54256,"at":147226},{"step":"crc16-ccitt","start":54272,"end":58352,"at":58354},{"step":"crc16-ccitt","start":54272,"end":58352,"at":147228},{"step":"crc16-ccitt","start":58368,"end":62448,"at":62450},{"step":"crc16-ccitt","start":58368,"end":62448,"at":147230},{"step":"crc16-ccitt","start":62464,"end":66544,"at":66546},{"step":"crc16-ccitt","start":62464,"end":66544,"at":147232},{"step":"crc16-ccitt","start":66560,"end":70640,"at":70642},{"step":"crc16-ccitt","start":66560,"end":70640,"at":147234},{"step":"crc16-ccitt","start":70656,"end":74736,"at":74738},{"step":"crc16-ccitt","start":70656,"end":74736,"at":147236},{"step":"crc16-ccitt","start":74752,"end":78832,"at":78834},{"step":"crc16-ccitt","start":74752,"end":78832,"at":147238},{"step":"crc16-ccitt","start":78848,"end":82928,"at":82930},{"step":"crc16-ccitt","start":78848,"end":82928,"at":147240},{"step":"crc16-ccitt","start":82944,"end":87024,"at":87026},{"step":"crc16-ccitt","start":82944,"end":87024,"at":147242},{"step":"crc16-ccitt","start":87040,"end":91120,"at":91122},{"step":"crc16-ccitt","start":87040,"end":91120,"at":147244},{"step":"crc16-ccitt","start":91136,"end":95216,"at":95218},{"step":"crc16-ccitt","start":91136,"end":95216,"at":147246},{"step":"crc16-ccitt","start":95232,"end":99312,"at":99314},{"step":"crc16-ccitt","start":95232,"end":99312,"at":147248},{"step":"crc16-ccitt","start":99328,"end":101824,"at":101826},{"step":"crc16-ccitt","start":99328,"end":101824,"at":147250},{"step":"crc16-ccitt","start":101888,"end":103220,"at":103222},{"step":"crc16-ccitt","start":101888,"end":103220,"at":147252},{"step":"crc16-ccitt","start":103424,"end":103528,"at":103530},{"step":"crc16-ccitt","start":103424,"end":103528,"at":147254},{"step":"crc16-ccitt","start":103680,"end":103836,"at":103838},{"step":"crc16-ccitt","start":103680,"end":103836,"at":147256},{"step":"crc16-ccitt","start":103936,"end":108856,"at":108858},{"step":"crc16-ccitt","start":103936,"end":108856,"at":147258},{"step":"crc16-ccitt","start":109056,"end":111044,"at":111046},{"step":"crc16-ccitt","start":109056,"end":111044,"at":147260},{"step":"crc16-ccitt","start":111104,"end":114516,"at":114518},{"step":"crc16-ccitt","start":111104,"end":114516,"at":147262},{"step":"crc16-ccitt","start":114688,"end":114732,"at":114734},{"step":"crc16-ccitt","start":114688,"end":114732,"at":147264},{"step":"crc16-ccitt","start":114944,"end":116568,"at":116570},{"step":"crc16-ccitt","start":114944,"end":116568,"at":147266},{"step":"crc16-ccitt","start":116736,"end":119444,"at":119446},{"step":"crc16-ccitt","start":116736,"end":119444,"at":147268},{"step":"crc16-ccitt","start":119552,"end":119980,"at":119982},{"step":"crc16-ccitt","start":119552,"end":119980,"at":147270},{"step":"crc16-ccitt","start":120064,"end":121068,"at":121070},{"step":"crc16-ccitt","start":120064,"end":121068,"at":147272},{"step":"crc16-ccitt","start":121088,"end":121180,"at":121182},{"step":"crc16-ccitt","start":121088,"end":121180,"at":147274},{"step":"crc16-ccitt","start":121344,"end":121824,"at":121826},{"step":"crc16-ccitt","start":121344,"end":121824,"at":147276},{"step":"crc16-ccitt","start":121856,"end":122024,"at":122026},{"step":"crc16-ccitt","start":121856,"end":122024,"at":147278},{"step":"crc16-ccitt","start":122112,"end":123232,"at":123234},{"step":"crc16-ccitt","start":122112,"end":123232,"at":147280},{"step":"crc16-ccitt","start":123392,"end":128512,"at":128514},{"step":"crc16-ccitt","start":123392,"end":128512,"at":147282},{"step":"crc16-ccitt","start":128768,"end":129444,"at":129446},{"step":"crc16-ccitt","start":128768,"end":129444,"at":147284},{"step":"crc16-ccitt","start":129536,"end":130268,"at":130270},{"step":"crc16-ccitt","start":129536,"end":130268,"at":147286},{"step":"crc16-ccitt","start":130304,"end":131148,"at":131150},{"step":"crc16-ccitt","start":130304,"end":131148,"at":147288},{"step":"crc16-ccitt","start":131328,"end":132332,"at":132334},{"step":"crc16-ccitt","start":131328,"end":132332,"at":147290},{"step":"crc16-ccitt","start":132352,"end":132600,"at":132602},{"step":"crc16-ccitt","start":132352,"end":132600,"at":147292},{"step":"crc16-ccitt","start":132608,"end":133372,"at":133374},{"step":"crc16-ccitt","start":132608,"end":133372,"at":147294},{"step":"crc16-ccitt","start":133376,"end":133524,"at":133526},{"step":"crc16-ccitt","start":133376,"end":133524,"at":147296},{"step":"crc16-ccitt","start":133632,"end":134492,"at":134494},{"step":"crc16-ccitt","start":133632,"end":134492,"at":147298},{"step":"crc16-ccitt","start":134656,"end":135116,"at":135118},{"step":"crc16-ccitt","start":134656,"end":135116,"at":147300},{"step":"crc16-ccitt","start":135168,"end":135528,"at":135530},{"step":"crc16-ccitt","start":135168,"end":135528,"at":147302},{"step":"crc16-ccitt","start":135680,"end":135916,"at":135918},{"step":"crc16-ccitt","start":135680,"end":135916,"at":147304},{"step":"crc16-ccitt","start":135936,"end":136368,"at":136370},{"step":"crc16-ccitt","start":135936,"end":136368,"at":147306},{"step":"crc16-ccitt","start":136448,"end":136476,"at":136478},{"step":"crc16-ccitt","start":136448,"end":136476,"at":147308},{"step":"crc16-ccitt","start":136704,"end":137940,"at":137942},{"step":"crc16-ccitt","start":136704,"end":137940,"at":147310},{"step":"crc16-ccitt","start":137984,"end":138036,"at":138038},{"step":"crc16-ccitt","start":137984,"end":138036,"at":147312},{"step":"crc16-ccitt","start":138240,"end":138300,"at":138302},{"step":"crc16-ccitt","start":138240,"end":138300,"at":147314},{"step":"crc16-ccitt","start":138496,"end":138924,"at":138926},{"step":"crc16-ccitt","start":138496,"end":138924,"at":147316},{"step":"crc16-ccitt","start":139008,"end":141968,"at":141970},{"step":"crc16-ccitt","start":139008,"end":141968,"at":147318},{"step":"crc16-ccitt","start":142080,"end":142236,"at":142238},{"step":"crc16-ccitt","start":142080,"end":142236,"at":147320},{"step":"crc16-ccitt","start":142336,"end":144464,"at":144466},{"step":"crc16-ccitt","start":142336,"end":144464,"at":147322},{"step":"crc16-ccitt","start":144640,"end":144680,"at":144682},{"step":"crc16-ccitt","start":144640,"end":144680,"at":147324},{"step":"crc16-ccitt","start":144896,"end":145540,"at":145542},{"step":"crc16-ccitt","start":144896,"end":145540,"at":147326},{"step":"crc16-ccitt","start":145664,"end":145680,"at":145682},{"step":"crc16-ccitt","start":145664,"end":145680,"at":147328},{"step":"crc16-ccitt","start":145920,"end":146012,"at":146014},{"step":"crc16-ccitt","start":145920,"end":146012,"at":147330},{"step":"crc16-ccitt","start":146176,"end":146540,"at":146542},{"step":"crc16-ccitt","start":146176,"end":146540,"at":147332},{"step":"crc16-ccitt","start":146688,"end":146752,"at":146754},{"step":"crc16-ccitt","start":146688,"end":146752,"at":147334},{"step":"crc16-ccitt","start":146944,"end":147196,"at":147198},{"step":"crc16-ccitt","start":146944,"end":147196,"at":147336},{"step":"crc16-ccitt","start":147200,"end":147340,"at":147354}]},
  {"name":"party:{1..6}","length":220,"transform":"pk45-crypt","source":{"regions":[{"space":"save","start":101888,"end":103220}],"offset":8,"stride":220},"checksums":[{"step":"sum16le","start":8,"end":136,"at":6}]},
  {"name":"box:{1..24}:{1..30}","length":136,"transform":"pk45-crypt","source":{"regions":[{"space":"save","start":1024,"end":5104},{"space":"save","start":5120,"end":9200},{"space":"save","start":9216,"end":13296},{"space":"save","start":13312,"end":17392},{"space":"save","start":17408,"end":21488},{"space":"save","start":21504,"end":25584},{"space":"save","start":25600,"end":29680},{"space":"save","start":29696,"end":33776},{"space":"save","start":33792,"end":37872},{"space":"save","start":37888,"end":41968},{"space":"save","start":41984,"end":46064},{"space":"save","start":46080,"end":50160},{"space":"save","start":50176,"end":54256},{"space":"save","start":54272,"end":58352},{"space":"save","start":58368,"end":62448},{"space":"save","start":62464,"end":66544},{"space":"save","start":66560,"end":70640},{"space":"save","start":70656,"end":74736},{"space":"save","start":74752,"end":78832},{"space":"save","start":78848,"end":82928},{"space":"save","start":82944,"end":87024},{"space":"save","start":87040,"end":91120},{"space":"save","start":91136,"end":95216},{"space":"save","start":95232,"end":99312}],"offset":0,"stride":136},"checksums":[{"step":"sum16le","start":8,"end":136,"at":6}]},
];

export type Spaces =
  { "save": SaveSpace } &
  { [Name in `party:${1 | 2 | 3 | 4 | 5 | 6}`]: Pk5Party } &
  { [Name in `box:${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24}:${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30}`]: Pk5 };

export type SpaceName = keyof Spaces;

export class Trainer {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get name(): string {
    return this.#store.text({ space: "save", offset: 0x19404, type: "text-gen5", length: 16 });
  }

  set name(value: string) {
    this.#store.setText({ space: "save", offset: 0x19404, type: "text-gen5", length: 16 }, value);
  }

  get gender(): number {
    return this.#store.number({ space: "save", offset: 0x19421, type: "u8", length: 1 });
  }

  set gender(value: number) {
    this.#store.setNumber({ space: "save", offset: 0x19421, type: "u8", length: 1 }, value);
  }

  get tid(): number {
    return this.#store.number({ space: "save", offset: 0x19414, type: "u16le", length: 2 });
  }

  set tid(value: number) {
    this.#store.setNumber({ space: "save", offset: 0x19414, type: "u16le", length: 2 }, value);
  }

  get sid(): number {
    return this.#store.number({ space: "save", offset: 0x19416, type: "u16le", length: 2 });
  }

  set sid(value: number) {
    this.#store.setNumber({ space: "save", offset: 0x19416, type: "u16le", length: 2 }, value);
  }

  get money(): number {
    return this.#store.number({ space: "save", offset: 0x21200, type: "u32le", length: 4 });
  }

  set money(value: number) {
    this.#store.setNumber({ space: "save", offset: 0x21200, type: "u32le", length: 4 }, value);
  }
}

export class PlayTime {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get hours(): number {
    return this.#store.number({ space: "save", offset: 0x19424, type: "u16le", length: 2 });
  }

  set hours(value: number) {
    this.#store.setNumber({ space: "save", offset: 0x19424, type: "u16le", length: 2 }, value);
  }

  get minutes(): number {
    return this.#store.number({ space: "save", offset: 0x19426, type: "u8", length: 1 });
  }

  set minutes(value: number) {
    this.#store.setNumber({ space: "save", offset: 0x19426, type: "u8", length: 1 }, value);
  }

  get seconds(): number {
    return this.#store.number({ space: "save", offset: 0x19427, type: "u8", length: 1 });
  }

  set seconds(value: number) {
    this.#store.setNumber({ space: "save", offset: 0x19427, type: "u8", length: 1 }, value);
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
    return this.#store.text({ space: this.#at.space, offset: 0x68, type: "text-gen5", length: 16 });
  }

  set name(value: string) {
    this.#store.setText({ space: this.#at.space, offset: 0x68, type: "text-gen5", length: 16 }, value);
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
    return this.#store.text({ space: this.#at.space, offset: 0x48, type: "text-gen5", length: 22 });
  }

  set nickname(value: string) {
    this.#store.setText({ space: this.#at.space, offset: 0x48, type: "text-gen5", length: 22 }, value);
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

  get nature(): number {
    return this.#store.number({ space: this.#at.space, offset: 0x41, type: "u8", length: 1 });
  }

  set nature(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x41, type: "u8", length: 1 }, value);
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
    return this.#store.text({ space: "save", offset: 0x4 + this.#at.index * 40, type: "text-gen5", length: 20 });
  }

  set name(value: string) {
    this.#store.setText({ space: "save", offset: 0x4 + this.#at.index * 40, type: "text-gen5", length: 20 }, value);
  }

  get wallpaper(): number {
    return this.#store.number({ space: "save", offset: 0x3C4 + this.#at.index * 1, type: "u8", length: 1 });
  }

  set wallpaper(value: number) {
    this.#store.setNumber({ space: "save", offset: 0x3C4 + this.#at.index * 1, type: "u8", length: 1 }, value);
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
    this.items = repeat(310, (index) => new Item(store, { space: "save", index, offset: 0x18400 + index * 4 }));
    this.keyItems = repeat(83, (index) => new Item(store, { space: "save", index, offset: 0x188D8 + index * 4 }));
    this.tmsHms = repeat(109, (index) => new Item(store, { space: "save", index, offset: 0x18A24 + index * 4 }));
    this.medicine = repeat(48, (index) => new Item(store, { space: "save", index, offset: 0x18BD8 + index * 4 }));
    this.berries = repeat(64, (index) => new Item(store, { space: "save", index, offset: 0x18C98 + index * 4 }));
  }
}

export class Badges {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get badge1(): number {
    return this.#store.number({ space: "save", offset: 0x21204, type: "u8", length: 1, bit: 0, width: 1 });
  }

  set badge1(value: number) {
    this.#store.setNumber({ space: "save", offset: 0x21204, type: "u8", length: 1, bit: 0, width: 1 }, value);
  }

  get badge2(): number {
    return this.#store.number({ space: "save", offset: 0x21204, type: "u8", length: 1, bit: 1, width: 1 });
  }

  set badge2(value: number) {
    this.#store.setNumber({ space: "save", offset: 0x21204, type: "u8", length: 1, bit: 1, width: 1 }, value);
  }

  get badge3(): number {
    return this.#store.number({ space: "save", offset: 0x21204, type: "u8", length: 1, bit: 2, width: 1 });
  }

  set badge3(value: number) {
    this.#store.setNumber({ space: "save", offset: 0x21204, type: "u8", length: 1, bit: 2, width: 1 }, value);
  }

  get badge4(): number {
    return this.#store.number({ space: "save", offset: 0x21204, type: "u8", length: 1, bit: 3, width: 1 });
  }

  set badge4(value: number) {
    this.#store.setNumber({ space: "save", offset: 0x21204, type: "u8", length: 1, bit: 3, width: 1 }, value);
  }

  get badge5(): number {
    return this.#store.number({ space: "save", offset: 0x21204, type: "u8", length: 1, bit: 4, width: 1 });
  }

  set badge5(value: number) {
    this.#store.setNumber({ space: "save", offset: 0x21204, type: "u8", length: 1, bit: 4, width: 1 }, value);
  }

  get badge6(): number {
    return this.#store.number({ space: "save", offset: 0x21204, type: "u8", length: 1, bit: 5, width: 1 });
  }

  set badge6(value: number) {
    this.#store.setNumber({ space: "save", offset: 0x21204, type: "u8", length: 1, bit: 5, width: 1 }, value);
  }

  get badge7(): number {
    return this.#store.number({ space: "save", offset: 0x21204, type: "u8", length: 1, bit: 6, width: 1 });
  }

  set badge7(value: number) {
    this.#store.setNumber({ space: "save", offset: 0x21204, type: "u8", length: 1, bit: 6, width: 1 }, value);
  }

  get badge8(): number {
    return this.#store.number({ space: "save", offset: 0x21204, type: "u8", length: 1, bit: 7, width: 1 });
  }

  set badge8(value: number) {
    this.#store.setNumber({ space: "save", offset: 0x21204, type: "u8", length: 1, bit: 7, width: 1 }, value);
  }
}

export class Pokedex {
  readonly #store: Store;

  constructor(store: Store, _at: At) {
    this.#store = store;
  }

  get owned(): readonly boolean[] {
    return this.#store.flags({ space: "save", offset: 0x21608, type: "flags", length: 84 });
  }

  set owned(value: readonly boolean[]) {
    this.#store.setFlags({ space: "save", offset: 0x21608, type: "flags", length: 84 }, value);
  }

  get seen(): readonly boolean[] {
    return this.#store.flags({ space: "save", offset: 0x2165C, type: "flags", length: 84 });
  }

  set seen(value: readonly boolean[]) {
    this.#store.setFlags({ space: "save", offset: 0x2165C, type: "flags", length: 84 }, value);
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
    return this.#store.number({ space: this.#at.space, offset: 0x20100 + this.#at.index * 2, type: "u16le", length: 2 });
  }

  set value(value: number) {
    this.#store.setNumber({ space: this.#at.space, offset: 0x20100 + this.#at.index * 2, type: "u16le", length: 2 }, value);
  }
}

export class Events {
  readonly #store: Store;
  readonly work: readonly EventsEventWork[];

  constructor(store: Store, _at: At) {
    this.#store = store;
    this.work = repeat(318, (index) => new EventsEventWork(store, { space: "save", index, offset: 0x20100 + index * 2 }));
  }

  get flags(): readonly boolean[] {
    return this.#store.flags({ space: "save", offset: 0x2037C, type: "flags", length: 364 });
  }

  set flags(value: readonly boolean[]) {
    this.#store.setFlags({ space: "save", offset: 0x2037C, type: "flags", length: 364 }, value);
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
    this.party = counted(expand("party:{1..6}").map((space, index) => new PartyPokemon(store, { space, index, offset: 0 })), store, { space: "save", offset: 0x18E04, type: "u8", length: 1 });
    this.boxes = expand("box:{1..24}").map((space, index) => new Box(store, { space, index, offset: 0 }));
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

  get currentBox(): number {
    return this.#store.number({ space: this.#space, offset: 0x0, type: "u8", length: 1 });
  }

  set currentBox(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x0, type: "u8", length: 1 }, value);
  }

  get boxNames(): readonly (string)[] {
    return repeat(24, (i) => this.#store.text({ space: this.#space, offset: 0x4 + i * 40, type: "text-gen5", length: 20 }));
  }

  set boxNames(values: readonly (string)[]) {
    setEach(24, values, (value, i) => this.#store.setText({ space: this.#space, offset: 0x4 + i * 40, type: "text-gen5", length: 20 }, value));
  }

  get boxWallpapers(): readonly (number)[] {
    return repeat(24, (i) => this.#store.number({ space: this.#space, offset: 0x3C4 + i * 1, type: "u8", length: 1 }));
  }

  set boxWallpapers(values: readonly (number)[]) {
    setEach(24, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x3C4 + i * 1, type: "u8", length: 1 }, value));
  }

  get boxesUnlocked(): number {
    return this.#store.number({ space: this.#space, offset: 0x3DD, type: "u8", length: 1 });
  }

  set boxesUnlocked(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x3DD, type: "u8", length: 1 }, value);
  }

  get block00Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x3E2, type: "u16le", length: 2 });
  }

  set block00Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x3E2, type: "u16le", length: 2 }, value);
  }

  get boxPokemon(): readonly (Uint8Array)[] {
    return repeat(24, (i) => this.#store.raw({ space: this.#space, offset: 0x400 + i * 4096, type: "bytes", length: 4080 }));
  }

  set boxPokemon(values: readonly (Uint8Array)[]) {
    setEach(24, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0x400 + i * 4096, type: "bytes", length: 4080 }, value));
  }

  get block01Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x13F2, type: "u16le", length: 2 });
  }

  set block01Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x13F2, type: "u16le", length: 2 }, value);
  }

  get block02Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F2, type: "u16le", length: 2 });
  }

  set block02Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F2, type: "u16le", length: 2 }, value);
  }

  get block03Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x33F2, type: "u16le", length: 2 });
  }

  set block03Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x33F2, type: "u16le", length: 2 }, value);
  }

  get block04Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x43F2, type: "u16le", length: 2 });
  }

  set block04Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x43F2, type: "u16le", length: 2 }, value);
  }

  get block05Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x53F2, type: "u16le", length: 2 });
  }

  set block05Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x53F2, type: "u16le", length: 2 }, value);
  }

  get block06Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x63F2, type: "u16le", length: 2 });
  }

  set block06Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x63F2, type: "u16le", length: 2 }, value);
  }

  get block07Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x73F2, type: "u16le", length: 2 });
  }

  set block07Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x73F2, type: "u16le", length: 2 }, value);
  }

  get block08Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x83F2, type: "u16le", length: 2 });
  }

  set block08Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x83F2, type: "u16le", length: 2 }, value);
  }

  get block09Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x93F2, type: "u16le", length: 2 });
  }

  set block09Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x93F2, type: "u16le", length: 2 }, value);
  }

  get block10Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0xA3F2, type: "u16le", length: 2 });
  }

  set block10Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xA3F2, type: "u16le", length: 2 }, value);
  }

  get block11Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0xB3F2, type: "u16le", length: 2 });
  }

  set block11Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xB3F2, type: "u16le", length: 2 }, value);
  }

  get block12Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0xC3F2, type: "u16le", length: 2 });
  }

  set block12Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xC3F2, type: "u16le", length: 2 }, value);
  }

  get block13Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0xD3F2, type: "u16le", length: 2 });
  }

  set block13Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xD3F2, type: "u16le", length: 2 }, value);
  }

  get block14Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0xE3F2, type: "u16le", length: 2 });
  }

  set block14Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xE3F2, type: "u16le", length: 2 }, value);
  }

  get block15Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0xF3F2, type: "u16le", length: 2 });
  }

  set block15Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0xF3F2, type: "u16le", length: 2 }, value);
  }

  get block16Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x103F2, type: "u16le", length: 2 });
  }

  set block16Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x103F2, type: "u16le", length: 2 }, value);
  }

  get block17Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x113F2, type: "u16le", length: 2 });
  }

  set block17Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x113F2, type: "u16le", length: 2 }, value);
  }

  get block18Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x123F2, type: "u16le", length: 2 });
  }

  set block18Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x123F2, type: "u16le", length: 2 }, value);
  }

  get block19Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x133F2, type: "u16le", length: 2 });
  }

  set block19Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x133F2, type: "u16le", length: 2 }, value);
  }

  get block20Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x143F2, type: "u16le", length: 2 });
  }

  set block20Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x143F2, type: "u16le", length: 2 }, value);
  }

  get block21Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x153F2, type: "u16le", length: 2 });
  }

  set block21Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x153F2, type: "u16le", length: 2 }, value);
  }

  get block22Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x163F2, type: "u16le", length: 2 });
  }

  set block22Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x163F2, type: "u16le", length: 2 }, value);
  }

  get block23Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x173F2, type: "u16le", length: 2 });
  }

  set block23Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x173F2, type: "u16le", length: 2 }, value);
  }

  get block24Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x183F2, type: "u16le", length: 2 });
  }

  set block24Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x183F2, type: "u16le", length: 2 }, value);
  }

  get itemsPocket(): readonly SaveSpaceItemsPocket[] {
    return repeat(310, (i) => new SaveSpaceItemsPocket(this.#store, { space: this.#space, offset: 0x18400 + i * 4, type: "u32le", length: 4 }));
  }

  get keyItemsPocket(): readonly SaveSpaceKeyItemsPocket[] {
    return repeat(83, (i) => new SaveSpaceKeyItemsPocket(this.#store, { space: this.#space, offset: 0x188D8 + i * 4, type: "u32le", length: 4 }));
  }

  get tmsAndHmsPocket(): readonly SaveSpaceTmsAndHmsPocket[] {
    return repeat(109, (i) => new SaveSpaceTmsAndHmsPocket(this.#store, { space: this.#space, offset: 0x18A24 + i * 4, type: "u32le", length: 4 }));
  }

  get medicinePocket(): readonly SaveSpaceMedicinePocket[] {
    return repeat(48, (i) => new SaveSpaceMedicinePocket(this.#store, { space: this.#space, offset: 0x18BD8 + i * 4, type: "u32le", length: 4 }));
  }

  get berriesPocket(): readonly SaveSpaceBerriesPocket[] {
    return repeat(64, (i) => new SaveSpaceBerriesPocket(this.#store, { space: this.#space, offset: 0x18C98 + i * 4, type: "u32le", length: 4 }));
  }

  get block25Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x18DC2, type: "u16le", length: 2 });
  }

  set block25Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x18DC2, type: "u16le", length: 2 }, value);
  }

  get partyCount(): number {
    return this.#store.number({ space: this.#space, offset: 0x18E04, type: "u8", length: 1 });
  }

  set partyCount(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x18E04, type: "u8", length: 1 }, value);
  }

  get partyPokemon(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x18E08, type: "bytes", length: 1320 });
  }

  set partyPokemon(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x18E08, type: "bytes", length: 1320 }, value);
  }

  get block26Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x19336, type: "u16le", length: 2 });
  }

  set block26Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x19336, type: "u16le", length: 2 }, value);
  }

  get trainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x19404, type: "text-gen5", length: 16 });
  }

  set trainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x19404, type: "text-gen5", length: 16 }, value);
  }

  get trainerId(): number {
    return this.#store.number({ space: this.#space, offset: 0x19414, type: "u16le", length: 2 });
  }

  set trainerId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x19414, type: "u16le", length: 2 }, value);
  }

  get secretId(): number {
    return this.#store.number({ space: this.#space, offset: 0x19416, type: "u16le", length: 2 });
  }

  set secretId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x19416, type: "u16le", length: 2 }, value);
  }

  get gameSyncId(): number {
    return this.#store.number({ space: this.#space, offset: 0x19418, type: "u32le", length: 4 });
  }

  set gameSyncId(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x19418, type: "u32le", length: 4 }, value);
  }

  get country(): number {
    return this.#store.number({ space: this.#space, offset: 0x1941C, type: "u8", length: 1 });
  }

  set country(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1941C, type: "u8", length: 1 }, value);
  }

  get region(): number {
    return this.#store.number({ space: this.#space, offset: 0x1941D, type: "u8", length: 1 });
  }

  set region(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1941D, type: "u8", length: 1 }, value);
  }

  get language(): number {
    return this.#store.number({ space: this.#space, offset: 0x1941E, type: "u8", length: 1 });
  }

  set language(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1941E, type: "u8", length: 1 }, value);
  }

  get game(): number {
    return this.#store.number({ space: this.#space, offset: 0x1941F, type: "u8", length: 1 });
  }

  set game(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1941F, type: "u8", length: 1 }, value);
  }

  get trainerGender(): number {
    return this.#store.number({ space: this.#space, offset: 0x19421, type: "u8", length: 1 });
  }

  set trainerGender(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x19421, type: "u8", length: 1 }, value);
  }

  get playTimeHours(): number {
    return this.#store.number({ space: this.#space, offset: 0x19424, type: "u16le", length: 2 });
  }

  set playTimeHours(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x19424, type: "u16le", length: 2 }, value);
  }

  get playTimeMinutes(): number {
    return this.#store.number({ space: this.#space, offset: 0x19426, type: "u8", length: 1 });
  }

  set playTimeMinutes(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x19426, type: "u8", length: 1 }, value);
  }

  get playTimeSeconds(): number {
    return this.#store.number({ space: this.#space, offset: 0x19427, type: "u8", length: 1 });
  }

  set playTimeSeconds(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x19427, type: "u8", length: 1 }, value);
  }

  get lastSaved(): SaveSpaceLastSaved {
    return new SaveSpaceLastSaved(this.#store, { space: this.#space, offset: 0x19428, type: "u32le", length: 4 });
  }

  get extraDataMagic(): readonly (number)[] {
    return repeat(9, (i) => this.#store.number({ space: this.#space, offset: 0x19430 + i * 2, type: "u16le", length: 2 }));
  }

  set extraDataMagic(values: readonly (number)[]) {
    setEach(9, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x19430 + i * 2, type: "u16le", length: 2 }, value));
  }

  get extraDataCounts(): readonly (number)[] {
    return repeat(9, (i) => this.#store.number({ space: this.#space, offset: 0x19444 + i * 4, type: "u32le", length: 4 }));
  }

  set extraDataCounts(values: readonly (number)[]) {
    setEach(9, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x19444 + i * 4, type: "u32le", length: 4 }, value));
  }

  get block27Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x1946A, type: "u16le", length: 2 });
  }

  set block27Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1946A, type: "u16le", length: 2 }, value);
  }

  get currentMap(): number {
    return this.#store.number({ space: this.#space, offset: 0x19580, type: "u32le", length: 4 });
  }

  set currentMap(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x19580, type: "u32le", length: 4 }, value);
  }

  get playerXPosition(): number {
    return this.#store.number({ space: this.#space, offset: 0x19586, type: "u16le", length: 2 });
  }

  set playerXPosition(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x19586, type: "u16le", length: 2 }, value);
  }

  get playerZPosition(): number {
    return this.#store.number({ space: this.#space, offset: 0x1958A, type: "u16le", length: 2 });
  }

  set playerZPosition(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1958A, type: "u16le", length: 2 }, value);
  }

  get playerYPosition(): number {
    return this.#store.number({ space: this.#space, offset: 0x1958E, type: "u16le", length: 2 });
  }

  set playerYPosition(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1958E, type: "u16le", length: 2 }, value);
  }

  get block28Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x1959E, type: "u16le", length: 2 });
  }

  set block28Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1959E, type: "u16le", length: 2 }, value);
  }

  get block29Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x1A93A, type: "u16le", length: 2 });
  }

  set block29Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1A93A, type: "u16le", length: 2 }, value);
  }

  get block30Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x1B1C6, type: "u16le", length: 2 });
  }

  set block30Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1B1C6, type: "u16le", length: 2 }, value);
  }

  get block31Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x1BF56, type: "u16le", length: 2 });
  }

  set block31Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1BF56, type: "u16le", length: 2 }, value);
  }

  get block32Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x1C02E, type: "u16le", length: 2 });
  }

  set block32Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1C02E, type: "u16le", length: 2 }, value);
  }

  get block33Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x1C75A, type: "u16le", length: 2 });
  }

  set block33Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1C75A, type: "u16le", length: 2 }, value);
  }

  get block34Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x1D296, type: "u16le", length: 2 });
  }

  set block34Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1D296, type: "u16le", length: 2 }, value);
  }

  get block35Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x1D4AE, type: "u16le", length: 2 });
  }

  set block35Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1D4AE, type: "u16le", length: 2 }, value);
  }

  get block36Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x1D8EE, type: "u16le", length: 2 });
  }

  set block36Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1D8EE, type: "u16le", length: 2 }, value);
  }

  get adventureStarted(): bigint {
    return this.#store.bigint({ space: this.#space, offset: 0x1D934, type: "u64le", length: 8 });
  }

  set adventureStarted(value: bigint) {
    this.#store.setBigint({ space: this.#space, offset: 0x1D934, type: "u64le", length: 8 }, value);
  }

  get hallOfFameEntered(): bigint {
    return this.#store.bigint({ space: this.#space, offset: 0x1D93C, type: "u64le", length: 8 });
  }

  set hallOfFameEntered(value: bigint) {
    this.#store.setBigint({ space: this.#space, offset: 0x1D93C, type: "u64le", length: 8 }, value);
  }

  get block37Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x1D95E, type: "u16le", length: 2 });
  }

  set block37Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1D95E, type: "u16le", length: 2 }, value);
  }

  get block38Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x1DBE2, type: "u16le", length: 2 });
  }

  set block38Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1DBE2, type: "u16le", length: 2 }, value);
  }

  get block39Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x1DCAA, type: "u16le", length: 2 });
  }

  set block39Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1DCAA, type: "u16le", length: 2 }, value);
  }

  get block40Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x1E162, type: "u16le", length: 2 });
  }

  set block40Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1E162, type: "u16le", length: 2 }, value);
  }

  get block41Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x1F602, type: "u16le", length: 2 });
  }

  set block41Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1F602, type: "u16le", length: 2 }, value);
  }

  get block42Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x1F9A6, type: "u16le", length: 2 });
  }

  set block42Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1F9A6, type: "u16le", length: 2 }, value);
  }

  get block43Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x1FCDE, type: "u16le", length: 2 });
  }

  set block43Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x1FCDE, type: "u16le", length: 2 }, value);
  }

  get block44Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x2004E, type: "u16le", length: 2 });
  }

  set block44Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2004E, type: "u16le", length: 2 }, value);
  }

  get eventWork(): readonly (number)[] {
    return repeat(318, (i) => this.#store.number({ space: this.#space, offset: 0x20100 + i * 2, type: "u16le", length: 2 }));
  }

  set eventWork(values: readonly (number)[]) {
    setEach(318, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x20100 + i * 2, type: "u16le", length: 2 }, value));
  }

  get eventFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x2037C, type: "flags", length: 364 });
  }

  set eventFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x2037C, type: "flags", length: 364 }, value);
  }

  get block45Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x204EE, type: "u16le", length: 2 });
  }

  set block45Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x204EE, type: "u16le", length: 2 }, value);
  }

  get block46Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x205FA, type: "u16le", length: 2 });
  }

  set block46Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x205FA, type: "u16le", length: 2 }, value);
  }

  get block47Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x208FE, type: "u16le", length: 2 });
  }

  set block47Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x208FE, type: "u16le", length: 2 }, value);
  }

  get block48Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x20996, type: "u16le", length: 2 });
  }

  set block48Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x20996, type: "u16le", length: 2 }, value);
  }

  get block49Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x20D5E, type: "u16le", length: 2 });
  }

  set block49Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x20D5E, type: "u16le", length: 2 }, value);
  }

  get daycareOccupied(): readonly (number)[] {
    return repeat(2, (i) => this.#store.number({ space: this.#space, offset: 0x20E00 + i * 228, type: "u32le", length: 4 }));
  }

  set daycareOccupied(values: readonly (number)[]) {
    setEach(2, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x20E00 + i * 228, type: "u32le", length: 4 }, value));
  }

  get daycarePokemon(): readonly (Uint8Array)[] {
    return repeat(2, (i) => this.#store.raw({ space: this.#space, offset: 0x20E04 + i * 228, type: "bytes", length: 220 }));
  }

  set daycarePokemon(values: readonly (Uint8Array)[]) {
    setEach(2, values, (value, i) => this.#store.setRaw({ space: this.#space, offset: 0x20E04 + i * 228, type: "bytes", length: 220 }, value));
  }

  get daycareExperienceGained(): readonly (number)[] {
    return repeat(2, (i) => this.#store.number({ space: this.#space, offset: 0x20EE0 + i * 228, type: "u32le", length: 4 }));
  }

  set daycareExperienceGained(values: readonly (number)[]) {
    setEach(2, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x20EE0 + i * 228, type: "u32le", length: 4 }, value));
  }

  get daycareFlags(): SaveSpaceDaycareFlags {
    return new SaveSpaceDaycareFlags(this.#store, { space: this.#space, offset: 0x20FC8, type: "u8", length: 1 });
  }

  get block50Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x20FCE, type: "u16le", length: 2 });
  }

  set block50Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x20FCE, type: "u16le", length: 2 }, value);
  }

  get block51Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x2116A, type: "u16le", length: 2 });
  }

  set block51Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2116A, type: "u16le", length: 2 }, value);
  }

  get money(): number {
    return this.#store.number({ space: this.#space, offset: 0x21200, type: "u32le", length: 4 });
  }

  set money(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x21200, type: "u32le", length: 4 }, value);
  }

  get badges(): SaveSpaceBadges {
    return new SaveSpaceBadges(this.#store, { space: this.#space, offset: 0x21204, type: "u8", length: 1 });
  }

  get pokeTransferScore(): number {
    return this.#store.number({ space: this.#space, offset: 0x21214, type: "u16le", length: 2 });
  }

  set pokeTransferScore(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x21214, type: "u16le", length: 2 }, value);
  }

  get badgeVictorySpecies(): readonly (number)[] {
    return repeat(48, (i) => this.#store.number({ space: this.#space, offset: 0x21258 + i * 2, type: "u16le", length: 2 }));
  }

  set badgeVictorySpecies(values: readonly (number)[]) {
    setEach(48, values, (value, i) => this.#store.setNumber({ space: this.#space, offset: 0x21258 + i * 2, type: "u16le", length: 2 }, value));
  }

  get libertyPass(): number {
    return this.#store.number({ space: this.#space, offset: 0x212BC, type: "u32le", length: 4 });
  }

  set libertyPass(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x212BC, type: "u32le", length: 4 }, value);
  }

  get block52Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x212EE, type: "u16le", length: 2 });
  }

  set block52Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x212EE, type: "u16le", length: 2 }, value);
  }

  get block53Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x214B2, type: "u16le", length: 2 });
  }

  set block53Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x214B2, type: "u16le", length: 2 }, value);
  }

  get block54Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x2151E, type: "u16le", length: 2 });
  }

  set block54Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2151E, type: "u16le", length: 2 }, value);
  }

  get pokedexMagic(): number {
    return this.#store.number({ space: this.#space, offset: 0x21600, type: "u32le", length: 4 });
  }

  set pokedexMagic(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x21600, type: "u32le", length: 4 }, value);
  }

  get pokedexFlags(): SaveSpacePokedexFlags {
    return new SaveSpacePokedexFlags(this.#store, { space: this.#space, offset: 0x21604, type: "u32le", length: 4 });
  }

  get pokedexOwnedFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x21608, type: "flags", length: 84 });
  }

  set pokedexOwnedFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x21608, type: "flags", length: 84 }, value);
  }

  get pokedexSeenMaleFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x2165C, type: "flags", length: 84 });
  }

  set pokedexSeenMaleFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x2165C, type: "flags", length: 84 }, value);
  }

  get pokedexSeenFemaleFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x216B0, type: "flags", length: 84 });
  }

  set pokedexSeenFemaleFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x216B0, type: "flags", length: 84 }, value);
  }

  get pokedexSeenMaleShinyFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x21704, type: "flags", length: 84 });
  }

  set pokedexSeenMaleShinyFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x21704, type: "flags", length: 84 }, value);
  }

  get pokedexSeenFemaleShinyFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x21758, type: "flags", length: 84 });
  }

  set pokedexSeenFemaleShinyFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x21758, type: "flags", length: 84 }, value);
  }

  get pokedexDisplayedMaleFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x217AC, type: "flags", length: 84 });
  }

  set pokedexDisplayedMaleFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x217AC, type: "flags", length: 84 }, value);
  }

  get pokedexDisplayedFemaleFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x21800, type: "flags", length: 84 });
  }

  set pokedexDisplayedFemaleFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x21800, type: "flags", length: 84 }, value);
  }

  get pokedexDisplayedMaleShinyFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x21854, type: "flags", length: 84 });
  }

  set pokedexDisplayedMaleShinyFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x21854, type: "flags", length: 84 }, value);
  }

  get pokedexDisplayedFemaleShinyFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x218A8, type: "flags", length: 84 });
  }

  set pokedexDisplayedFemaleShinyFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x218A8, type: "flags", length: 84 }, value);
  }

  get pokedexFormFlags(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x218FC, type: "bytes", length: 36 });
  }

  set pokedexFormFlags(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x218FC, type: "bytes", length: 36 }, value);
  }

  get pokedexLanguageFlags(): readonly boolean[] {
    return this.#store.flags({ space: this.#space, offset: 0x21920, type: "flags", length: 432 });
  }

  set pokedexLanguageFlags(value: readonly boolean[]) {
    this.#store.setFlags({ space: this.#space, offset: 0x21920, type: "flags", length: 432 }, value);
  }

  get pokedexSpindaPid(): number {
    return this.#store.number({ space: this.#space, offset: 0x21AD0, type: "u32le", length: 4 });
  }

  set pokedexSpindaPid(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x21AD0, type: "u32le", length: 4 }, value);
  }

  get block55Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x21AD6, type: "u16le", length: 2 });
  }

  set block55Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x21AD6, type: "u16le", length: 2 }, value);
  }

  get block56Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x21B36, type: "u16le", length: 2 });
  }

  set block56Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x21B36, type: "u16le", length: 2 }, value);
  }

  get block57Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x21C3E, type: "u16le", length: 2 });
  }

  set block57Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x21C3E, type: "u16le", length: 2 }, value);
  }

  get block58Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x21EAE, type: "u16le", length: 2 });
  }

  set block58Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x21EAE, type: "u16le", length: 2 }, value);
  }

  get block59Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x22A92, type: "u16le", length: 2 });
  }

  set block59Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x22A92, type: "u16le", length: 2 }, value);
  }

  get block60Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x22B9E, type: "u16le", length: 2 });
  }

  set block60Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x22B9E, type: "u16le", length: 2 }, value);
  }

  get block61Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x23452, type: "u16le", length: 2 });
  }

  set block61Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23452, type: "u16le", length: 2 }, value);
  }

  get block62Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x2352A, type: "u16le", length: 2 });
  }

  set block62Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x2352A, type: "u16le", length: 2 }, value);
  }

  get block63Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x23886, type: "u16le", length: 2 });
  }

  set block63Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23886, type: "u16le", length: 2 }, value);
  }

  get block64Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x23912, type: "u16le", length: 2 });
  }

  set block64Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23912, type: "u16le", length: 2 }, value);
  }

  get block65Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x23A5E, type: "u16le", length: 2 });
  }

  set block65Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23A5E, type: "u16le", length: 2 }, value);
  }

  get block66Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x23C6E, type: "u16le", length: 2 });
  }

  set block66Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23C6E, type: "u16le", length: 2 }, value);
  }

  get block67Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x23D42, type: "u16le", length: 2 });
  }

  set block67Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23D42, type: "u16le", length: 2 }, value);
  }

  get block68Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x23EFE, type: "u16le", length: 2 });
  }

  set block68Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23EFE, type: "u16le", length: 2 }, value);
  }

  get block00ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F00, type: "u16le", length: 2 });
  }

  set block00ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F00, type: "u16le", length: 2 }, value);
  }

  get block01ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F02, type: "u16le", length: 2 });
  }

  set block01ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F02, type: "u16le", length: 2 }, value);
  }

  get block02ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F04, type: "u16le", length: 2 });
  }

  set block02ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F04, type: "u16le", length: 2 }, value);
  }

  get block03ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F06, type: "u16le", length: 2 });
  }

  set block03ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F06, type: "u16le", length: 2 }, value);
  }

  get block04ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F08, type: "u16le", length: 2 });
  }

  set block04ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F08, type: "u16le", length: 2 }, value);
  }

  get block05ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F0A, type: "u16le", length: 2 });
  }

  set block05ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F0A, type: "u16le", length: 2 }, value);
  }

  get block06ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F0C, type: "u16le", length: 2 });
  }

  set block06ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F0C, type: "u16le", length: 2 }, value);
  }

  get block07ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F0E, type: "u16le", length: 2 });
  }

  set block07ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F0E, type: "u16le", length: 2 }, value);
  }

  get block08ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F10, type: "u16le", length: 2 });
  }

  set block08ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F10, type: "u16le", length: 2 }, value);
  }

  get block09ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F12, type: "u16le", length: 2 });
  }

  set block09ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F12, type: "u16le", length: 2 }, value);
  }

  get block10ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F14, type: "u16le", length: 2 });
  }

  set block10ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F14, type: "u16le", length: 2 }, value);
  }

  get block11ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F16, type: "u16le", length: 2 });
  }

  set block11ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F16, type: "u16le", length: 2 }, value);
  }

  get block12ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F18, type: "u16le", length: 2 });
  }

  set block12ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F18, type: "u16le", length: 2 }, value);
  }

  get block13ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F1A, type: "u16le", length: 2 });
  }

  set block13ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F1A, type: "u16le", length: 2 }, value);
  }

  get block14ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F1C, type: "u16le", length: 2 });
  }

  set block14ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F1C, type: "u16le", length: 2 }, value);
  }

  get block15ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F1E, type: "u16le", length: 2 });
  }

  set block15ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F1E, type: "u16le", length: 2 }, value);
  }

  get block16ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F20, type: "u16le", length: 2 });
  }

  set block16ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F20, type: "u16le", length: 2 }, value);
  }

  get block17ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F22, type: "u16le", length: 2 });
  }

  set block17ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F22, type: "u16le", length: 2 }, value);
  }

  get block18ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F24, type: "u16le", length: 2 });
  }

  set block18ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F24, type: "u16le", length: 2 }, value);
  }

  get block19ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F26, type: "u16le", length: 2 });
  }

  set block19ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F26, type: "u16le", length: 2 }, value);
  }

  get block20ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F28, type: "u16le", length: 2 });
  }

  set block20ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F28, type: "u16le", length: 2 }, value);
  }

  get block21ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F2A, type: "u16le", length: 2 });
  }

  set block21ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F2A, type: "u16le", length: 2 }, value);
  }

  get block22ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F2C, type: "u16le", length: 2 });
  }

  set block22ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F2C, type: "u16le", length: 2 }, value);
  }

  get block23ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F2E, type: "u16le", length: 2 });
  }

  set block23ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F2E, type: "u16le", length: 2 }, value);
  }

  get block24ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F30, type: "u16le", length: 2 });
  }

  set block24ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F30, type: "u16le", length: 2 }, value);
  }

  get block25ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F32, type: "u16le", length: 2 });
  }

  set block25ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F32, type: "u16le", length: 2 }, value);
  }

  get block26ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F34, type: "u16le", length: 2 });
  }

  set block26ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F34, type: "u16le", length: 2 }, value);
  }

  get block27ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F36, type: "u16le", length: 2 });
  }

  set block27ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F36, type: "u16le", length: 2 }, value);
  }

  get block28ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F38, type: "u16le", length: 2 });
  }

  set block28ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F38, type: "u16le", length: 2 }, value);
  }

  get block29ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F3A, type: "u16le", length: 2 });
  }

  set block29ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F3A, type: "u16le", length: 2 }, value);
  }

  get block30ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F3C, type: "u16le", length: 2 });
  }

  set block30ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F3C, type: "u16le", length: 2 }, value);
  }

  get block31ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F3E, type: "u16le", length: 2 });
  }

  set block31ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F3E, type: "u16le", length: 2 }, value);
  }

  get block32ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F40, type: "u16le", length: 2 });
  }

  set block32ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F40, type: "u16le", length: 2 }, value);
  }

  get block33ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F42, type: "u16le", length: 2 });
  }

  set block33ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F42, type: "u16le", length: 2 }, value);
  }

  get block34ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F44, type: "u16le", length: 2 });
  }

  set block34ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F44, type: "u16le", length: 2 }, value);
  }

  get block35ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F46, type: "u16le", length: 2 });
  }

  set block35ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F46, type: "u16le", length: 2 }, value);
  }

  get block36ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F48, type: "u16le", length: 2 });
  }

  set block36ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F48, type: "u16le", length: 2 }, value);
  }

  get block37ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F4A, type: "u16le", length: 2 });
  }

  set block37ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F4A, type: "u16le", length: 2 }, value);
  }

  get block38ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F4C, type: "u16le", length: 2 });
  }

  set block38ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F4C, type: "u16le", length: 2 }, value);
  }

  get block39ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F4E, type: "u16le", length: 2 });
  }

  set block39ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F4E, type: "u16le", length: 2 }, value);
  }

  get block40ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F50, type: "u16le", length: 2 });
  }

  set block40ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F50, type: "u16le", length: 2 }, value);
  }

  get block41ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F52, type: "u16le", length: 2 });
  }

  set block41ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F52, type: "u16le", length: 2 }, value);
  }

  get block42ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F54, type: "u16le", length: 2 });
  }

  set block42ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F54, type: "u16le", length: 2 }, value);
  }

  get block43ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F56, type: "u16le", length: 2 });
  }

  set block43ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F56, type: "u16le", length: 2 }, value);
  }

  get block44ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F58, type: "u16le", length: 2 });
  }

  set block44ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F58, type: "u16le", length: 2 }, value);
  }

  get block45ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F5A, type: "u16le", length: 2 });
  }

  set block45ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F5A, type: "u16le", length: 2 }, value);
  }

  get block46ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F5C, type: "u16le", length: 2 });
  }

  set block46ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F5C, type: "u16le", length: 2 }, value);
  }

  get block47ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F5E, type: "u16le", length: 2 });
  }

  set block47ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F5E, type: "u16le", length: 2 }, value);
  }

  get block48ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F60, type: "u16le", length: 2 });
  }

  set block48ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F60, type: "u16le", length: 2 }, value);
  }

  get block49ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F62, type: "u16le", length: 2 });
  }

  set block49ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F62, type: "u16le", length: 2 }, value);
  }

  get block50ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F64, type: "u16le", length: 2 });
  }

  set block50ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F64, type: "u16le", length: 2 }, value);
  }

  get block51ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F66, type: "u16le", length: 2 });
  }

  set block51ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F66, type: "u16le", length: 2 }, value);
  }

  get block52ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F68, type: "u16le", length: 2 });
  }

  set block52ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F68, type: "u16le", length: 2 }, value);
  }

  get block53ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F6A, type: "u16le", length: 2 });
  }

  set block53ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F6A, type: "u16le", length: 2 }, value);
  }

  get block54ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F6C, type: "u16le", length: 2 });
  }

  set block54ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F6C, type: "u16le", length: 2 }, value);
  }

  get block55ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F6E, type: "u16le", length: 2 });
  }

  set block55ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F6E, type: "u16le", length: 2 }, value);
  }

  get block56ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F70, type: "u16le", length: 2 });
  }

  set block56ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F70, type: "u16le", length: 2 }, value);
  }

  get block57ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F72, type: "u16le", length: 2 });
  }

  set block57ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F72, type: "u16le", length: 2 }, value);
  }

  get block58ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F74, type: "u16le", length: 2 });
  }

  set block58ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F74, type: "u16le", length: 2 }, value);
  }

  get block59ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F76, type: "u16le", length: 2 });
  }

  set block59ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F76, type: "u16le", length: 2 }, value);
  }

  get block60ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F78, type: "u16le", length: 2 });
  }

  set block60ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F78, type: "u16le", length: 2 }, value);
  }

  get block61ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F7A, type: "u16le", length: 2 });
  }

  set block61ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F7A, type: "u16le", length: 2 }, value);
  }

  get block62ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F7C, type: "u16le", length: 2 });
  }

  set block62ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F7C, type: "u16le", length: 2 }, value);
  }

  get block63ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F7E, type: "u16le", length: 2 });
  }

  set block63ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F7E, type: "u16le", length: 2 }, value);
  }

  get block64ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F80, type: "u16le", length: 2 });
  }

  set block64ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F80, type: "u16le", length: 2 }, value);
  }

  get block65ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F82, type: "u16le", length: 2 });
  }

  set block65ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F82, type: "u16le", length: 2 }, value);
  }

  get block66ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F84, type: "u16le", length: 2 });
  }

  set block66ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F84, type: "u16le", length: 2 }, value);
  }

  get block67ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F86, type: "u16le", length: 2 });
  }

  set block67ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F86, type: "u16le", length: 2 }, value);
  }

  get block68ChecksumCopy(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F88, type: "u16le", length: 2 });
  }

  set block68ChecksumCopy(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F88, type: "u16le", length: 2 }, value);
  }

  get saveCount(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F8C, type: "u32le", length: 4 });
  }

  set saveCount(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F8C, type: "u32le", length: 4 }, value);
  }

  get saveSize(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F90, type: "u32le", length: 4 });
  }

  set saveSize(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F90, type: "u32le", length: 4 }, value);
  }

  get saveMagic(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F94, type: "u32le", length: 4 });
  }

  set saveMagic(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F94, type: "u32le", length: 4 }, value);
  }

  get block69Checksum(): number {
    return this.#store.number({ space: this.#space, offset: 0x23F9A, type: "u16le", length: 2 });
  }

  set block69Checksum(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x23F9A, type: "u16le", length: 2 }, value);
  }
}

export class SaveSpaceItemsPocket {
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

export class SaveSpaceKeyItemsPocket {
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

export class SaveSpaceTmsAndHmsPocket {
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

export class SaveSpaceMedicinePocket {
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

export class SaveSpaceBerriesPocket {
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

export class SaveSpaceLastSaved {
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

  get year(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 7 });
  }

  set year(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 7 }, value);
  }

  get month(): number {
    return this.#store.number({ ...this.#read, bit: 7, width: 4 });
  }

  set month(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 7, width: 4 }, value);
  }

  get day(): number {
    return this.#store.number({ ...this.#read, bit: 11, width: 5 });
  }

  set day(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 11, width: 5 }, value);
  }

  get hour(): number {
    return this.#store.number({ ...this.#read, bit: 16, width: 5 });
  }

  set hour(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 16, width: 5 }, value);
  }

  get minute(): number {
    return this.#store.number({ ...this.#read, bit: 21, width: 6 });
  }

  set minute(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 21, width: 6 }, value);
  }
}

export class SaveSpaceDaycareFlags {
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

  get eggAvailable(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set eggAvailable(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }
}

export class SaveSpaceBadges {
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

export class SaveSpacePokedexFlags {
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

  get nationalUnlocked(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set nationalUnlocked(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get upgrades(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 10 });
  }

  set upgrades(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 10 }, value);
  }

  get nationalMode(): number {
    return this.#store.number({ ...this.#read, bit: 11, width: 1 });
  }

  set nationalMode(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 11, width: 1 }, value);
  }

  get initialSpecies(): number {
    return this.#store.number({ ...this.#read, bit: 12, width: 10 });
  }

  set initialSpecies(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 12, width: 10 }, value);
  }
}

export class Pk5Party {
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

  get originalTrainerId(): Pk5PartyOriginalTrainerId {
    return new Pk5PartyOriginalTrainerId(this.#store, { space: this.#space, offset: 0xC, type: "u32le", length: 4 });
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

  get sinnohRibbons(): Pk5PartySinnohRibbons {
    return new Pk5PartySinnohRibbons(this.#store, { space: this.#space, offset: 0x24, type: "u32le", length: 4 });
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

  get ivsEggAndNicknamed(): Pk5PartyIvsEggAndNicknamed {
    return new Pk5PartyIvsEggAndNicknamed(this.#store, { space: this.#space, offset: 0x38, type: "u32le", length: 4 });
  }

  get hoennRibbons(): Pk5PartyHoennRibbons {
    return new Pk5PartyHoennRibbons(this.#store, { space: this.#space, offset: 0x3C, type: "u32le", length: 4 });
  }

  get fatefulEncounterGenderAndForm(): Pk5PartyFatefulEncounterGenderAndForm {
    return new Pk5PartyFatefulEncounterGenderAndForm(this.#store, { space: this.#space, offset: 0x40, type: "u8", length: 1 });
  }

  get nature(): number {
    return this.#store.number({ space: this.#space, offset: 0x41, type: "u8", length: 1 });
  }

  set nature(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x41, type: "u8", length: 1 }, value);
  }

  get abilityFlags(): Pk5PartyAbilityFlags {
    return new Pk5PartyAbilityFlags(this.#store, { space: this.#space, offset: 0x42, type: "u8", length: 1 });
  }

  get unused1(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x43, type: "bytes", length: 5 });
  }

  set unused1(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x43, type: "bytes", length: 5 }, value);
  }

  get nickname(): string {
    return this.#store.text({ space: this.#space, offset: 0x48, type: "text-gen5", length: 22 });
  }

  set nickname(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x48, type: "text-gen5", length: 22 }, value);
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

  get sinnohContestRibbons(): Pk5PartySinnohContestRibbons {
    return new Pk5PartySinnohContestRibbons(this.#store, { space: this.#space, offset: 0x60, type: "u32le", length: 4 });
  }

  get unused3(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x64, type: "bytes", length: 4 });
  }

  set unused3(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x64, type: "bytes", length: 4 }, value);
  }

  get originalTrainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x68, type: "text-gen5", length: 16 });
  }

  set originalTrainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x68, type: "text-gen5", length: 16 }, value);
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

  get pokerus(): Pk5PartyPokerus {
    return new Pk5PartyPokerus(this.#store, { space: this.#space, offset: 0x82, type: "u8", length: 1 });
  }

  get ball(): number {
    return this.#store.number({ space: this.#space, offset: 0x83, type: "u8", length: 1 });
  }

  set ball(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x83, type: "u8", length: 1 }, value);
  }

  get metLevelAndTrainerGender(): Pk5PartyMetLevelAndTrainerGender {
    return new Pk5PartyMetLevelAndTrainerGender(this.#store, { space: this.#space, offset: 0x84, type: "u8", length: 1 });
  }

  get encounterType(): number {
    return this.#store.number({ space: this.#space, offset: 0x85, type: "u8", length: 1 });
  }

  set encounterType(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x85, type: "u8", length: 1 }, value);
  }

  get unused4(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x86, type: "bytes", length: 1 });
  }

  set unused4(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x86, type: "bytes", length: 1 }, value);
  }

  get pokestarFame(): number {
    return this.#store.number({ space: this.#space, offset: 0x87, type: "u8", length: 1 });
  }

  set pokestarFame(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x87, type: "u8", length: 1 }, value);
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

  get unused5(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x8D, type: "bytes", length: 1 });
  }

  set unused5(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x8D, type: "bytes", length: 1 }, value);
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

  get unused6(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0xD4, type: "bytes", length: 8 });
  }

  set unused6(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0xD4, type: "bytes", length: 8 }, value);
  }
}

export class Pk5PartyOriginalTrainerId {
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

export class Pk5PartySinnohRibbons {
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

export class Pk5PartyIvsEggAndNicknamed {
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

export class Pk5PartyHoennRibbons {
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

export class Pk5PartyFatefulEncounterGenderAndForm {
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

export class Pk5PartyAbilityFlags {
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

  get hiddenAbility(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set hiddenAbility(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get nSparkle(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set nSparkle(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }
}

export class Pk5PartySinnohContestRibbons {
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

export class Pk5PartyPokerus {
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

export class Pk5PartyMetLevelAndTrainerGender {
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

export class Pk5 {
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

  get originalTrainerId(): Pk5OriginalTrainerId {
    return new Pk5OriginalTrainerId(this.#store, { space: this.#space, offset: 0xC, type: "u32le", length: 4 });
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

  get sinnohRibbons(): Pk5SinnohRibbons {
    return new Pk5SinnohRibbons(this.#store, { space: this.#space, offset: 0x24, type: "u32le", length: 4 });
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

  get ivsEggAndNicknamed(): Pk5IvsEggAndNicknamed {
    return new Pk5IvsEggAndNicknamed(this.#store, { space: this.#space, offset: 0x38, type: "u32le", length: 4 });
  }

  get hoennRibbons(): Pk5HoennRibbons {
    return new Pk5HoennRibbons(this.#store, { space: this.#space, offset: 0x3C, type: "u32le", length: 4 });
  }

  get fatefulEncounterGenderAndForm(): Pk5FatefulEncounterGenderAndForm {
    return new Pk5FatefulEncounterGenderAndForm(this.#store, { space: this.#space, offset: 0x40, type: "u8", length: 1 });
  }

  get nature(): number {
    return this.#store.number({ space: this.#space, offset: 0x41, type: "u8", length: 1 });
  }

  set nature(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x41, type: "u8", length: 1 }, value);
  }

  get abilityFlags(): Pk5AbilityFlags {
    return new Pk5AbilityFlags(this.#store, { space: this.#space, offset: 0x42, type: "u8", length: 1 });
  }

  get unused1(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x43, type: "bytes", length: 5 });
  }

  set unused1(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x43, type: "bytes", length: 5 }, value);
  }

  get nickname(): string {
    return this.#store.text({ space: this.#space, offset: 0x48, type: "text-gen5", length: 22 });
  }

  set nickname(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x48, type: "text-gen5", length: 22 }, value);
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

  get sinnohContestRibbons(): Pk5SinnohContestRibbons {
    return new Pk5SinnohContestRibbons(this.#store, { space: this.#space, offset: 0x60, type: "u32le", length: 4 });
  }

  get unused3(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x64, type: "bytes", length: 4 });
  }

  set unused3(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x64, type: "bytes", length: 4 }, value);
  }

  get originalTrainerName(): string {
    return this.#store.text({ space: this.#space, offset: 0x68, type: "text-gen5", length: 16 });
  }

  set originalTrainerName(value: string) {
    this.#store.setText({ space: this.#space, offset: 0x68, type: "text-gen5", length: 16 }, value);
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

  get pokerus(): Pk5Pokerus {
    return new Pk5Pokerus(this.#store, { space: this.#space, offset: 0x82, type: "u8", length: 1 });
  }

  get ball(): number {
    return this.#store.number({ space: this.#space, offset: 0x83, type: "u8", length: 1 });
  }

  set ball(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x83, type: "u8", length: 1 }, value);
  }

  get metLevelAndTrainerGender(): Pk5MetLevelAndTrainerGender {
    return new Pk5MetLevelAndTrainerGender(this.#store, { space: this.#space, offset: 0x84, type: "u8", length: 1 });
  }

  get encounterType(): number {
    return this.#store.number({ space: this.#space, offset: 0x85, type: "u8", length: 1 });
  }

  set encounterType(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x85, type: "u8", length: 1 }, value);
  }

  get unused4(): Uint8Array {
    return this.#store.raw({ space: this.#space, offset: 0x86, type: "bytes", length: 1 });
  }

  set unused4(value: Uint8Array) {
    this.#store.setRaw({ space: this.#space, offset: 0x86, type: "bytes", length: 1 }, value);
  }

  get pokestarFame(): number {
    return this.#store.number({ space: this.#space, offset: 0x87, type: "u8", length: 1 });
  }

  set pokestarFame(value: number) {
    this.#store.setNumber({ space: this.#space, offset: 0x87, type: "u8", length: 1 }, value);
  }
}

export class Pk5OriginalTrainerId {
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

export class Pk5SinnohRibbons {
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

export class Pk5IvsEggAndNicknamed {
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

export class Pk5HoennRibbons {
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

export class Pk5FatefulEncounterGenderAndForm {
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

export class Pk5AbilityFlags {
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

  get hiddenAbility(): number {
    return this.#store.number({ ...this.#read, bit: 0, width: 1 });
  }

  set hiddenAbility(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 0, width: 1 }, value);
  }

  get nSparkle(): number {
    return this.#store.number({ ...this.#read, bit: 1, width: 1 });
  }

  set nSparkle(value: number) {
    this.#store.setNumber({ ...this.#read, bit: 1, width: 1 }, value);
  }
}

export class Pk5SinnohContestRibbons {
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

export class Pk5Pokerus {
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

export class Pk5MetLevelAndTrainerGender {
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
  ["party:{1..6}", Pk5Party],
  ["box:{1..24}:{1..30}", Pk5],
];

export const read = (file: Uint8Array) => new Save(file);
