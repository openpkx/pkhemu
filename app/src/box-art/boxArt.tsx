import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useGamesFolder } from "@/games-folder/gamesFolder";
import type { Game } from "@/library/scan";
import { pngDataUrl } from "@/lib/utils";
import type { System } from "@/systems";
import { matchBoxArt, parseListing } from "./match";

export const thumbnails = "https://thumbnails.libretro.com/";

const thumbnailFolders: Record<System, string> = {
  gb: "Nintendo - Game Boy",
  gbc: "Nintendo - Game Boy Color",
  gba: "Nintendo - Game Boy Advance",
  nds: "Nintendo - Nintendo DS",
  n64: "Nintendo - Nintendo 64",
  "3ds": "Nintendo - Nintendo 3DS",
};

export type BoxArtKind = "Named_Boxarts" | "Named_Titles";
export type Listing = { fetchedAt: number; names: string[] };

const listingAge = 7 * 24 * 60 * 60 * 1000;
const bulkLookups = 4;

export type ChosenBoxArt = { kind: "none" } | { kind: "image"; url: string };

export type BoxArtHost = {
  /** Resolves to undefined when the player hasn't chosen box art for the game. */
  chosen(folder: string, path: string): Promise<ChosenBoxArt | undefined>;
  onChanged(listener: (path: string) => void): () => void;
  read(system: System, name: string): Promise<Uint8Array | undefined>;
  write(system: System, name: string, bytes: Uint8Array): Promise<void>;
  readListing(system: System, kind: BoxArtKind): Promise<Listing | undefined>;
  writeListing(system: System, kind: BoxArtKind, listing: Listing): Promise<void>;
  /** Resolves to undefined when the server has no such file, and rejects when it can't be reached. */
  download(url: string): Promise<Uint8Array | undefined>;
  choose(folder: string, path: string, image: Uint8Array): Promise<void>;
  chooseUrl(folder: string, path: string, url: string): Promise<void>;
  /** Resolves to false when the player closes the picker without choosing. */
  chooseFile(folder: string, path: string): Promise<boolean>;
  chooseNone(folder: string, path: string): Promise<void>;
  chooseDefault(folder: string, path: string): Promise<void>;
};

const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
const isPng = (bytes: Uint8Array) => pngSignature.every((byte, i) => bytes[i] === byte);

const folderUrl = (system: System, kind: BoxArtKind) => `${thumbnails}${encodeURIComponent(thumbnailFolders[system])}/${kind}/`;

export const imageUrl = (system: System, kind: BoxArtKind, name: string) =>
  `${folderUrl(system, kind)}${encodeURIComponent(`${name}.png`)}`;

type Lookup = (system: System, name: string) => Promise<string | undefined>;
type Art = { folder: string; path: string; system: System; name: string };

const artKey = (system: System, name: string) => `${system}/${name}`;
const choiceKey = (folder: string, path: string) => JSON.stringify([folder, path]);

