import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { EngineProvider } from "@pkhex-everywhere/react";
import { afterEach, expect, it, vi } from "vitest";
import { ApplyBar, EditorScreen, useEditorNav, type Page } from "./EditorScreen";
import type { SaveHost } from "./editSession";
import { fakeEngine } from "./fakeEngine";

afterEach(cleanup);

function Item({ name }: { name: string }) {
  const { open } = useEditorNav();
  return <button onClick={() => open({ title: name, content: <p>{name} details</p> })}>{name}</button>;
}

const home: Page = {
  title: "Save",
  sidebar: true,
  content: (
    <>
      <Item name="Bulbasaur" />
      <Item name="Pikachu" />
      <ApplyBar />
    </>
  ),
};

function launch({
  read = async () => new Uint8Array([1, 2, 3]),
  sinceSave = async () => 5,
  afterApply,
  onApplied,
  confirmApply,
}: {
  read?: SaveHost["read"];
  sinceSave?: SaveHost["playTimeSinceSave"];
  afterApply?: "restart" | "play";
  onApplied?: () => void;
  confirmApply?: boolean;
} = {}) {
  const { engine, loaded } = fakeEngine();
  let backGesture: (() => void) | undefined;
  const host: SaveHost = {
    read: vi.fn(read),
    apply: vi.fn(async () => {}),
    playTimeSinceSave: sinceSave,
  };
  const onBackGesture = (handler: () => void) => {
    backGesture = handler;
    return () => (backGesture = undefined);
  };
  const onClose = vi.fn();
  const onSaveFirst = vi.fn();
  render(
    <EngineProvider engine={engine}>
      <EditorScreen
        host={host}
        home={home}
        onBackGesture={onBackGesture}
        onClose={onClose}
        onSaveFirst={onSaveFirst}
        afterApply={afterApply}
        onApplied={onApplied}
        confirmApply={confirmApply}
      />
    </EngineProvider>,
  );
  return { engine, loaded, host, onClose, onSaveFirst, backGesture: () => backGesture?.() };
}

async function opened() {
  return screen.findByRole("button", { name: "Bulbasaur" });
}

const applyButton = () => screen.findByRole("button", { name: "Apply and restart" });

async function applyInPrompt(label = "Apply and restart") {
  fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: label }));
}

async function change(engine: ReturnType<typeof fakeEngine>["engine"]) {
  await engine.trainer.setMoney(9);
  await applyButton();
}

it("loads the game's save into the engine", async () => {
  const { loaded } = launch();

  await opened();

  expect(loaded()).toEqual(new Uint8Array([1, 2, 3]));
  expect(screen.getByRole("heading", { name: "Save" })).toBeTruthy();
});

it("closes without applying when backing out with no changes", async () => {
  const { host, onClose } = launch();
  await opened();

  fireEvent.click(screen.getByRole("button", { name: "Back" }));

  expect(onClose).toHaveBeenCalled();
  expect(host.apply).not.toHaveBeenCalled();
});

it("shows the Apply bar only once something changed", async () => {
  const { engine } = launch();
  await opened();

  expect(screen.queryByRole("region", { name: "Changes not in the game yet" })).toBeNull();
  await change(engine);
  expect(screen.getByRole("region", { name: "Changes not in the game yet" })).toBeTruthy();
  expect(within(screen.getByRole("banner")).queryByRole("button", { name: /Apply/ })).toBeNull();
});

it("leaves the primary button to the page on top when Apply shows beside it", async () => {
  const { engine } = launch();
  fireEvent.click(await opened());
  await change(engine);

  expect((await applyButton()).dataset.variant).toBe("outline");
});

it("applies the engine's export and closes", async () => {
  const { engine, host, onClose } = launch();
  await opened();
  await change(engine);

  fireEvent.click(await applyButton());
  await screen.findByRole("alertdialog", { name: "Apply and restart?" });
  expect(host.apply).not.toHaveBeenCalled();
  await applyInPrompt();

  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(host.apply).toHaveBeenCalledWith(new Uint8Array([9, 2, 3]));
});

it("asks before applying, and keeps editing", async () => {
  const { engine, host, onClose } = launch();
  await opened();
  await change(engine);

  fireEvent.click(await applyButton());
  fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Keep editing" }));

  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(host.apply).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
  expect(await opened()).toBeTruthy();
});

it("closes the apply prompt on back without applying", async () => {
  const { engine, host, onClose, backGesture } = launch();
  await opened();
  await change(engine);

  fireEvent.click(await applyButton());
  await screen.findByRole("alertdialog");
  backGesture();

  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(host.apply).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});

it("asks before leaving with changes, and keeps editing", async () => {
  const { engine, onClose } = launch();
  await opened();
  await change(engine);

  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  fireEvent.click(await screen.findByRole("button", { name: "Keep editing" }));

  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(onClose).not.toHaveBeenCalled();
});

it("discards changes without applying them", async () => {
  const { engine, host, onClose } = launch();
  await opened();
  await change(engine);

  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  fireEvent.click(await screen.findByRole("button", { name: "Discard" }));

  expect(onClose).toHaveBeenCalled();
  expect(host.apply).not.toHaveBeenCalled();
});

it("applies from the leave prompt", async () => {
  const { engine, host, onClose } = launch();
  await opened();
  await change(engine);

  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  await applyInPrompt();

  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(host.apply).toHaveBeenCalledWith(new Uint8Array([9, 2, 3]));
});

