import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { navigate } from "./motion";

afterEach(cleanup);

function Pages() {
  const [page, setPage] = useState("Library");
  return (
    <button type="button" onClick={() => navigate("forward", () => setPage("Settings"))}>
      {page}
    </button>
  );
}

it("applies the update without the View Transitions API", async () => {
  expect("startViewTransition" in document).toBe(false);
  render(<Pages />);

  fireEvent.click(screen.getByRole("button", { name: "Library" }));

  expect(await screen.findByRole("button", { name: "Settings" })).toBeTruthy();
});
