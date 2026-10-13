import dependencies from "./dependencies.json";

export type Notice = { name: string; version?: string; licence: string; source: string };

export const appNotice = {
  name: "pkhemu",
  licence: "GPL-3.0-or-later",
  source: "https://github.com/openpkx/pkhemu",
  licenceText: "https://www.gnu.org/licenses/gpl-3.0.html",
};

export const demoNotice: Notice = {
  name: "Tobu Tobu Girl Deluxe",
  version: "Tangram Games",
  licence: "MIT, CC BY 4.0",
  source: "https://github.com/SimonLarsen/tobutobugirl-dx",
};

export const notices: Record<keyof typeof dependencies, Notice[]> = dependencies;