function createBoxArt(host: BoxArtHost) {
  const images = new Map<string, Promise<string | undefined>>();
  const lookups = new Map<string, Promise<string | undefined>>();
  const listings = new Map<string, Promise<string[]>>();
  const urls = new Map<string, string>();
  const watchers = new Map<string, Set<(url: string) => void>>();
  const choices = new Map<string, Promise<ChosenBoxArt | null>>();
  const knownChoices = new Map<string, ChosenBoxArt | null>();
  const listeners = new Set<(path: string) => void>();

  const choice = (folder: string, path: string) => {
    const key = choiceKey(folder, path);
    let found = choices.get(key);
    if (!found) {
      const asked: Promise<ChosenBoxArt | null> = host.chosen(folder, path).then(
        (chosen) => {
          if (choices.get(key) === asked) knownChoices.set(key, chosen ?? null);
          return chosen ?? null;
        },
        () => {
          if (choices.get(key) === asked) choices.delete(key);
          return null;
        },
      );
      choices.set(key, asked);
      found = asked;
    }
    return found;
  };

  const changed = (path: string) => {
    for (const key of [...choices.keys()]) {
      if (JSON.parse(key)[1] !== path) continue;
      choices.delete(key);
      knownChoices.delete(key);
    }
    listeners.forEach((listener) => listener(path));
  };

  const cached: Lookup = (system, name) => {
    const art = artKey(system, name);
    let image = images.get(art);
    if (!image) {
      image = host.read(system, name).then(
        (bytes) => {
          if (!bytes) return undefined;
          const url = pngDataUrl(bytes);
          urls.set(art, url);
          return url;
        },
        () => undefined,
      );
      images.set(art, image);
    }
    return image;
  };

  const fetchListing = async (system: System, kind: BoxArtKind) => {
    const stored = await host.readListing(system, kind).catch(() => undefined);
    if (stored && Date.now() - stored.fetchedAt < listingAge) return stored.names;
    try {
      const html = await host.download(folderUrl(system, kind));
      if (!html) throw new Error(`${folderUrl(system, kind)}: not found`);
      const listing = { fetchedAt: Date.now(), names: parseListing(new TextDecoder().decode(html)) };
      await host.writeListing(system, kind, listing).catch((error) => console.error(error));
      return listing.names;
    } catch (error) {
      if (stored) return stored.names;
      throw error;
    }
  };

  const listing = (system: System, kind: BoxArtKind) => {
    const key = `${system}/${kind}`;
    let names = listings.get(key);
    if (!names) {
      names = fetchListing(system, kind);
      listings.set(key, names);
      names.catch(() => listings.delete(key));
    }
    return names;
  };

  const findImage = async (system: System, name: string) => {
    const art = artKey(system, name);
    const image = await cached(system, name);
    if (image) return image;
    const match = matchBoxArt(name, await listing(system, "Named_Boxarts"));
    if (!match) return undefined;
    const bytes = await host.download(imageUrl(system, "Named_Boxarts", match));
    if (!bytes || !isPng(bytes)) return undefined;
    await host.write(system, name, bytes).catch((error) => console.error(error));
    const url = pngDataUrl(bytes);
    images.set(art, Promise.resolve(url));
    urls.set(art, url);
    for (const onFound of watchers.get(art) ?? []) onFound(url);
    return url;
  };

  const lookup = (system: System, name: string) => {
    const art = artKey(system, name);
    let found = lookups.get(art);
    if (!found) {
      found = findImage(system, name);
      lookups.set(art, found);
      // Offline: forget the attempt so the box art is looked up again next time.
      found.catch(() => lookups.delete(art));
    }
    return found;
  };

  const findAll = async (folder: string, games: Game[]) => {
    const queue = [...games];
    let offline = false;
    const next = async () => {
      for (let game = queue.shift(); game && !offline; game = queue.shift()) {
        if (await choice(folder, game.path)) continue;
        await lookup(game.system, boxArtName(game)).catch(() => {
          offline = true;
        });
      }
    };
    await Promise.all(Array.from({ length: bulkLookups }, next));
  };

  const watch = (art: string, onFound: (url: string) => void) => {
    let watching = watchers.get(art);
    if (!watching) watchers.set(art, (watching = new Set()));
    watching.add(onFound);
    return () => void watching.delete(onFound);
  };

  const find: Lookup = (system, name) => lookup(system, name).catch(() => undefined);

  return {
    host,
    cached,
    find,
    listing,
    choice,
    async pick(folder: string, path: string, image: string) {
      const bytes = await host.download(image).catch(() => undefined);
      if (!bytes) throw new Error("Couldn't download that box art");
      await host.choose(folder, path, bytes);
    },
    findAll,
    watch,
    listen: () => host.onChanged(changed),
    subscribe(listener: (path: string) => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    async resolve({ folder, path, system, name }: Art, lookup: Lookup) {
      const chosen = await choice(folder, path);
      if (chosen) return chosen.kind === "image" ? chosen.url : undefined;
      return lookup(system, name);
    },
    /** The box art when every answer it depends on is already in memory. */
    known({ folder, path, system, name }: Art): { url: string | undefined } | undefined {
      const chosen = knownChoices.get(choiceKey(folder, path));
      if (chosen === undefined) return undefined;
      if (chosen) return { url: chosen.kind === "image" ? chosen.url : undefined };
      const url = urls.get(artKey(system, name));
      return url ? { url } : undefined;
    },
  };
}

type BoxArt = ReturnType<typeof createBoxArt>;

const BoxArtContext = createContext<BoxArt | null>(null);

export function BoxArtProvider({ host, children }: { host: BoxArtHost; children: ReactNode }) {
  const [boxArt] = useState(() => createBoxArt(host));
  useEffect(() => boxArt.listen(), [boxArt]);
  return <BoxArtContext.Provider value={boxArt}>{children}</BoxArtContext.Provider>;
}

export function useBoxArtContext() {
  const boxArt = useContext(BoxArtContext);
  if (!boxArt) throw new Error("box art needs a BoxArtProvider");
  return boxArt;
}

export const boxArtName = (game: Game) => game.name.replace(/[&*/:`<>?\\|"]/g, "_");

export function useFolder() {
  const gamesFolder = useGamesFolder();
  return gamesFolder.status === "ready" ? gamesFolder.folder : undefined;
}

function useLookup(game: Game, pick: (boxArt: BoxArt) => Lookup) {
  const boxArt = useBoxArtContext();
  const folder = useFolder();
  const lookup = pick(boxArt);
  const { system, path } = game;
  const name = boxArtName(game);
  const art = JSON.stringify({ folder, path, system, name });
  const [image, setImage] = useState<{ art: string; url: string | undefined }>();
  const [version, setVersion] = useState(0);

  useEffect(() => boxArt.subscribe((changed) => changed === path && setVersion((count) => count + 1)), [boxArt, path]);

  useEffect(() => {
    if (folder === undefined) return;
    let current = true;
    const of = { folder, path, system, name };
    const show = (url: string | undefined) => current && setImage({ art: JSON.stringify(of), url });
    void boxArt.resolve(of, lookup).then(show);
    const unwatch = boxArt.watch(artKey(system, name), () => {
      const known = boxArt.known(of);
      if (known) show(known.url);
    });
    return () => {
      current = false;
      unwatch();
    };
  }, [boxArt, lookup, folder, system, path, name, version]);

  if (image?.art !== art) {
    const known = folder === undefined ? undefined : boxArt.known({ folder, path, system, name });
    return { loading: !known, url: known?.url };
  }
  return { loading: false, url: image.url };
}

export function useBoxArt(game: Game) {
  return useLookup(game, (boxArt) => boxArt.find);
}

export function useCachedBoxArt(game: Game) {
  return useLookup(game, (boxArt) => boxArt.cached).url;
}

export function useFindAllBoxArt(games: Game[] | undefined) {
  const boxArt = useBoxArtContext();
  const folder = useFolder();
  useEffect(() => {
    if (folder !== undefined && games) void boxArt.findAll(folder, games);
  }, [boxArt, folder, games]);
}
