import { useEffect, useMemo, useRef, useState } from "react";
import { ImageOff, ImagePlus, Link, RotateCcw, Search } from "lucide-react";
import { useBack } from "@/back/back";
import { BottomSheet } from "@/components/BottomSheet";
import { MenuEntry } from "@/components/MenuDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Game } from "@/library/scan";
import { messageOf } from "@/lib/utils";
import { imageUrl, useBoxArtContext, useFolder, type BoxArtKind } from "./boxArt";
import { rankBoxArt } from "./match";

const PAGE = 30;

const kinds: { kind: BoxArtKind; label: string }[] = [
  { kind: "Named_Boxarts", label: "Box art" },
  { kind: "Named_Titles", label: "Title screens" },
];

type Saving = "file" | "url" | "none" | "default" | { image: string };

function useListing(game: Game, kind: BoxArtKind) {
  const boxArt = useBoxArtContext();
  const [names, setNames] = useState<string[] | "offline" | "failed">();

  useEffect(() => {
    if (!navigator.onLine) return setNames("offline");
    let current = true;
    boxArt.listing(game.system, kind).then(
      (names) => current && setNames(names),
      () => current && setNames(navigator.onLine ? "failed" : "offline"),
    );
    return () => {
      current = false;
    };
  }, [boxArt, game.system, kind]);

  return names;
}

function Gallery({
  game,
  kind,
  query,
  saving,
  onPick,
}: {
  game: Game;
  kind: BoxArtKind;
  query: string;
  saving: Saving | undefined;
  onPick(image: string): void;
}) {
  const names = useListing(game, kind);
  const [shown, setShown] = useState(PAGE);
  const more = useRef<HTMLDivElement>(null);
  const results = useMemo(() => {
    if (!Array.isArray(names)) return [];
    return query.trim() ? rankBoxArt(query, names) : names;
  }, [names, query]);

  useEffect(() => setShown(PAGE), [results]);

  useEffect(() => {
    const end = more.current;
    if (!end) return;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setShown((shown) => shown + PAGE));
    observer.observe(end);
    return () => observer.disconnect();
  }, [results, shown]);

  if (names === "failed") return <p className="py-8 text-center text-muted-foreground">Couldn't load box art from libretro</p>;
  if (names === "offline") return <p className="py-8 text-center text-muted-foreground">Connect to the internet to browse box art</p>;
  if (!names) return <Spinner className="mx-auto my-8" />;
  if (!results.length) return <p className="py-8 text-center text-muted-foreground">No box art matches</p>;

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {results.slice(0, shown).map((name) => {
          const image = imageUrl(game.system, kind, name);
          const picking = typeof saving === "object" && saving.image === image;
          const at = name.search(/ [([]/);
          const [title, tags] = at < 0 ? [name, ""] : [name.slice(0, at), name.slice(at + 1)];
          return (
            <Button
              key={name}
              variant="ghost"
              aria-label={name}
              aria-busy={picking || undefined}
              disabled={!!saving}
              onClick={() => onPick(image)}
              className="relative h-auto flex-col items-stretch gap-1 rounded-lg p-1.5 whitespace-normal"
            >
              <span className="grid aspect-square place-items-center overflow-hidden rounded-md bg-muted">
                <img src={image} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
              </span>
              <span className="grid text-left text-xs font-normal text-muted-foreground">
                <span className="truncate">{title}</span>
                {tags && <span className="truncate">{tags}</span>}
              </span>
              {picking && <Spinner className="absolute top-3 right-3" />}
            </Button>
          );
        })}
      </div>
      {shown < results.length && <div ref={more} className="h-px" />}
    </>
  );
}

