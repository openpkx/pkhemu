import { useEffect, useRef, useState } from "react";
import { Toast, TOAST_MS, WithAction } from "@/components/Toast";
import { usePreferences } from "@/preferences/preferences";
import { useAppUpdate, type AppUpdateState } from "./appUpdate";

export function UpdateToast() {
  return useAppUpdate().state === "none" ? null : <PendingUpdateToast />;
}

function PendingUpdateToast() {
  const { state, versionCode = 0, start, complete, toasted } = useAppUpdate();
  const { preferences, change } = usePreferences();
  const [shown, setShown] = useState<AppUpdateState>("none");
  const dismiss = useRef(() => {});
  dismiss.current = () => void change({ updateDismissedVersion: versionCode });

  const wanted = state === "downloaded" || (state === "available" && versionCode > preferences.updateDismissedVersion);
  useEffect(() => {
    if (!wanted || toasted.has(state)) return;
    toasted.add(state);
    setShown(state);
  }, [state, wanted, toasted]);

  useEffect(() => {
    if (shown === "none") return;
    const timer = setTimeout(() => {
      setShown("none");
      if (shown === "available") dismiss.current();
    }, TOAST_MS);
    return () => clearTimeout(timer);
  }, [shown]);

  const then = (run: () => void) => () => {
    setShown("none");
    run();
  };
  return (
    <Toast>
      {shown === "available" ? (
        <WithAction action="Update" onAction={then(start)}>
          New version available
        </WithAction>
      ) : shown === "downloaded" ? (
        <WithAction action="Restart" onAction={then(complete)}>
          Update downloaded
        </WithAction>
      ) : undefined}
    </Toast>
  );
}
