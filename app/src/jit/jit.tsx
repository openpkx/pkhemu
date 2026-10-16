import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useVisible } from "@/visible";

export type JitHelper = "ready" | "removed" | "unavailable";

export type JitHost = {
  on(): Promise<boolean>;
  enable(): Promise<void>;
  helper(): Promise<JitHelper>;
  turnOn(): Promise<boolean>;
  pairingFile(): Promise<boolean>;
  importPairingFile(): Promise<boolean>;
  removePairingFile(): Promise<void>;
};

const JitContext = createContext<JitHost>({
  on: async () => false,
  enable: async () => {},
  helper: async () => "unavailable",
  turnOn: async () => false,
  pairingFile: async () => false,
  importPairingFile: async () => false,
  removePairingFile: async () => {},
});

export function JitProvider({ host, children }: { host: JitHost; children: ReactNode }) {
  return <JitContext.Provider value={host}>{children}</JitContext.Provider>;
}

export function useJit() {
  const host = useContext(JitContext);
  const visible = useVisible();
  const [on, setOn] = useState<boolean>();
  const [pairingFile, setPairingFile] = useState<boolean>();
  const [helper, setHelper] = useState<JitHelper>();
  const [turningOn, setTurningOn] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!visible) return;
    let current = true;
    host.on().then(
      (answer) => current && setOn(answer),
      (reason: unknown) => current && setError(String(reason)),
    );
    return () => {
      current = false;
    };
  }, [host, visible]);

  useEffect(() => {
    let current = true;
    host.pairingFile().then(
      (answer) => current && setPairingFile(answer),
      (reason: unknown) => current && setError(String(reason)),
    );
    return () => {
      current = false;
    };
  }, [host]);

  useEffect(() => {
    let current = true;
    host.helper().then(
      (answer) => current && setHelper(answer),
      () => current && setHelper("unavailable"),
    );
    return () => {
      current = false;
    };
  }, [host]);

  const run = useCallback(async (work: () => Promise<void>) => {
    setError(undefined);
    try {
      await work();
    } catch (reason) {
      setError(String(reason));
    }
  }, []);

  const enable = useCallback(() => run(() => host.enable()), [host, run]);

  const turnOn = useCallback(
    () =>
      run(async () => {
        setTurningOn(true);
        try {
          setOn(await host.turnOn());
        } finally {
          setTurningOn(false);
        }
      }),
    [host, run],
  );

  const importPairingFile = useCallback(
    () =>
      run(async () => {
        if (await host.importPairingFile()) setPairingFile(true);
      }),
    [host, run],
  );

  const removePairingFile = useCallback(
    () =>
      run(async () => {
        await host.removePairingFile();
        setPairingFile(false);
      }),
    [host, run],
  );

  return {
    on,
    enable,
    helper,
    turnOn,
    turningOn,
    pairingFile,
    importPairingFile,
    removePairingFile,
    error,
  };
}
