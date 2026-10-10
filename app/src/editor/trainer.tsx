import { useId, useState, type ComponentProps } from "react";
import { useTrainer } from "@pkhex-everywhere/react";
import type { TrainerGender } from "@pkhex-everywhere/engine";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Page } from "./EditorScreen";

const maxMoney = 999_999;

type Commit = (value: string) => Promise<boolean>;

function Field({
  label,
  value,
  parse,
  commit,
  ...props
}: {
  label: string;
  value: string;
  parse(text: string): string | undefined;
  commit: Commit;
} & Omit<ComponentProps<typeof Input>, "value" | "id">) {
  const id = useId();

  const save = async (input: HTMLInputElement) => {
    const next = parse(input.value) ?? value;
    input.value = next;
    if (next !== value && !(await commit(next))) input.value = value;
  };

  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input
        key={value}
        id={id}
        defaultValue={value}
        onBlur={(event) => void save(event.currentTarget)}
        onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
        {...props}
      />
    </div>
  );
}

function Trainer() {
  const { trainer, setName, setGender, setMoney } = useTrainer();
  const [error, setError] = useState<string>();
  const genderId = useId();

  const attempt = (change: Promise<void>) =>
    change.then(
      () => {
        setError(undefined);
        return true;
      },
      (reason) => {
        setError(String(reason));
        return false;
      },
    );

  return (
    <div className="grid max-w-md gap-6 p-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Field
        label="Name"
        value={trainer.name}
        maxLength={trainer.maxNameLength}
        autoComplete="off"
        parse={(text) => text || undefined}
        commit={(name) => attempt(setName(name))}
      />
      {trainer.gender !== null && (
        <div className="grid gap-2">
          <span id={genderId} className="text-sm font-medium">
            Gender
          </span>
          <ToggleGroup
            type="single"
            variant="outline"
            aria-labelledby={genderId}
            value={trainer.gender}
            onValueChange={(gender) => gender && void attempt(setGender(gender as TrainerGender))}
            className="justify-start"
          >
            <ToggleGroupItem value="male">Male</ToggleGroupItem>
            <ToggleGroupItem value="female">Female</ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}
      {trainer.money !== null && (
        <Field
          label="Money"
          value={String(trainer.money)}
          type="number"
          inputMode="numeric"
          min={0}
          max={maxMoney}
          parse={(text) => (/^\d+$/.test(text) ? String(Math.min(Number(text), maxMoney)) : undefined)}
          commit={(amount) => attempt(setMoney(Number(amount)))}
        />
      )}
    </div>
  );
}

export const trainerPage: Page = { title: "Trainer", content: <Trainer /> };
