import { useEffect, useState } from "react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { inRange } from "@/lib/utils";

export function NumberInput({
  label,
  unit,
  value,
  min = 0,
  max,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min?: number;
  max: number;
  onChange(value: number): void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  return (
    <InputGroup className="w-24">
      <InputGroupInput
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        aria-label={label}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          const typed = Number(event.target.value);
          if (event.target.value !== "" && inRange(typed, min, max)) onChange(typed);
        }}
        onBlur={() => setDraft(String(value))}
      />
      <InputGroupAddon align="inline-end">{unit}</InputGroupAddon>
    </InputGroup>
  );
}
