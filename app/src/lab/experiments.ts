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
    id: "tiltScreen",
    label: "Handheld display depth",
    line: "In portrait, the game screen sits below the shell like a handheld's. Tilt the phone and the edge of the opening passes over it.",
    values: ["off", "on"],
    players: false,
  },
  {
    id: "displayGlass",
    label: "Handheld display glass",
    line: "In portrait, glass covers the game screen, with a lit top edge and a sheen that moves as you tilt the phone.",
    values: ["off", "on"],
    players: false,
  },
];