it("stays open and says why when applying fails", async () => {
  const { engine, host, onClose } = launch();
  await opened();
  await change(engine);
  vi.mocked(host.apply).mockRejectedValue("the edited save is 3 bytes");

  fireEvent.click(await applyButton());
  await applyInPrompt();

  expect(await screen.findByText(/the edited save is 3 bytes/)).toBeTruthy();
  expect(onClose).not.toHaveBeenCalled();
});

it("closes the save in the engine when it closes", async () => {
  const { loaded } = launch();
  await opened();

  cleanup();

  await waitFor(() => expect(loaded()).toBeUndefined());
});

it("opens a screen on top and goes back to the one below", async () => {
  launch();
  fireEvent.click(await opened());

  expect(screen.getByRole("heading", { name: "Bulbasaur" })).toBeTruthy();
  expect(screen.getByText("Bulbasaur details")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Back" }));

  expect(screen.getByRole("heading", { name: "Save" })).toBeTruthy();
  expect(screen.queryByText("Bulbasaur details")).toBeNull();
});

it("goes back one screen with the back gesture, without asking", async () => {
  const { engine, backGesture, onClose } = launch();
  fireEvent.click(await opened());
  await change(engine);

  backGesture();

  await waitFor(() => expect(screen.getByRole("heading", { name: "Save" })).toBeTruthy());
  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(onClose).not.toHaveBeenCalled();
});

it("asks before leaving with the back gesture on the first screen", async () => {
  const { engine, backGesture } = launch();
  await opened();
  await change(engine);

  backGesture();

  expect(await screen.findByRole("alertdialog")).toBeTruthy();
});

it("replaces the selected item when another is picked from the list beside it", async () => {
  launch();
  fireEvent.click(await opened());

  fireEvent.click(screen.getByRole("button", { name: "Pikachu" }));
  expect(screen.getByText("Pikachu details")).toBeTruthy();
  expect(screen.queryByText("Bulbasaur details")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByRole("heading", { name: "Save" })).toBeTruthy();
});

it("offers only to save in game first when there's no save yet", async () => {
  const { onSaveFirst } = launch({ read: () => Promise.reject("no-save-yet"), sinceSave: async () => 120 });

  fireEvent.click(await screen.findByRole("button", { name: "Save in game first" }));

  expect(onSaveFirst).toHaveBeenCalled();
  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(screen.queryByRole("button", { name: "Bulbasaur" })).toBeNull();
});

it("closes from the no save yet screen", async () => {
  const { onClose } = launch({ read: () => Promise.reject("no-save-yet") });
  await screen.findByRole("button", { name: "Save in game first" });

  fireEvent.click(screen.getByRole("button", { name: "Back" }));

  expect(onClose).toHaveBeenCalled();
});

it("goes straight into the editor right after an in-game save", async () => {
  launch({ sinceSave: async () => 60 });

  await opened();

  expect(screen.queryByRole("alertdialog")).toBeNull();
});

it("offers to save in game first when the last save is over a minute of play old", async () => {
  const { onSaveFirst } = launch({ sinceSave: async () => 61 });

  const prompt = await screen.findByRole("alertdialog");
  fireEvent.click(within(prompt).getByRole("button", { name: "Save in game first" }));

  expect(onSaveFirst).toHaveBeenCalled();
});

it("waits to know when the game last saved before showing the editor", async () => {
  const { loaded } = launch({ sinceSave: () => new Promise(() => {}) });

  await waitFor(() => expect(loaded()).toBeDefined());

  expect(screen.getByText("Opening save…")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Bulbasaur" })).toBeNull();
});

it("edits anyway", async () => {
  const { onSaveFirst } = launch({ sinceSave: async () => 120 });

  fireEvent.click(await screen.findByRole("button", { name: "Edit anyway" }));

  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  await opened();
  expect(onSaveFirst).not.toHaveBeenCalled();
});

it("closes when backing out of the save first prompt", async () => {
  const { onClose, backGesture } = launch({ sinceSave: async () => 120 });
  await screen.findByRole("alertdialog");

  backGesture();

  expect(onClose).toHaveBeenCalled();
});

it("says why the save couldn't be opened", async () => {
  launch({ read: () => Promise.reject("the game isn't running") });

  const main = await screen.findByRole("main");
  expect(await within(main).findByText(/the game isn't running/)).toBeTruthy();
});

it("stays put on back while applying", async () => {
  const { engine, host, onClose, backGesture } = launch();
  await opened();
  await change(engine);
  let finish = () => {};
  vi.mocked(host.apply).mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));

  fireEvent.click(await applyButton());
  await applyInPrompt();
  await waitFor(() => expect(host.apply).toHaveBeenCalled());
  backGesture();

  expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(onClose).not.toHaveBeenCalled();
  finish();
  await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
});

it("applies and plays when the game isn't running", async () => {
  const onApplied = vi.fn();
  const { engine, host, onClose } = launch({ sinceSave: async () => null, afterApply: "play", onApplied, confirmApply: false });
  await opened();
  await engine.trainer.setMoney(9);

  fireEvent.click(await screen.findByRole("button", { name: "Apply and play" }));

  await waitFor(() => expect(onApplied).toHaveBeenCalled());
  expect(host.apply).toHaveBeenCalledWith(new Uint8Array([9, 2, 3]));
  expect(onClose).not.toHaveBeenCalled();
});

it("offers to apply and play when leaving with changes while the game isn't running", async () => {
  const onApplied = vi.fn();
  const { engine } = launch({ sinceSave: async () => null, afterApply: "play", onApplied });
  await opened();
  await engine.trainer.setMoney(9);
  await screen.findByRole("button", { name: "Apply and play" });

  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Apply and play" }));

  await waitFor(() => expect(onApplied).toHaveBeenCalled());
});
