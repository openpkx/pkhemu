import { useId } from "react";
import { TitledCard } from "@/components/TitledCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Experiment } from "./experiments";
import { useExperiments } from "./lab";

function ExperimentRow({ experiment, value, onChange }: { experiment: Experiment; value: string; onChange(value: string): void }) {
  const labelId = useId();
  const switchId = useId();
  const [off, on] = experiment.values;

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        {experiment.values.length === 2 ? (
          <>
            <label htmlFor={switchId}>{experiment.label}</label>
            <Switch id={switchId} checked={value === on} onCheckedChange={(checked) => onChange(checked ? on : off)} />
          </>
        ) : (
          <>
            <span id={labelId}>{experiment.label}</span>
            <ToggleGroup
              type="single"
              variant="outline"
              aria-labelledby={labelId}
              value={value}
              onValueChange={(next) => {
                if (next) onChange(next);
              }}
            >
              {experiment.values.map((option) => (
                <ToggleGroupItem key={option} value={option}>
                  {experiment.labels?.[option] ?? option}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </>
        )}
      </div>
      <div className="flex min-h-7 items-center justify-between gap-3">
        <p className="text-muted-foreground">{experiment.line}</p>
        {value !== off && (
          <Button variant="outline" size="sm" onClick={() => onChange(off)}>
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}

export function LabSettings() {
  const { shown, values, error, change } = useExperiments();
  if (shown.length === 0) return null;

  return (
    <TitledCard title="Lab" className="max-w-sm">
      <p className="text-muted-foreground">Experiments can change or go away in any update.</p>
      {shown.map((experiment) => (
        <ExperimentRow
          key={experiment.id}
          experiment={experiment}
          value={values[experiment.id]}
          onChange={(value) => void change(experiment.id, value)}
        />
      ))}
      {error && <p className="text-destructive">{error}</p>}
    </TitledCard>
  );
}
