export type Experiment = {
  id: string;
  label: string;
  line: string;
  values: readonly [string, string, ...string[]];
  labels?: Record<string, string>;
  players: boolean;
};

export const experiments: Experiment[] = [
  {
    id: "steadyFastForward",
    label: "Steady fast-forward",
    line: "Fast-forward runs at most one refresh of frames at a time. A slow device runs below the speed instead of stalling and jumping.",
    values: ["off", "on"],
    players: true,
  },
  {
    id: "motionBlur",
    label: "Motion blur",
    line: "While fast-forwarding, the frame shown mixes the last two frames that ran, so animations don't freeze.",
    values: ["off", "on"],
    players: true,
  },
  {
    id: "research",
    label: "Research",
    line: "On Gen 3 games, the pause menu offers Research, to compare two saves and name the bytes that changed.",
    values: ["off", "on"],
    players: true,
  },
  {
    id: "demoGame",
    label: "Demo game",
    line: "The empty library offers a free demo game to play.",
    values: ["on", "off"],
    players: false,
  },
];
