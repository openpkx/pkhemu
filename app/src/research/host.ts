export type SaveFile = { bytes: Uint8Array; writtenAt: number };

export type ResearchContext = {
  game: string;
  build: string | null;
  format: { id: string | null; name: string };
  romSha1: string | null;
  app: string;
};

export type ItemReading = { index: number; name?: string; count: number };

export type EngineReading = {
  pouches: { pocket: string; items: ItemReading[] }[];
  held: { slot: string; species: string; item: ItemReading }[];
};

export type HostEvent = { kind: "open" } | { kind: "back" } | { kind: "save-written"; save: SaveFile } | { kind: "state-loaded" };

export interface ResearchHost {
  context(): Promise<ResearchContext>;
  saveFile(): Promise<SaveFile>;
  read(save: Uint8Array): Promise<EngineReading>;
  load<T>(key: string): Promise<T | undefined>;
  store(key: string, value: unknown): Promise<void>;
  exportFile(file: { name: string; text: string }): Promise<string | undefined>;
  importFile(): Promise<{ name: string; text: string } | undefined>;
  setStatus(status: string): Promise<void>;
  notify(message: string): Promise<void>;
  close(): Promise<void>;
  resume(): Promise<void>;
  listen(listener: (event: HostEvent) => void): () => void;
}
