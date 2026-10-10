import { Button } from "@/components/ui/button";
import { useGamesFolder } from "./games-folder/gamesFolder";

export function AddGames() {
  const gamesFolder = useGamesFolder();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="font-heading text-xl font-medium">Add your games</h1>
      <p className="max-w-sm text-sm text-muted-foreground">This app doesn't include any games.</p>
      {gamesFolder.error && <p className="max-w-sm text-sm text-destructive">{gamesFolder.error}</p>}
      <Button className="mt-2" onClick={gamesFolder.choose}>
        Choose folder
      </Button>
    </main>
  );
}
