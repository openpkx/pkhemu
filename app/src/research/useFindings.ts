import { useCallback, useEffect, useRef, useState } from "react";
import { appName, findingsFile, findingsName, parseFindings, type Finding, type Named, type Target } from "./findings";
import type { ResearchHost } from "./host";
import type { Game } from "./useGame";

export type Findings = ReturnType<typeof useFindings>;

export function useFindings(host: ResearchHost, game: Game | null | undefined) {
  const target: Target | undefined = game?.picked && { format: game.picked.layout.target.format, version: game.picked.layout.target.version };
  // Offsets mean something only in the layout version they were found with.
  const layout = target && `${target.format}-${target.version}`;
  const [loaded, setLoaded] = useState<{ own: Finding[]; imported: Finding[] }>();
  const current = useRef(loaded);
  current.current = loaded;
  const { own = [], imported = [] } = loaded ?? {};

  useEffect(() => {
    if (!layout) return;
    let live = true;
    void Promise.all([host.load<Finding[]>(`findings:${layout}`), host.load<Finding[]>(`imported:${layout}`)])
      .catch(() => [])
      .then(([own, imported]) => live && setLoaded({ own: own ?? [], imported: imported ?? [] }));
    return () => {
      live = false;
    };
  }, [host, layout]);

  const update = useCallback(
    (which: "own" | "imported", next: Finding[]) => {
      if (!layout || !current.current) return;
      current.current = { ...current.current, [which]: next };
      setLoaded(current.current);
      void host.store(`${which === "own" ? "findings" : "imported"}:${layout}`, next);
    },
    [host, layout],
  );

  const text = target && findingsFile(target, own);
  const exported = target && text ? { name: findingsName(target), text, count: (JSON.parse(text) as { findings: unknown[] }).findings.length } : undefined;

  return {
    own,
    imported,
    all: [...own, ...imported],
    exported,
    save(named: Named) {
      if (!current.current) return;
      const own = current.current.own;
      const was = own.find(({ id }) => id === named.id);
      const finding: Finding = was ? { ...named, rom: was.rom, app: was.app } : { ...named, rom: game?.context.romSha1?.toLowerCase() ?? null, app: appName(game?.context.app ?? "") };
      update("own", was ? own.map((kept) => (kept === was ? finding : kept)) : [...own, finding]);
    },
    remove(id: string) {
      update("own", own.filter((finding) => finding.id !== id));
    },
    async importFile(): Promise<{ error: string } | { added: number; file: string } | undefined> {
      if (!target) return { error: "No layout describes this game's saves yet." };
      const file = await host.importFile();
      if (!file) return;
      const read = parseFindings(file.text, target, file.name);
      if (typeof read === "string") return { error: read };
      update("imported", [...imported.filter((finding) => finding.file !== file.name), ...read]);
      return { added: read.length, file: file.name };
    },
    removeFile(file: string) {
      update("imported", imported.filter((finding) => finding.file !== file));
    },
  };
}
