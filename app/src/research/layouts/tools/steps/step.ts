export interface Transform<Value extends Uint8Array | string, Args> {
  kind: "transform";
  decode(input: Uint8Array, args: Args): Value;
  encode(value: Value, args: Args, previous: Uint8Array): Uint8Array;
}

export interface Checksum {
  kind: "checksum";
  size: number;
  compute(bytes: Uint8Array): Uint8Array;
}

export interface KeyedChecksum {
  kind: "checksum";
  size: number;
  keyed: true;
  compute(bytes: Uint8Array, key: Uint8Array): Uint8Array;
}

export interface Detect<Args> {
  kind: "detect";
  test(file: Uint8Array, args: Args): boolean;
}

export interface ReadStep<Value extends Uint8Array | string, Args> {
  kind: "read";
  decode(input: Uint8Array, args: Args): Value;
}
