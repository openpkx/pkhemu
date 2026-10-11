const size = 120;
const fallMs = 380;
const settleMs = 440;
const startMs = 250;
const pace = 1.3;
const wordmarkWidth = 367.8;
const letterEdges = [47.5, 109.2, 168.9, 228.6, 308.1, 367.8];

const ended = new WeakMap<Element, Promise<unknown>>();
const hiding = new WeakSet<Element>();

function wobble(): Keyframe[] {
  return Array.from({ length: 29 }, (_, frame) => {
    const p = frame / 28;
    const tilt = 26 * (1 - p) ** 1.7;
    const angle = 2 * Math.PI * 2.2 * (0.6 * p + 0.4 * p ** 2);
    return { transform: `rotate3d(${Math.cos(angle)}, ${Math.sin(angle)}, 0, ${tilt}deg)` };
  });
}

function timeline(piece: (name: string) => Element): Animation[] {
  const slideIn = (name: string, from: string, delay: number) =>
    piece(name).animate([{ transform: from, opacity: 0 }, { opacity: 1, offset: 0.25 }, { transform: "translate(0px, 0px)", opacity: 1 }], {
      delay: startMs + delay * pace,
      duration: 640 * pace,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      fill: "both",
    });
  const drop = (name: string, delay: number, spin: number) => [
    piece(name).animate(
      [
        { transform: `translateZ(${3.1 * size}px) rotateX(${spin * 380}deg) rotateY(${spin * 25}deg)`, opacity: 0 },
        { opacity: 1, offset: 0.2 },
        { transform: "translateZ(0px) rotateX(0deg) rotateY(0deg)", opacity: 1 },
      ],
      { delay: startMs + delay * pace, duration: fallMs * pace, easing: "cubic-bezier(0.55, 0, 0.85, 0.35)", fill: "both" },
    ),
    piece(name).animate(wobble(), { delay: startMs + (delay + fallMs) * pace, duration: settleMs * pace, composite: "add" }),
    piece(`${name}-shadow`).animate(
      [
        { transform: `translate(${0.05 * size}px, ${0.08 * size}px) scale(2.6)`, filter: "blur(10px)", opacity: 0 },
        {
          transform: `translate(${0.02 * size}px, ${0.03 * size}px) scale(1.05)`,
          filter: "blur(3px)",
          opacity: 0.9,
          offset: fallMs / (fallMs + settleMs),
        },
        { transform: "translate(0px, 0px) scale(1)", filter: "blur(0px)", opacity: 0 },
      ],
      { delay: startMs + delay * pace, duration: (fallMs + settleMs) * pace, easing: "ease-in", fill: "both" },
    ),
  ];
  const hidden = [100, ...letterEdges.map((edge) => 100 * (1 - edge / wordmarkWidth))];
  return [
    slideIn("vertical", `translateY(${-1.35 * size}px)`, 120),
    slideIn("horizontal", `translateX(${-1.35 * size}px)`, 200),
    ...drop("upper", 500, 1),
    ...drop("lower", 620, -1),
    piece("wordmark").animate(
      hidden.map((right) => ({ clipPath: `inset(0 ${right}% 0 0)`, easing: "step-end" })),
      { delay: startMs + 940 * pace, duration: 360 * pace, fill: "both" },
    ),
  ];
}

function fadeIn(piece: (name: string) => Element): Animation[] {
  return [
    ...["vertical", "horizontal", "upper", "lower"].map((name) =>
      piece(name).animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: "both" }),
    ),
    piece("wordmark").animate(
      [
        { clipPath: "none", opacity: 0 },
        { clipPath: "none", opacity: 1 },
      ],
      { duration: 300, fill: "both" },
    ),
  ];
}

export function playSplash() {
  const splash = document.getElementById("splash");
  if (!splash) return;
  const piece = (name: string) => splash.querySelector(`.${name}`)!;
  const animations = matchMedia("(prefers-reduced-motion: reduce)").matches ? fadeIn(piece) : timeline(piece);
  splash.addEventListener("pointerdown", () => animations.forEach((animation) => animation.finish()), { once: true });
  ended.set(splash, Promise.allSettled(animations.map((animation) => animation.finished)));
}

export function hideSplash() {
  const splash = document.getElementById("splash");
  if (!splash || hiding.has(splash)) return;
  hiding.add(splash);
  void (ended.get(splash) ?? Promise.resolve()).then(async () => {
    await splash.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: "forwards" }).finished;
    splash.remove();
    window.androidSystemBars?.splashHidden();
  });
}
