"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  nextRefreshIso: string | null;
};

function formatDuration(ms: number): string {
  if (ms <= 0) return "Now";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

export function NextRefreshCountdown({ nextRefreshIso }: Props) {
  const targetTs = useMemo(
    () => (nextRefreshIso ? new Date(nextRefreshIso).getTime() : null),
    [nextRefreshIso],
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!targetTs || Number.isNaN(targetTs)) {
    return <span>No refresh scheduled</span>;
  }

  const remaining = targetTs - now;
  return <span>{formatDuration(remaining)}</span>;
}
