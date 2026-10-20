import { useId, useState, type ReactNode } from "react";
import { cn } from "cn";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BottomSheet } from "@/plugin-kit/BottomSheet";
import { spaceTitle, type Space, type ValueCandidate } from "./diff";
import { MAX_RANGE, RANGE_TYPES, rangeProblem, type Confidence, type Finding, type Named, type RangeType } from "./findings";
import { bytesText, hex } from "./text";

export type Draft = { kind: "range"; space: Space; offset: number; length: number } | { kind: "value"; change: ValueCandidate } | { kind: "edit"; finding: Finding };

export function FindingSheet({
  draft,
  findings,
  pockets,
  onClose,
  onSave,
  onDelete,
}: {
  draft?: Draft;
  findings: readonly Finding[];
  pockets: string[];
  onClose(): void;
  onSave(finding: Named): void;
  onDelete(id: string): void;
}) {
  const [shown, setShown] = useState(draft);
  if (draft && draft !== shown) setShown(draft);
  const value = shown?.kind === "value" || (shown?.kind === "edit" && shown.finding.kind === "value");
  const props = { onClose, onSave, onDelete };
  return (
    <BottomSheet
      open={draft !== undefined}
      title={shown?.kind === "edit" ? "Edit finding" : value ? "Name this item" : "Name these bytes"}
      centeredFromSm
      className="gap-4 sm:max-w-lg"
      onClose={onClose}
    >
      {shown && (
        <div className="grid gap-5 px-3">
          {value ? (
            <ValueForm key={key(shown)} draft={shown} pockets={pockets} {...props} />
          ) : (
            <RangeForm key={key(shown)} draft={shown} findings={findings} {...props} />
          )}
        </div>
      )}
    </BottomSheet>
  );
}

const key = (draft: Draft) => (draft.kind === "edit" ? draft.finding.id : draft.kind === "range" ? `${draft.space.name}@${draft.offset}` : draft.change.id);

const typeFor = (length: number): RangeType => ({ 1: "u8", 2: "u16le", 4: "u32le" } as Record<number, RangeType>)[length] ?? "bytes";

type FormProps = { draft: Draft; onClose(): void; onSave(finding: Named): void; onDelete(id: string): void };

function RangeForm({ draft, findings, onClose, onSave, onDelete }: FormProps & { findings: readonly Finding[] }) {
  const ids = { name: useId(), offset: useId(), length: useId(), problem: useId(), note: useId() };
  const existing = draft.kind === "edit" && draft.finding.kind === "range" ? draft.finding : undefined;
  const space = draft.kind === "range" ? draft.space : undefined;
  const start = existing?.offset ?? (draft.kind === "range" ? draft.offset : 0);
  const [offset, setOffset] = useState(start.toString(16).toUpperCase().padStart(4, "0"));
  const [length, setLength] = useState(String(existing?.length ?? (draft.kind === "range" ? Math.min(draft.length, MAX_RANGE) : 1)));
  const [type, setType] = useState<RangeType>(existing?.type ?? typeFor(Number(length)));
  const [confidence, setConfidence] = useState<Confidence>(existing?.confidence ?? "guess");
  const [name, setName] = useState(existing?.name ?? "");
  const [note, setNote] = useState(existing?.note ?? "");

  const at = parseInt(offset, 16);
  const size = Number(length);
  const problem = space && rangeProblem(space, findings, at, size);
  const bytes = (which: "before" | "after") => (existing ? existing[which] : space && !problem ? bytesText(space[which].subarray(at, at + size)) : "");
  const where = space ? spaceTitle(space.name) : spaceTitle(existing!.space);

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (problem || !name.trim()) return;
        onSave({
          id: existing?.id ?? `${space!.name}@${at}`,
          kind: "range",
          space: existing?.space ?? space!.name,
          offset: existing?.offset ?? at,
          length: existing?.length ?? size,
          type,
          name: name.trim(),
          confidence,
          ...(note.trim() && { note: note.trim() }),
          before: bytes("before"),
          after: bytes("after"),
        });
      }}
    >
      <Field id={ids.name} label="Name">
        <Input id={ids.name} value={name} autoComplete="off" placeholder="What these bytes hold" onChange={(event) => setName(event.target.value)} />
      </Field>

      <div className="grid gap-2">
        <div className="grid grid-cols-2 gap-3">
          <Field id={ids.offset} label="Offset">
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText className="font-mono">0x</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                id={ids.offset}
                value={offset}
                disabled={!space}
                autoComplete="off"
                aria-invalid={problem ? true : undefined}
                aria-describedby={problem ? ids.problem : undefined}
                className="font-mono tabular-nums"
                onChange={(event) => setOffset(event.target.value.replace(/[^0-9a-f]/gi, "").toUpperCase().slice(0, 5))}
              />
            </InputGroup>
          </Field>
          <Field id={ids.length} label="Length">
            <InputGroup>
              <InputGroupInput
                id={ids.length}
                value={length}
                disabled={!space}
                inputMode="numeric"
                autoComplete="off"
                aria-invalid={problem ? true : undefined}
                aria-describedby={problem ? ids.problem : undefined}
                className="font-mono tabular-nums"
                onChange={(event) => {
                  const next = event.target.value.replace(/\D/g, "").slice(0, 4);
                  setLength(next);
                  setType(typeFor(Number(next)));
                }}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText>{size === 1 ? "byte" : "bytes"}</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
          </Field>
        </div>
        {problem && (
          <p id={ids.problem} role="alert" className="text-sm text-destructive">
            {problem}
          </p>
        )}
      </div>

      <Preview label={problem ? where : `${where} · ${hex(existing?.offset ?? at)}–${hex((existing?.offset ?? at) + (existing?.length ?? size) - 1)}`} before={bytes("before")} after={bytes("after")} />

      <Pick label="Type" value={type} options={RANGE_TYPES.map((type) => [type, type])} mono onChange={(next) => setType(next as RangeType)} />
      <Sure value={confidence} onChange={setConfidence} />
      <Field id={ids.note} label="Note">
        <Textarea id={ids.note} value={note} rows={2} placeholder="What you did between the saves" onChange={(event) => setNote(event.target.value)} />
      </Field>

      <Footer editing={existing !== undefined} disabled={!name.trim() || problem !== undefined} onClose={onClose} onDelete={() => existing && onDelete(existing.id)} />
    </form>
  );
}

