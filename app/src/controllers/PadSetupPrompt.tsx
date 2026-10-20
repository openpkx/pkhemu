import { useEffect, useRef, useState } from "react";
import { Toast, useToast } from "@/components/Toast";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { withPad } from "@/input/calibration";
import { useCalibrations } from "@/input/calibrations";
import type { Input } from "@/input/input";
import { capturingPads, useCapturePads } from "@/input/padPresses";
import { navigate } from "@/plugin-kit/motion";
import { ControllerSetup } from "./ControllerSetup";
import { padDriver, type SetupPad } from "./setupDrivers";

function SetupNotice({ pad, onSetUp, onDismiss }: { pad: SetupPad; onSetUp(): void; onDismiss(): void }) {
  useCapturePads();
  return (
    <AlertDialog open onOpenChange={(open) => !open && onDismiss()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Set up this controller?</AlertDialogTitle>
          <AlertDialogDescription className="break-all">{pad.id}</AlertDialogDescription>
          <AlertDialogDescription>The app can't read its buttons until you set it up.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Not now</AlertDialogCancel>
          {/* AlertDialogAction would also close through onOpenChange and count as dismissing. */}
          <Button onClick={onSetUp}>Set up</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function PadSetupPrompt({
  input,
  dismissed,
  listening = true,
  onPrompt,
  onSettingUp,
}: {
  input: Input;
  dismissed: Set<string>;
  listening?: boolean;
  onPrompt?(): void;
  onSettingUp?(settingUp: boolean): void;
}) {
  const { current, save } = useCalibrations();
  const [pressed, setPressed] = useState<SetupPad>();
  const [notice, setNotice] = useState<SetupPad>();
  const [settingUp, setSettingUp] = useState<SetupPad>();
  const [toast, setToast] = useToast();
  const latest = useRef({ onPrompt, onSettingUp });
  latest.current = { onPrompt, onSettingUp };
  const busy = !!pressed || !!notice || !!settingUp;

  useEffect(() => {
    if (!listening || busy) return;
    return input.onUnreadablePad((pad) => {
      if (dismissed.has(pad.id) || capturingPads()) return;
      setPressed({ index: pad.index, id: pad.id });
      latest.current.onPrompt?.();
    });
  }, [input, dismissed, listening, busy]);

  // A dialog opened by onPrompt in the same commit as the notice would hide the notice from screen readers.
  useEffect(() => {
    if (!pressed) return;
    setNotice(pressed);
    setPressed(undefined);
  }, [pressed]);

  const dismiss = () => {
    if (notice) dismissed.add(notice.id);
    setNotice(undefined);
  };

  const setUp = () =>
    navigate("sheet", () => {
      setSettingUp(notice);
      setNotice(undefined);
      latest.current.onSettingUp?.(true);
    });

  const close = () =>
    navigate("sheet", () => {
      setSettingUp(undefined);
      latest.current.onSettingUp?.(false);
    });

  return (
    <>
      {notice && <SetupNotice pad={notice} onSetUp={setUp} onDismiss={dismiss} />}
      {settingUp && (
        <ControllerSetup
          driver={() => padDriver(settingUp)}
          onDone={async (calibration) => {
            close();
            try {
              await save(withPad(current(), settingUp.id, calibration));
              setToast("Saved");
            } catch (reason) {
              setToast(String(reason));
            }
          }}
          onCancel={() => {
            // Otherwise the next press on the pad brings the notice straight back.
            dismissed.add(settingUp.id);
            close();
          }}
        />
      )}
      <Toast>{toast}</Toast>
    </>
  );
}
