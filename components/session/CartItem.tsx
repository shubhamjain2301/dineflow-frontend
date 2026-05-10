"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import type { CartItem as CartItemType } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

interface CartItemProps {
  item: CartItemType;
  currentParticipantId: string;
  onUpdate: (id: string, patch: { quantity?: number; note?: string }) => void;
  onRemove: (id: string) => void;
}

export function CartItem({
  item,
  currentParticipantId,
  onUpdate,
  onRemove,
}: CartItemProps) {
  const isOwner = item.participant_id === currentParticipantId;
  const linePrice = formatPrice(item.price * item.quantity);

  function handleQuantityChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1 && value <= 99) {
      onUpdate(item.id, { quantity: value });
    }
  }

  function handleNoteChange(e: React.ChangeEvent<HTMLInputElement>) {
    onUpdate(item.id, { note: e.target.value });
  }

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={item.id}
        initial={{ opacity: 0, x: -20, height: 0 }}
        animate={{ opacity: 1, x: 0, height: "auto" }}
        exit={{ opacity: 0, x: 20, height: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="overflow-hidden"
      >
        <div className="flex flex-col gap-2 rounded-xl border border-base-border bg-base-surface/40 px-4 py-3">
          {/* Top row: name + line price */}
          <div className="flex items-start justify-between gap-3">
            <span className="flex-1 text-sm font-medium text-white leading-snug">
              {item.menu_item_name}
            </span>
            <span className="shrink-0 text-sm font-semibold text-accent-blue">
              {linePrice}
            </span>
          </div>

          {/* Owner-only controls */}
          {isOwner && (
            <div className="flex items-center gap-3">
              {/* Quantity input */}
              <div className="flex items-center gap-1.5">
                <label
                  htmlFor={`qty-${item.id}`}
                  className="text-xs text-white/50"
                >
                  Qty
                </label>
                <input
                  id={`qty-${item.id}`}
                  type="number"
                  min={1}
                  max={99}
                  value={item.quantity}
                  onChange={handleQuantityChange}
                  className="w-14 rounded-lg border border-base-border bg-base-DEFAULT px-2 py-1 text-center text-sm text-white focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue"
                  aria-label={`Quantity for ${item.menu_item_name}`}
                />
              </div>

              {/* Preference note input */}
              <input
                type="text"
                value={item.note}
                onChange={handleNoteChange}
                placeholder="Special request…"
                maxLength={200}
                className="flex-1 rounded-lg border border-base-border bg-base-DEFAULT px-2 py-1 text-sm text-white placeholder-white/30 focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue"
                aria-label={`Preference note for ${item.menu_item_name}`}
              />

              {/* Remove button */}
              <button
                onClick={() => onRemove(item.id)}
                aria-label={`Remove ${item.menu_item_name}`}
                className="shrink-0 rounded-lg p-1.5 text-white/40 transition-colors hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Read-only view for other participants */}
          {!isOwner && (item.quantity > 1 || item.note) && (
            <div className="flex items-center gap-3 text-xs text-white/40">
              {item.quantity > 1 && <span>×{item.quantity}</span>}
              {item.note && (
                <span className="truncate italic">{item.note}</span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
