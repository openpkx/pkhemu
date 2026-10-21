import { uint, view, type Uint } from "./bytes.ts";
import { checksum } from "./checksums.ts";
import type { Detect } from "./step.ts";

export const gen5Checksums: Detect<{ start: Uint; end: Uint; at: Uint }> = {
  kind: "detect",
  test(file, { start, end, at }) {
    if (uint(at) + 2 > file.length) return false;
    return view(checksum("crc16-ccitt", file, { start, end })).getUint16(0, true) === view(file).getUint16(uint(at), true);
  },
};
