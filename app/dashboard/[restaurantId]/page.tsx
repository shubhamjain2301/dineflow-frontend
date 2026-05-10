"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getOrders, updateOrderStatus } from "@/lib/api";
import { buildDashboardWsUrl } from "@/lib/ws";
import type { GroupOrder, OrderStatus } from "@/lib/types";
import { OrderCard } from "@/components/dashboard/OrderCard";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

const connectionConfig: Record<
  ConnectionStatus,
  { dotClass: string; label: string; textClass: string }
> = {
  connected: {
    dotClass: "bg-green-500 animate-pulse",
    label: "Live",
    textClass: "text-green-400",
  },
  connecting: {
    dotClass: "bg-amber-500 animate-pulse",
    label: "Connecting...",
    textClass: "text-amber-400",
  },
  disconnected: {
    dotClass: "bg-red-500",
    label: "Disconnected",
    textClass: "text-red-400",
  },
};

interface DashboardPageProps {
  params: { restaurantId: string };
}

export default function DashboardPage({ params }: DashboardPageProps) {
  const { restaurantId } = params;

  const [orders, setOrders] = useState<GroupOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");

  const wsRef = useRef<WebSocket | null>(null);

  // -------------------------------------------------------------------------
  // Initial fetch
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    getOrders(restaurantId)
      .then((data) => {
        if (!cancelled) {
          setOrders(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  // -------------------------------------------------------------------------
  // WebSocket connection (raw — not useWebSocket hook)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const url = buildDashboardWsUrl(restaurantId)!;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus("connected");
    };

    ws.onclose = () => {
      setConnectionStatus("disconnected");
    };

    ws.onerror = () => {
      setConnectionStatus("disconnected");
    };

    ws.onmessage = (event: MessageEvent) => {
      let msg: { type: string; payload: unknown };
      try {
        msg = JSON.parse(event.data as string) as {
          type: string;
          payload: unknown;
        };
      } catch {
        return;
      }

      if (msg.type === "new_order") {
        const newOrder = msg.payload as GroupOrder;
        setOrders((prev) => [newOrder, ...prev]);
      } else if (msg.type === "status_update") {
        const { order_id, status } = msg.payload as {
          order_id: string;
          status: OrderStatus;
        };
        setOrders((prev) =>
          prev.map((o) => (o.id === order_id ? { ...o, status } : o))
        );
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [restaurantId]);

  // -------------------------------------------------------------------------
  // Status change handler — optimistic update + API call
  // -------------------------------------------------------------------------
  async function handleStatusChange(orderId: string, status: OrderStatus) {
    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );

    try {
      await updateOrderStatus(orderId, status);
    } catch {
      // Revert on failure — re-fetch to get the true state
      getOrders(restaurantId)
        .then(setOrders)
        .catch(() => {});
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  const { dotClass, label, textClass } = connectionConfig[connectionStatus];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      className="min-h-screen bg-base text-white"
    >
      {/* Page header */}
      <header className="sticky top-0 z-10 bg-base/80 backdrop-blur-md border-b border-base-border px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold tracking-tight">
            Restaurant Dashboard
          </h1>

          {/* Live connection indicator */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${dotClass}`}
              aria-hidden="true"
            />
            <span className={`text-xs font-medium ${textClass}`}>{label}</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          /* Loading state */
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-gray-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-blue border-t-transparent" />
            <p className="text-sm">Loading orders…</p>
          </div>
        ) : orders.length === 0 ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center gap-3 py-24 text-center text-gray-400"
          >
            <p className="text-lg font-medium text-gray-300">
              No orders yet. Waiting for groups to arrive…
            </p>
            <p className="text-sm">
              New orders will appear here automatically.
            </p>
          </motion.div>
        ) : (
          /* Orders grid */
          <motion.div
            className="grid grid-cols-1 gap-5 lg:grid-cols-2"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.07 } },
            }}
          >
            <AnimatePresence initial={false}>
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>
    </motion.div>
  );
}
