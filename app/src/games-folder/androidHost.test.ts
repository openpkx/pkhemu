import { expect, it } from "vitest";
import { androidGamesFolderHost } from "./androidHost";

const folder = (uri: string) => JSON.stringify({ uri, documentTopTreeUri: uri });

it("labels a folder on the device by its path", () => {
  const games = folder("content://com.android.externalstorage.documents/tree/primary%3AEmulation%2Froms");

  expect(androidGamesFolderHost.label(games)).toBe("Emulation/roms");
});

it("labels a folder it can't read a path from by its document ID", () => {
  const games = folder("content://com.example.provider/tree/abc123");

  expect(androidGamesFolderHost.label(games)).toBe("abc123");
});
