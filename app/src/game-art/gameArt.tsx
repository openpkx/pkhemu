import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { PokemonGender, PokemonSummary } from "@pkhex-everywhere/engine";
import { cn, pngDataUrl } from "@/lib/utils";
import { useReducedMotion } from "@/motion/motion";
import { neutralColor, typeColor } from "./typeColors";

export type GameArtStatus = "pending" | "done" | "partial" | "unsupported" | "failed";
export type GameArtProgress = { done: number; total: number };
export type Lender = { sha1: string; generation: number };

export type GameArtHost = {
  /** Resolves to null until the library has hashed the ROM. */
  sha1(path: string): Promise<string | null>;
  keys(sha1: string): Promise<string[]>;
  image(sha1: string, key: string): Promise<Uint8Array>;
  lenders(): Promise<Lender[]>;
  onChanged(listener: (sha1: string) => void): () => void;
  status(path: string): Promise<GameArtStatus | null>;
  reextract(folder: string, path: string): Promise<void>;
  reextractAll(): Promise<void>;
  progress(): Promise<GameArtProgress | null>;
  onProgress(listener: (progress: GameArtProgress | null) => void): () => void;
};

export const isUnavailable = (status?: GameArtStatus | null) => status === "unsupported" || status === "failed";

type Borrowing = "none" | "all" | "gaps";

// A 3DS game lacks sprites for most species, so it fills each gap from the lenders.
function borrowing(path: string, status: GameArtStatus | null): Borrowing {
  if (isUnavailable(status)) return "all";
  const decoded = status === "done" || status === "partial";
  return decoded && path.split("/")[0] === "3ds" ? "gaps" : "none";
}

export type ArtPokemon = {
  speciesId: number | null;
  speciesIndex?: number;
  species: string;
  form?: number;
  isShiny?: boolean;
  gender?: PokemonGender;
  isEgg?: boolean;
  isUnknown?: boolean;
  types?: number[];
};

export type ArtItem = { index: number; name: string };

const ICON_MAX_SIZE = 12;
const MANAPHY = 490;
const LAST_NATIONAL_DEX = 1025;

export const dexNumber = (speciesId: number | null) =>
  speciesId !== null && speciesId <= LAST_NATIONAL_DEX ? `#${String(speciesId).padStart(4, "0")}` : undefined;

function createStore(host: GameArtHost) {
  const listeners = new Set<(sha1: string) => void>();
  const keys = new Map<string, Promise<Set<string>>>();
  const images = new Map<string, Promise<string | undefined>>();
  let lenders: Promise<Lender[]> | undefined;

  const changed = (sha1: string) => {
    keys.delete(sha1);
    lenders = undefined;
    for (const id of images.keys()) if (id.startsWith(`${sha1}/`)) images.delete(id);
    listeners.forEach((listener) => listener(sha1));
  };

  return {
    listen: () => host.onChanged(changed),
    subscribe(listener: (sha1: string) => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    sha1: (path: string) => host.sha1(path).catch(() => null),
    status: (path: string) => host.status(path).catch(() => null),
    lenders() {
      if (!lenders) {
        const asked: Promise<Lender[]> = host.lenders().catch(() => {
          if (lenders === asked) lenders = undefined;
          return [];
        });
        lenders = asked;
      }
      return lenders;
    },
    keys(sha1: string) {
      let found = keys.get(sha1);
      if (!found) {
        const asked: Promise<Set<string>> = host.keys(sha1).then(
          (list) => new Set(list),
          () => {
            if (keys.get(sha1) === asked) keys.delete(sha1);
            return new Set();
          },
        );
        keys.set(sha1, asked);
        found = asked;
      }
      return found;
    },
    image(sha1: string, key: string) {
      const id = `${sha1}/${key}`;
      let found = images.get(id);
      if (!found) {
        const asked: Promise<string | undefined> = host.image(sha1, key).then(pngDataUrl, () => {
          if (images.get(id) === asked) images.delete(id);
          return undefined;
        });
        images.set(id, asked);
        found = asked;
      }
      return found;
    },
  };
}

type Store = ReturnType<typeof createStore>;

const HostContext = createContext<GameArtHost | null>(null);
const StoreContext = createContext<Store | null>(null);
const GameContext = createContext<{ sha1: string | null | undefined; borrows: Borrowing } | null>(null);

export function GameArtProvider({ host, children }: { host: GameArtHost; children: ReactNode }) {
  const [store] = useState(() => createStore(host));
  useEffect(() => store.listen(), [store]);
  return (
    <HostContext.Provider value={host}>
      <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
    </HostContext.Provider>
  );
}

export function useGameArt() {
  const host = useContext(HostContext);
  if (!host) throw new Error("useGameArt needs a GameArtProvider");
  return host;
}

export function useGameArtProgress() {
  const host = useGameArt();
  const [progress, setProgress] = useState<GameArtProgress | null>(null);
  const heard = useRef(0);

  const refresh = useCallback(async () => {
    const seen = heard.current;
    const progress = await host.progress().catch(() => undefined);
    if (progress !== undefined && heard.current === seen) setProgress(progress);
  }, [host]);

  useEffect(() => {
    const stop = host.onProgress((progress) => {
      heard.current++;
      setProgress(progress);
    });
    void refresh();
    return stop;
  }, [host, refresh]);

  return [progress, refresh] as const;
}

function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("Game art needs a GameArtProvider");
  return store;
}

