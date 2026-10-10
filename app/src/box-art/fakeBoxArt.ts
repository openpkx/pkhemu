import { pngDataUrl } from "@/lib/utils";
import type { System } from "@/systems";
import { thumbnails, type BoxArtHost, type ChosenBoxArt, type Listing } from "./boxArt";

export function fakeBoxArt(published: Record<string, Uint8Array> = {}) {
  const cache = new Map<string, Uint8Array>();
  const listings = new Map<string, Listing>();
  const network = { online: true };
  const picker: { image?: Uint8Array } = {};
  const chosen = new Map<string, ChosenBoxArt>();
  const listeners = new Set<(path: string) => void>();
  const art = (system: System, name: string) => `${system}/${name}`;
  const directory = (folder: string) =>
    Object.keys(published)
      .filter((path) => path.startsWith(folder) && !path.slice(folder.length).includes("/"))
      .map((path) => `<a href="${encodeURIComponent(path.slice(folder.length))}">${path.slice(folder.length)}</a>`)
      .join("\n");
  const host: BoxArtHost = {
    chosen: async (_, path) => chosen.get(path),
    onChanged: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    read: async (system, name) => cache.get(art(system, name)),
    write: async (system, name, bytes) => void cache.set(art(system, name), bytes),
    readListing: async (system, kind) => listings.get(`${system}/${kind}`),
    writeListing: async (system, kind, listing) => void listings.set(`${system}/${kind}`, listing),
    download: async (url) => {
      if (!network.online) throw new TypeError("Failed to fetch");
      const path = decodeURIComponent(url.slice(thumbnails.length));
      if (path.endsWith("/")) return new TextEncoder().encode(directory(path));
      return published[path];
    },
    choose: async (_, path, image) => choose(path, { kind: "image", url: pngDataUrl(image) }),
    chooseUrl: async (_, path, url) => {
      if (!network.online) throw "Couldn't download that link";
      choose(path, { kind: "image", url });
    },
    chooseFile: async (_, path) => {
      if (!picker.image) return false;
      choose(path, { kind: "image", url: pngDataUrl(picker.image) });
      return true;
    },
    chooseNone: async (_, path) => choose(path, { kind: "none" }),
    chooseDefault: async (_, path) => choose(path, undefined),
  };
  function choose(path: string, choice: ChosenBoxArt | undefined) {
    if (choice) chosen.set(path, choice);
    else chosen.delete(path);
    listeners.forEach((listener) => listener(path));
  }
  return { host, cache, listings, network, picker, choose };
}
