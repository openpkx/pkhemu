import { useEffect, useState } from "react";
import { useEngine } from "@pkhex-everywhere/react";
import { EngineError, type Engine, type FormatEntry, type GameProgress, type PokemonSummary, type TrainerCard } from "@pkhex-everywhere/engine";
import { inTurn } from "@/lib/engineTurn";
import type { SaveFormat, SaveFormatHost } from "@/preferences/gameSettings";
import { lastKnown, remember } from "./lastKnown";

export type SaveFile = { bytes: number[]; modified: number; sha256: string };

export type PartyMember = Pick<
  PokemonSummary,
  "speciesId" | "speciesIndex" | "species" | "isUnknown" | "isShiny" | "gender" | "isEgg" | "types" | "level"
> & {
  form: { id: number };
};

export type SaveSummary = {
  revision: number;
  version: string | null;
  formatId: string | null;
  generation: number | null;
  trainer: Pick<TrainerCard, "name" | "gender" | "money"> | null;
  party: PartyMember[];
  progress: GameProgress;
};

export type SummaryCacheHost = {
  saveSummary(sha256: string): Promise<SaveSummary | null>;
  keepSaveSummary(sha256: string, summary: SaveSummary): Promise<void>;
};

export type SaveSummaryHost = SummaryCacheHost &
  SaveFormatHost & {
    readSave(folder: string, path: string): Promise<SaveFile | null>;
  };

// Bump when an engine update changes what a summary holds, so cached summaries are made again.
export const summaryRevision = 3;

export const genderSymbols = { male: "♂", female: "♀" };

export type SaveCardState =
  | { state: "none" }
  | { state: "unreadable" }
  | { state: "choose"; candidates: FormatEntry[] }
  | { state: "read"; modified: number; summary: SaveSummary; format: SaveFormat | null };

export const originalGame = "pkhex";

const formatChoiceOf = (error: unknown) =>
  error instanceof EngineError && error.code === "format-choice-required" ? (error.candidates ?? []) : undefined;

const rejectsFormat = (error: unknown) => error instanceof EngineError && (error.code === "invalid-save" || error.code === "not-found");

// Candidates are named like "Pokémon Radical Red", and ROM files often leave the brand out.
const comparable = (text: string) =>
  text
    .normalize("NFD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/pokemon/g, "");

export function formatChoices(candidates: FormatEntry[], romPath: string) {
  const rom = comparable(romPath.split(/[\\/]/).pop()!);
  const inRom = candidates.find(({ name }) => comparable(name) && rom.includes(comparable(name)));
  const others = candidates.filter((candidate) => candidate !== inRom);
  return [...(inRom ? [{ ...inRom, inRomName: true }] : []), ...others.map((candidate) => ({ ...candidate, inRomName: false }))];
}

async function summarise(
  engine: Engine,
  bytes: Uint8Array,
  current: () => boolean,
  formatId: string | undefined,
): Promise<SaveSummary | undefined> {
  if (!current()) return;
  await engine.game.load(bytes, undefined, formatId);
  // The editor shares the engine, so once the page is gone the loaded save may be the editor's to read or close.
  if (!current()) return;
  try {
    const [trainer, teams, party, version, progress] = await Promise.all([
      engine.trainer.get(),
      engine.team.list(),
      engine.party.get(),
      engine.game.version(),
      engine.game.progress(),
    ]);
    return {
      revision: summaryRevision,
      version: version?.version ?? null,
      formatId: version?.formatId ?? null,
      generation: version?.generationId ?? null,
      // A Stadium save has no single trainer, yet the engine still answers with a placeholder name and money.
      trainer: teams.length ? null : { name: trainer.name, gender: trainer.gender, money: trainer.money },
      party: party.map(({ speciesId, speciesIndex, species, isUnknown, isShiny, gender, isEgg, types, level, form }) => ({
        speciesId,
        speciesIndex,
        species,
        isUnknown,
        isShiny,
        gender,
        isEgg,
        types,
        level,
        form: { id: form.id },
      })),
      progress,
    };
  } finally {
    if (current()) await engine.game.close().catch((error) => console.error(error));
  }
}

export async function summaryOf(
  engine: Engine,
  host: SummaryCacheHost,
  sha256: string,
  bytes: () => Promise<Uint8Array>,
  current: () => boolean,
  formatId?: string,
): Promise<SaveSummary | undefined> {
  const keyFor = (formatId?: string | null) => (formatId ? `${sha256}:${formatId}` : sha256);
  const keep = (key: string, summary: SaveSummary) => host.keepSaveSummary(key, summary).catch((error) => console.error(error));
  const cached = await host.saveSummary(keyFor(formatId)).catch(() => null);
  if (cached?.revision === summaryRevision) return cached;
  if (!current()) return;
  const save = await bytes();
  const summary = await inTurn(() => summarise(engine, save, current, formatId));
  if (!summary) return;
  keep(keyFor(formatId), summary);
  // The detected format gets stored, so the next read asks for the summary under it.
  if (!formatId && summary.formatId) keep(keyFor(summary.formatId), summary);
  return summary;
}

async function readCard(
  engine: Engine,
  host: SaveSummaryHost,
  folder: string,
  path: string,
  current: () => boolean,
): Promise<SaveCardState | undefined> {
  const file = await host.readSave(folder, path);
  if (!file) return { state: "none" };
  const summaryWith = (format: SaveFormat | null) =>
    summaryOf(engine, host, file.sha256, async () => new Uint8Array(file.bytes), current, format?.id);
  let format = await host.saveFormat(path).catch(() => null);
  const keep = (format: SaveFormat | null) => host.keepSaveFormat(path, format).catch((error) => console.error(error));
  try {
    let summary: SaveSummary | undefined;
    try {
      summary = await summaryWith(format);
    } catch (error) {
      if (!format || !rejectsFormat(error)) throw error;
      await keep((format = null));
      summary = await summaryWith(format);
    }
    if (!summary) return;
    if (!format && summary.formatId) await keep((format = { id: summary.formatId, chosen: false }));
    return { state: "read", modified: file.modified, summary, format };
  } catch (error) {
    const candidates = formatChoiceOf(error);
    if (candidates) return { state: "choose", candidates };
    throw error;
  }
}

export function useSaveCard(host: SaveSummaryHost, folder: string, path: string, reload: number) {
  const engine = useEngine();
  const [card, setCard] = useState(() => lastKnown(host, path).card);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let current = true;
    setLoading(true);
    readCard(engine, host, folder, path, () => current)
      .catch((): SaveCardState => ({ state: "unreadable" }))
      .then((card) => {
        if (!current || !card) return;
        remember(host, path, { card });
        setCard(card);
        setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [engine, host, folder, path, reload]);

  return [card, loading] as const;
}
