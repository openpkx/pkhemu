import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useBack } from "@/back/back";
import { ScreenHeader } from "@/plugin-kit/ScreenHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Input as GameInput } from "@/input/input";
import { moveFocusWithArrows, PadNavigation, reveal } from "@/pad-navigation/PadNavigation";
import type { System } from "@/systems";

export type Cheat = { id: string; name: string; code: string; on: boolean; problem: string | null };

export type CheatsHost = {
  listCheats(folder: string, path: string): Promise<Cheat[]>;
  addCheat(folder: string, path: string, name: string, code: string): Promise<Cheat[]>;
  editCheat(folder: string, path: string, id: string, name: string, code: string): Promise<Cheat[]>;
  deleteCheat(folder: string, path: string, id: string): Promise<Cheat[]>;
  toggleCheat(folder: string, path: string, id: string, on: boolean): Promise<Cheat[]>;
};

type Form = { id?: string; name: string; code: string; problem?: string; error?: string };

const formatHelp: Record<System, string> = {
  gb: "GameShark, CodeBreaker, Game Genie and VBA codes work here.",
  gbc: "GameShark, CodeBreaker, Game Genie and VBA codes work here.",
  gba: "GameShark, Action Replay and CodeBreaker codes work here.",
  nds: "Action Replay DS codes work here.",
  n64: "GameShark codes work here.",
  "3ds": "3DS games don't take cheats yet.",
  gc: "GameCube games don't take cheats yet.",
};

