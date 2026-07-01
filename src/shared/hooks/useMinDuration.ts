"use client";

import { useEffect, useState } from "react";

export function useMinDuration(isActive: boolean, minMs = 1200) {
  const [shouldShow, setShouldShow] = useState(isActive);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    if (isActive) {
      // Evita setState sincrono dentro del effect para cumplir la regla de React.
      timeout = setTimeout(() => setShouldShow(true), 0);

      return () => {
        if (timeout) {
          clearTimeout(timeout);
        }
      };
    }

    timeout = setTimeout(() => setShouldShow(false), minMs);

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [isActive, minMs]);

  return shouldShow;
}