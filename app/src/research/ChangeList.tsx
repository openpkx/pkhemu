import { useState, type ReactNode } from "react";
import { cn } from "cn";
import { ArrowRight, ChevronRight, Ellipsis, GitCompareArrows, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { sectionHeading } from "@/plugin-kit/sectionHeading";
import {
  knownChanged,
  knownValue,
  runName,
  SHORT,
  spaceTitle,
  valueName,
  valueWhere,
  type Change,
  type KnownChange,
  type SpaceChanges,
  type ValueCandidate,
} from "./diff";
import { findingAt, valueFinding, type Finding } from "./findings";
import type { SaveFile } from "./host";
import { plural, time } from "./text";

const KNOWN_SHOWN = 3;

export function ChangeList({
  diff,
  values,
  spaces,
  checked,
  baseline,
  after,
  latest,
  findings,
  selected,
  onOpen,
  onNew,
  onClose,
}: {
  diff: SpaceChanges[];
  values: ValueCandidate[];
  spaces: number;
  checked: boolean;
  baseline: SaveFile;
  after: SaveFile;
  latest: boolean;
  findings: readonly Finding[];
  selected?: Change;
  onOpen(change: Change): void;
  onNew(): void;
  onClose(): void;
}) {
  const unmapped = diff.filter(({ candidates }) => candidates.length);
  const known = diff.filter(({ known }) => known.length);
  const counts = {
    unmapped: unmapped.reduce((sum, { candidates }) => sum + candidates.length, 0),
    known: known.reduce((sum, { known }) => sum + known.length, 0),
  };
  const row = (change: Change) => (
    <li key={change.id} data-change={change.id}>
      <ChangeRow change={change} findings={findings} selected={change.id === selected?.id} onClick={() => onOpen(change)} />
    </li>
  );

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 pb-4">
      <CompareCard baseline={baseline} after={after} latest={latest} onNew={onNew} onClose={onClose}>
        <dl className="grid grid-cols-3 gap-2">
          <Stat label="Unmapped" value={counts.unmapped} tone={counts.unmapped > 0} />
          <Stat label="Unknown" value={values.length} tone={values.length > 0} />
          <Stat label="Known" value={counts.known} />
        </dl>
        {!checked && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TriangleAlert className="size-3.5 text-warning" />
            Not checked against this ROM
          </p>
        )}
      </CompareCard>

      {counts.unmapped > 0 && (
        <Group title="Unmapped bytes" line="Changed bytes no known range covers">
          {unmapped.map(({ space, candidates }) => (
            <SpaceGroup key={space.name} name={spaceTitle(space.name)} count={plural(candidates.length, "range")}>
              {candidates.map(row)}
            </SpaceGroup>
          ))}
        </Group>
      )}

      {values.length > 0 && (
        <Group title="Unknown items" line="Items the engine reads but can't name">
          <ul className="grid gap-0.5">{values.map(row)}</ul>
        </Group>
      )}

      {counts.known > 0 && (
        <Group title="Known changes" line="Named by the layout">
          {known.map((changes) => (
            <KnownGroup key={changes.space.name} name={spaceTitle(changes.space.name)} changes={changes.known} row={row} />
          ))}
        </Group>
      )}

      {diff.length === 0 && values.length === 0 && (
        <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">Nothing changed between these saves.</p>
      )}

      <p className="text-center text-xs text-muted-foreground">
        {diff.length} of {plural(spaces, "space")} changed. The rest are hidden.
      </p>
    </div>
  );
}

export function CompareCard({
  baseline,
  after,
  latest,
  onNew,
  onClose,
  children,
}: {
  baseline: SaveFile;
  after: SaveFile;
  latest: boolean;
  onNew(): void;
  onClose(): void;
  children?: ReactNode;
}) {
  return (
    <Card className="relative gap-3 px-4 py-4">
      <div className="flex items-start gap-3 pr-8">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary [&_svg]:size-4.5">
          <GitCompareArrows />
        </span>
        <div className="grid min-w-0 gap-0.5">
          <span className="font-medium">Compare</span>
          <span className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground tabular-nums">
            {latest ? "Latest save" : "Save"} {time(baseline.writtenAt)}
            <ArrowRight className="size-3.5" aria-label="to" />
            {time(after.writtenAt)}
          </span>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Compare actions" className="absolute top-3 right-3">
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onNew}>New compare…</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onClose}>
            Close compare…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {children}
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: boolean }) {
  return (
    <div className="grid gap-0.5 rounded-lg bg-background px-3 py-2 dark:bg-background/50">
      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("text-lg leading-tight font-medium tabular-nums", tone && "text-warning")}>{value}</dd>
    </div>
  );
}

