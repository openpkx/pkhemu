import { useCallback, useEffect, useMemo, useState } from "react";
import { useEngine } from "@pkhex-everywhere/react";
import { inTurn } from "@/lib/engineTurn";
import { messageOf } from "@/lib/utils";
import {
  draftHandle,
  type EditablePokemon,
  type Engine,
  type PokemonHandle,
  type PokemonOptions,
  type PokemonPatch,
  type StatValues,
  type Topic,
} from "@pkhex-everywhere/engine";

const saveTopics: Topic[] = ["party", "box", "inventory", "events", "trainer", "team", "mysteryGift"];

export const noSaveYet = "no-save-yet";

export type SaveHost = {
  read(): Promise<Uint8Array>;
  formatId?(): Promise<string | undefined>;
  apply(edited: Uint8Array): Promise<void>;
  playTimeSinceSave(): Promise<number | null>;
};

export type DraftView = {
  at: PokemonHandle;
  pokemon?: { details: EditablePokemon; options: PokemonOptions };
  changes: number;
  error?: string;
};

export type DraftPatch = PokemonPatch | ((details: EditablePokemon) => PokemonPatch);

export type Drafts = {
  view?: DraftView;
  open(at: PokemonHandle): void;
  update(patch: DraftPatch): Promise<void>;
  save(): Promise<boolean>;
  unsaved(): Promise<boolean>;
  discard(): void;
  close(): void;
};

export type EditSession =
  | { state: "opening" }
  | { state: "failed"; error: unknown }
  | { state: "open"; changed: boolean; apply(): Promise<void>; drafts: Drafts };

const scalarFields = [
  "species",
  "form",
  "gender",
  "nature",
  "ability",
  "heldItem",
  "ball",
  "friendship",
  "language",
  "isShiny",
  "isAlpha",
  "isEgg",
  "nickname",
  "level",
  "trainerId",
  "secretId",
  "originalTrainerName",
  "originalTrainerGender",
  "handlingTrainerName",
  "handlingTrainerGender",
  "currentHandler",
  "version",
  "metLocation",
  "metLevel",
  "metDate",
  "fatefulEncounter",
  "isShadow",
  "purification",
  "combatPower",
] satisfies (keyof EditablePokemon & keyof PokemonPatch)[];
const statFields = ["ivs", "evs", "avs"] satisfies (keyof EditablePokemon & keyof PokemonPatch)[];

export function changedFields(saved: EditablePokemon, draft: EditablePokemon): number {
  const scalars = scalarFields.filter((key) => saved[key] !== draft[key]).length;
  const stats = statFields.flatMap((key) =>
    Object.keys(draft[key] ?? {}).filter((stat) => saved[key]?.[stat as keyof StatValues] !== draft[key]?.[stat as keyof StatValues]),
  ).length;
  const moves = draft.moves.filter((move, index) => move.id !== saved.moves[index]?.id).length;
  return scalars + stats + moves;
}