export function GameArtFor({ path, children }: { path: string; children: ReactNode }) {
  const store = useStore();
  const [found, setFound] = useState<{ path: string; sha1: string | null; borrows: Borrowing }>();
  const [attempt, setAttempt] = useState(0);
  const sha1 = found?.path === path ? found.sha1 : undefined;
  const borrows = found?.path === path ? found.borrows : "none";

  useEffect(() => {
    let current = true;
    void Promise.all([store.sha1(path), store.status(path)]).then(
      ([sha1, status]) => current && setFound({ path, sha1, borrows: borrowing(path, status) }),
    );
    return () => {
      current = false;
    };
  }, [store, path, attempt]);

  // A ROM the library hasn't hashed yet has no SHA-1 to listen for, so any art change might be its own.
  useEffect(
    () => store.subscribe((changed) => (!sha1 || changed === sha1) && setAttempt((count) => count + 1)),
    [store, sha1],
  );

  const game = useMemo(() => ({ sha1, borrows }), [sha1, borrows]);
  return <GameContext.Provider value={game}>{children}</GameContext.Provider>;
}

const noKeys = new Set<string>();

function useGameKeys() {
  const store = useStore();
  const game = useContext(GameContext);
  if (!game) throw new Error("Game art needs a GameArtFor");
  const { sha1, borrows } = game;
  const [version, setVersion] = useState(0);
  const [found, setFound] = useState<{ sha1: string; keys: Set<string> }>();

  useEffect(
    () => (sha1 ? store.subscribe((changed) => changed === sha1 && setVersion((count) => count + 1)) : undefined),
    [store, sha1],
  );

  useEffect(() => {
    if (!sha1) return;
    let current = true;
    void store.keys(sha1).then((keys) => current && setFound({ sha1, keys }));
    return () => {
      current = false;
    };
  }, [store, sha1, version]);

  const keys = sha1 === null ? noKeys : sha1 && found?.sha1 === sha1 ? found.keys : undefined;
  return { sha1, keys, version, borrows };
}

type GameKeys = ReturnType<typeof useGameKeys>;

type LentArt = Lender & { keys: Set<string> };

const noLenders: LentArt[] = [];

function useLentArt(borrows: boolean) {
  const store = useStore();
  const [version, setVersion] = useState(0);
  const [found, setFound] = useState<LentArt[]>();

  useEffect(() => (borrows ? store.subscribe(() => setVersion((count) => count + 1)) : undefined), [store, borrows]);

  useEffect(() => {
    if (!borrows) return;
    let current = true;
    void store
      .lenders()
      .then((lenders) => Promise.all(lenders.map(async (lender) => ({ ...lender, keys: await store.keys(lender.sha1) }))))
      .then((lent) => current && setFound(lent));
    return () => {
      current = false;
    };
  }, [store, borrows, version]);

  return { lent: borrows ? found : noLenders, version };
}

function useImage(sha1: string | null | undefined, key: string | undefined, version: number) {
  const store = useStore();
  const [found, setFound] = useState<{ id: string; url: string | undefined }>();
  const id = sha1 && key ? `${sha1}/${key}` : undefined;

  useEffect(() => {
    if (!sha1 || !key) return;
    let current = true;
    void store.image(sha1, key).then((url) => current && setFound({ id: `${sha1}/${key}`, url }));
    return () => {
      current = false;
    };
  }, [store, sha1, key, version]);

  if (!id) return { loading: false, url: undefined };
  if (found?.id !== id) return { loading: true, url: undefined };
  return { loading: false, url: found.url };
}

