import { useEffect, useRef, useState } from "react";

export function useSeen<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (seen || !element) return;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setSeen(true));
    observer.observe(element);
    return () => observer.disconnect();
  }, [seen]);

  return { ref, seen };
}
