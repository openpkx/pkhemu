import { useEffect, useState } from "react";
import { SettingRow, SwitchRow } from "@/components/SettingsRow";
import { TitledCard } from "@/components/TitledCard";
import { Toast, useToast } from "@/components/Toast";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { withPad, type Calibrations, type KeyboardCalibration } from "@/input/calibration";
import { useCalibrations } from "@/input/calibrations";
import { connectedGamepads } from "@/input/input";
import { navigate } from "@/motion/motion";
import { isStickSensitivity, stickSensitivities, usePreferences } from "@/preferences/preferences";
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

const stickSensitivityLabels = { 0.75: "Low", 1: "Medium", 1.5: "High" };
const stickSensitivityLines = {
  0.75: "The touch stick tilts all the way after a long slide.",
  1: "The touch stick tilts all the way after a medium slide.",
  1.5: "The touch stick tilts all the way after a short slide.",
};

function TouchControlsSettings() {
  const { preferences, change } = usePreferences();

  return (
    <>
      <SwitchRow
        label="Touch controls"
        checked={preferences.touchControls}
        onCheckedChange={(touchControls) => void change({ touchControls })}
      />
      {preferences.touchControls && (
        <div className="grid gap-1">
          <SettingRow label="Stick sensitivity">
            {(labelId) => (
              <ToggleGroup
                type="single"
                variant="outline"
                aria-labelledby={labelId}
                value={String(preferences.stickSensitivity)}
                onValueChange={(value) => {
                  const stickSensitivity = Number(value);
                  if (isStickSensitivity(stickSensitivity)) void change({ stickSensitivity });
                }}
              >
                {stickSensitivities.map((sensitivity) => (
                  <ToggleGroupItem key={sensitivity} value={String(sensitivity)}>
                    {stickSensitivityLabels[sensitivity]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
          </SettingRow>
          <p className="text-muted-foreground">{stickSensitivityLines[preferences.stickSensitivity]}</p>
        </div>
      )}
    </>
  );
}

export function ControlsSettings() {
  const pads = useConnectedPads();
  const { calibrations, current, save } = useCalibrations();
  const [configuring, setConfiguring] = useState<SetupPad | "keyboard">();
  const [toast, setToast] = useToast();
  const [error, setError] = useState<string>();
  const preferencesError = usePreferences().error;

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
    <TitledCard title="Controls" className="max-w-sm">
      <TouchControlsSettings />
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
      {(error ?? preferencesError) && <p className="text-destructive">{error ?? preferencesError}</p>}
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
