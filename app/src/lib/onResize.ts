export function onResize(changed: () => void) {
  addEventListener("resize", changed);
  return () => removeEventListener("resize", changed);
}
