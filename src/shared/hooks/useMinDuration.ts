"use client";

import { useEffect, useState } from "react";

export function useMinDuration(isActive: boolean, minMs = 1200) {
  const [shouldShow, setShouldShow] = useState(isActive);

  useEffect(() => {
    if (isActive) {
      setShouldShow(true);
      return;
    }

    const timeout = setTimeout(() => setShouldShow(false), minMs);
    return () => clearTimeout(timeout);
  }, [isActive, minMs]);

  return shouldShow;
}