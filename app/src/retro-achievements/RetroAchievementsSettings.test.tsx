import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useEffect, useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { BackProvider } from "@/back/back";
import { fakePlus } from "@/plus/fakePlus";
import { PlusProvider } from "@/plus/plus";
import { RetroAchievementsProvider, useRetroAchievements, type Achievement, type RetroAchievementsHost, type Summary } from "./retroAchievements";
import { RetroAchievementsScreen, RetroAchievementsSettings } from "./RetroAchievementsSettings";

afterEach(cleanup);

const unlocked = (id: number, title: string, at: number): Achievement => ({
  id,
  title,
  description: `Description of ${title}`,
  points: 10,
  badge: `${id}`,
  earned: { at, hardcore: false },
  progress: null,
  rarity: 25,
});

const recent = [
  { game: "Pokémon Red", achievement: unlocked(1, "Boulder Badge", 1_700_000_300) },
  { game: "Pokémon Gold", achievement: unlocked(2, "Zephyr Badge", 1_700_000_200) },
];

const playerSummary: Summary = {
  user: "Player",
  profile: { avatar: "avatar-Player-1", hardcore: 1240, softcore: 85 },
  recent,
  offline: false,
};

function fakeHost({
  account = null as string | null,
  refuses = undefined as string | undefined,
  summary = playerSummary as Summary | null,
  hardcore = false,
} = {}) {
  let signedIn = account;
  return {
    turn: vi.fn(async () => {}),
    account: vi.fn(async () => signedIn),
    signIn: vi.fn(async (user: string) => {
      if (refuses) throw refuses;
      return (signedIn = user);
    }),
    signOut: vi.fn(async () => {
      signedIn = null;
    }),
    createAccount: vi.fn(async () => {}),
    openProfile: vi.fn(async () => {}),
    onEvent: () => () => {},
    badge: async () => undefined,
    playing: async () => null,
    game: async () => null,
    summary: vi.fn(async () => (signedIn ? summary : null)),
    hardcore: async () => hardcore,
    setHardcore: vi.fn(async () => {}),
    leaveHardcore: vi.fn(async () => {}),
    edited: async () => false,
    settleEdited: async () => false,
  } satisfies RetroAchievementsHost;
}

function Settings() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <RetroAchievementsSettings onOpen={() => setOpen(true)} />
      {open && <RetroAchievementsScreen onBack={() => setOpen(false)} />}
    </>
  );
}

function PlayingInHardcore() {
  const { setPlayingHardcore } = useRetroAchievements();
  useEffect(() => setPlayingHardcore(true), [setPlayingHardcore]);
  return null;
}

function openSettings({ host = fakeHost(), playing = false } = {}) {
  render(
    <PlusProvider host={fakePlus({ status: { state: "unlocked" } }).host}>
      <RetroAchievementsProvider host={host}>
        <BackProvider>
          {playing && <PlayingInHardcore />}
          <Settings />
        </BackProvider>
      </RetroAchievementsProvider>
    </PlusProvider>,
  );
  return host;
}

async function openPage() {
  const card = await screen.findByRole("region", { name: "RetroAchievements" });
  fireEvent.click(within(card).getByRole("button"));
}

it("turns RetroAchievements on in every build and offers to sign in", async () => {
  const host = openSettings();

  const card = await screen.findByRole("region", { name: "RetroAchievements" });

  expect(host.turn).toHaveBeenCalledWith(true);
  expect(within(card).getByRole("button", { name: /sign in/i })).toBeTruthy();
});

