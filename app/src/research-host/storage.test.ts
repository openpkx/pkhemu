import { expect, it } from "vitest";
import { fromText, toText } from "./storage";

it("keeps bytes as bytes through a round trip", () => {
  const value = { stage: "open", baseline: { bytes: Uint8Array.from([0, 1, 254, 255]), writtenAt: 5 }, latest: true };

  const back = fromText(toText(value)) as typeof value;

  expect(back).toEqual(value);
  expect(back.baseline.bytes).toBeInstanceOf(Uint8Array);
});

it("keeps a whole Gen 3 save small enough as text", () => {
  const bytes = Uint8Array.from({ length: 0x20000 }, (_, index) => index % 256);

  const text = toText({ bytes });

  expect(text.length).toBeLessThan(0x20000 * 1.4);
  expect((fromText(text) as { bytes: Uint8Array }).bytes).toEqual(bytes);
});