const itemIcons = new WeakMap<Set<string>, boolean>();

function hasItemIcons(keys: Set<string>) {
  let found = itemIcons.get(keys);
  if (found === undefined) {
    found = [...keys].some((key) => key.startsWith("item-"));
    itemIcons.set(keys, found);
  }
  return found;
}

/** Gen 1 and 2 games and Ruby and Sapphire never had item icons. */
export function useHasItemIcons() {
  const { keys } = useGameKeys();
  return !!keys && hasItemIcons(keys);
}

function speciesKeys(base: string, shiny: string, female: boolean) {
  return {
    sprites: [...(female ? [`sprite-${base}-female${shiny}`] : []), `sprite-${base}${shiny}`, ...(shiny ? [`sprite-${base}`] : [])],
    icons: [...(female ? [`icon-${base}-female`] : []), `icon-${base}`],
  };
}

export function pokemonKeys(pokemon: ArtPokemon, size: number) {
  let sprites: string[];
  let icons: string[];
  if (pokemon.isEgg) {
    sprites = pokemon.speciesId === MANAPHY ? ["egg-manaphy", "egg"] : ["egg"];
    icons = sprites.map((key) => `icon-${key}`);
  } else {
    const shiny = pokemon.isShiny ? "-shiny" : "";
    const candidates = [
      ...(pokemon.speciesIndex === undefined ? [] : [speciesKeys(`index-${pokemon.speciesIndex}`, shiny, false)]),
      ...(pokemon.isUnknown || pokemon.speciesId === null
        ? []
        : [speciesKeys(`${pokemon.speciesId}-${pokemon.form ?? 0}`, shiny, pokemon.gender === "female")]),
    ];
    sprites = candidates.flatMap((keys) => keys.sprites);
    icons = candidates.flatMap((keys) => keys.icons);
  }
  return size <= ICON_MAX_SIZE ? [...icons, ...sprites] : [...sprites, ...icons];
}

const boxSize = (size: number): CSSProperties => ({
  width: `calc(var(--spacing) * ${size})`,
  height: `calc(var(--spacing) * ${size})`,
});

type Shown = { size: number; decorative?: boolean; className?: string };

function Empty({ size, className }: Shown) {
  return <span aria-hidden className={cn("shrink-0", className)} style={boxSize(size)} />;
}

function Picture({
  url,
  name,
  size,
  decorative,
  integerScale,
  className,
}: Shown & { url: string; name: string; integerScale?: boolean }) {
  const box = useRef<HTMLSpanElement>(null);
  const [scaled, setScaled] = useState<{ url: string; width?: number }>();
  const width = scaled?.url === url ? scaled.width : undefined;
  const waiting = integerScale && scaled?.url !== url;

  const scale = (image: HTMLImageElement) => {
    const room = box.current;
    const times =
      room && image.naturalWidth && image.naturalHeight
        ? Math.floor(Math.min(room.clientWidth / image.naturalWidth, room.clientHeight / image.naturalHeight))
        : 0;
    setScaled({ url, width: times >= 1 ? image.naturalWidth * times : undefined });
  };

  return (
    <span ref={box} className={cn("flex shrink-0 items-center justify-center", className)} style={boxSize(size)}>
      <img
        src={url}
        alt={decorative ? "" : name}
        onLoad={integerScale ? (event) => scale(event.currentTarget) : undefined}
        className={cn(
          "object-contain [image-rendering:pixelated]",
          width === undefined ? "size-full" : "max-w-none",
          waiting && "invisible",
        )}
        style={width === undefined ? undefined : { width }}
      />
    </span>
  );
}

function Tile({
  name,
  size,
  tint,
  decorative,
  className,
  children,
}: Shown & { name: string; tint: string; children: ReactNode }) {
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative || undefined}
      className={cn(
        "flex shrink-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-md border p-0.5 text-center leading-tight text-muted-foreground",
        size >= 24 ? "text-sm" : "text-[0.625rem]",
        className,
      )}
      style={{
        ...boxSize(size),
        backgroundColor: `color-mix(in oklab, ${tint} 15%, transparent)`,
        borderColor: `color-mix(in oklab, ${tint} 40%, transparent)`,
      }}
    >
      {children}
    </span>
  );
}

function animatedKey(still: string | undefined, keys: Set<string>) {
  const animated = still?.startsWith("sprite-") && `anim-${still.slice("sprite-".length)}`;
  return animated && keys.has(animated) ? animated : still;
}

