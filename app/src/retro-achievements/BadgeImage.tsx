import { useEffect, useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { useRetroAchievements } from "./retroAchievements";

function useBadge(name: string | undefined) {
  const { badge } = useRetroAchievements();
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!name) return;
    let current = true;
    let made: string | undefined;
    void badge(name).then((bytes) => {
      if (!current || !bytes) return;
      made = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "image/png" }));
      setUrl(made);
    });
    return () => {
      current = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [badge, name]);
  return url;
}

/** An achievement's or game's badge, or the pkhemu glyph until it's downloaded. */
export function BadgeImage({ name }: { name: string | undefined }) {
  const badge = useBadge(name);
  return badge ? <img src={badge} alt="" className="size-full" /> : <AppIcon className="size-full" />;
}
