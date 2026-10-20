import { useState, type ReactNode } from "react";
import { cn } from "cn";
import { Check, Keyboard, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { knownChanged, knownValue, rangeAt, SHORT, runName, spaceTitle, type SpaceChange, type SpaceChanges } from "./diff";
import { findingAt, whose, type Finding } from "./findings";
import { HexView, type Selection } from "./HexView";
import { byte, hex, plural } from "./text";

export function SpacePane({
  changes,
  focus,
  findings,
  cursor,
  selection,
  columns,
  wide,
  onCursor,
  onPick,
  onName,
}: {
  changes: SpaceChanges;
  focus?: SpaceChange;
  findings: readonly Finding[];
  cursor: number;
  selection?: Selection;
  columns: number;
  wide: boolean;
  onCursor(offset: number, extend: boolean): void;
  onPick(change: SpaceChange): void;
  onName(): void;
}) {
  const [showing, setShowing] = useState<"before" | "after">("after");
  const { space } = changes;
  const all = [...changes.candidates, ...changes.known].sort((a, b) => a.bytes[0] - b.bytes[0]);
  const changed = all.reduce((sum, { bytes }) => sum + bytes.length, 0);
  return (
    <div className="mx-auto grid w-full max-w-[40rem] gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-0.5">
          {wide && <h2 className="font-heading text-lg font-medium">{spaceTitle(space.name)}</h2>}
          <p className="text-sm text-muted-foreground tabular-nums">
            {plural(space.after.length, "byte")} · {changed} changed
          </p>
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          spacing={0}
          aria-label="Bytes shown"
          value={showing}
          onValueChange={(value) => value && setShowing(value as typeof showing)}
        >
          <ToggleGroupItem value="before">Before</ToggleGroupItem>
          <ToggleGroupItem value="after">After</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {focus && <ChangeCard key={focus.id} change={focus} findings={findings} onName={onName} />}

      <Legend />

      <div className="-mx-1 -mt-6 overflow-x-auto px-1 pt-8">
        <HexView
          space={space}
          changes={all}
          focus={focus}
          findings={findings}
          showing={showing}
          columns={columns}
          cursor={cursor}
          selection={selection}
          onCursor={onCursor}
          onPick={onPick}
        />
      </div>

      <div className="sticky bottom-0 -mx-1 grid gap-2 bg-linear-to-t from-background from-75% to-transparent px-1 pt-5 pb-4">
        <Inspector changes={changes} findings={findings} offset={cursor} selection={selection} />
        <p className="hidden items-center gap-1.5 text-xs text-muted-foreground pointer-fine:flex">
          <Keyboard className="size-3.5" />
          Arrow keys move. Shift selects. N and P jump between changes.
        </p>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <ul aria-label="Key" className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      <Key swatch="bg-warning/30">Changed, unmapped</Key>
      <Key swatch="bg-primary/30">Changed, known</Key>
      <Key swatch="h-[2px] w-4 rounded-full bg-success/60">Named by a finding</Key>
      <Key swatch="h-[2px] w-4 rounded-full bg-input">Known range</Key>
    </ul>
  );
}

function Key({ swatch, children }: { swatch: string; children: ReactNode }) {
  return (
    <li className="flex items-center gap-1.5">
      <span aria-hidden className={cn("size-3 rounded-[3px]", swatch)} />
      {children}
    </li>
  );
}

function ChangeCard({ change, findings, onName }: { change: SpaceChange; findings: readonly Finding[]; onName(): void }) {
  const named = change.kind === "range" ? change.bytes.map((offset) => findingAt(findings, change.space.name, offset)) : [];
  const names = [...new Set(named.flatMap((finding) => (finding ? [finding.name] : [])))];
  return (
    <Card className="motion-crossfade-in gap-3 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1.5">
          <Badge variant="outline" className={change.kind === "range" ? "border-warning/40 text-warning" : "text-muted-foreground"}>
            {change.kind === "range" ? "Unmapped bytes" : "Known range"}
          </Badge>
          <span className={cn("text-base font-medium", change.kind === "range" && "font-mono tabular-nums")}>
            {change.kind === "range" ? runName(change) : change.name}
          </span>
        </div>
        {change.kind === "range" &&
          (named.some((finding) => !finding) ? (
            <Button onClick={onName}>
              <Tag />
              Name this
            </Button>
          ) : (
            <Badge variant="outline" className="h-8 px-3 text-success">
              <Check />
              Named
            </Badge>
          ))}
      </div>
      {change.kind === "range" ? (
        <div className="grid gap-1 text-sm text-muted-foreground">
          <p>
            {plural(change.bytes.length, "byte")} changed at{" "}
            <span className="font-mono text-[13px] text-foreground tabular-nums">{change.bytes.map((offset) => hex(offset)).join(", ")}</span>. No known range
            covers them.
          </p>
          {names.length > 0 && <p className="text-success">Named: {names.join(", ")}</p>}
        </div>
      ) : (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Type</dt>
          <dd className="font-mono text-[13px]">{change.type}</dd>
          {change.length > SHORT ? (
            <>
              <dt className="text-muted-foreground">Changed</dt>
              <dd>{knownChanged(change)}</dd>
            </>
          ) : (
            <>
              <dt className="text-muted-foreground">Before</dt>
              <dd className="font-mono text-[13px] tabular-nums">{knownValue(change, "before")}</dd>
              <dt className="text-muted-foreground">After</dt>
              <dd className="font-mono text-[13px] tabular-nums">{knownValue(change, "after")}</dd>
            </>
          )}
          {change.note && (
            <>
              <dt className="text-muted-foreground">Note</dt>
              <dd>{change.note}</dd>
            </>
          )}
        </dl>
      )}
    </Card>
  );
}

function Inspector({
  changes: { space },
  findings,
  offset,
  selection,
}: {
  changes: SpaceChanges;
  findings: readonly Finding[];
  offset: number;
  selection?: Selection;
}) {
  const known = rangeAt(space, offset);
  const found = known ? undefined : findingAt(findings, space.name, offset);
  const before = space.before[offset];
  const after = space.after[offset];
  const selected = selection && selection.to > selection.from;
  return (
    <div
      aria-live="polite"
      className="grid min-h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 rounded-xl border bg-card px-4 py-2.5 text-sm shadow-sm"
    >
      <span className="row-span-2 font-mono text-[13px] text-muted-foreground tabular-nums">{hex(offset)}</span>
      <span className={cn("truncate font-medium", !known && !found && "text-muted-foreground")}>{known?.name ?? found?.name ?? "Unmapped"}</span>
      <span className="row-span-2 text-right font-mono text-[13px] tabular-nums">
        {before === after ? (
          byte(after)
        ) : (
          <>
            <span className="text-muted-foreground">{byte(before)}</span>
            <span className="px-1.5 text-muted-foreground">→</span>
            <span className={known ? "text-foreground" : "text-warning"}>{byte(after)}</span>
          </>
        )}
      </span>
      <span className="line-clamp-2 text-muted-foreground">
        {selected
          ? `Selected ${hex(selection.from)}–${hex(selection.to)} · ${plural(selection.to - selection.from + 1, "byte")}`
          : known
            ? [known.type, known.length > 1 && plural(known.length, "byte")].filter(Boolean).join(" · ")
            : found
              ? `${found.type} · ${whose(found)}`
              : before === after
              ? "No known range covers this byte"
              : "Changed. No known range covers it."}
      </span>
    </div>
  );
}
