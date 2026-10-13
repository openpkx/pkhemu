import { describe, expect, it } from "vitest";
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
  ["macOS", desktopHosts],
])("offers every system on %s", (_, hosts) => {
  expect(hosts.systems).toEqual(systems);
});

it("offers every system but N64 on iOS", () => {
  expect(iosHosts.systems).toEqual(["gb", "gbc", "gba", "nds"]);
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
