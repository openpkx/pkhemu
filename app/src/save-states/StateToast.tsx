import { Toast } from "@/components/Toast";
import { WithUndo } from "@/editor/undo";
import type { StateMessage } from "./StatesScreen";

export function StateToast({ toast, onUndo }: { toast?: StateMessage; onUndo(): void }) {
  return (
    <Toast inline>
      {toast && (toast.undoable ? <WithUndo onUndo={onUndo}>{toast.message}</WithUndo> : toast.message)}
    </Toast>
  );
}
