import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { LicencesScreen } from "./LicencesScreen";

afterEach(cleanup);

it("shows the app's GPL-3.0 licence with a link to its source", () => {
  render(<LicencesScreen onBack={() => {}} />);
  const app = screen.getByRole("region", { name: "pkhemu" });

  expect(within(app).getByText(/GPL-3\.0/)).toBeTruthy();
  expect(within(app).getByRole("link", { name: /source/i }).getAttribute("href")).toMatch(/^https:\/\//);
});

it("links mGBA's source next to its MPL-2.0 licence", () => {
  render(<LicencesScreen onBack={() => {}} />);
  const core = screen.getByRole("region", { name: "Emulator cores" });
  const mgba = within(core).getByRole("link", { name: /mGBA/ });

  expect(mgba.getAttribute("href")).toBe("https://github.com/pkhex-web/mgba/tree/pkh-emu");
  expect(within(mgba.closest("li")!).getByText("MPL-2.0")).toBeTruthy();
});

it("links PKHeX's source in the save editor's components", () => {
  render(<LicencesScreen onBack={() => {}} />);
  const saveEditor = screen.getByRole("region", { name: "Save editor" });
  const pkhex = within(saveEditor).getByRole("link", { name: /^PKHeX / });

  expect(pkhex.getAttribute("href")).toMatch(/^https:\/\/github\.com\//);
  expect(within(pkhex.closest("li")!).getByText("GPL-3.0-or-later")).toBeTruthy();
  expect(within(saveEditor).getByRole("link", { name: /^Microsoft\.NETCore\.App\.Runtime/ })).toBeTruthy();
});

it("lists the Rust and npm dependencies", () => {
  render(<LicencesScreen onBack={() => {}} />);

  expect(within(screen.getByRole("region", { name: "Rust crates" })).getByRole("link", { name: /^tauri / })).toBeTruthy();
  expect(within(screen.getByRole("region", { name: "npm packages" })).getByRole("link", { name: /^react / })).toBeTruthy();
});

it("keeps Pokémon off the screen", () => {
  render(<LicencesScreen onBack={() => {}} />);

  expect(document.body.textContent).not.toMatch(/pok[eé]mon/i);
});
