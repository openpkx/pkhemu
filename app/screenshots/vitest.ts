export const vi = { fn: <T extends (...args: never[]) => unknown>(impl?: T) => impl ?? (() => {}) };
