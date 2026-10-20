import Ajv2020 from "ajv/dist/2020";
import { expect, it } from "vitest";
import { space } from "./diff";
import { findingsFile, findingsName, parseFindings, rangeProblem, type Finding, type RangeFinding } from "./findings";
import schema from "./layouts/schema/layout.schema.json";

const target = { format: "unbound", version: "2.1" };
const rom = "b4776b82a4c7915d0fadeaa27e013523f99dfd94";

const range: RangeFinding = {
  id: "section:4@3147",
  kind: "range",
  space: "section:4",
  offset: 0xc4b,
  length: 2,
  type: "u16le",
  name: "Steps on the bike",
  confidence: "guess",
  note: "Rode the bike between the saves",
  before: "07 00",
  after: "08 00",
  rom,
  app: "pkh-emu 0.12.0",
};
const value: Finding = { id: "item:368", kind: "value", domain: "item", index: 368, name: "Mega Ring", confidence: "known", pocket: "Key items", rom, app: "pkh-emu 0.12.0" };

it("names the file after the save format, the layout version and the day", () => {
  expect(findingsName(target, new Date(2026, 9, 20, 23, 30))).toBe("unbound-2.1-findings-2026-10-20.json");
});

it("writes a layout file the schema accepts", () => {
  const validate = new Ajv2020({ allErrors: true }).compile(schema);

  const file = JSON.parse(findingsFile(target, [range, value]));

  expect(validate(file), JSON.stringify(validate.errors)).toBe(true);
});

it("writes each finding with its ROM's SHA-1 and the app's version, and nothing else", () => {
  expect(JSON.parse(findingsFile(target, [range, value]))).toEqual({
    $schema: "../schema/layout.schema.json",
    target: { kind: "save", format: "unbound", version: "2.1" },
    findings: [
      {
        rom,
        app: "pkh-emu 0.12.0",
        range: {
          space: "section:4",
          offset: "0x0C4B",
          length: 2,
          type: "u16le",
          name: "Steps on the bike",
          confidence: "guess",
          before: "07 00",
          after: "08 00",
          note: "Rode the bike between the saves",
        },
      },
      { rom, app: "pkh-emu 0.12.0", value: { domain: "item", index: 368, name: "Mega Ring", confidence: "known", pocket: "Key items" } },
    ],
  });
});

it("leaves out a finding with no ROM SHA-1, which the schema needs", () => {
  expect(JSON.parse(findingsFile(target, [{ ...range, rom: null }, value])).findings).toHaveLength(1);
});

it("reads back an exported file as findings from that file", () => {
  const read = parseFindings(findingsFile(target, [range, value]), target, "theirs.json");

  expect(read).toEqual([
    { ...range, id: "theirs.json:section:4@3147", file: "theirs.json" },
    { ...value, id: "theirs.json:item:368", file: "theirs.json" },
  ]);
});

it("keeps one of each finding a file repeats", () => {
  expect(parseFindings(findingsFile(target, [range, range]), target, "theirs.json")).toHaveLength(1);
});

it("turns away a file for another layout, or one that isn't findings", () => {
  const text = findingsFile(target, [range]);

  expect(parseFindings(text, { format: "unbound", version: "2.0" }, "a.json")).toBe("These findings are for unbound 2.1.");
  expect(parseFindings(text, { format: "frlg", version: "2.1" }, "a.json")).toBe("These findings are for unbound 2.1.");
  expect(parseFindings("{", target, "a.json")).toBe("This file isn't a findings file.");
  expect(parseFindings(JSON.stringify({ target: { kind: "save", ...target }, spaces: [] }), target, "a.json")).toBe("This file isn't a findings file.");
  expect(parseFindings(JSON.stringify({ ...JSON.parse(text), findings: [null] }), target, "a.json")).toBe("This file isn't a findings file.");
  const tooLong = JSON.parse(text);
  tooLong.findings[0].range.length = 300;
  expect(parseFindings(JSON.stringify(tooLong), target, "a.json")).toBe("This file isn't a findings file.");
});

const section = space(
  "section:4",
  new Uint8Array(0x100),
  new Uint8Array(0x100),
  [{ offset: 0x20, length: 4, type: "u32le", name: "Money", confidence: "known", source: "pkhex:SAV3.cs" }],
);

it("blocks a range that overlaps a known range, and names it", () => {
  expect(rangeProblem(section, [], 0x1e, 3)).toBe("Overlaps Money at 0x0020–0x0023, which the layout already names.");
  expect(rangeProblem(section, [], 0x1c, 4)).toBeUndefined();
});

it("blocks a range that overlaps another finding, and says whose it is", () => {
  const ours: RangeFinding = { ...range, space: "section:4", offset: 0x10, length: 2 };
  const theirs: RangeFinding = { ...ours, id: "theirs", offset: 0x40, file: "theirs.json" };

  expect(rangeProblem(section, [ours, theirs], 0x11, 1)).toBe('Overlaps your finding "Steps on the bike".');
  expect(rangeProblem(section, [ours, theirs], 0x3f, 2)).toBe('Overlaps "Steps on the bike" from theirs.json.');
  expect(rangeProblem(section, [{ ...ours, space: "section:5" }], 0x11, 1)).toBeUndefined();
});

it("caps a range at 256 bytes and keeps it in its space", () => {
  expect(rangeProblem(section, [], 0, 257)).toBe("A finding holds at most 256 bytes.");
  expect(rangeProblem(section, [], 0xf0, 0x20)).toBe("Section 4 ends at 0x00FF.");
  expect(rangeProblem(section, [], 0, 0)).toBe("Enter an offset and a length.");
  expect(rangeProblem(section, [], Number.NaN, 1)).toBe("Enter an offset and a length.");
});
