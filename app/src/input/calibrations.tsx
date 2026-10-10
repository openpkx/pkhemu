import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { noCalibrations, parseCalibrations, type Calibrations } from "./calibration";

export type CalibrationsHost = {
  load(): Promise<unknown>;
  save(calibrations: Calibrations): Promise<void>;
};

export type CalibrationsState = {
  calibrations: Calibrations;
  current(): Calibrations;
  save(calibrations: Calibrations): Promise<void>;
};

const CalibrationsContext = createContext<CalibrationsState>({
  calibrations: noCalibrations,
  current: () => noCalibrations,
  save: async () => {},
});

export function CalibrationsProvider({ host, children }: { host: CalibrationsHost; children: ReactNode }) {
  const latest = useRef(noCalibrations);
  const [calibrations, setCalibrations] = useState(noCalibrations);

  useEffect(() => {
    let live = true;
    host.load().then(
      (stored) => {
        if (!live) return;
        latest.current = parseCalibrations(stored);
        setCalibrations(latest.current);
      },
      () => {},
    );
    return () => {
      live = false;
    };
  }, [host]);

  const current = useCallback(() => latest.current, []);
  const save = useCallback(
    async (calibrations: Calibrations) => {
      latest.current = calibrations;
      setCalibrations(calibrations);
      await host.save(calibrations);
    },
    [host],
  );
  const value = useMemo(() => ({ calibrations, current, save }), [calibrations, current, save]);

  return <CalibrationsContext.Provider value={value}>{children}</CalibrationsContext.Provider>;
}

export function useCalibrations() {
  return useContext(CalibrationsContext);
}