function Group({ title, line, children }: { title: string; line: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="grid gap-3">
      <div className="grid gap-0.5 px-1">
        <h2 className={sectionHeading}>{title}</h2>
        <p className="text-xs text-muted-foreground">{line}</p>
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function SpaceGroup({ name, count, children }: { name: string; count: string; children: ReactNode }) {
  return (
    <section aria-label={name} className="grid gap-1">
      <h3 className="flex items-baseline justify-between gap-3 px-1 text-sm">
        <span className="font-medium text-foreground/85">{name}</span>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{count}</span>
      </h3>
      <ul className="grid gap-0.5">{children}</ul>
    </section>
  );
}

function KnownGroup({ name, changes, row }: { name: string; changes: KnownChange[]; row(change: Change): ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? changes : changes.slice(0, KNOWN_SHOWN);
  return (
    <SpaceGroup name={name} count={plural(changes.length, "change")}>
      {shown.map(row)}
      {changes.length > KNOWN_SHOWN && (
        <li>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start rounded-lg px-3 text-muted-foreground"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Show fewer" : `${changes.length - KNOWN_SHOWN} more`}
          </Button>
        </li>
      )}
    </SpaceGroup>
  );
}

function names(change: Change, findings: readonly Finding[]) {
  if (change.kind === "value") {
    const named = valueFinding(findings, change.domain, change.index);
    return named && { names: named.name, all: true };
  }
  if (change.kind !== "range") return;
  const named = change.bytes.map((offset) => findingAt(findings, change.space.name, offset));
  const found = [...new Set(named.flatMap((finding) => (finding ? [finding.name] : [])))];
  return found.length ? { names: found.join(", "), all: named.every(Boolean) } : undefined;
}

function ChangeRow({ change, findings, selected, onClick }: { change: Change; findings: readonly Finding[]; selected: boolean; onClick(): void }) {
  const named = names(change, findings);
  return (
    <Button
      variant="ghost"
      aria-current={selected || undefined}
      onClick={onClick}
      className={cn(
        "motion-press relative h-auto min-h-11 w-full justify-start gap-3 rounded-lg px-3 py-2.5 text-left font-normal whitespace-normal",
        selected && "bg-accent hover:bg-accent dark:hover:bg-accent",
        change.kind === "known" && "py-2 text-muted-foreground",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-2 shrink-0 rounded-full",
          change.kind === "known" ? "bg-muted-foreground/35" : named?.all ? "bg-success" : "bg-warning",
          selected && "ring-4 ring-ring/25",
        )}
      />
      {change.kind === "known" ? (
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <span className="min-w-0 truncate text-sm">{change.name}</span>
          <span className="min-w-0 truncate font-mono text-xs tabular-nums">
            {change.length > SHORT ? (
              knownChanged(change)
            ) : (
              <>
                {knownValue(change, "before")} <span aria-label="to">→</span> <span className="text-foreground/75">{knownValue(change, "after")}</span>
              </>
            )}
          </span>
        </span>
      ) : (
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="truncate font-mono text-[13px] font-medium text-foreground tabular-nums">
            {change.kind === "range" ? runName(change) : valueName(change)}
          </span>
          <span className="truncate text-sm text-muted-foreground">
            {change.kind === "range"
              ? `${plural(change.bytes.length, "byte")} changed`
              : `${valueWhere(change)} · ${change.before} → ${change.after}`}
          </span>
          {named && <span className="truncate text-sm text-success">{named.names}</span>}
        </span>
      )}
      <ChevronRight className="text-muted-foreground md:hidden" />
    </Button>
  );
}
