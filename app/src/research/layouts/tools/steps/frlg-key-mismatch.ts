import { view } from "./bytes.ts";
import { activeSlot, validSlots } from "./gen3-slots.ts";
import type { Detect } from "./step.ts";

export const frlgKeyMismatch: Detect<Record<string, never>> = {
  kind: "detect",
  test(file) {
    if (!validSlots(file).length) return false;
    const section = activeSlot(file).sectors.get(0)!;
    const data = view(file);
    const key = data.getUint32(section + 0xf20, true);
    return key === 0 || key !== data.getUint32(section + 0xaf8, true);
  },
};
