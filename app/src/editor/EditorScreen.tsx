import { createContext, Suspense, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BottomBar } from "@/components/BottomBar";
import { ScreenHeader } from "@/components/ScreenHeader";
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
import type { OnBackGesture } from "@/backGesture";
import { navigate, Screen } from "@/motion/motion";
import { noSaveYet, useEditSession, type Drafts, type SaveHost } from "./editSession";
import { useStaleSave } from "./saveFirst";

export type Page = {
  title: ReactNode;
  content: ReactNode;
  sidebar?: boolean;
};

type Nav = { open(page: Page): void; closeAbove(): void };
type Apply = { label: string; disabled: boolean; apply(): void };

const afterApplyCopy = {
  restart: {
    label: "Apply and restart",
    description: "Applying restarts the game on the edited save.",
    confirm: "The game restarts on the edited save. Play since your last save is lost.",
  },
  play: {
    label: "Apply and play",
    description: "Applying starts the game on the edited save.",
    confirm: "The game starts on the edited save, and your resume point is removed.",
  },
};

const NavContext = createContext<Nav | null>(null);
const DraftsContext = createContext<Drafts | null>(null);
const ApplyContext = createContext<Apply | null>(null);
const TopPageContext = createContext(true);

export function useEditorNav(): Nav {
  const nav = useContext(NavContext);
  if (!nav) throw new Error("useEditorNav must be used inside EditorScreen");
  return nav;
}

export function useDrafts(): Drafts {
  const drafts = useContext(DraftsContext);
  if (!drafts) throw new Error("useDrafts must be used inside EditorScreen");
  return drafts;
}

export function ApplyBar() {
  const action = useContext(ApplyContext);
  const top = useContext(TopPageContext);
  const labelId = useId();
  return (
    <BottomBar open={!!action} role="region" aria-labelledby={labelId} className="mt-auto">
      <span id={labelId} className="text-sm font-medium">
        Changes not in the game yet
      </span>
      {action && (
        <Button size="lg" variant={top ? "default" : "outline"} className="ml-auto" disabled={action.disabled} onClick={action.apply}>
          {action.label}
        </Button>
      )}
    </BottomBar>
  );
}

function StackPage({
  depth,
  top,
  openAt,
  closeAbove,
  children,
}: {
  depth: number;
  top: boolean;
  openAt(depth: number, page: Page): void;
  closeAbove(depth: number): void;
  children: ReactNode;
}) {
  const nav = useMemo(() => ({ open: (page: Page) => openAt(depth, page), closeAbove: () => closeAbove(depth) }), [depth, openAt, closeAbove]);
  return (
    <NavContext.Provider value={nav}>
      <TopPageContext.Provider value={top}>{children}</TopPageContext.Provider>
    </NavContext.Provider>
  );
}

