import { SettingRow, SwitchRow } from "@/components/SettingsRow";
import { TitledCard } from "@/plugin-kit/TitledCard";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Experiment } from "./experiments";
import { useExperiments } from "./lab";

function ExperimentRow({ experiment, value, onChange }: { experiment: Experiment; value: string; onChange(value: string): void }) {
  const [off, on] = experiment.values;

  return (
    <div className="grid gap-2">
      {experiment.values.length === 2 ? (
        <SwitchRow label={experiment.label} checked={value === on} onCheckedChange={(checked) => onChange(checked ? on : off)} />
      ) : (
        <SettingRow label={experiment.label}>
          {(labelId) => (
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
          )}
        </SettingRow>
      )}
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