export function BoxArtSheet({
  open,
  game,
  onClose,
  onChanged,
}: {
  open: boolean;
  game: Game;
  onClose(): void;
  onChanged(): void;
}) {
  const boxArt = useBoxArtContext();
  const folder = useFolder();
  const [chosen, setChosen] = useState<boolean>();
  const [query, setQuery] = useState(game.name);
  const [kind, setKind] = useState<BoxArtKind>("Named_Boxarts");
  const [typingUrl, setTypingUrl] = useState(false);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState<Saving>();
  const [error, setError] = useState<{ source: Saving; message: string }>();

  useEffect(() => {
    if (folder === undefined) return;
    let current = true;
    void boxArt.choice(folder, game.path).then((chosen) => current && setChosen(!!chosen));
    return () => {
      current = false;
    };
  }, [boxArt, folder, game.path]);

  const close = () => !saving && onClose();
  useBack(open ? close : undefined);

  const save = async (source: Saving, action: (folder: string, path: string) => Promise<boolean | void>) => {
    if (folder === undefined || saving) return;
    setSaving(source);
    setError(undefined);
    try {
      if ((await action(folder, game.path)) !== false) onChanged();
    } catch (reason) {
      setError({ source, message: messageOf(reason) });
    } finally {
      setSaving(undefined);
    }
  };

  const busy = !!saving;
  const urlError = error?.source === "url" ? error.message : undefined;

  return (
    <BottomSheet
      open={open}
      title="Box art"
      onClose={close}
      centeredFromSm
      className="h-[85dvh] content-start sm:h-[80dvh] sm:max-w-2xl"
    >
      <div className="grid gap-1">
        <MenuEntry icon={<ImagePlus />} disabled={busy} onClick={() => void save("file", boxArt.host.chooseFile)}>
          Choose image
          {saving === "file" && <Spinner className="ml-auto" />}
        </MenuEntry>
        <MenuEntry icon={<Link />} disabled={busy} aria-expanded={typingUrl} onClick={() => setTypingUrl((typing) => !typing)}>
          From URL
        </MenuEntry>
        {typingUrl && (
          <form
            className="grid gap-1 px-3 pb-2"
            onSubmit={(event) => {
              event.preventDefault();
              void save("url", (folder, path) => boxArt.host.chooseUrl(folder, path, url.trim()));
            }}
          >
            <div className="flex items-center gap-2">
              <Input
                type="url"
                inputMode="url"
                autoFocus
                aria-label="Image URL"
                placeholder="https://"
                value={url}
                disabled={busy}
                aria-invalid={urlError ? true : undefined}
                onChange={(event) => setUrl(event.target.value)}
              />
              <Button type="submit" disabled={busy || !url.trim()} aria-busy={saving === "url" || undefined}>
                {saving === "url" && <Spinner />}
                Use
              </Button>
            </div>
            {urlError && (
              <p role="alert" className="text-destructive">
                {urlError}
              </p>
            )}
          </form>
        )}
        {chosen === true && (
          <MenuEntry icon={<RotateCcw />} disabled={busy} onClick={() => void save("default", boxArt.host.chooseDefault)}>
            Use default
            {saving === "default" && <Spinner className="ml-auto" />}
          </MenuEntry>
        )}
        {chosen === false && (
          <MenuEntry icon={<ImageOff />} disabled={busy} onClick={() => void save("none", boxArt.host.chooseNone)}>
            No box art
            {saving === "none" && <Spinner className="ml-auto" />}
          </MenuEntry>
        )}
      </div>
      <Tabs value={kind} onValueChange={(kind) => setKind(kind as BoxArtKind)} className="gap-3">
        <div className="sticky -top-4 z-10 -mx-4 grid gap-3 bg-popover px-4 py-2">
          <InputGroup>
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              aria-label="Search box art"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </InputGroup>
          <TabsList className="w-full">
            {kinds.map(({ kind, label }) => (
              <TabsTrigger key={kind} value={kind}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          {error && !urlError && (
            <p role="alert" className="text-destructive">
              {error.message}
            </p>
          )}
        </div>
        {kinds.map(({ kind }) => (
          <TabsContent key={kind} value={kind}>
            <Gallery
              game={game}
              kind={kind}
              query={query}
              saving={saving}
              onPick={(image) => void save({ image }, (folder, path) => boxArt.pick(folder, path, image))}
            />
          </TabsContent>
        ))}
      </Tabs>
    </BottomSheet>
  );
}
