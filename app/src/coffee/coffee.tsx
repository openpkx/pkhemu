import { useCallback, useEffect, useRef, useState } from "react";
import { Coffee } from "lucide-react";
import { useBackGesture } from "@/back/back";
import { TitledCard } from "@/components/TitledCard";
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
import { useVisible } from "@/visible";

export const koFi = "https://ko-fi.com/pkhemu";

const ASK_AFTER_SECONDS = 2 * 60 * 60;
const FLUSH_MS = 60_000;

export type CoffeeState = { secondsPlayed: number; asked: boolean };

type StoredCoffee = Partial<Record<keyof CoffeeState, unknown>>;

export type CoffeeHost = {
  load(): Promise<StoredCoffee>;
  save(state: CoffeeState): Promise<void>;
  openKoFi(): Promise<void>;
};

function withDefaults({ secondsPlayed, asked }: StoredCoffee): CoffeeState {
  return {
    secondsPlayed: typeof secondsPlayed === "number" && secondsPlayed >= 0 ? secondsPlayed : 0,
    asked: asked === true,
  };
}

export function CoffeeCard({ host }: { host: CoffeeHost }) {
  return (
    <TitledCard title="Buy me a coffee" className="max-w-sm">
      <p className="text-muted-foreground">
        Sync is free in this build. If pkhemu is useful to you, a coffee helps me keep working on it.
      </p>
      <Button variant="outline" className="justify-self-start" onClick={() => void host.openKoFi()}>
        <Coffee />
        Open Ko-fi
      </Button>
    </TitledCard>
  );
}

export function CoffeeAsk({ host, playing, canAsk }: { host: CoffeeHost; playing: boolean; canAsk: boolean }) {
  const [state, setState] = useState<CoffeeState>();
  const latest = useRef<CoffeeState>(undefined);
  const visible = useVisible();
  const onBackGesture = useBackGesture();

  const update = useCallback(
    (change: (state: CoffeeState) => CoffeeState) => {
      if (!latest.current) return;
      latest.current = change(latest.current);
      setState(latest.current);
      host.save(latest.current).catch(console.error);
    },
    [host],
  );

  useEffect(() => {
    let current = true;
    host.load().then(
      (stored) => current && setState((latest.current = withDefaults(stored))),
      (reason) => console.error(reason),
    );
    return () => {
      current = false;
    };
  }, [host]);

  const loaded = state !== undefined;
  useEffect(() => {
    if (!playing || !visible || !loaded) return;
    let since = Date.now();
    const flush = () => {
      const now = Date.now();
      const seconds = Math.round((now - since) / 1000);
      since = now;
      update((state) => ({ ...state, secondsPlayed: state.secondsPlayed + seconds }));
    };
    const timer = setInterval(flush, FLUSH_MS);
    return () => {
      clearInterval(timer);
      flush();
    };
  }, [playing, visible, loaded, update]);

  const showing = canAsk && !playing && !!state && !state.asked && state.secondsPlayed >= ASK_AFTER_SECONDS;
  const close = useCallback(() => update((state) => ({ ...state, asked: true })), [update]);

  useEffect(() => {
    if (showing) return onBackGesture(close);
  }, [showing, onBackGesture, close]);

  return (
    <AlertDialog open={showing}>
      <AlertDialogContent onEscapeKeyDown={close}>
        <AlertDialogHeader>
          <AlertDialogTitle>Enjoying pkhemu?</AlertDialogTitle>
          <AlertDialogDescription>
            On the App Store, Sync is part of Plus. In this build it's free, and it stays free. If you'd like to support
            the project, you can buy me a coffee.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={close}>No thanks</AlertDialogCancel>
          <AlertDialogAction variant="secondary" onClick={close}>
            Already did
          </AlertDialogAction>
          <AlertDialogAction
            onClick={() => {
              close();
              void host.openKoFi();
            }}
          >
            Buy me a coffee
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
