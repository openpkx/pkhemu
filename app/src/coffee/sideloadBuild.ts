// Read at build time rather than from Plus, so the store builds' bundles leave out the coffee code and its link.
export const sideloadBuild = import.meta.env.PKH_EMU_STORE === "sideload";
