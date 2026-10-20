import type { ComponentProps } from "react";
import { buttons, type Input } from "@/input/input";
import { usePadPresses } from "@/input/padPresses";
import { BottomSheet } from "@/plugin-kit/BottomSheet";

export function PadBottomSheet({
  input,
  onPadPress,
  ...sheet
}: ComponentProps<typeof BottomSheet> & { input?: Input; onPadPress?(button: number): void }) {
  usePadPresses(input, (button) => (button === buttons.b ? sheet.onClose() : onPadPress?.(button)), sheet.open ?? true);
  return <BottomSheet {...sheet} />;
}