it("signs in from the page and then shows the account", async () => {
  const host = openSettings();
  await openPage();

  const signIn = screen.getByRole("button", { name: "Sign in" }) as HTMLButtonElement;
  expect(signIn.disabled).toBe(true);
  fireEvent.change(screen.getByLabelText("Username"), { target: { value: "Player" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
  fireEvent.click(signIn);

  await screen.findByRole("button", { name: "Sign out" });
  expect(host.signIn).toHaveBeenCalledWith("Player", "secret");
  expect(within(screen.getByRole("main")).getByText("Player")).toBeTruthy();
  expect(screen.queryByLabelText("Password")).toBeNull();
});

it("shows why sign-in failed and stays on the form", async () => {
  openSettings({ host: fakeHost({ refuses: "Invalid User/Password combination. Please try again" }) });
  await openPage();

  fireEvent.change(screen.getByLabelText("Username"), { target: { value: "Player" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong" } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

  expect(await screen.findByText("Invalid User/Password combination. Please try again")).toBeTruthy();
  expect(screen.getByLabelText("Password")).toBeTruthy();
});

it("opens retroachievements.org to create an account", async () => {
  const host = openSettings();
  await openPage();

  fireEvent.click(screen.getByRole("button", { name: "Create an account" }));

  expect(host.createAccount).toHaveBeenCalled();
});

it("names the signed-in player on the card and signs out from the page", async () => {
  const host = openSettings({ host: fakeHost({ account: "Player" }) });
  const card = await screen.findByRole("region", { name: "RetroAchievements" });
  await waitFor(() => expect(within(card).getByRole("button", { name: /^Player/ })).toBeTruthy());
  await openPage();

  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

  await screen.findByLabelText("Username");
  expect(host.signOut).toHaveBeenCalled();
  expect(within(card).getByRole("button", { name: "Sign in to earn achievements" })).toBeTruthy();
});

it("shows the avatar, username and points on the card", async () => {
  openSettings({ host: fakeHost({ account: "Player" }) });
  const card = await screen.findByRole("region", { name: "RetroAchievements" });

  const row = await within(card).findByRole("button", { name: /1,240.*85/ });
  expect(within(row).getByText("Player")).toBeTruthy();
});

it("shows the player's points, recent unlocks and sign-out in order on the page", async () => {
  openSettings({ host: fakeHost({ account: "Player" }) });
  await openPage();
  const page = screen.getByRole("main");

  expect(await within(page).findByText("1,240")).toBeTruthy();
  expect(within(page).getByText("85")).toBeTruthy();
  const buttons = within(page).getAllByRole("button").map((button) => button.textContent);
  expect(buttons).toEqual([
    expect.stringContaining("Boulder Badge"),
    expect.stringContaining("Zephyr Badge"),
    "View profile on RetroAchievements",
    "Sign out",
  ]);
  expect(within(page).getByText(/Pokémon Gold/)).toBeTruthy();
  expect(within(page).queryByText(/offline/i)).toBeNull();
});

it("opens a recent unlock's details sheet", async () => {
  openSettings({ host: fakeHost({ account: "Player" }) });
  await openPage();

  fireEvent.click(await screen.findByRole("button", { name: /Zephyr Badge/ }));

  const sheet = await screen.findByRole("dialog", { name: /Zephyr Badge/ });
  expect(within(sheet).getByText("Description of Zephyr Badge")).toBeTruthy();
});

it("opens the player's profile on retroachievements.org", async () => {
  const host = openSettings({ host: fakeHost({ account: "Player" }) });
  await openPage();

  fireEvent.click(await screen.findByRole("button", { name: "View profile on RetroAchievements" }));

  expect(host.openProfile).toHaveBeenCalled();
});

it("shows the last summary with a line saying it's offline", async () => {
  openSettings({ host: fakeHost({ account: "Player", summary: { ...playerSummary, offline: true } }) });
  await openPage();
  const page = screen.getByRole("main");

  expect(await within(page).findByText("1,240")).toBeTruthy();
  expect(within(page).getByText(/offline/i)).toBeTruthy();
});

it("shows a dash for points it has never fetched", async () => {
  openSettings({ host: fakeHost({ account: "Player", summary: { ...playerSummary, profile: null, offline: true } }) });
  await openPage();
  const page = screen.getByRole("main");

  expect(await within(page).findAllByText("–")).toHaveLength(2);
});

it("keeps Hardcore off until the player turns it on, which applies from the next launch", async () => {
  const host = openSettings({ host: fakeHost({ account: "Player" }) });
  await openPage();

  const hardcore = await screen.findByRole("switch", { name: "Hardcore" });
  expect(hardcore.getAttribute("aria-checked")).toBe("false");
  fireEvent.click(hardcore);
  await act(async () => {});

  expect(host.setHardcore).toHaveBeenCalledWith(true);
  expect(hardcore.getAttribute("aria-checked")).toBe("true");
  expect(screen.getByText("Applies from the next launch.")).toBeTruthy();
  expect(host.leaveHardcore).not.toHaveBeenCalled();
});

it("drops a game running in hardcore to softcore when Hardcore goes off", async () => {
  const host = openSettings({ host: fakeHost({ account: "Player", hardcore: true }), playing: true });
  await openPage();

  fireEvent.click(await screen.findByRole("switch", { name: "Hardcore" }));
  await act(async () => {});

  expect(host.leaveHardcore).toHaveBeenCalledOnce();
  expect(host.setHardcore).toHaveBeenCalledWith(false);
});
