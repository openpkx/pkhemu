export const devices = [
  { name: "play", platform: "android", viewport: { width: 390, height: 844 }, scale: 3, output: { width: 1080, height: 1920 }, frame: { top: 500, width: 780, radius: 60 } },
  { name: "iphone-6.9", platform: "ios", viewport: { width: 440, height: 956 }, scale: 3, output: { width: 1320, height: 2868 }, frame: { top: 520, width: 900, radius: 60 } },
  { name: "iphone-6.3", platform: "ios", viewport: { width: 402, height: 874 }, scale: 3, output: { width: 1206, height: 2622 }, frame: { top: 520, width: 900, radius: 60 } },
  { name: "ipad-13", platform: "ios", iosDevice: "iPad", viewport: { width: 1032, height: 1376 }, scale: 2, output: { width: 2064, height: 2752 }, frame: { top: 400, width: 740, radius: 28 } },
];

export const picked = (items, only) => (only.some((name) => items.some((item) => item.name === name)) ? items.filter((item) => only.includes(item.name)) : items);
