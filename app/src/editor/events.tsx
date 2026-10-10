import { Suspense, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useEvents, useInventory, useQuery } from "@pkhex-everywhere/react";
import type { EventFlag, EventWork, TicketsAndIslands } from "@pkhex-everywhere/engine";
import { useVirtualizer } from "@tanstack/react-virtual";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/preferences/preferences";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChoiceSelect } from "./choiceSelect";
import type { Page } from "./EditorScreen";

const rowHeight = 56;
const shortcuts = [
  { label: "Legendaries and rebattles", category: "Rebattle" },
  { label: "Story progress", category: "StoryProgress" },
];

type Entry = { index: number; name: string; category: string };
type SetFlag = (index: number, value: boolean) => void;
type SetWork = (index: number, value: number) => Promise<boolean>;

function Notice() {
  const { preferences, change } = usePreferences();
  if (preferences.eventsNoticeDismissed) return null;

  return (
    <Alert>
      <TriangleAlert />
      <AlertTitle>Changing event flags can break the story</AlertTitle>
      <AlertDescription>Applying an edit keeps a backup of the save, which you can restore from the game page.</AlertDescription>
      <AlertAction>
        <Button size="sm" variant="secondary" onClick={() => void change({ eventsNoticeDismissed: true })}>
          Got it
        </Button>
      </AlertAction>
    </Alert>
  );
}

function Row({ name, caption, children }: { name: string; caption: string; children(id: string, captionId: string): ReactNode }) {
  const id = useId();
  return (
    <div className="flex h-full items-center gap-3 px-3">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block truncate">
          {name}
        </label>
        <span id={`${id}-caption`} className="block truncate text-xs text-muted-foreground">
          {caption}
        </span>
      </div>
      {children(id, `${id}-caption`)}
    </div>
  );
}

const caption = (entry?: Entry) => (entry ? `#${entry.index} · ${entry.category}` : "No name in PKHeX");

function FlagRow({ index, flag, value, setFlag }: { index: number; flag?: EventFlag; value: boolean; setFlag: SetFlag }) {
  return (
    <Row name={flag?.name ?? `Flag ${index}`} caption={caption(flag)}>
      {(id, captionId) => (
        <Switch id={id} aria-describedby={captionId} checked={value} onCheckedChange={(value) => setFlag(index, value)} />
      )}
    </Row>
  );
}

function FlagByIndex({ index, flag, setFlag }: { index: number; flag?: EventFlag; setFlag: SetFlag }) {
  const value = useQuery("events.flag", index);
  return <FlagRow index={index} flag={flag} value={value} setFlag={setFlag} />;
}

function WorkNumber({
  id,
  captionId,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  captionId: string;
  value?: number;
  min: number;
  max: number;
  onChange(value: number): Promise<boolean>;
}) {
  const shown = value === undefined ? "" : String(value);
  const save = async (input: HTMLInputElement) => {
    const text = input.value.trim();
    const next = /^-?\d+$/.test(text) && Number(text) >= min && Number(text) <= max ? Number(text) : undefined;
    if (next === undefined || next === value) input.value = shown;
    else if (!(await onChange(next))) input.value = shown;
  };

  return (
    <Input
      key={shown}
      id={id}
      aria-describedby={captionId}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      placeholder={value === undefined ? "Value" : undefined}
      defaultValue={shown}
      onBlur={(event) => void save(event.currentTarget)}
      onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
      className="w-28 shrink-0"
    />
  );
}

function WorkRow({
  index,
  entry,
  min,
  max,
  setWork,
}: {
  index: number;
  entry?: EventWork;
  min: number;
  max: number;
  setWork: SetWork;
}) {
  const options = entry?.options ?? [];
  const choices = options.map((option) => ({ id: option.value, name: option.name }));
  if (entry && !options.some((option) => option.value === entry.value))
    choices.push({ id: entry.value, name: `Other (${entry.value})` });

  return (
    <Row name={entry?.name ?? `Work ${index}`} caption={caption(entry)}>
      {(id, captionId) =>
        entry && options.length ? (
          <div className="w-40 shrink-0">
            <ChoiceSelect
              id={id}
              choices={choices}
              value={entry.value}
              onChange={(value) => value !== entry.value && void setWork(index, value)}
            />
          </div>
        ) : (
          <WorkNumber
            id={id}
            captionId={captionId}
            value={entry?.value}
            min={min}
            max={max}
            onChange={(value) => setWork(index, value)}
          />
        )
      }
    </Row>
  );
}

