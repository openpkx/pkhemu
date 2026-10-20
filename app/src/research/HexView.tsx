import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "cn";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rangeAt, spaceTitle, type KnownRange, type SpaceChange, type Space } from "./diff";
import { findingAt, whose, type Finding } from "./findings";
import { byte, hex } from "./text";

type Row = { kind: "row"; row: number } | { kind: "gap"; from: number; to: number };

export type Selection = { from: number; to: number };

const CONTEXT_ROWS = 1;

export function HexView({
  space,
  changes,
  focus,
  findings,
  showing,
  columns,
  cursor,
  selection,
  onCursor,
  onPick,
}: {
  space: Space;
  changes: SpaceChange[];
  focus?: SpaceChange;
  findings: readonly Finding[];
  showing: "before" | "after";
  columns: number;
  cursor: number;
  selection?: Selection;
  onCursor(offset: number, extend: boolean): void;
  onPick(change: SpaceChange): void;
}) {
  const id = useId();
  const grid = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<number>();
  const [opened, setOpened] = useState<ReadonlySet<number>>(() => new Set());
  const size = space.after.length;
  const rowCount = Math.ceil(size / columns);

  const changeOf = useMemo(() => {
    const map = new Map<number, SpaceChange>();
    for (const change of changes) for (const offset of change.bytes) map.set(offset, change);
    return map;
  }, [changes]);

  const rows = useMemo(() => {
    if (size <= 256) return Array.from({ length: rowCount }, (_, row): Row => ({ kind: "row", row }));
    const shown = new Set<number>();
    const keep = (offset: number) => {
      const row = Math.floor(offset / columns);
      for (let near = row - CONTEXT_ROWS; near <= row + CONTEXT_ROWS; near++) if (near >= 0 && near < rowCount) shown.add(near);
    };
    for (const offset of changeOf.keys()) keep(offset);
    keep(cursor);
    const list: Row[] = [];
    let gapFrom: number | undefined;
    for (let row = 0; row < rowCount; row++) {
      if (shown.has(row) || opened.has(row)) {
        if (gapFrom !== undefined) list.push({ kind: "gap", from: gapFrom, to: row });
        gapFrom = undefined;
        list.push({ kind: "row", row });
      } else gapFrom ??= row;
    }
    if (gapFrom !== undefined) list.push({ kind: "gap", from: gapFrom, to: rowCount });
    return list;
  }, [size, columns, rowCount, changeOf, opened, cursor]);

  const visibleRows = rows.flatMap((row) => (row.kind === "row" ? [row.row] : []));
  const litOffset = hovered ?? cursor;
  const litRange = rangeAt(space, litOffset) ?? findingAt(findings, space.name, litOffset);

  useEffect(() => {
    grid.current?.querySelector(`[data-offset="${cursor}"]`)?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  const move = (event: KeyboardEvent) => {
    const row = Math.floor(cursor / columns);
    const at = visibleRows.indexOf(row);
    const column = cursor % columns;
    const jump = (offset: number | undefined) => {
      if (offset === undefined || offset < 0 || offset >= size) return;
      event.preventDefault();
      onCursor(offset, event.shiftKey);
    };
    const toChange = (step: 1 | -1) => {
      const index = focus ? changes.indexOf(focus) : -1;
      const next = changes[(index + step + changes.length) % changes.length];
      if (!next) return;
      event.preventDefault();
      onPick(next);
    };
    switch (event.key) {
      case "ArrowLeft":
        return jump(column > 0 ? cursor - 1 : visibleRows[at - 1] !== undefined ? visibleRows[at - 1] * columns + columns - 1 : undefined);
      case "ArrowRight":
        return jump(column < columns - 1 ? cursor + 1 : visibleRows[at + 1] !== undefined ? visibleRows[at + 1] * columns : undefined);
      case "ArrowUp":
        return jump(visibleRows[at - 1] !== undefined ? visibleRows[at - 1] * columns + column : undefined);
      case "ArrowDown":
        return jump(visibleRows[at + 1] !== undefined ? visibleRows[at + 1] * columns + column : undefined);
      case "Home":
        return jump(row * columns);
      case "End":
        return jump(Math.min(size - 1, row * columns + columns - 1));
      case "n":
      case "N":
        return toChange(1);
      case "p":
      case "P":
        return toChange(-1);
    }
  };

  return (
    <div className="relative">
      <div
        ref={grid}
        role="grid"
        tabIndex={0}
        aria-label={`${spaceTitle(space.name)}, ${showing}`}
        aria-activedescendant={`${id}-${cursor}`}
        aria-rowcount={rowCount}
        aria-multiselectable
        onKeyDown={move}
        onPointerLeave={() => setHovered(undefined)}
        className="w-fit max-w-full rounded-lg font-mono text-[13px] leading-none tabular-nums outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {rows.map((entry) =>
          entry.kind === "gap" ? (
            <div key={`gap-${entry.from}`} role="row" className="py-1">
              <span role="gridcell" className="block">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 rounded-lg font-sans text-muted-foreground"
                  onClick={() => setOpened((opened) => new Set([...opened, ...span(entry.from, entry.to)]))}
                >
                  <ChevronsUpDown />
                  {hex(entry.from * columns)}–{hex(Math.min(entry.to * columns, size) - 1)} · {entry.to - entry.from}{" "}
                  {entry.to - entry.from === 1 ? "row" : "rows"}, nothing changed
                </Button>
              </span>
            </div>
          ) : (
            <div key={entry.row} role="row" aria-rowindex={entry.row + 1} className="flex items-center">
              <span role="rowheader" className="w-12 shrink-0 pr-2 text-[12px] text-muted-foreground/70 sm:w-14">
                {(entry.row * columns).toString(16).toUpperCase().padStart(4, "0")}
              </span>
              {span(entry.row * columns, Math.min((entry.row + 1) * columns, size)).map((offset) => {
                const change = changeOf.get(offset);
                const known = rangeAt(space, offset);
                const found = known ? undefined : findingAt(findings, space.name, offset);
                const group = known ?? found;
                const column = offset % columns;
                const selected = selection && offset >= selection.from && offset <= selection.to;
                const lit = group !== undefined && group === litRange;
                return (
                  <span
                    key={offset}
                    id={`${id}-${offset}`}
                    role="gridcell"
                    aria-selected={selected || offset === cursor}
                    aria-label={cellLabel(space, findings, offset)}
                    data-offset={offset}
                    onPointerEnter={(event) => event.pointerType === "mouse" && setHovered(offset)}
                    onClick={(event) => {
                      onCursor(offset, event.shiftKey);
                      if (change && !event.shiftKey) onPick(change);
                      grid.current?.focus({ preventScroll: true });
                    }}
                    className={cn(
                      "relative grid h-9 w-9 scroll-mt-20 scroll-mb-36 cursor-default place-items-center rounded-[5px] transition-colors duration-(--motion-duration-short3) ease-(--motion-easing-standard) sm:h-8 sm:w-8",
                      column === columns / 2 && "ml-2",
                      !change && !group && "text-muted-foreground/45",
                      !change && group && "text-muted-foreground",
                      lit && !change && "bg-foreground/[0.06] text-foreground",
                      change?.kind === "known" && "bg-primary/15 text-foreground",
                      change?.kind === "range" && "bg-warning/15 font-semibold text-warning",
                      change && change === focus && (change.kind === "known" ? "bg-primary/30" : "bg-warning/30"),
                      selected && "bg-ring/30 text-foreground",
                      offset === cursor && "z-10 ring-2 ring-ring",
                    )}
                  >
                    {byte(space[showing][offset])}
                    {group && <RangeBar range={group} offset={offset} column={column} columns={columns} lit={lit} finding={found !== undefined} />}
                  </span>
                );
              })}
            </div>
          ),
        )}
      </div>
      {hovered !== undefined && <Tooltip grid={grid.current} offset={hovered} text={describe(space, findings, hovered)} />}
    </div>
  );
}