// Draft fields are read here rather than through the query cache, so nothing reads the draft after a commit clears it.
function draftKeeper(engine: Engine, show: (view?: DraftView) => void, saved: () => void) {
  let queue = Promise.resolve();
  let target: PokemonHandle | undefined;
  let draft: { at: PokemonHandle; saved: EditablePokemon; details: EditablePokemon } | undefined;
  let disposed = false;

  const run = <T>(task: () => Promise<T>) => {
    const done = queue.then(() => (disposed ? undefined : task()));
    queue = done.then(
      () => {},
      (error) => console.error(error),
    );
    return done;
  };
  const edit = async (at: PokemonHandle) => {
    if (draft?.at === at) return draft;
    draft = undefined;
    await engine.pokemon.edit(at);
    const details = await engine.pokemon.details(draftHandle);
    return (draft = { at, saved: details, details });
  };
  const changes = (at: PokemonHandle) => (draft?.at === at ? changedFields(draft.saved, draft.details) : 0);
  const read = async (at: PokemonHandle, error?: string) => {
    const [details, options] = await Promise.all([engine.pokemon.details(draftHandle), engine.pokemon.options(draftHandle)]);
    if (draft?.at === at) draft.details = details;
    if (target === at) show({ at, pokemon: { details, options }, changes: changes(at), error });
  };
  const fail = async (at: PokemonHandle, error: unknown) => {
    try {
      await read(at, messageOf(error));
    } catch {
      if (target === at) show({ at, changes: changes(at), error: messageOf(error) });
    }
  };
  const reopen = async (at: PokemonHandle) => {
    draft = undefined;
    await edit(at);
    await read(at);
  };

  return {
    open(at: PokemonHandle) {
      target = at;
      void run(async () => {
        try {
          await reopen(at);
        } catch (error) {
          if (target === at) show({ at, changes: 0, error: messageOf(error) });
        }
      });
    },
    update(patch: DraftPatch) {
      const at = target;
      return run(async () => {
        if (!at || at !== target) return;
        try {
          const opened = await edit(at);
          if (typeof patch === "function") patch = patch(opened.details);
          await engine.pokemon.update(draftHandle, patch);
          await read(at);
        } catch (error) {
          await fail(at, error);
        }
      });
    },
    async save() {
      const at = target;
      const done = await run(async () => {
        if (!at || at !== target || draft?.at !== at) return false;
        try {
          await engine.pokemon.commit();
        } catch (error) {
          await fail(at, error);
          return false;
        }
        draft = undefined;
        saved();
        try {
          await reopen(at);
        } catch (error) {
          if (target === at) show({ at, changes: 0, error: messageOf(error) });
        }
        return true;
      });
      return done ?? false;
    },
    async unsaved() {
      const at = target;
      return (await run(async () => !!at && at === target && changes(at) > 0)) ?? false;
    },
    discard() {
      const at = target;
      void run(async () => {
        if (!at || at !== target) return;
        try {
          await reopen(at);
        } catch (error) {
          await fail(at, error);
        }
      });
    },
    close() {
      target = undefined;
      show(undefined);
      void run(async () => {
        draft = undefined;
      });
    },
    dispose() {
      disposed = true;
    },
  };
}

type Keeper = ReturnType<typeof draftKeeper>;

export function useEditSession(host: SaveHost): EditSession {
  const engine = useEngine();
  const [state, setState] = useState<"opening" | { keeper: Keeper } | { error: unknown }>("opening");
  const [changed, setChanged] = useState(false);
  const [view, setView] = useState<DraftView>();

  useEffect(() => {
    let closed = false;
    let unsubscribe: (() => void) | undefined;
    const keeper = draftKeeper(engine, setView, () => setChanged(true));
    host
      .read()
      .then(async (save) => {
        const formatId = await host.formatId?.();
        if (closed) return;
        await inTurn(() => engine.game.load(save, undefined, formatId));
        if (closed) return;
        // Loading and closing announce "*"; anything else under these topics is an edit.
        unsubscribe = engine.subscribe(saveTopics, (topics) => {
          if (topics.some((topic) => topic !== "*")) setChanged(true);
        });
        setState({ keeper });
      })
      .catch((error) => !closed && setState({ error }));
    return () => {
      closed = true;
      keeper.dispose();
      unsubscribe?.();
      inTurn(() => engine.game.close()).catch((error) => console.error(error));
    };
  }, [engine, host]);

  const keeper = typeof state === "object" && "keeper" in state ? state.keeper : undefined;
  const drafts = useMemo(
    () =>
      keeper && {
        view,
        open: keeper.open,
        update: keeper.update,
        save: keeper.save,
        unsaved: keeper.unsaved,
        discard: keeper.discard,
        close: keeper.close,
      },
    [keeper, view],
  );

  const apply = useCallback(async () => {
    const { bytes } = await engine.game.export();
    await host.apply(bytes);
  }, [engine, host]);

  if (state === "opening") return { state };
  if (!drafts) return { state: "failed", error: "error" in state ? state.error : undefined };
  return { state: "open", changed, apply, drafts };
}
