export type SaveFile = { bytes: Uint8Array; writtenAt: number };

export type ResearchContext = {
  game: string;
  build: string | null;
  romSha1: string | null;
  romHack: boolean;
  app: string;
};

export type HostEvent = { kind: "open" } | { kind: "back" } | { kind: "save-written"; save: SaveFile } | { kind: "state-loaded" };

export interface ResearchHost {
  context(): Promise<ResearchContext>;
  saveFile(): Promise<SaveFile>;
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
