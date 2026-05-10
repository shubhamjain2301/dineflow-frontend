"use client";

import { useEffect, useRef } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { useEtaCountdown } from "@/hooks/useEtaCountdown";

interface EtaCountdownProps {
  etaMinutes: number | null;
  startedAt?: number;
}

/**
 * EtaCountdown — displays a live countdown to the group's arrival ETA.
 *
 * - No ETA set → "No ETA set"
 * - Counting down → "Food preparation begins in X mins"
 * - Expired → "🍽️ Preparation should begin now!" with a pulsing indicator
 *
 * The displayed minute value animates with a Framer Motion spring on change.
 *
 * Requirements: 4.3, 4.5
 */
export function EtaCountdown({ etaMinutes, startedAt }: EtaCountdownProps) {
  const { remainingSeconds, isExpired } = useEtaCountdown(etaMinutes, startedAt);

  // Convert remaining seconds to minutes (ceiling so "1 min" shows until 0)
  const remainingMinutes = Math.ceil(remainingSeconds / 60);

  // Spring-animated value for the minute number
  const springValue = useSpring(remainingMinutes, {
    stiffness: 200,
    damping: 25,
  });

  // Rounded display value derived from the spring
  const displayMinutes = useTransform(springValue, (v) => Math.round(v));

  // Keep the spring in sync with the real remaining minutes
  const prevMinutes = useRef(remainingMinutes);
  useEffect(() => {
    if (prevMinutes.current !== remainingMinutes) {
      springValue.set(remainingMinutes);
      prevMinutes.current = remainingMinutes;
    }
  }, [remainingMinutes, springValue]);

  // ── No ETA set ──────────────────────────────────────────────────────────────
  if (etaMinutes === null) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-base-border bg-base-surface/60 px-4 py-3 backdrop-blur-md shadow-lg shadow-black/30">
        <span className="text-sm text-white/40">No ETA set</span>
      </div>
    );
  }

  // ── Expired ─────────────────────────────────────────────────────────────────
  if (isExpired) {
    return (
      <div
        className="flex items-center gap-3 rounded-2xl border border-accent-blue/40 bg-accent-blue/10 px-4 py-3 backdrop-blur-md shadow-lg shadow-black/30"
        role="status"
        aria-live="polite"
      >
        {/* Pulsing visual indicator */}
        <span
          className="inline-block h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-accent-blue"
          aria-hidden="true"
        />
        <span className="text-sm font-semibold text-white">
          🍽️ Preparation should begin now!
        </span>
      </div>
    );
  }

  // ── Counting down ────────────────────────────────────────────────────────────
  return (
    <div
      className="flex items-center gap-2 rounded-2xl border border-base-border bg-base-surface/60 px-4 py-3 backdrop-blur-md shadow-lg shadow-black/30"
      role="status"
      aria-live="polite"
    >
      <span className="text-sm text-white/70">Food preparation begins in</span>
      <motion.span className="text-sm font-bold text-accent-cyan tabular-nums">
        {displayMinutes}
      </motion.span>
      <span className="text-sm text-white/70">
        {remainingMinutes === 1 ? "min" : "mins"}
      </span>
    </div>
  );
}
