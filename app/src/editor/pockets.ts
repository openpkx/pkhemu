const pocketLabels: Record<string, string> = { TMHMs: "TMs & HMs", MailItems: "Mail", PCItems: "PC" };

export const pocketLabel = (name: string) =>
  pocketLabels[name] ?? name.replace(/([a-z])([A-Z])/g, (_, end: string, start: string) => `${end} ${start.toLowerCase()}`);