function ownKey(pokemon: ArtPokemon, size: number, animated: boolean, keys: Set<string>) {
  const still = pokemonKeys(pokemon, size).find((key) => keys.has(key));
  return animated ? animatedKey(still, keys) : still;
}

const byOrder = (a: number[], b: number[]) => a.reduce((found, value, at) => found || value - b[at], 0);

// A species index is the game's own and means nothing in another ROM.
function lentArt(pokemon: ArtPokemon, size: number, animated: boolean, lent: LentArt[]) {
  const wanted = pokemonKeys({ ...pokemon, speciesIndex: undefined }, size);
  const icons = size <= ICON_MAX_SIZE;
  const [best] = lent
    .flatMap(({ sha1, generation, keys }) => {
      const match = wanted.findIndex((key) => keys.has(key));
      if (match < 0) return [];
      const still = wanted[match];
      const key = animated ? animatedKey(still, keys) : still;
      const order = [Number(still.startsWith("icon-") !== icons), -generation, match, Number(key === still)];
      return [{ sha1, key, order }];
    })
    .sort((a, b) => byOrder(a.order, b.order));
  return { sha1: best?.sha1, key: best?.key };
}

function filledArt(pokemon: ArtPokemon, size: number, animated: boolean, own: GameKeys, lent: LentArt[] | undefined) {
  if (!own.keys) return undefined;
  const fits = (key: string | undefined) => !!key && key.startsWith("icon-") === size <= ICON_MAX_SIZE;
  const mine = { sha1: own.sha1, key: ownKey(pokemon, size, animated, own.keys) };
  if (fits(mine.key)) return mine;
  if (!lent) return undefined;
  const borrowed = lentArt(pokemon, size, animated, lent);
  return fits(borrowed.key) || !mine.key ? borrowed : mine;
}

export function PokemonArt({
  pokemon,
  integerScale,
  animate,
  ...shown
}: Shown & { pokemon: ArtPokemon; integerScale?: boolean; animate?: boolean }) {
  const own = useGameKeys();
  const { lent, version } = useLentArt(own.borrows !== "none");
  const animates = !!animate && shown.size > ICON_MAX_SIZE;
  const reducedMotion = useReducedMotion(animates);
  const animated = animates && !reducedMotion;
  const art =
    own.borrows === "all"
      ? lent && lentArt(pokemon, shown.size, animated, lent)
      : own.borrows === "gaps"
        ? filledArt(pokemon, shown.size, animated, own, lent)
        : own.keys && { sha1: own.sha1, key: ownKey(pokemon, shown.size, animated, own.keys) };
  const image = useImage(art?.sha1, art?.key, own.version + version);
  const name = pokemon.species;

  if (image.url) return <Picture {...shown} url={image.url} name={name} integerScale={integerScale} />;
  if (!art || image.loading) return <Empty {...shown} />;
  const dex = !pokemon.isEgg && !pokemon.isUnknown && dexNumber(pokemon.speciesId);
  return (
    <Tile {...shown} name={name} tint={typeColor(pokemon.types?.[0])}>
      {dex && <span className="font-mono">{dex}</span>}
      {(!dex || shown.size >= ICON_MAX_SIZE) && <span className="line-clamp-2 break-words">{name}</span>}
    </Tile>
  );
}

/** Shows nothing in a game without item icons. */
export function ItemArt({ item, ...shown }: Shown & { item: ArtItem }) {
  const { sha1, keys, version } = useGameKeys();
  const icons = !!keys && hasItemIcons(keys);
  const key = icons && keys.has(`item-${item.index}`) ? `item-${item.index}` : undefined;
  const image = useImage(sha1, key, version);

  if (!icons) return null;
  if (image.url) return <Picture {...shown} url={image.url} name={item.name} />;
  if (image.loading) return <Empty {...shown} />;
  return (
    <Tile {...shown} name={item.name} tint={neutralColor}>
      <span className="line-clamp-3 break-words">{item.name}</span>
    </Tile>
  );
}

type Summary = Pick<PokemonSummary, "speciesId" | "speciesIndex" | "species" | "isUnknown" | "isShiny" | "gender" | "isEgg" | "types"> & {
  form: { id: number };
};

export const summaryArt = ({ speciesId, speciesIndex, species, isUnknown, isShiny, gender, isEgg, types, form }: Summary): ArtPokemon => ({
  speciesId,
  speciesIndex,
  species,
  isUnknown,
  isShiny,
  gender,
  isEgg,
  types,
  form: form.id,
});