function EditByIndex({ count, children }: { count: number; children(index: number): ReactNode }) {
  const id = useId();
  const [text, setText] = useState("");
  const index = /^\d+$/.test(text) && Number(text) < count ? Number(text) : undefined;

  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        Edit by index
      </label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        max={count - 1}
        placeholder={`0 to ${count - 1}`}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      {text && index === undefined && <p className="text-sm text-muted-foreground">This save has indexes 0 to {count - 1}.</p>}
      {index !== undefined && (
        <div className="h-14 rounded-lg border">
          <Suspense fallback={<p className="p-3 text-sm text-muted-foreground">Loading…</p>}>{children(index)}</Suspense>
        </div>
      )}
    </div>
  );
}

function matches(entry: Entry, search: string) {
  const text = search.trim().toLowerCase();
  if (/^\d+$/.test(text) && entry.index === Number(text)) return true;
  return entry.name.toLowerCase().includes(text);
}

function EntryList<T extends Entry>({
  label,
  entries,
  scroller,
  row,
}: {
  label: string;
  entries: T[];
  scroller: HTMLElement | null;
  row(entry: T): ReactNode;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => scroller,
    estimateSize: () => rowHeight,
    overscan: 8,
    scrollMargin,
  });

  // The list sits below the notice and the search inside the page's own scroller, and moves when anything there resizes.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !scroller) return;
    const measure = () => setScrollMargin(list.offsetTop);
    measure();
    const observer = new ResizeObserver(measure);
    for (const child of scroller.children) observer.observe(child);
    return () => observer.disconnect();
  }, [scroller]);

  return (
    <>
      {!entries.length && <p className="text-sm text-muted-foreground">Nothing matches.</p>}
      <div
        ref={listRef}
        role="list"
        aria-label={label}
        className={cn("relative rounded-lg", entries.length > 0 && "border")}
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const entry = entries[item.index];
          return (
            <div
              key={entry.index}
              role="listitem"
              className={cn("absolute inset-x-0 top-0", item.index > 0 && "border-t")}
              style={{ height: item.size, transform: `translateY(${item.start - scrollMargin}px)` }}
            >
              {row(entry)}
            </div>
          );
        })}
      </div>
    </>
  );
}

