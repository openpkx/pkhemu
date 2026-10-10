declare global {
  interface Window {
    androidHaptics?: { tap(): void };
  }
}

export function tap() {
  window.androidHaptics?.tap();
}
