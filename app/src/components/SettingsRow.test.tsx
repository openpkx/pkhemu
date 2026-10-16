import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { SettingRow, SwitchRow } from "./SettingsRow";

afterEach(cleanup);

function Toggle() {
  const [checked, setChecked] = useState(false);
  return <SwitchRow label="Show FPS" checked={checked} onCheckedChange={setChecked} />;
}

it("toggles a switch when its label is clicked", () => {
  render(<Toggle />);

  fireEvent.click(screen.getByText("Show FPS"));

  expect(screen.getByRole("switch", { name: "Show FPS" }).getAttribute("aria-checked")).toBe("true");
});

it("names a setting's control by its label", () => {
  render(<SettingRow label="Theme">{(labelId) => <div role="group" aria-labelledby={labelId} />}</SettingRow>);

  expect(screen.getByRole("group", { name: "Theme" })).toBeTruthy();
});

it("keeps a switch on its label's line and lets a wider control wrap below its label", () => {
  render(
    <>
      <SwitchRow label="Show FPS" checked={false} onCheckedChange={() => {}} />
      <SettingRow label="Theme">{(labelId) => <div role="group" aria-labelledby={labelId} />}</SettingRow>
    </>,
  );

  expect(screen.getByRole("switch").parentElement!.className).not.toContain("flex-wrap");
  expect(screen.getByRole("group").parentElement!.className).toContain("flex-wrap");
});
