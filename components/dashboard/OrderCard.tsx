"use client";

import { motion } from "framer-motion";
import { Users, Clock } from "lucide-react";
import type { GroupOrder, OrderStatus } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { useEtaCountdown } from "@/hooks/useEtaCountdown";

interface OrderCardProps {
  order: GroupOrder;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
}

/**
 * Formats remaining seconds into a human-readable countdown string.
 * e.g. 125 → "2m 5s", 45 → "45s", 0 → "0s"
 */
function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

/**
 * Derives the unique participant count from order items by counting
 * distinct display_name values.
 */
function getParticipantCount(items: GroupOrder["items"]): number {
  const names = new Set(items.map((item) => item.display_name));
  return names.size;
}

/**
 * Groups order items by participant display_name.
 * Returns a Map preserving insertion order.
 */
function groupItemsByParticipant(
  items: GroupOrder["items"]
): Map<string, GroupOrder["items"]> {
  const map = new Map<string, GroupOrder["items"]>();
  for (const item of items) {
    const existing = map.get(item.display_name);
    if (existing) {
      existing.push(item);
    } else {
      map.set(item.display_name, [item]);
    }
  }
  return map;
}

/**
 * ETA countdown sub-component — isolated so the hook only runs when
 * eta_minutes is relevant.
 */
function EtaDisplay({
  etaMinutes,
  createdAt,
}: {
  etaMinutes: number | null;
  createdAt: string;
}) {
  const startedAt = new Date(createdAt).getTime();
  const { remainingSeconds, isExpired } = useEtaCountdown(
    etaMinutes,
    startedAt
  );

  if (etaMinutes === null) {
    return (
      <span className="text-sm text-gray-400 flex items-center gap-1">
        <Clock className="w-3.5 h-3.5" />
        No ETA
      </span>
    );
  }

  return (
    <span
      className={`text-sm flex items-center gap-1 font-mono ${
        isExpired ? "text-status-ready" : "text-accent-cyan"
      }`}
    >
      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
      {isExpired ? "Overdue" : formatCountdown(remainingSeconds)}
    </span>
  );
}

/**
 * OrderCard — displays a single group order on the restaurant dashboard.
 *
 * Requirements: 6.2, 6.7, 6.8
 */
export function OrderCard({ order, onStatusChange }: OrderCardProps) {
  const participantCount = getParticipantCount(order.items);
  const groupedItems = groupItemsByParticipant(order.items);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="bg-base-surface/60 backdrop-blur-md border border-base-border rounded-2xl shadow-lg shadow-black/30 p-5 flex flex-col gap-4"
    >
      {/* Header row: participant count + ETA + status badge */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4">
          {/* Participant count */}
          <span className="flex items-center gap-1.5 text-sm text-gray-300">
            <Users className="w-4 h-4 text-accent-blue" />
            <span className="font-medium">{participantCount}</span>
            <span className="text-gray-500">
              {participantCount === 1 ? "participant" : "participants"}
            </span>
          </span>

          {/* Live ETA countdown */}
          <EtaDisplay
            etaMinutes={order.eta_minutes}
            createdAt={order.created_at}
          />
        </div>

        {/* Status badge */}
        <StatusBadge status={order.status} />
      </div>

      {/* Order summary grouped by participant */}
      <div className="flex flex-col gap-3">
        {Array.from(groupedItems.entries()).map(([displayName, items]) => (
          <div key={displayName} className="flex flex-col gap-1">
            {/* Participant name header */}
            <p className="text-xs font-semibold text-accent-purple uppercase tracking-wide">
              {displayName}
            </p>
            {/* Items for this participant */}
            <ul className="flex flex-col gap-0.5 pl-2 border-l border-base-border">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between text-sm text-gray-300"
                >
                  <span className="truncate">
                    {item.menu_item_name ?? item.menu_item_id}
                  </span>
                  <span className="ml-2 text-gray-500 flex-shrink-0">
                    ×{item.quantity}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Status transition controls */}
      <div className="pt-1 border-t border-base-border">
        {order.status === "pending" && (
          <button
            onClick={() => onStatusChange(order.id, "preparing")}
            className="w-full rounded-xl bg-accent-blue/20 hover:bg-accent-blue/30 border border-accent-blue/40 text-accent-blue text-sm font-medium py-2 px-4 transition-colors duration-150"
          >
            Start Preparing
          </button>
        )}

        {order.status === "preparing" && (
          <button
            onClick={() => onStatusChange(order.id, "ready")}
            className="w-full rounded-xl bg-status-ready/20 hover:bg-status-ready/30 border border-status-ready/40 text-status-ready text-sm font-medium py-2 px-4 transition-colors duration-150"
          >
            Mark Ready
          </button>
        )}

        {order.status === "ready" && (
          <div className="flex items-center justify-center gap-2 text-status-ready text-sm font-medium py-2">
            ✓ Ready
          </div>
        )}
      </div>
    </motion.div>
  );
}
