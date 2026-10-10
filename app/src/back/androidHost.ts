import { exit } from "@tauri-apps/api/app";
import { onBackGesture } from "@/backGesture";
import type { BackHost } from "./back";

export const androidBackHost: BackHost = {
  listen: onBackGesture,
  exit: () => void exit(0),
};
