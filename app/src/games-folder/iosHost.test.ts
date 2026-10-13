import { beforeEach, expect, it, vi } from "vitest";
import { iosGamesFolderHost } from "./iosHost";

const container = vi.hoisted(() => ({ documents: "" }));
const stored = vi.hoisted(() => new Map<string, unknown>());

vi.mock("@tauri-apps/api/path", () => ({
  documentDir: async () => container.documents,
  join: async (...parts: string[]) => parts.join("/"),
}));
vi.mock("@/settings", () => ({
  settings: {
    get: async (key: string) => stored.get(key),
    set: async (key: string, value: unknown) => void stored.set(key, value),
    save: async () => {},
  },
}));

beforeEach(() => stored.clear());

it("finds the folder again after iOS moves the app's container", async () => {
  container.documents = "/var/mobile/Containers/Data/Application/OLD/Documents";
  await iosGamesFolderHost.save("/var/mobile/Containers/Data/Application/OLD/Documents/pkhemu");

  container.documents = "/var/mobile/Containers/Data/Application/NEW/Documents";

  expect(await iosGamesFolderHost.loadSaved()).toBe("/var/mobile/Containers/Data/Application/NEW/Documents/pkhemu");
});

it("has no folder before one is saved", async () => {
  expect(await iosGamesFolderHost.loadSaved()).toBeNull();
});

it("refuses a folder outside Documents", async () => {
  container.documents = "/var/mobile/Containers/Data/Application/A/Documents";

  await expect(iosGamesFolderHost.save("/var/mobile/Containers/Data/Application/A/Documents-old/pkhemu")).rejects.toThrow();
  expect(stored.has("gamesFolder")).toBe(false);
});
