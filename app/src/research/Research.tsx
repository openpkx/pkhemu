import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "cn";
import { Check, FileClock, FlaskConical, Gamepad2, Save } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Choice } from "@/plugin-kit/Choice";
import { navigate, Screen } from "@/plugin-kit/motion";
import { ScreenHeader } from "@/plugin-kit/ScreenHeader";
import { ChangeList, CompareCard } from "./ChangeList";
import { spaceTitle, valueName, type Change, type RangeCandidate, type SpaceChange } from "./diff";
import { FindingSheet, type Draft } from "./FindingSheet";
import { findingAt, type Finding } from "./findings";
import { FindingsTab } from "./FindingsTab";
import type { Selection } from "./HexView";
import type { ResearchHost } from "./host";
import { SpacePane } from "./SpacePane";
import { time } from "./text";
import { useCompare, type Compare } from "./useCompare";
import { useDiff, type Diff } from "./useDiff";
import { useFindings } from "./useFindings";
import { useGame } from "./useGame";
import { useWide } from "./useWide";
import { ValuePane } from "./ValuePane";

export function Research({ host }: { host: ResearchHost }) {
  const [open, setOpen] = useState(false);
  const { compare, start, end } = useCompare(host);
  const game = useGame(host);
  const findings = useFindings(host, game);
  const diff = useDiff(game?.picked, compare?.stage === "open" && game !== undefined ? compare : undefined);
  const [tab, setTab] = useState<"compare" | "findings">("compare");
  const [confirming, setConfirming] = useState<"new" | "close">();
  const [drilled, setDrilled] = useState<string>();
  const [draft, setDraft] = useState<Draft>();
  const [exporting, setExporting] = useState(false);
  const wide = useWide();
  const inSpace = tab === "compare" && !wide && drilled !== undefined;

  const close = useCallback(() => {
    navigate("back", () => {
      setOpen(false);
      setDrilled(undefined);
      setDraft(undefined);
      setExporting(false);
    });
    void host.close();
  }, [host]);
  const back = useRef(close);
  back.current = draft
    ? () => setDraft(undefined)
    : exporting
      ? () => setExporting(false)
      : inSpace
        ? () => navigate("back", () => setDrilled(undefined))
        : close;

  const resume = () => {
    setOpen(false);
    void host.resume();
  };

  useEffect(
    () =>
      host.listen((event) => {
        if (event.kind === "open") setOpen(true);
        if (event.kind === "back") back.current();
      }),
    [host],
  );

  if (!open) return null;
  const tabs = (
    <TabsList className={cn("pointer-coarse:h-11", !wide && "w-full")}>
      <TabsTrigger value="compare" className="px-3">
        Compare
      </TabsTrigger>
      <TabsTrigger value="findings" className="px-3">
        Findings
        {findings.all.length > 0 && <span className="rounded-full bg-muted-foreground/15 px-1.5 text-xs tabular-nums">{findings.all.length}</span>}
      </TabsTrigger>
    </TabsList>
  );
  return (
    <Screen>
      <Tabs
        value={tab}
        onValueChange={(next) => setTab(next as typeof tab)}
        role="region"
        aria-label="Research"
        className="fixed inset-0 z-20 gap-0 bg-background px-safe pb-safe text-foreground"
      >
        <ScreenHeader title={inSpace ? drilled : "Research"} onBack={() => back.current()}>
          {!inSpace && (
            <Badge variant="outline" className="text-muted-foreground">
              <FlaskConical />
              Lab
            </Badge>
          )}
          {wide && tabs}
        </ScreenHeader>
        {!wide && !inSpace && <div className="shrink-0 border-b px-4 py-2">{tabs}</div>}
        <TabsContent value="compare" className="flex min-h-0 flex-col">
          {compare === null ? null : !compare ? (
            <StartCompare host={host} onStart={(from) => navigate("forward", () => void start(from))} />
          ) : compare.stage !== "open" ? (
            <Waiting compare={compare} onBack={resume} onCancel={() => navigate("back", end)} />
          ) : game === undefined ? null : (
            <Ready
              key={compare.after.writtenAt}
              compare={compare}
              diff={diff}
              findings={findings.all}
              wide={wide}
              drilled={inSpace}
              onDrill={setDrilled}
              onName={setDraft}
              onNew={() => setConfirming("new")}
              onClose={() => setConfirming("close")}
            />
          )}
        </TabsContent>
        <TabsContent value="findings" className="flex min-h-0 flex-col">
          {game?.picked && (
            <FindingsTab
              host={host}
              findings={findings}
              format={`${game.picked.layout.target.format} ${game.picked.layout.target.version}`}
              exporting={exporting}
              onExporting={setExporting}
              onEdit={(finding) => setDraft({ kind: "edit", finding })}
            />
          )}
        </TabsContent>
      </Tabs>
      <FindingSheet
        draft={draft}
        findings={findings.all}
        pockets={diff?.state === "ready" ? diff.pockets : []}
        onClose={() => setDraft(undefined)}
        onSave={(finding) => {
          findings.save(finding);
          setDraft(undefined);
          void host.notify(`Saved ${finding.name}`);
        }}
        onDelete={(id) => {
          findings.remove(id);
          setDraft(undefined);
        }}
      />
      <AlertDialog open={confirming !== undefined} onOpenChange={(open) => !open && setConfirming(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirming === "new" ? "Start a new compare?" : "Close this compare?"}</AlertDialogTitle>
            <AlertDialogDescription>Both saves in this compare go away.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={confirming === "close" ? "destructive" : "default"}
              onClick={() => {
                const closing = confirming === "close";
                setConfirming(undefined);
                setDrilled(undefined);
                setDraft(undefined);
                end();
                if (closing) close();
              }}
            >
              {confirming === "new" ? "New compare" : "Close compare"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Screen>
  );
}

function Page({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto grid w-full max-w-md content-start gap-8 px-6 pt-10 pb-8 md:pt-20">{children}</div>
    </main>
  );
}

function StartCompare({ host, onStart }: { host: ResearchHost; onStart(from: "latest" | "next"): void }) {
  const [latest, setLatest] = useState<number>();

  useEffect(() => {
    let live = true;
    host.saveFile().then(
      ({ writtenAt }) => live && setLatest(writtenAt),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [host]);

  return (
    <Page>
      <div className="grid justify-items-center gap-3 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary [&_svg]:size-7">
          <FlaskConical />
        </span>
        <h2 className="font-heading text-2xl font-medium">Compare two saves</h2>
        <p className="text-sm text-balance text-muted-foreground">Pick a first save, do one thing in the game, then save again. You'll see which bytes changed.</p>
      </div>
      <div className="stagger grid gap-3">
        <Choice
          icon={<FileClock />}
          title="Latest save"
          line={latest ? `The save file as it is now, from ${time(latest)}` : "The save file as it is now"}
          onClick={() => onStart("latest")}
        />
        <Choice icon={<Save />} title="I'll save now" line="Use the next save the game writes" onClick={() => onStart("next")} />
      </div>
      <ul className="grid gap-1.5 text-center text-xs text-muted-foreground">
        <li>Research only reads saves, and its data stays on this device.</li>
        <li>Loading a save state ends a compare.</li>
      </ul>
    </Page>
  );
}

function Waiting({ compare, onBack, onCancel }: { compare: Exclude<Compare, { stage: "open" }>; onBack(): void; onCancel(): void }) {
  const baseline = compare.stage === "after" ? compare.baseline : undefined;
  return (
    <Page>
      <div className="grid gap-2 text-center">
        <h2 className="font-heading text-2xl font-medium">Play, then save in game</h2>
        <p className="text-sm text-balance text-muted-foreground">
          {baseline ? "The compare opens when the game writes its next save." : "The next save the game writes becomes the first save."}
        </p>
      </div>
      <ol aria-label="Saves" className="grid rounded-xl border bg-card p-2">
        <Step state={baseline ? "done" : "waiting"} title="First save" line={baseline ? `Kept · ${time(baseline.writtenAt)}` : "Waiting for the game to save"} />
        <Step state={baseline ? "waiting" : "next"} title="Second save" line={baseline ? "Waiting for the game to save" : "After the first one"} />
      </ol>
      <div className="grid gap-2">
        <Button size="lg" onClick={onBack}>
          <Gamepad2 />
          Back to game
        </Button>
        <Button variant="secondary" size="lg" onClick={onCancel}>
          Cancel compare
        </Button>
      </div>
    </Page>
  );
}

function Step({ state, title, line }: { state: "done" | "waiting" | "next"; title: string; line: string }) {
  return (
    <li className="flex items-center gap-3 rounded-lg px-3 py-3" aria-current={state === "waiting" ? "step" : undefined}>
      <span
        className={cn(
          "relative flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors",
          state === "done" ? "border-transparent bg-success/15 text-success" : state === "waiting" ? "border-primary/60" : "border-border",
        )}
      >
        {state === "done" ? <Check className="size-4" /> : state === "waiting" && <span className="size-2 animate-pulse rounded-full bg-primary" />}
      </span>
      <span className="grid min-w-0 gap-0.5">
        <span className={cn("font-medium", state === "next" && "text-muted-foreground")}>{title}</span>
        <span className="text-sm text-muted-foreground">{line}</span>
      </span>
    </li>
  );
}

function Ready({
  compare,
  diff,
  findings,
  wide,
  drilled,
  onDrill,
  onName,
  onNew,
  onClose,
}: {
  compare: Extract<Compare, { stage: "open" }>;
  diff?: Diff;
  findings: readonly Finding[];
  wide: boolean;
  drilled: boolean;
  onDrill(title: string): void;
  onName(draft: Draft): void;
  onNew(): void;
  onClose(): void;
}) {
  const [selectedId, setSelectedId] = useState<string>();
  const [movedCursor, setCursor] = useState<number>();
  const [anchor, setAnchor] = useState<number>();

  if (diff?.state !== "ready")
    return (
      <main className="min-h-0 flex-1 overflow-y-auto px-4 pt-4">
        <div className="mx-auto grid max-w-md gap-6">
          <CompareCard baseline={compare.baseline} after={compare.after} latest={compare.latest} onNew={onNew} onClose={onClose} />
          <p className="px-6 text-center text-sm text-muted-foreground">
            {!diff
              ? "Reading both saves…"
              : diff.state === "no-layout"
                ? "No layout describes this game's saves yet."
                : "These saves couldn't be read with this game's layout."}
          </p>
        </div>
      </main>
    );

  const changes: Change[] = [
    ...diff.changes.flatMap(({ candidates }) => candidates),
    ...diff.values,
    ...diff.changes.flatMap(({ known }) => known),
  ];
  const selected = changes.find(({ id }) => id === selectedId) ?? (wide ? changes[0] : undefined);
  const spaceChange = selected?.kind === "value" ? undefined : selected;
  const space = spaceChange && diff.changes.find((changes) => changes.space === spaceChange.space);
  const cursor = movedCursor ?? spaceChange?.bytes[0] ?? 0;
  const selection = anchor !== undefined && anchor !== cursor ? { from: Math.min(anchor, cursor), to: Math.max(anchor, cursor) } : undefined;

  const pick = (change: Change) => {
    setSelectedId(change.id);
    setAnchor(undefined);
    if (change.kind !== "value" && !change.bytes.includes(cursor)) setCursor(change.bytes[0]);
  };
  const drill = (change: SpaceChange) => navigate("forward", () => (pick(change), onDrill(spaceTitle(change.space.name))));
  const name = (change: Change) =>
    change.kind === "value" ? onName({ kind: "value", change }) : change.kind === "range" && onName(rangeDraft(change, cursor, selection, findings));
  const open = (change: Change) => (wide ? pick(change) : change.kind === "value" ? name(change) : drill(change));
  const moveCursor = (offset: number, extend: boolean) => {
    setAnchor(extend ? (anchor ?? cursor) : undefined);
    setCursor(offset);
  };

  const list = (
    <ChangeList
      diff={diff.changes}
      values={diff.values}
      spaces={diff.spaces}
      checked={diff.checked}
      baseline={compare.baseline}
      after={compare.after}
      latest={compare.latest}
      findings={findings}
      selected={wide ? selected : undefined}
      onOpen={open}
      onNew={onNew}
      onClose={onClose}
    />
  );
  const pane = space && (
    <SpacePane
      key={space.space.name}
      changes={space}
      focus={spaceChange}
      findings={findings}
      cursor={cursor}
      selection={selection}
      columns={wide ? 16 : 8}
      wide={wide}
      onCursor={moveCursor}
      onPick={pick}
      onName={() => spaceChange && name(spaceChange)}
    />
  );

  if (wide)
    return (
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)]">
        <aside aria-label="Changes" className="min-h-0 overflow-y-auto border-r px-4 pt-4">
          {list}
        </aside>
        <section
          aria-label={selected?.kind === "value" ? valueName(selected) : space ? spaceTitle(space.space.name) : undefined}
          className="relative min-h-0 overflow-y-auto px-8 pt-6"
        >
          {selected?.kind === "value" ? <ValuePane change={selected} findings={findings} onName={() => name(selected)} /> : pane}
        </section>
      </div>
    );
  return drilled && pane ? (
    <Screen key="space">
      <main className="min-h-0 flex-1 overflow-y-auto px-4 pt-4">{pane}</main>
    </Screen>
  ) : (
    <Screen key="list">
      <main className="min-h-0 flex-1 overflow-y-auto px-4 pt-4">{list}</main>
    </Screen>
  );
}

function rangeDraft(change: RangeCandidate, cursor: number, selection: Selection | undefined, findings: readonly Finding[]): Draft {
  const { space } = change;
  if (selection) return { kind: "range", space, offset: selection.from, length: selection.to - selection.from + 1 };
  const free = (offset: number) => offset >= change.start && offset < change.end && !findingAt(findings, space.name, offset);
  const from = free(cursor) ? cursor : (change.bytes.find(free) ?? change.start);
  let [first, last] = [from, from];
  while (free(first - 1)) first--;
  while (free(last + 1)) last++;
  return { kind: "range", space, offset: first, length: last - first + 1 };
}
