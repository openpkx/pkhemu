import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Choice } from "@pkhex-everywhere/engine";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";

function ChoiceRow<T extends Choice>({ choice, icon }: { choice: T; icon?(choice: T): ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const row = ref.current;
    if (!icon || seen || !row) return;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setSeen(true));
    observer.observe(row);
    return () => observer.disconnect();
  }, [icon, seen]);

  return (
    <ComboboxItem ref={ref} value={choice}>
      {icon && <span className="flex size-8 shrink-0 items-center justify-center">{seen && icon(choice)}</span>}
      {choice.name}
    </ComboboxItem>
  );
}

export function ChoiceSelect<T extends Choice>({
  id,
  choices,
  value,
  disabled,
  onChange,
  icon,
}: {
  id: string;
  choices: T[];
  value: number | null;
  disabled?: boolean;
  onChange(id: number): void;
  icon?(choice: T): ReactNode;
}) {
  return (
    <Combobox
      items={choices}
      value={choices.find((choice) => choice.id === value) ?? null}
      onValueChange={(choice) => choice && onChange(choice.id)}
      itemToStringLabel={(choice) => choice.name}
      isItemEqualToValue={(choice, other) => choice.id === other.id}
      disabled={disabled}
    >
      <ComboboxTrigger
        id={id}
        render={<Button variant="outline" className="w-full min-w-0 shrink justify-between rounded-lg font-normal" />}
      >
        <span className="truncate">
          <ComboboxValue />
        </span>
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxInput showTrigger={false} placeholder="Search" aria-label="Search" />
        <ComboboxEmpty>No matches</ComboboxEmpty>
        <ComboboxList>{(choice: T) => <ChoiceRow key={choice.id} choice={choice} icon={icon} />}</ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
