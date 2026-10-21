import { uint, view, type Uint } from "./bytes.ts";
import { validSlots } from "./gen3-slots.ts";
import type { Detect } from "./step.ts";

export const gen3Signature: Detect<{ signatures: Uint[] }> = {
  kind: "detect",
  test(file, { signatures }) {
    const allowed = signatures.map(uint);
    const data = view(file);
    return validSlots(file).some(({ sectors }) => [...sectors.values()].every((at) => allowed.includes(data.getUint32(at + 0xff8, true))));
  },
};
