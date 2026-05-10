"use client";

import { motion } from "framer-motion";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Thin client wrapper that applies a Framer Motion entrance animation to
 * server-rendered page content. Use this in Server Components where you
 * cannot add `motion.*` elements directly.
 *
 * Animation: fade-in + slide-up with a spring transition.
 */
export default function PageTransition({
  children,
  className,
}: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