function ValueForm({ draft, pockets, onClose, onSave, onDelete }: FormProps & { pockets: string[] }) {
  const ids = { name: useId(), note: useId() };
  const existing = draft.kind === "edit" && draft.finding.kind === "value" ? draft.finding : undefined;
  const change = draft.kind === "value" ? draft.change : undefined;
  const domain = existing?.domain ?? change!.domain;
  const index = existing?.index ?? change!.index;
  const [name, setName] = useState(existing?.name ?? "");
  const [pocket, setPocket] = useState(existing?.pocket ?? change?.pocket);
  const [confidence, setConfidence] = useState<Confidence>(existing?.confidence ?? "guess");
  const [note, setNote] = useState(existing?.note ?? "");
  const choices = [...new Set([...pockets, ...(pocket ? [pocket] : [])])];

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) return;
        onSave({
          id: existing?.id ?? `${domain}:${index}`,
          kind: "value",
          domain,
          index,
          name: name.trim(),
          confidence,
          ...(pocket && { pocket }),
          ...(note.trim() && { note: note.trim() }),
        });
      }}
    >
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div className="grid gap-0.5 rounded-lg border px-3 py-2">
          <dt className="text-xs text-muted-foreground">Domain</dt>
          <dd className="font-mono">{domain}</dd>
        </div>
        <div className="grid gap-0.5 rounded-lg border px-3 py-2">
          <dt className="text-xs text-muted-foreground">Index</dt>
          <dd className="font-mono tabular-nums">{index}</dd>
        </div>
      </dl>
      <Field id={ids.name} label="Name">
        <Input id={ids.name} value={name} autoComplete="off" placeholder="As the game shows it" onChange={(event) => setName(event.target.value)} />
      </Field>
      {domain === "item" && <Pick label="Pocket" value={pocket} placeholder="Pick a pocket" options={choices.map((pocket) => [pocket, pocket])} onChange={setPocket} />}
      <Sure value={confidence} onChange={setConfidence} />
      <Field id={ids.note} label="Note">
        <Textarea id={ids.note} value={note} rows={2} placeholder="Where you saw it in the game" onChange={(event) => setNote(event.target.value)} />
      </Field>
      <Footer editing={existing !== undefined} disabled={!name.trim()} onClose={onClose} onDelete={() => existing && onDelete(existing.id)} />
    </form>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function Pick({
  label,
  value,
  placeholder,
  options,
  mono,
  onChange,
}: {
  label: string;
  value?: string;
  placeholder?: string;
  options: string[][];
  mono?: boolean;
  onChange(value: string): void;
}) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <Label id={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-labelledby={id} className={cn("w-full", mono && "font-mono")}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(([key, text]) => (
            <SelectItem key={key} value={key} className={mono ? "font-mono" : undefined}>
              {text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Sure({ value, onChange }: { value: Confidence; onChange(value: Confidence): void }) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <Label id={id}>How sure are you?</Label>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        spacing={0}
        aria-labelledby={id}
        value={value}
        onValueChange={(next) => next && onChange(next as Confidence)}
        className="w-fit"
      >
        <ToggleGroupItem value="guess">A guess</ToggleGroupItem>
        <ToggleGroupItem value="known">I checked</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

function Footer({ editing, disabled, onClose, onDelete }: { editing: boolean; disabled: boolean; onClose(): void; onDelete(): void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {editing && (
        <Button type="button" variant="outline" className="text-destructive hover:text-destructive" onClick={onDelete}>
          Delete
        </Button>
      )}
      <span className="flex-1" />
      <Button type="button" variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button type="submit" disabled={disabled}>
        Save finding
      </Button>
    </div>
  );
}

const SHOWN = 16;

function Preview({ label, before, after }: { label: string; before: string; after: string }) {
  const line = (text: string, other?: string[]) => {
    const values = text ? text.split(" ") : [];
    return (
      <span className="flex flex-wrap gap-x-1.5 gap-y-0.5">
        {values.slice(0, SHOWN).map((value, index) => (
          <span key={index} className={other && other[index] !== value ? "font-semibold text-warning" : "text-muted-foreground"}>
            {value}
          </span>
        ))}
        {values.length > SHOWN && <span className="font-sans text-muted-foreground">+{values.length - SHOWN}</span>}
        {!values.length && <span className="text-muted-foreground">—</span>}
      </span>
    );
  };
  return (
    <section aria-label="Bytes in the finding" className="grid gap-2 rounded-xl border bg-background/60 px-4 py-3">
      <span className="truncate text-xs text-muted-foreground tabular-nums">{label}</span>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1 font-mono text-[13px] tabular-nums">
        <dt className="font-sans text-xs text-muted-foreground">Before</dt>
        <dd>{line(before)}</dd>
        <dt className="font-sans text-xs text-muted-foreground">After</dt>
        <dd>{line(after, before.split(" "))}</dd>
      </dl>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5 text-success" />
        Only these bytes go in an export, never the rest of the save.
      </p>
    </section>
  );
}
