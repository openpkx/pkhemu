import { view } from "./bytes.ts";
import type { Transform } from "./step.ts";

export const textGen3Gc: Transform<string, Record<string, never>> = {
  kind: "transform",
  decode(input) {
    const data = view(input);
    let decoded = "";
    for (let at = 0; at + 1 < input.length; at += 2) {
      const unit = data.getUint16(at);
      if (unit === 0) break;
      decoded += String.fromCharCode(unit);
    }
    return decoded;
  },
  encode(value, _, previous) {
    const encoded = previous.slice();
    const data = view(encoded);
    if (value.length * 2 > encoded.length) throw new Error(`"${value}" is longer than ${encoded.length / 2} characters`);
    for (let i = 0; i < value.length; i++) {
      const unit = value.charCodeAt(i);
      if (unit === 0) throw new Error("text can't hold a NUL character");
      data.setUint16(i * 2, unit);
    }
    if (value.length * 2 + 1 < encoded.length) data.setUint16(value.length * 2, 0);
    return encoded;
  },
};
