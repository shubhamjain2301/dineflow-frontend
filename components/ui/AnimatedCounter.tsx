"use client";

import { useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface AnimatedCounterProps {
  /** The numeric value to animate to */
  value: number;
  /** Optional formatter — defaults to two decimal places */
  formatter?: (v: number) => string;
}

/**
 * Reusable animated numeric counter.
 *
 * Uses Framer Motion `useSpring` to smoothly interpolate to the new value
 * whenever `value` changes, then formats the result via `formatter`.
 *
 * Validates: Requirements 8.5
 */
export function AnimatedCounter({
  value,
  formatter = (v) => v.toFixed(2),
}: AnimatedCounterProps) {
  const spring = useSpring(value, { stiffness: 200, damping: 30 });
  const display = useTransform(spring, formatter);

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span>{display}</motion.span>;
}
