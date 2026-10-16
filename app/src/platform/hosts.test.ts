import { afterEach, describe, expect, it, vi } from "vitest";
import { systems } from "@/systems";
import { androidHosts } from "./androidHosts";
import { desktopHosts } from "./desktopHosts";
import { iosHosts } from "./iosHosts";

const hostSets = { android: androidHosts, ios: iosHosts, desktop: desktopHosts };

describe.each(Object.entries(hostSets))("%s hosts", (_, hosts) => {
  it("has the same entries as every other platform", () => {
    for (const other of Object.values(hostSets)) expect(Object.keys(hosts).sort()).toEqual(Object.keys(other).sort());
  });

  it("sets every entry", () => {
    for (const [name, host] of Object.entries(hosts)) expect(host, name).toBeDefined();
  });
});

it.each([
  ["Android", androidHosts],
  ["iOS", iosHosts],
  ["macOS", desktopHosts],
])("offers every system on %s", (_, hosts) => {
  expect(hosts.systems).toEqual(systems);
});

it("turns touch controls on only on phones", () => {
  expect(androidHosts.defaultPreferences.touchControls).toBe(true);
  expect(iosHosts.defaultPreferences.touchControls).toBe(true);
  expect(desktopHosts.defaultPreferences.touchControls).toBe(false);
});

it("mutes the game in silent mode until the player turns sound on", () => {
  for (const hosts of Object.values(hostSets)) expect(hosts.defaultPreferences.playInSilentMode).toBe(false);
});

it("offers the silent mode setting only on iOS", () => {
  expect(iosHosts.audioSession.silentSwitch).toBe(true);
  expect(androidHosts.audioSession.silentSwitch).toBe(false);
  expect(desktopHosts.audioSession.silentSwitch).toBe(false);
});

it("offers the native renderer only on phones", () => {
  expect(androidHosts.gameSurface.renderers).toEqual(["native", "compatible"]);
  expect(iosHosts.gameSurface.renderers).toEqual(["native", "compatible"]);
  expect(desktopHosts.gameSurface.renderers).toEqual(["compatible"]);
});

it("picks the renderer automatically until the player chooses", () => {
  for (const hosts of Object.values(hostSets)) expect(hosts.defaultPreferences.renderer).toBe("automatic");
});

it("turns fewer 3DS freezes on everywhere it's offered", () => {
  expect(androidHosts.defaultPreferences.asyncShaders).toBe(true);
  expect(desktopHosts.defaultPreferences.asyncShaders).toBe(true);
  expect(iosHosts.defaultPreferences.asyncShaders).toBe(true);
});

it.each([
  ["iOS", iosHosts, ["On My iPhone", "Delta", "Provenance", "RetroArch", "Manic EMU"]],
  ["Android", androidHosts, ["RetroArch", "Pizza Boy", "My Boy!"]],
  ["macOS", desktopHosts, ["RetroArch"]],
])("names the emulators people come from on %s", (_, hosts, apps) => {
  for (const app of apps) expect(hosts.import.emulatorHint).toContain(app);
});

afterEach(() => delete window.iosDevice);

it("points to On My iPad on an iPad", async () => {
  window.iosDevice = "iPad";
  vi.resetModules();

  const { iosHosts } = await import("./iosHosts");

  expect(iosHosts.import.emulatorHint).toContain("On My iPad");
});