function Section<T extends Entry>({
  label,
  entries,
  scroller,
  byIndex,
  row,
  shortcuts = [],
}: {
  label: string;
  entries: T[];
  scroller: HTMLElement | null;
  byIndex: ReactNode;
  row(entry: T): ReactNode;
  shortcuts?: { label: string; category: string }[];
}) {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const categories = useMemo(() => [...new Set(entries.map((entry) => entry.category))].sort(), [entries]);
  const availableShortcuts = shortcuts.filter((shortcut) => categories.includes(shortcut.category));
  const shown = useMemo(
    () => entries.filter((entry) => (!picked.length || picked.includes(entry.category)) && matches(entry, search)),
    [entries, picked, search],
  );

  const applyShortcut = (category: string) => {
    setPicked([category]);
    setSearch("");
  };

  return (
    <>
      <div className="grid gap-4 p-4 pb-0">
        {availableShortcuts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {availableShortcuts.map((shortcut) => (
              <Button key={shortcut.category} variant="secondary" size="sm" onClick={() => applyShortcut(shortcut.category)}>
                {shortcut.label}
              </Button>
            ))}
          </div>
        )}
        {byIndex}
      </div>
      <div className="sticky top-0 z-10 grid gap-2 bg-background p-4">
        <Input
          type="search"
          aria-label={`Search ${label.toLowerCase()}`}
          placeholder="Search by name or index"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <ToggleGroup
          type="multiple"
          variant="outline"
          size="sm"
          value={picked}
          onValueChange={setPicked}
          className="flex-wrap justify-start"
        >
          {categories.map((category) => (
            <ToggleGroupItem key={category} value={category}>
              {category}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="px-4 pb-4">
        <EntryList label={label} entries={shown} scroller={scroller} row={row} />
      </div>
    </>
  );
}

function Tickets({
  gen3,
  giveTickets,
  setFlag,
}: {
  gen3: TicketsAndIslands;
  giveTickets(includeOldSeaMap: boolean): void;
  setFlag: SetFlag;
}) {
  const { inventory } = useInventory();
  const [asking, setAsking] = useState(false);
  const held = new Set(inventory.find((pouch) => pouch.name === "KeyItems")?.items.map((item) => item.name));

  return (
    <div className="grid gap-4 p-4">
      <div role="list" aria-label="Tickets" className="rounded-lg border">
        {gen3.tickets.map((ticket, i) => (
          <div
            key={ticket}
            role="listitem"
            data-held={held.has(ticket)}
            className={cn("flex h-14 flex-col justify-center px-3", i > 0 && "border-t")}
          >
            <span className="truncate">{ticket}</span>
            <span className="truncate text-xs text-muted-foreground">{held.has(ticket) ? "In the bag" : "Missing"}</span>
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        disabled={!gen3.anyTicketMissing}
        onClick={() => (gen3.oldSeaMapNeedsConfirmation ? setAsking(true) : giveTickets(false))}
      >
        Give tickets
      </Button>
      {gen3.islands.length > 0 && (
        <div className="grid gap-2">
          <h2 className="text-sm font-medium">Islands</h2>
          <div role="list" aria-label="Islands" className="rounded-lg border">
            {gen3.islands.map((island, i) => (
              <div key={island.index} role="listitem" className={cn("h-14", i > 0 && "border-t")}>
                <FlagRow index={island.index} flag={island} value={island.value} setFlag={setFlag} />
              </div>
            ))}
          </div>
        </div>
      )}
      <AlertDialog open={asking} onOpenChange={setAsking}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Give the Old Sea Map too?</AlertDialogTitle>
            <AlertDialogDescription>It was only given out in Japan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline" onClick={() => giveTickets(false)}>
              Leave it out
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => giveTickets(true)}>Include it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Events() {
  const { events, setFlag, setWork, giveTickets } = useEvents();
  const [error, setError] = useState<string>();
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);

  if (!events) return <p className="p-4 text-sm text-muted-foreground">This save has no event flags.</p>;

  const attempt = (change: Promise<unknown>) =>
    change.then(
      () => {
        setError(undefined);
        return true;
      },
      (reason) => {
        setError(String(reason));
        return false;
      },
    );
  const changeFlag: SetFlag = (index, value) => void attempt(setFlag(index, value));
  const changeWork: SetWork = (index, value) => attempt(setWork(index, value));

  const flags = (
    <Section
      label="Flags"
      entries={events.flags}
      scroller={scroller}
      shortcuts={shortcuts}
      byIndex={
        <EditByIndex count={events.flagCount}>
          {(index) => <FlagByIndex index={index} flag={events.flags.find((flag) => flag.index === index)} setFlag={changeFlag} />}
        </EditByIndex>
      }
      row={(entry) => <FlagRow index={entry.index} flag={entry} value={entry.value} setFlag={changeFlag} />}
    />
  );

  const tabs = [
    { value: "flags", label: "Flags", content: flags },
    events.work.length > 0 && {
      value: "work",
      label: "Work",
      content: (
        <Section
          label="Work"
          entries={events.work}
          scroller={scroller}
          byIndex={
            <EditByIndex count={events.workCount}>
              {(index) => (
                <WorkRow
                  index={index}
                  entry={events.work.find((entry) => entry.index === index)}
                  min={events.workMin}
                  max={events.workMax}
                  setWork={changeWork}
                />
              )}
            </EditByIndex>
          }
          row={(entry) => (
            <WorkRow index={entry.index} entry={entry} min={events.workMin} max={events.workMax} setWork={changeWork} />
          )}
        />
      ),
    },
    events.gen3 && {
      value: "tickets",
      label: "Tickets",
      content: (
        <Tickets
          gen3={events.gen3}
          giveTickets={(includeOldSeaMap) => void attempt(giveTickets(includeOldSeaMap))}
          setFlag={changeFlag}
        />
      ),
    },
  ].filter((tab) => !!tab);

  return (
    <Tabs ref={setScroller} defaultValue="flags" className="relative h-full gap-0 overflow-y-auto">
      <div className="grid gap-4 p-4 pb-0">
        <Notice />
        {error && <p className="text-sm text-destructive">{error}</p>}
        {tabs.length > 1 && (
          <TabsList className="w-full">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        )}
      </div>
      {tabs.length > 1
        ? tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="text-base">
              {tab.content}
            </TabsContent>
          ))
        : flags}
    </Tabs>
  );
}

export const eventsPage: Page = { title: "Events", sidebar: true, content: <Events /> };
