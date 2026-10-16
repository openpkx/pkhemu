import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePlus, useSideloadBuild, type PlusState } from "@/plus/plus";
import { experiments, type Experiment } from "./experiments";

export type Lab = "off" | "players" | "all";

export type ExperimentValues = Record<string, string>;

export type ExperimentsHost = {
  load(): Promise<unknown>;
  save(values: ExperimentValues): Promise<void>;
  hidden?(): Promise<readonly string[]>;
  lines?: Readonly<Record<string, string>>;
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

function labFor(plus: PlusState | undefined, sideload: boolean): Lab {
  if (plus === "unlocked") return sideload ? "players" : "all";
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
  const lab = labFor(usePlus().status?.state, useSideloadBuild());
  const [stored, setStored] = useState<ExperimentValues>();
  const [hidden, setHidden] = useState<readonly string[]>([]);
  const [error, setError] = useState<string>();
  const latest = useRef<ExperimentValues>(undefined);
  const shown = useMemo(() => {
    const offered = registry
      .filter(({ id }) => !hidden.includes(id))
      .map((experiment) => ({ ...experiment, line: host.lines?.[experiment.id] ?? experiment.line }));
    return lab === "all" ? offered : lab === "players" ? offered.filter(({ players }) => players) : [];
  }, [lab, registry, hidden, host]);
  const values = useMemo(() => {
    if (!stored) return undefined;
    const running = firstValues(registry);
    for (const { id } of shown) running[id] = stored[id];
    return running;
  }, [stored, registry, shown]);

  useEffect(() => {
    let current = true;
    Promise.all([
      host.load().then(
        (stored) => withDefaults(stored, registry),
        () => firstValues(registry),
      ),
      (host.hidden?.() ?? Promise.resolve([])).catch(() => []),
    ]).then(([stored, hidden]) => {
      if (!current) return;
      setHidden(hidden);
      setStored((latest.current = stored));
    });
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
