import { useEffect, useState } from "react";

const wideQuery = "(orientation: landscape), (min-width: 48rem)";

export function useWideScreen() {
  const [wide, setWide] = useState(() => matchMedia(wideQuery).matches);

  useEffect(() => {
    const query = matchMedia(wideQuery);
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return wide;
}