export function EditorScreen({
  host,
  home,
  onBackGesture,
  onClose,
  onSaveFirst,
  afterApply = "restart",
  onApplied = onClose,
  confirmApply = true,
}: {
  host: SaveHost;
  home: Page;
  onBackGesture: OnBackGesture;
  onClose(): void;
  onSaveFirst(): void;
  afterApply?: keyof typeof afterApplyCopy;
  onApplied?(): void;
  confirmApply?: boolean;
}) {
  const session = useEditSession(host);
  const stale = useStaleSave(host);
  const [editAnyway, setEditAnyway] = useState(false);
  const nextId = useRef(1);
  const [stack, setStack] = useState([{ id: 0, page: home }]);
  const [leaving, setLeaving] = useState(false);
  const [confirmingApply, setConfirmingApply] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState<() => void>();
  const open = session.state === "open" && stale !== undefined ? session : undefined;
  const askingToSave = !!open && stale && !editAnyway;
  const top = stack[stack.length - 1];

  const apply = async () => {
    if (!open) return;
    setApplying(true);
    setError(undefined);
    try {
      await open.apply();
      onApplied();
    } catch (reason) {
      setError(String(reason));
      setApplying(false);
    }
  };

  const guard = async (action: () => void) => {
    if (!open?.drafts.view) action();
    else if (await open.drafts.unsaved()) setPending(() => action);
    else action();
  };
  const latestGuard = useRef(guard);
  latestGuard.current = guard;

  const openAt = useCallback(
    (depth: number, page: Page) =>
      void latestGuard.current(() =>
        navigate("forward", () => setStack((stack) => [...stack.slice(0, depth + 1), { id: nextId.current++, page }])),
      ),
    [],
  );
  const closeAbove = useCallback(
    (depth: number) => void latestGuard.current(() => navigate("back", () => setStack((stack) => stack.slice(0, depth + 1)))),
    [],
  );

  const saveAndGo = async (go: () => void) => {
    if (await open?.drafts.save()) go();
  };

  const back = () => {
    if (applying) return;
    if (askingToSave) onClose();
    else if (leaving) setLeaving(false);
    else if (confirmingApply) setConfirmingApply(false);
    else if (pending) setPending(undefined);
    else if (open && stack.length > 1) void guard(() => navigate("back", () => setStack((stack) => stack.slice(0, -1))));
    else if (open?.changed) setLeaving(true);
    else onClose();
  };
  const latestBack = useRef(back);
  latestBack.current = back;
  useEffect(
    () =>
      onBackGesture(() => {
        // Fields send their edit on blur, and the gesture doesn't move focus the way tapping Back does.
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        latestBack.current();
      }),
    [onBackGesture],
  );

  const copy = afterApplyCopy[afterApply];
  const applyAction = open?.changed
    ? {
        label: copy.label,
        disabled: applying || !!open.drafts.view?.changes,
        apply: () => void guard(() => (confirmApply ? setConfirmingApply(true) : void apply())),
      }
    : null;

  return (
    <DraftsContext.Provider value={open?.drafts ?? null}>
      <ApplyContext.Provider value={applyAction}>
        <div className="fixed inset-0 px-safe pb-safe z-20 flex flex-col bg-background">
          <ScreenHeader title={top.page.title} onBack={applying ? undefined : back} />
          {error && <p className="border-b px-4 py-2 text-sm text-destructive">{error}</p>}
          <main className="flex min-h-0 flex-1">
            {(session.state === "opening" || (session.state === "open" && !open)) && (
              <p className="p-4 text-sm text-muted-foreground">Opening save…</p>
            )}
            {session.state === "failed" &&
              (session.error === noSaveYet ? (
                <div className="flex flex-col items-start gap-3 p-4">
                  <p className="text-sm text-muted-foreground">This game has no save yet.</p>
                  <Button onClick={onSaveFirst}>Save in game first</Button>
                </div>
              ) : (
                <p className="p-4 text-sm text-destructive">{String(session.error)}</p>
              ))}
            {open &&
              stack.map(({ id, page }, depth) => {
                const isTop = depth === stack.length - 1;
                const beside = depth === stack.length - 2 && page.sidebar;
                return (
                  <StackPage key={id} depth={depth} top={isTop} openAt={openAt} closeAbove={closeAbove}>
                    <Screen>
                      <section
                        hidden={!isTop && !beside}
                        className={cn("min-h-0 overflow-y-auto", isTop ? "flex-1" : "hidden w-80 shrink-0 border-r lg:block")}
                      >
                        <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Loading…</p>}>{page.content}</Suspense>
                      </section>
                    </Screen>
                  </StackPage>
                );
              })}
          </main>
          <AlertDialog open={askingToSave}>
            <AlertDialogContent onEscapeKeyDown={onClose}>
              <AlertDialogHeader>
                <AlertDialogTitle>Save in game first?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your last save was over a minute of play ago. Applying an edit loses play since then.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction variant="outline" onClick={() => setEditAnyway(true)}>
                  Edit anyway
                </AlertDialogAction>
                <AlertDialogAction onClick={onSaveFirst}>Save in game first</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog open={!!pending} onOpenChange={(isOpen) => !isOpen && setPending(undefined)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Discard changes?</AlertDialogTitle>
                <AlertDialogDescription>Your changes to this Pokémon aren't saved yet.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep editing</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={pending}>
                  Discard
                </AlertDialogAction>
                <AlertDialogAction onClick={() => pending && void saveAndGo(pending)}>Save</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog open={leaving} onOpenChange={setLeaving}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Apply your changes?</AlertDialogTitle>
                <AlertDialogDescription>{copy.description}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep editing</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={onClose}>
                  Discard
                </AlertDialogAction>
                <AlertDialogAction onClick={() => void apply()}>{copy.label}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog open={confirmingApply} onOpenChange={setConfirmingApply}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{copy.label}?</AlertDialogTitle>
                <AlertDialogDescription>{copy.confirm}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep editing</AlertDialogCancel>
                <AlertDialogAction onClick={() => void apply()}>{copy.label}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </ApplyContext.Provider>
    </DraftsContext.Provider>
  );
}
