import { platform } from "@tauri-apps/plugin-os";
import { androidHosts } from "./androidHosts";
import { desktopHosts } from "./desktopHosts";
import type { Hosts } from "./hosts";
import { iosHosts } from "./iosHosts";

const mobileHosts: Partial<Record<string, Hosts>> = { android: androidHosts, ios: iosHosts };

export const hosts = mobileHosts[platform()] ?? desktopHosts;
