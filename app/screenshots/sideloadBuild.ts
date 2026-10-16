const screen = new URLSearchParams(location.search).get("screen") ?? "";
export const sideloadBuild = screen === "settings-sideload" || screen.startsWith("settings-jit");
