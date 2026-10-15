import { useMediaQuery } from "./useMediaQuery";

export function useWideScreen() {
  return useMediaQuery("(orientation: landscape), (min-width: 48rem)");
}
