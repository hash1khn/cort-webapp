"use client";

import { useCallback, useRef, useState } from "react";

export function useAsyncAction<T extends unknown[]>(
  action: (...args: T) => Promise<void>,
) {
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);

  const run = useCallback(
    async (...args: T) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setLoading(true);
      try {
        await action(...args);
      } finally {
        inFlight.current = false;
        setLoading(false);
      }
    },
    [action],
  );

  return { run, loading };
}
