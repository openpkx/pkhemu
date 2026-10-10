import type { DirEntry } from "./scan";

export function fakeFolder(paths: string[]) {
  return async (path: string): Promise<DirEntry[]> => {
    const prefix = path ? path + "/" : "";
    const children = new Map<string, boolean>();
    for (const file of paths) {
      if (!file.startsWith(prefix)) continue;
      const [name, ...rest] = file.slice(prefix.length).split("/");
      if (name) children.set(name, children.get(name) || rest.length > 0);
    }
    if (!children.size && !paths.some((file) => file.startsWith(prefix))) throw new Error(`${path} not found`);
    return [...children].map(([name, isDirectory]) => ({ name, isDirectory }));
  };
}