function CodeForm({
  open,
  system,
  form,
  saving,
  onChange,
  onSave,
  onClose,
}: {
  open: boolean;
  system: System;
  form?: Form;
  saving: boolean;
  onChange(form: Form): void;
  onSave(): void;
  onClose(): void;
}) {
  const [nameId, codeId, problemId] = [useId(), useId(), useId()];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (form?.code.trim() && !saving) onSave();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent showCloseButton={!saving}>
        <form className="grid gap-4" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit code" : "Add code"}</DialogTitle>
            <DialogDescription>{formatHelp[system]}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={nameId}>Name</Label>
            <Input
              id={nameId}
              value={form?.name ?? ""}
              readOnly={saving}
              onChange={(event) => form && onChange({ ...form, name: event.target.value, error: undefined })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={codeId}>Code</Label>
            <Textarea
              id={codeId}
              value={form?.code ?? ""}
              readOnly={saving}
              rows={4}
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={form?.problem ? true : undefined}
              aria-describedby={form?.problem ? problemId : undefined}
              className="min-h-24 font-mono"
              onChange={(event) => form && onChange({ ...form, code: event.target.value, problem: undefined, error: undefined })}
            />
            {form?.problem && (
              <p id={problemId} className="text-destructive">
                {form.problem}
              </p>
            )}
          </div>
          {form?.error && (
            <p role="alert" className="text-destructive">
              {form.error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={saving} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!form?.code.trim()} aria-busy={saving || undefined}>
              {saving && <Spinner />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CheatsScreen({
  host,
  folder,
  path,
  system,
  input,
  onBack,
}: {
  host: CheatsHost;
  folder: string;
  path: string;
  system: System;
  input: GameInput;
  onBack(): void;
}) {
  const [codes, setCodes] = useState<Cheat[]>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Form>();
  const [confirming, setConfirming] = useState<Cheat>();
  const shownForm = useRef<Form>(undefined);
  const shownConfirm = useRef<Cheat>(undefined);
  const list = useRef<HTMLUListElement>(null);
  const add = useRef<HTMLButtonElement>(null);
  const focusAfterDelete = useRef<number>(undefined);
  if (form) shownForm.current = form;
  if (confirming) shownConfirm.current = confirming;

  const back = () => {
    if (busy) return;
    if (confirming) setConfirming(undefined);
    else if (form) setForm(undefined);
    else onBack();
  };
  useBack(back);

  useEffect(() => {
    let current = true;
    host.listCheats(folder, path).then(
      (codes) => current && setCodes(codes),
      (reason) => current && setError(String(reason)),
    );
    return () => {
      current = false;
    };
  }, [host, folder, path]);

  useEffect(() => {
    const at = focusAfterDelete.current;
    if (at === undefined || busy) return;
    focusAfterDelete.current = undefined;
    const rows = list.current?.querySelectorAll<HTMLButtonElement>(":scope > li > button:first-child") ?? [];
    const next = rows[Math.min(at, rows.length - 1)] ?? add.current;
    if (next) reveal(next);
  }, [codes, busy]);

  const run = async (command: () => Promise<Cheat[]>) => {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      setCodes(await command());
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!form || busy) return;
    const { id, name, code } = form;
    setBusy(true);
    setError(undefined);
    try {
      const codes = await (id ? host.editCheat(folder, path, id, name, code) : host.addCheat(folder, path, name, code));
      setCodes(codes);
      const saved = id ? codes.find((code) => code.id === id) : codes.at(-1);
      setForm(saved?.problem ? { id: saved.id, name: saved.name, code: saved.code, problem: saved.problem } : undefined);
    } catch (reason) {
      setForm({ ...form, error: String(reason) });
    } finally {
      setBusy(false);
    }
  };

  const remove = (code: Cheat) => {
    if (busy) return;
    setConfirming(undefined);
    focusAfterDelete.current = codes?.indexOf(code) ?? 0;
    void run(() => host.deleteCheat(folder, path, code.id));
  };

  const edit = (form: Form) => !busy && setForm(form);

  return (
    <div className="fixed inset-0 px-safe pb-safe z-20 overflow-y-auto bg-background">
      <PadNavigation input={input} />
      <ScreenHeader title="Cheats" onBack={back} />
      <main className="mx-auto grid max-w-2xl gap-3 p-4" onKeyDown={moveFocusWithArrows}>
        <Button ref={add} variant="outline" className="justify-self-start" autoFocus onClick={() => edit({ name: "", code: "" })}>
          <Plus />
          Add code
        </Button>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        {codes?.length === 0 && <p className="text-muted-foreground">No codes for this game yet.</p>}
        {!!codes?.length && (
          <ul ref={list} className="grid gap-2">
            {codes.map((code) => (
              <li key={code.id} className="flex items-center gap-2 rounded-lg border p-1 pr-2">
                <Button
                  variant="ghost"
                  className="h-auto min-w-0 flex-1 flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left whitespace-normal"
                  onClick={() => edit({ id: code.id, name: code.name, code: code.code, problem: code.problem ?? undefined })}
                >
                  <span className="font-medium break-words">{code.name}</span>
                  {code.problem && <span className="text-sm font-normal text-destructive">{code.problem}</span>}
                </Button>
                <Switch
                  aria-label={code.name}
                  checked={code.on}
                  disabled={!!code.problem}
                  onCheckedChange={(on) => void run(() => host.toggleCheat(folder, path, code.id, on))}
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete ${code.name}`}
                  onClick={() => !busy && setConfirming(code)}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </main>
      <CodeForm
        open={!!form}
        system={system}
        form={form ?? shownForm.current}
        saving={busy}
        onChange={setForm}
        onSave={() => void save()}
        onClose={() => !busy && setForm(undefined)}
      />
      <ConfirmDialog
        title={`Delete ${shownConfirm.current?.name}?`}
        action="Delete"
        destructive
        open={!!confirming}
        onConfirm={() => confirming && remove(confirming)}
        onCancel={() => setConfirming(undefined)}
        // The trash button focus would go back to is about to go away with the code.
        onCloseAutoFocus={(event) => focusAfterDelete.current !== undefined && event.preventDefault()}
      >
        To use it later, you'll have to type it in again.
      </ConfirmDialog>
    </div>
  );
}
