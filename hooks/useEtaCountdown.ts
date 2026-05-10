import { useEffect, useRef, useState } from "react";

interface UseEtaCountdownReturn {
  remainingSeconds: number;
  isExpired: boolean;
}

/**
 * Countdown timer hook for ETA display.
 *
 * Accepts an `etaMinutes` value and an optional `startedAt` timestamp (ms).
 * When `etaMinutes` is null, returns `{ remainingSeconds: 0, isExpired: false }`.
 * When `etaMinutes` is set, calculates remaining seconds based on `startedAt`
 * and decrements every second via `setInterval`.
 * When remaining seconds reach 0, `isExpired` becomes true.
 * Cleans up the interval on unmount or when `etaMinutes` changes.
 *
 * Requirements: 4.3, 4.5, 6.7
 */
export function useEtaCountdown(
  etaMinutes: number | null,
  startedAt?: number
): UseEtaCountdownReturn {
  // Capture the timestamp when etaMinutes is first set (if startedAt not provided)
  const startedAtRef = useRef<number | null>(startedAt ?? null);

  // Update startedAtRef when startedAt prop changes
  useEffect(() => {
    if (startedAt !== undefined) {
      startedAtRef.current = startedAt;
    }
  }, [startedAt]);

  const computeRemaining = (): number => {
    if (etaMinutes === null) return 0;

    const origin = startedAtRef.current ?? Date.now();
    const totalMs = etaMinutes * 60 * 1000;
    const elapsedMs = Date.now() - origin;
    const remainingMs = totalMs - elapsedMs;

    return Math.max(0, Math.floor(remainingMs / 1000));
  };

  const [remainingSeconds, setRemainingSeconds] = useState<number>(() =>
    computeRemaining()
  );

  useEffect(() => {
    // When etaMinutes becomes null, reset state
    if (etaMinutes === null) {
      setRemainingSeconds(0);
      return;
    }

    // If startedAt was not provided externally, record now as the start time
    // (only when etaMinutes transitions from null to a value)
    if (startedAt === undefined && startedAtRef.current === null) {
      startedAtRef.current = Date.now();
    }

    // Compute initial remaining seconds immediately
    const initial = computeRemaining();
    setRemainingSeconds(initial);

    // If already expired, no need to start an interval
    if (initial <= 0) return;

    const intervalId = setInterval(() => {
      const remaining = computeRemaining();
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        clearInterval(intervalId);
      }
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etaMinutes]);

  const isExpired = etaMinutes !== null && remainingSeconds <= 0;

  return { remainingSeconds, isExpired };
}