function RangeBar({
  range,
  offset,
  column,
  columns,
  lit,
  finding,
}: {
  range: Pick<KnownRange, "offset" | "length">;
  offset: number;
  column: number;
  columns: number;
  lit: boolean;
  finding: boolean;
}) {
  const start = offset === range.offset || column === 0 || column === columns / 2;
  const end = offset === range.offset + range.length - 1 || column === columns - 1 || column === columns / 2 - 1;
  return (
    <span
      aria-hidden
      className={cn(
        "absolute bottom-[3px] h-[2px] transition-colors duration-(--motion-duration-short3)",
        finding ? "bg-success/60" : "bg-input",
        lit && (finding ? "bg-success" : "bg-ring"),
        start ? "left-[5px] rounded-l-full" : "left-0",
        end ? "right-[5px] rounded-r-full" : "right-0",
      )}
    />
  );
}

function Tooltip({ grid, offset, text }: { grid: HTMLDivElement | null; offset: number; text: string }) {
  const cell = grid?.querySelector<HTMLElement>(`[data-offset="${offset}"]`);
  if (!cell) return null;
  return (
    <span
      key={text}
      aria-hidden
      style={{ left: cell.offsetLeft + cell.offsetWidth / 2, top: cell.offsetTop }}
      className="motion-crossfade-in pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+6px)] rounded-md bg-overlay/90 px-2 py-1 font-sans text-xs whitespace-nowrap text-white shadow-md"
    >
      {text}
    </span>
  );
}

function span(from: number, to: number) {
  return Array.from({ length: Math.max(0, to - from) }, (_, index) => from + index);
}

export function describe(space: Space, findings: readonly Finding[], offset: number) {
  const known = rangeAt(space, offset);
  if (known) return `${known.name} · ${known.type}`;
  const found = findingAt(findings, space.name, offset);
  return found ? `${found.name} · ${found.type} · ${whose(found)}` : "Unmapped";
}

function cellLabel(space: Space, findings: readonly Finding[], offset: number) {
  const where = `${hex(offset)}, ${describe(space, findings, offset)}`;
  const before = space.before[offset];
  const after = space.after[offset];
  return before === after ? `${where}, ${byte(after)}` : `${where}, changed from ${byte(before)} to ${byte(after)}`;
}
