"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Participant } from "@/lib/types";
import { getInitials } from "@/lib/utils";

interface ParticipantListProps {
  participants: Participant[];
  currentParticipantId: string;
}

// Stable gradient palette — assigned by index so avatars don't shift colors on re-render
const AVATAR_GRADIENTS = [
  "from-accent-blue to-accent-purple",
  "from-accent-purple to-accent-cyan",
  "from-accent-cyan to-accent-blue",
  "from-pink-500 to-accent-purple",
  "from-orange-500 to-pink-500",
  "from-emerald-500 to-accent-cyan",
];

function gradientFor(index: number): string {
  return AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
}

export function ParticipantList({
  participants,
  currentParticipantId,
}: ParticipantListProps) {
  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {participants.map((participant, index) => {
          const isCurrentUser = participant.id === currentParticipantId;
          const initials = getInitials(participant.display_name);

          return (
            <motion.div
              key={participant.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-colors ${
                isCurrentUser
                  ? "bg-accent-blue/10 border border-accent-blue/20"
                  : "bg-base-surface/40 border border-base-border/50"
              }`}
            >
              {/* Avatar */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradientFor(index)} text-xs font-bold text-white shadow-md`}
                aria-hidden="true"
              >
                {initials}
              </div>

              {/* Display name */}
              <span
                className={`truncate text-sm font-medium ${
                  isCurrentUser ? "text-white" : "text-white/70"
                }`}
              >
                {participant.display_name}
                {isCurrentUser && (
                  <span className="ml-1.5 text-xs font-normal text-accent-blue/80">
                    (you)
                  </span>
                )}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {participants.length === 0 && (
        <p className="text-xs text-white/30 px-3 py-2">No participants yet.</p>
      )}
    </div>
  );
}
