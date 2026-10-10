import { onBackButtonPress } from "@tauri-apps/api/app";

export type OnBackGesture = (handler: () => void) => () => void;

export const onBackGesture: OnBackGesture = (handler) => {
  const listener = onBackButtonPress(handler);
  listener.catch((error) => console.error(error));
  return () => void listener.then((registered) => registered.unregister(), () => {});
};
