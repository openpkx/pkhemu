import { useEffect, useState } from "react";
import { NumberInput } from "@/components/NumberInput";
import { SettingRow } from "@/components/SettingsRow";
import { Button } from "@/components/ui/button";
import {
  maxClockDays,
  maxClockHours,
  offsetSeconds,
  usePreferences,
  type GameClockOffset,
} from "@/preferences/preferences";

const MINUTE_MS = 60_000;

const dateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export function useMinute() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setNow(Date.now());
        schedule();
      }, MINUTE_MS - (Date.now() % MINUTE_MS));
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);
  return now;
}

export function GameClockSetting() {
  const { preferences, change } = usePreferences();
  const offset = preferences.gameClockOffset;
  const now = useMinute();
  const ahead = offsetSeconds(offset) > 0;
  const set = (update: Partial<GameClockOffset>) => void change({ gameClockOffset: { ...offset, ...update } });

  return (
    <div className="grid gap-2">
      <SettingRow label="Game clock">
        {(labelId) => (
          <div role="group" aria-labelledby={labelId} className="flex gap-2">
            <NumberInput label="Days ahead" unit={offset.days === 1 ? "day" : "days"} value={offset.days} max={maxClockDays} onChange={(days) => set({ days })} />
            <NumberInput label="Hours ahead" unit={offset.hours === 1 ? "hour" : "hours"} value={offset.hours} max={maxClockHours} onChange={(hours) => set({ hours })} />
          </div>
        )}
      </SettingRow>
      <div className="flex min-h-7 items-center justify-between gap-3">
        <p className="text-muted-foreground">
          {ahead ? `Games see ${dateFormat.format(now + offsetSeconds(offset) * 1000)}.` : "Games use real time."}
        </p>
        {ahead && (
          <Button variant="outline" size="sm" onClick={() => set({ days: 0, hours: 0 })}>
            Reset
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Applies when a game starts or resumes.</p>
    </div>
  );
}
