import { useEffect, useState } from "react";
import { TitledCard } from "@/components/TitledCard";
import { Toast, useToast } from "@/components/Toast";
import { Button } from "@/components/ui/button";
import { withPad, type Calibrations, type KeyboardCalibration } from "@/input/calibration";
import { useCalibrations } from "@/input/calibrations";
import { connectedGamepads } from "@/input/input";
import { navigate } from "@/motion/motion";
import { ControllerSetup } from "./ControllerSetup";
import { keyboardDriver, padDriver, type SetupPad } from "./setupDrivers";

type ConnectedPad = SetupPad & { standard: boolean };

function connectedPads(): ConnectedPad[] {
  return connectedGamepads().flatMap((pad) => (pad ? [{ index: pad.index, id: pad.id, standard: pad.mapping === "standard" }] : []));
}

const keyOf = (pads: ConnectedPad[]) => pads.map((pad) => `${pad.index}:${pad.id}`).join("\n");

// Pads only show up after a press, and Android doesn't always send gamepadconnected.
function useConnectedPads() {
  const [pads, setPads] = useState(connectedPads);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const next = connectedPads();
      setPads((pads) => (keyOf(pads) === keyOf(next) ? pads : next));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return pads;
}

function withKeyboard({ keyboard: _, ...calibrations }: Calibrations, keyboard?: KeyboardCalibration): Calibrations {
  return keyboard && Object.keys(keyboard).length ? { ...calibrations, keyboard } : calibrations;
}

function Device({ name, status, onConfigure, onReset }: { name: string; status: string; onConfigure(): void; onReset?(): void }) {
  return (
    <div role="group" aria-label={name} className="grid gap-2">
      <div>
        <p className="break-all">{name}</p>
        <p className="text-sm text-muted-foreground">{status}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={onConfigure}>
          Configure
        </Button>
        <Button variant="ghost" disabled={!onReset} onClick={onReset}>
          Reset to default
        </Button>
      </div>
    </div>
  );
}

export function ControllersSettings() {
  const pads = useConnectedPads();
  const { calibrations, current, save } = useCalibrations();
  const [configuring, setConfiguring] = useState<SetupPad | "keyboard">();
  const [toast, setToast] = useToast();
  const [error, setError] = useState<string>();

  const store = async (change: (calibrations: Calibrations) => Calibrations) => {
    try {
      await save(change(current()));
      setError(undefined);
      return true;
    } catch (reason) {
      setError(String(reason));
      return false;
    }
  };
  const configure = (pad?: SetupPad | "keyboard") => navigate("sheet", () => setConfiguring(pad));
  const finish = async (change: (calibrations: Calibrations) => Calibrations) => {
    configure(undefined);
    if (await store(change)) setToast("Saved");
  };

  const status = (pad: ConnectedPad) =>
    calibrations.pads[pad.id] ? "Set up" : pad.standard ? "Standard layout" : "Not set up";

  return (
    <TitledCard title="Controllers" className="max-w-sm">
      <Device
        name="Keyboard"
        status={calibrations.keyboard ? "Set up" : "Default keys"}
        onConfigure={() => configure("keyboard")}
        onReset={calibrations.keyboard && (() => void store((all) => withKeyboard(all)))}
      />
      {!pads.length && <p className="text-muted-foreground">Connect a controller and press any button on it.</p>}
      {pads.map((pad) => (
        <Device
          key={pad.index}
          name={pad.id}
          status={status(pad)}
          onConfigure={() => configure({ index: pad.index, id: pad.id })}
          onReset={calibrations.pads[pad.id] && (() => void store((all) => withPad(all, pad.id)))}
        />
      ))}
      {error && <p className="text-destructive">{error}</p>}
      {configuring === "keyboard" && (
        <ControllerSetup
          driver={keyboardDriver}
          onDone={(keyboard) => finish((all) => withKeyboard(all, keyboard))}
          onCancel={() => configure(undefined)}
        />
      )}
      {configuring && configuring !== "keyboard" && (
        <ControllerSetup
          key={configuring.index}
          driver={() => padDriver(configuring)}
          onDone={(calibration) => finish((all) => withPad(all, configuring.id, calibration))}
          onCancel={() => configure(undefined)}
        />
      )}
      <Toast>{toast}</Toast>
    </TitledCard>
  );
}
