import { invoke } from "@tauri-apps/api/core";
import { expect, it, vi } from "vitest";
import { androidShadersHost } from "./androidHost";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

it.each([
  ["Azahar draws with Vulkan", () => Promise.resolve("Vulkan"), true],
  ["Azahar draws with OpenGL", () => Promise.resolve("OpenGL"), false],
  ["the renderer is unknown", () => Promise.reject(new Error("no answer")), false],
])("offers fewer freezes in 3D games when %s", async (_, renderer, offered) => {
  vi.mocked(invoke).mockImplementation(renderer);

  expect(await androidShadersHost.offered()).toBe(offered);
  expect(invoke).toHaveBeenCalledWith("three_ds_renderer");
});
