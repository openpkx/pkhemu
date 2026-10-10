import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useEngineStatus } from "@pkhex-everywhere/react";
import type { EngineStatus } from "@pkhex-everywhere/engine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CoreInfo = { name: string; version: string };

const engineLabels: Record<EngineStatus["state"], string> = {
  idle: "Waiting",
  booting: "Starting",
  ready: "Ready",
  failed: "Failed",
};

export function Status() {
  const engine = useEngineStatus();
  const [core, setCore] = useState<string>();

  useEffect(() => {
    invoke<CoreInfo>("core_info").then(
      ({ name, version }) => setCore(`${name} ${version}`),
      (error) => setCore(String(error)),
    );
  }, []);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>pkhemu</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Save editor</dt>
          <dd data-testid="engine" data-state={engine.state}>
            {engineLabels[engine.state]}
          </dd>
          <dt className="text-muted-foreground">Emulator core</dt>
          <dd>{core ?? "…"}</dd>
        </dl>
      </CardContent>
    </Card>
  );
}
