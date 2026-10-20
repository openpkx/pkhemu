import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { LicencesScreen } from "./LicencesScreen";

afterEach(cleanup);

it("shows the app's GPL-3.0 licence with a link to its source", () => {
  render(<LicencesScreen onBack={() => {}} />);
  const app = screen.getByRole("region", { name: "pkhemu" });

  expect(within(app).getByText(/GPL-3\.0/)).toBeTruthy();
  expect(within(app).getByRole("link", { name: /source/i }).getAttribute("href")).toBe("https://github.com/openpkx/pkhemu");
});

it("links mGBA's source next to its MPL-2.0 licence", () => {
  render(<LicencesScreen onBack={() => {}} />);
  const core = screen.getByRole("region", { name: "Emulator cores" });
  const mgba = within(core).getByRole("link", { name: /^mGBA \d/ });

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

it("links the demo game's source next to its licences", () => {
  render(<LicencesScreen onBack={() => {}} />);
  const demo = within(screen.getByRole("region", { name: "Demo game" })).getByRole("link", { name: /Tobu Tobu Girl Deluxe/ });

  expect(demo.getAttribute("href")).toBe("https://github.com/SimonLarsen/tobutobugirl-dx");
  expect(within(demo.closest("li")!).getByText("MIT, CC BY 4.0")).toBeTruthy();
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
