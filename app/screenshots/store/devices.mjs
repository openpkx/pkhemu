export const devices = [
  { name: "play", platform: "android", viewport: { width: 390, height: 844 }, output: { width: 1080, height: 1920 }, phone: { top: 500, width: 780 } },
  { name: "iphone-6.9", platform: "ios", viewport: { width: 440, height: 956 }, output: { width: 1320, height: 2868 }, phone: { top: 520, width: 900 } },
  { name: "iphone-6.3", platform: "ios", viewport: { width: 402, height: 874 }, output: { width: 1206, height: 2622 }, phone: { top: 520, width: 900 } },
];

export const picked = (items, only) => (only.some((name) => items.some((item) => item.name === name)) ? items.filter((item) => only.includes(item.name)) : items);
