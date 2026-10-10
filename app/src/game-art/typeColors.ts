const typeColors = [
  "#9fa19f",
  "#ff8000",
  "#81b9ef",
  "#9141cb",
  "#915121",
  "#afa981",
  "#91a119",
  "#704170",
  "#60a1b8",
  "#e62829",
  "#2980ef",
  "#3fa129",
  "#fac000",
  "#ef4179",
  "#3dcef3",
  "#5060e1",
  "#624d4e",
  "#ef70ef",
];

export const neutralColor = "#5a5673";

export const typeColor = (id: number | undefined) => (id === undefined ? undefined : typeColors[id]) ?? neutralColor;
