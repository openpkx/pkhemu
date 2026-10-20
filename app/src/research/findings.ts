import { spaceTitle, type Space } from "./diff";
import { uint, type Uint } from "./layout";
import { hex } from "./text";

export const MAX_RANGE = 256;

export const RANGE_TYPES = ["u8", "u16le", "u32le", "u64le", "i8", "i16le", "i32le", "u16be", "u32be", "flags", "bytes", "text-gen3"] as const;
export type RangeType = (typeof RANGE_TYPES)[number];
export type Confidence = "known" | "guess";

type Found = { id: string; name: string; confidence: Confidence; note?: string; rom: string | null; app: string; file?: string };
export type RangeFinding = Found & { kind: "range"; space: string; offset: number; length: number; type: RangeType; before: string; after: string };
export type ValueFinding = Found & { kind: "value"; domain: string; index: number; pocket?: string };
export type Finding = RangeFinding | ValueFinding;
export type Named = Omit<RangeFinding, "rom" | "app"> | Omit<ValueFinding, "rom" | "app">;

export type Target = { format: string; version: string };

export const appName = (version: string) => `pkh-emu ${version}`;

const day = (date: Date) => [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((part) => String(part).padStart(2, "0")).join("-");

export const findingsName = ({ format, version }: Target, date = new Date()) => `${format}-${version}-findings-${day(date)}.json`;

export function findingsFile(target: Target, findings: readonly Finding[]) {
  const entries = findings.flatMap((finding) => {
    if (!finding.rom) return [];
    const { rom, app, name, confidence, note } = finding;
    const described = { name, confidence, ...(note && { note }) };
    const entry =
      finding.kind === "range"
        ? {
            range: {
              space: finding.space,
              offset: hex(finding.offset),
              length: finding.length,
              type: finding.type,
              ...described,
              before: finding.before,
              after: finding.after,
            },
          }
        : { value: { domain: finding.domain, index: finding.index, ...described, ...(finding.pocket && { pocket: finding.pocket }) } };
    return [{ rom, app, ...entry }];
  });
  return JSON.stringify({ $schema: "../schema/layout.schema.json", target: { kind: "save", ...target }, findings: entries }, null, 2) + "\n";
}

const NOT_FINDINGS = "This file isn't a findings file.";

const text = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const whole = (value: unknown, max = Infinity): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= max;
const uintText = (value: unknown): value is Uint => whole(value) || (typeof value === "string" && /^0x[0-9a-f]+$/i.test(value));
const hexBytes = (value: unknown, length: number) => typeof value === "string" && /^[0-9A-F]{2}( [0-9A-F]{2})*$/.test(value) && value.length === length * 3 - 1;
const confidence = (value: unknown): value is Confidence => value === "known" || value === "guess";
const optional = (value: unknown) => value === undefined || text(value);

type Entry = { rom?: unknown; app?: unknown; range?: Record<string, unknown>; value?: Record<string, unknown> };

function read(entry: Entry, file: string): Finding | undefined {
  const { rom, app, range, value } = entry;
  if (typeof rom !== "string" || !/^[0-9a-f]{40}$/.test(rom) || !text(app) || !range === !value) return;
  const described = (fields: Record<string, unknown>) =>
    text(fields.name) && confidence(fields.confidence) && optional(fields.note)
      ? { name: fields.name, confidence: fields.confidence, ...(fields.note !== undefined && { note: fields.note as string }), rom, app, file }
      : undefined;
  if (range) {
    const { space, offset, length, type, before, after } = range;
    const common = described(range);
    if (!common || !text(space) || !uintText(offset) || !whole(length, MAX_RANGE) || !length) return;
    if (!RANGE_TYPES.includes(type as RangeType) || !hexBytes(before, length) || !hexBytes(after, length)) return;
    const at = uint(offset);
    return { ...common, id: `${file}:${space}@${at}`, kind: "range", space, offset: at, length, type: type as RangeType, before: before as string, after: after as string };
  }
  const { domain, index, pocket } = value!;
  const common = described(value!);
  if (!common || !text(domain) || !whole(index) || !optional(pocket)) return;
  return { ...common, id: `${file}:${domain}:${index}`, kind: "value", domain, index, ...(pocket !== undefined && { pocket: pocket as string }) };
}

export function parseFindings(fileText: string, target: Target, file: string): Finding[] | string {
  let parsed: { target?: { kind?: unknown; format?: unknown; version?: unknown }; findings?: unknown };
  try {
    parsed = JSON.parse(fileText);
  } catch {
    return NOT_FINDINGS;
  }
  const { target: theirs, findings } = parsed ?? {};
  if (theirs?.kind !== "save" || !text(theirs.format) || !text(theirs.version) || !Array.isArray(findings)) return NOT_FINDINGS;
  if (theirs.format !== target.format || theirs.version !== target.version) return `These findings are for ${theirs.format} ${theirs.version}.`;
  const found = findings.map((entry: Entry) => (entry && typeof entry === "object" ? read(entry, file) : undefined));
  if (!found.every((finding) => finding !== undefined)) return NOT_FINDINGS;
  return found.filter((finding, index) => found.findIndex(({ id }) => id === finding.id) === index);
}

export const ranges = (findings: readonly Finding[], space: string) =>
  findings.filter((finding): finding is RangeFinding => finding.kind === "range" && finding.space === space);

export const findingAt = (findings: readonly Finding[], space: string, offset: number) =>
  ranges(findings, space).find((finding) => offset >= finding.offset && offset < finding.offset + finding.length);

export const valueFinding = (findings: readonly Finding[], domain: string, index: number) =>
  findings.find((finding): finding is ValueFinding => finding.kind === "value" && finding.domain === domain && finding.index === index);

export const whose = (finding: Finding) => (finding.file ? `from ${finding.file}` : "your finding");

export function rangeProblem(space: Space, findings: readonly Finding[], offset: number, length: number) {
  if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(length) || length < 1) return "Enter an offset and a length.";
  if (length > MAX_RANGE) return `A finding holds at most ${MAX_RANGE} bytes.`;
  const end = offset + length;
  if (end > space.after.length) return `${spaceTitle(space.name)} ends at ${hex(space.after.length - 1)}.`;
  const known = space.rangeIndex.subarray(offset, end).find((index) => index >= 0);
  if (known !== undefined) {
    const range = space.ranges[known];
    return `Overlaps ${range.name} at ${hex(range.offset)}–${hex(range.offset + range.length - 1)}, which the layout already names.`;
  }
  const other = ranges(findings, space.name).find((finding) => offset < finding.offset + finding.length && finding.offset < end);
  if (other) return other.file ? `Overlaps "${other.name}" from ${other.file}.` : `Overlaps your finding "${other.name}".`;
}
