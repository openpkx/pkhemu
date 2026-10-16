import { useId, type ReactNode } from "react";
import { Switch } from "@/components/ui/switch";

export function SwitchRow({
  label,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onCheckedChange(checked: boolean): void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="min-w-0 flex-1">
        {label}
      </label>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function SettingRow({ label, children }: { label: string; children: (labelId: string) => ReactNode }) {
  const labelId = useId();
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <span id={labelId}>{label}</span>
      {children(labelId)}
    </div>
  );
}
