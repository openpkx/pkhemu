import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePlus, type PlusStatus } from "@/plus/plus";
import { experiments, type Experiment } from "./experiments";

export type Lab = "off" | "players" | "all";

export type ExperimentValues = Record<string, string>;

export type ExperimentsHost = {
  load(): Promise<unknown>;
  save(values: ExperimentValues): Promise<void>;
};

export type ExperimentsState = {
  lab: Lab;
  shown: readonly Experiment[];
  values: ExperimentValues;
  error?: string;
  change(id: string, value: string): Promise<void>;
};

function firstValues(registry: readonly Experiment[]): ExperimentValues {
  return Object.fromEntries(registry.map(({ id, values }) => [id, values[0]]));
}

function withDefaults(stored: unknown, registry: readonly Experiment[]): ExperimentValues {
  const values = firstValues(registry);
  if (typeof stored !== "object" || stored === null) return values;
  for (const experiment of registry) {
    const value = (stored as Record<string, unknown>)[experiment.id];
    if (experiment.values.includes(value as string)) values[experiment.id] = value as string;
  }
  return values;
}

function labFor(plus: PlusStatus["state"] | undefined): Lab {
  if (plus === "unlocked") return "all";
  if (plus === "owned") return "players";
  return "off";
}

const ignoreChange = async () => {};

const ExperimentsContext = createContext<ExperimentsState>({
  lab: "off",
  shown: [],
  values: firstValues(experiments),
  change: ignoreChange,
});

export function ExperimentsProvider({
  host,
  registry,
  children,
}: {
  host: ExperimentsHost;
  registry: readonly Experiment[];
  children: ReactNode;
}) {
  const lab = labFor(usePlus().status?.state);
  const [stored, setStored] = useState<ExperimentValues>();
  const [error, setError] = useState<string>();
  const latest = useRef<ExperimentValues>(undefined);
  const shown = useMemo(
    () => (lab === "all" ? registry : lab === "players" ? registry.filter(({ players }) => players) : []),
    [lab, registry],
  );
  const values = useMemo(() => {
    if (!stored) return undefined;
    const running = firstValues(registry);
    for (const { id } of shown) running[id] = stored[id];
    return running;
  }, [stored, registry, shown]);

  useEffect(() => {
    let current = true;
    host.load().then(
      (stored) => current && setStored((latest.current = withDefaults(stored, registry))),
      () => current && setStored((latest.current = firstValues(registry))),
    );
    return () => {
      current = false;
    };
  }, [host, registry]);

  const change = useCallback(
    async (id: string, value: string) => {
      const next = { ...latest.current!, [id]: value };
      latest.current = next;
      setStored(next);
      try {
        await host.save(next);
        setError(undefined);
      } catch (reason) {
        setError(String(reason));
      }
    },
    [host],
  );

  const state = useMemo<ExperimentsState | undefined>(
    () => values && { lab, shown, values, error, change: lab === "off" ? ignoreChange : change },
    [lab, shown, values, error, change],
  );
  if (!state) return null;

  return <ExperimentsContext.Provider value={state}>{children}</ExperimentsContext.Provider>;
}

export function useExperiments() {
  return useContext(ExperimentsContext);
}

export function useExperiment(id: string) {
  const value = useExperiments().values[id];
  if (value === undefined) throw new Error(`No experiment called ${id}`);
  return value;
}
