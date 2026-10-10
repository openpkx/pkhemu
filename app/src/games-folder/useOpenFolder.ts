import { useState } from "react";

export function useOpenFolder(openFolder?: () => Promise<void>) {
  const [error, setError] = useState<string>();
  const open = async () => {
    try {
      await openFolder?.();
      setError(undefined);
    } catch (reason) {
      setError(String(reason));
    }
  };
  return { open, error };
}
