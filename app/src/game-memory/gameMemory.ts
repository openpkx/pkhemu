import type { System } from "@/systems";
import { identifyBuild, type Build, type ReadMemory } from "./builds";
import { readGen3 } from "./gen3";
import { readGen4 } from "./gen4";
import { readGen5 } from "./gen5";

export type Battle = {
  kind: "wild" | "trainer";
  opponents: Uint8Array[];
  left: number;
};

export type Facts = {
  build: string;
  format: Build["format"];
  version: number;
  party: Uint8Array[];
  battle: Battle | null;
};

export type GameMemory = {
  build: string;
  read: () => Promise<Facts>;
};

export async function openGameMemory(system: System, read: ReadMemory): Promise<GameMemory | "unsupported"> {
  const build = await identifyBuild(system, read);
  if (build === "unsupported") return build;
  return { build: build.name, read: () => readFacts(build, read) };
}

async function readFacts(build: Build, read: ReadMemory): Promise<Facts> {
  const facts =
    build.format === "pk3"
      ? await readGen3(build.symbols, read)
      : build.format === "pk4"
        ? await readGen4(build.addresses, read)
        : await readGen5(build.addresses, read);
  return { build: build.name, format: build.format, version: build.version, ...facts };
}
