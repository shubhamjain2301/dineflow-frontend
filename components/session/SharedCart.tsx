"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion, useSpring, useTransform } from "framer-motion";
import { ShoppingCart, CheckCircle2 } from "lucide-react";
import type { CartItem as CartItemType, Participant } from "@/lib/types";
import { CartItem } from "@/components/session/CartItem";
import { formatPrice, computeSubtotal, getInitials } from "@/lib/utils";

// Stable gradient palette — same as ParticipantList for visual consistency
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

// Animated numeric counter that springs to the new value
function AnimatedSubtotal({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 200, damping: 30 });
  const display = useTransform(spring, (v) => formatPrice(v));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span>{display}</motion.span>;
}

interface SharedCartProps {
  cart: CartItemType[];
  participants: Participant[];
  currentParticipantId: string;
  onUpdate: (id: string, patch: { quantity?: number; note?: string }) => void;
  onRemove: (id: string) => void;
  onConfirm: () => void;
}

export function SharedCart({
  cart,
  participants,
  currentParticipantId,
  onUpdate,
  onRemove,
  onConfirm,
}: SharedCartProps) {
  const [emptyError, setEmptyError] = useState(false);

  // Group cart items by participant using a Map to preserve insertion order
  const grouped = new Map<string, CartItemType[]>();

  // Seed the map with all participants so groups appear even if empty
  for (const participant of participants) {
    grouped.set(participant.id, []);
  }

  // Distribute cart items into their participant buckets
  for (const item of cart) {
    const bucket = grouped.get(item.participant_id);
    if (bucket) {
      bucket.push(item);
    } else {
      // Item belongs to a participant not in the current list — still show it
      grouped.set(item.participant_id, [item]);
    }
  }

  // Build a lookup for participant display names (fallback to item's display_name)
  const participantMap = new Map<string, Participant>(
    participants.map((p) => [p.id, p])
  );

  // Compute subtotal across all items
  const subtotal = computeSubtotal(cart);

  function handleConfirm() {
    if (cart.length === 0) {
      setEmptyError(true);
      return;
    }
    setEmptyError(false);
    onConfirm();
  }

  // Clear the empty-cart error as soon as an item is added
  useEffect(() => {
    if (cart.length > 0 && emptyError) {
      setEmptyError(false);
    }
  }, [cart.length, emptyError]);

  // Participant index for stable gradient assignment
  const participantIndex = new Map<string, number>(
    participants.map((p, i) => [p.id, i])
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ShoppingCart className="h-5 w-5 text-accent-blue" aria-hidden="true" />
        <h2 className="text-base font-semibold text-white">Shared Cart</h2>
      </div>

      {/* Participant groups */}
      <div className="flex flex-col gap-6">
        {Array.from(grouped.entries()).map(([participantId, items]) => {
          // Resolve display name: prefer participants list, fall back to first item
          const participant = participantMap.get(participantId);
          const displayName =
            participant?.display_name ??
            items[0]?.display_name ??
            "Unknown";
          const initials = getInitials(displayName);
          const gradientIndex = participantIndex.get(participantId) ?? 0;
          const isCurrentUser = participantId === currentParticipantId;

          // Skip groups with no items (participants who haven't ordered yet)
          if (items.length === 0) return null;

          return (
            <motion.div
              key={participantId}
              layout
              className="flex flex-col gap-2"
            >
              {/* Participant group header */}
              <div className="flex items-center gap-2 px-1">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradientFor(gradientIndex)} text-xs font-bold text-white shadow-md`}
                  aria-hidden="true"
                >
                  {initials}
                </div>
                <span className="text-sm font-medium text-white/80">
                  {displayName}
                  {isCurrentUser && (
                    <span className="ml-1.5 text-xs font-normal text-accent-blue/80">
                      (you)
                    </span>
                  )}
                </span>
              </div>

              {/* Cart items for this participant */}
              <div className="flex flex-col gap-2 pl-2">
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <CartItem
                      key={item.id}
                      item={item}
                      currentParticipantId={currentParticipantId}
                      onUpdate={onUpdate}
                      onRemove={onRemove}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Empty cart placeholder */}
      {cart.length === 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-6 text-center text-sm text-white/30"
        >
          No items in the cart yet.
        </motion.p>
      )}

      {/* Subtotal row */}
      <div className="flex items-center justify-between rounded-xl border border-base-border bg-base-surface/40 px-4 py-3">
        <span className="text-sm font-medium text-white/60">Group Subtotal</span>
        <span className="text-base font-bold text-accent-blue">
          <AnimatedSubtotal value={subtotal} />
        </span>
      </div>

      {/* Inline empty-cart error */}
      <AnimatePresence>
        {emptyError && (
          <motion.p
            key="empty-error"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            role="alert"
            className="text-center text-sm font-medium text-red-400"
          >
            Your cart is empty
          </motion.p>
        )}
      </AnimatePresence>

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-blue px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-blue/20 transition-all hover:bg-accent-blue/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:ring-offset-2 focus-visible:ring-offset-base-DEFAULT active:scale-[0.98]"
        aria-label="Confirm group order"
      >
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        Confirm Group Order
      </button>
    </div>
  );
}
