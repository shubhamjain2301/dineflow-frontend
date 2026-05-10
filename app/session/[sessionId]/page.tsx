"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

import { useDiningSession } from "@/hooks/useDiningSession";
import { confirmOrder, getMenu } from "@/lib/api";
import type { MenuItem } from "@/lib/types";

import { ConnectionPulse } from "@/components/session/ConnectionPulse";
import { ParticipantList } from "@/components/session/ParticipantList";
import { InviteLink } from "@/components/session/InviteLink";
import { EtaControl } from "@/components/session/EtaControl";
import { EtaCountdown } from "@/components/session/EtaCountdown";
import MenuSection from "@/components/restaurant/MenuSection";
import { SharedCart } from "@/components/session/SharedCart";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StoredSession {
  session_id: string;
  display_name: string;
  participant_id: string;
  restaurant_id?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem("dineflow_session");
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function writeStoredSession(session: StoredSession): void {
  try {
    localStorage.setItem("dineflow_session", JSON.stringify(session));
  } catch {
    // localStorage unavailable — graceful degradation
  }
}

function generateUUID(): string {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------------------------------------------------------------------------
// Name-entry prompt (shown when display_name is missing from localStorage)
// ---------------------------------------------------------------------------

interface NameEntryProps {
  onSubmit: (name: string) => void;
}

function NameEntryPrompt({ onSubmit }: NameEntryProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a display name.");
      return;
    }
    if (trimmed.length > 50) {
      setError("Display name must be 50 characters or fewer.");
      return;
    }
    setError("");
    onSubmit(trimmed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="bg-base-surface border border-base-border rounded-2xl shadow-xl shadow-black/40 p-6 w-full max-w-sm"
      >
        <h2 className="text-xl font-semibold text-white mb-2">
          Join the Dining Group
        </h2>
        <p className="text-sm text-white/60 mb-5">
          Enter a display name so your group knows who you are.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label
              htmlFor="join-name-input"
              className="block text-sm font-medium text-white/70 mb-1.5"
            >
              Your display name
            </label>
            <input
              id="join-name-input"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
              placeholder="e.g. Alex"
              maxLength={50}
              autoFocus
              className="w-full bg-base-surface border border-base-border rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/60"
              aria-describedby={error ? "join-name-error" : undefined}
            />
            {error && (
              <p
                id="join-name-error"
                className="text-red-400 text-xs mt-1"
                role="alert"
              >
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-accent-blue px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:ring-offset-2 focus-visible:ring-offset-base-DEFAULT"
          >
            Join Group
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Order confirmed screen (inline state change)
// ---------------------------------------------------------------------------

function OrderConfirmedScreen() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 border border-green-500/40">
        <CheckCircle2 className="h-10 w-10 text-green-400" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-white">Order Confirmed!</h2>
        <p className="text-white/60 text-sm max-w-xs">
          The restaurant has been notified. Your group order is on its way.
        </p>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main session page
// ---------------------------------------------------------------------------

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  // ── Identity resolution ──────────────────────────────────────────────────
  // We read from localStorage on the client only (guarded by mounted state)
  const [mounted, setMounted] = useState(false);
  const [participantId, setParticipantId] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [needsName, setNeedsName] = useState(false);

  useEffect(() => {
    const stored = readStoredSession();

    if (stored && stored.session_id === sessionId && stored.display_name) {
      // Returning participant — use stored identity
      setParticipantId(stored.participant_id);
      setDisplayName(stored.display_name);
    } else if (stored && stored.display_name) {
      // Participant joining via invite link (different session_id)
      // Reuse display_name but generate a fresh participant_id
      const newParticipantId = generateUUID();
      const updated: StoredSession = {
        session_id: sessionId,
        display_name: stored.display_name,
        participant_id: newParticipantId,
        restaurant_id: stored.restaurant_id,
      };
      writeStoredSession(updated);
      setParticipantId(newParticipantId);
      setDisplayName(stored.display_name);
    } else {
      // No stored name — prompt the user
      const newParticipantId = generateUUID();
      setParticipantId(newParticipantId);
      setNeedsName(true);
    }

    setMounted(true);
  }, [sessionId]);

  // Handle name submission from the prompt
  const handleNameSubmit = useCallback(
    (name: string) => {
      const session: StoredSession = {
        session_id: sessionId,
        display_name: name,
        participant_id: participantId,
      };
      writeStoredSession(session);
      setDisplayName(name);
      setNeedsName(false);
    },
    [sessionId, participantId]
  );

  // ── Session hook ─────────────────────────────────────────────────────────
  // Only connect once we have a display name.
  // We always call the hook (Rules of Hooks), but pass an empty sessionId
  // when not ready — useDiningSession derives the WS URL as null when
  // sessionId is empty, so no connection is attempted.
  const ready = mounted && !needsName && !!displayName && !!participantId;

  const {
    restaurantId,
    inviteLink,
    participants,
    cart,
    etaMinutes,
    connectionStatus,
    addItem,
    updateItem,
    removeItem,
    setEta,
  } = useDiningSession({
    sessionId: ready ? sessionId : "",
    participantId: ready ? participantId : "",
    displayName: ready ? displayName : "",
  });

  // ── Session-not-found detection ──────────────────────────────────────────
  // Only redirect if:
  // 1. We have connected at least once (status was "connecting" or "connected")
  // 2. Then dropped to "disconnected" without ever receiving a sync
  // This prevents false positives on initial render where status starts as "disconnected"
  const hasEverSynced = useRef(false);
  const hasEverConnected = useRef(false);
  const sessionNotFoundHandled = useRef(false);

  useEffect(() => {
    if (restaurantId) {
      hasEverSynced.current = true;
    }
  }, [restaurantId]);

  useEffect(() => {
    if (ready && (connectionStatus === "connecting" || connectionStatus === "connected")) {
      hasEverConnected.current = true;
    }
  }, [connectionStatus, ready]);

  useEffect(() => {
    if (
      ready &&
      hasEverConnected.current &&
      connectionStatus === "disconnected" &&
      !hasEverSynced.current &&
      !sessionNotFoundHandled.current
    ) {
      // Give a grace period in case the WS is just reconnecting.
      // Increased to 8s to account for reconnect backoff + server grace period.
      const timer = setTimeout(() => {
        if (!hasEverSynced.current && !sessionNotFoundHandled.current) {
          sessionNotFoundHandled.current = true;
          toast.error("Session has ended or does not exist");
          router.push("/");
        }
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [connectionStatus, ready, router]);

  // ── Menu items ───────────────────────────────────────────────────────────
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const fetchedRestaurantId = useRef<string>("");

  useEffect(() => {
    if (!restaurantId || restaurantId === fetchedRestaurantId.current) return;
    fetchedRestaurantId.current = restaurantId;

    getMenu(restaurantId)
      .then(setMenuItems)
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to load menu.";
        toast.error(message);
      });
  }, [restaurantId]);

  // ── Order confirmation ───────────────────────────────────────────────────
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirmOrder = useCallback(async () => {
    if (isConfirming) return;
    setIsConfirming(true);

    try {
      await confirmOrder({
        session_id: sessionId,
        restaurant_id: restaurantId,
        eta_minutes: etaMinutes,
        items: cart.map((item) => ({
          menu_item_id: item.menu_item_id,
          menu_item_name: item.menu_item_name,
          price: item.price,
          participant_id: item.participant_id,
          display_name: item.display_name,
          quantity: item.quantity,
          note: item.note,
        })),
      });
      setOrderConfirmed(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to confirm order.";
      toast.error(message);
    } finally {
      setIsConfirming(false);
    }
  }, [isConfirming, sessionId, restaurantId, etaMinutes, cart]);

  // ── Pending item from restaurant page ────────────────────────────────────
  // When the user adds an item on the restaurant page and gets redirected here,
  // the item is stored in sessionStorage. We consume it once the WS is connected.
  const pendingItemConsumed = useRef(false);

  useEffect(() => {
    if (connectionStatus !== "connected" || pendingItemConsumed.current) return;
    if (!participantId || !displayName) return;

    try {
      const raw = sessionStorage.getItem("dineflow_pending_item");
      if (!raw) return;
      const item = JSON.parse(raw) as MenuItem;
      sessionStorage.removeItem("dineflow_pending_item");
      pendingItemConsumed.current = true;

      addItem({
        menu_item_id: item.id,
        menu_item_name: item.name,
        price: item.price,
        participant_id: participantId,
        display_name: displayName,
        quantity: 1,
        note: "",
      });
    } catch {
      // sessionStorage unavailable or malformed — ignore
    }
  }, [connectionStatus, participantId, displayName, addItem]);

  // ── Add item to cart ─────────────────────────────────────────────────────
  const handleAddToCart = useCallback(
    (item: MenuItem) => {
      addItem({
        menu_item_id: item.id,
        menu_item_name: item.name,
        price: item.price,
        participant_id: participantId,
        display_name: displayName,
        quantity: 1,
        note: "",
      });
    },
    [addItem, participantId, displayName]
  );

  // ── Render ───────────────────────────────────────────────────────────────

  // Don't render anything until we've read localStorage (avoids hydration mismatch)
  if (!mounted) {
    return null;
  }

  // Show name-entry prompt if display name is missing
  if (needsName) {
    return <NameEntryPrompt onSubmit={handleNameSubmit} />;
  }

  // Show confirmation screen after successful order
  if (orderConfirmed) {
    return (
      <main className="min-h-screen bg-base px-4 py-8">
        <OrderConfirmedScreen />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-base px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        className="mx-auto max-w-7xl"
      >
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Dining Group</h1>
          <ConnectionPulse status={connectionStatus} />
        </div>

        {/* Two-column layout: left panel + right panel */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
          {/* ── Left column ─────────────────────────────────────────────── */}
          <aside className="flex flex-col gap-4 lg:w-72 lg:shrink-0">
            {/* Participants */}
            <section className="rounded-2xl border border-base-border bg-base-surface/60 p-4 backdrop-blur-md shadow-lg shadow-black/30">
              <h2 className="mb-3 text-sm font-semibold text-white/70 uppercase tracking-wide">
                Participants
              </h2>
              <ParticipantList
                participants={participants}
                currentParticipantId={participantId}
              />
            </section>

            {/* Invite link */}
            {inviteLink && (
              <section className="rounded-2xl border border-base-border bg-base-surface/60 p-4 backdrop-blur-md shadow-lg shadow-black/30">
                <h2 className="mb-3 text-sm font-semibold text-white/70 uppercase tracking-wide">
                  Invite Link
                </h2>
                <InviteLink inviteLink={inviteLink} />
              </section>
            )}

            {/* ETA control */}
            <EtaControl onSetEta={setEta} currentEta={etaMinutes} />

            {/* ETA countdown */}
            <EtaCountdown etaMinutes={etaMinutes} />
          </aside>

          {/* ── Right column ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-6 flex-1 min-w-0">
            {/* Menu */}
            {menuItems.length > 0 && (
              <section className="rounded-2xl border border-base-border bg-base-surface/60 p-4 backdrop-blur-md shadow-lg shadow-black/30">
                <h2 className="mb-4 text-sm font-semibold text-white/70 uppercase tracking-wide">
                  Menu
                </h2>
                <MenuSection items={menuItems} onAddToCart={handleAddToCart} />
              </section>
            )}

            {/* Shared cart */}
            <section className="rounded-2xl border border-base-border bg-base-surface/60 p-4 backdrop-blur-md shadow-lg shadow-black/30">
              <SharedCart
                cart={cart}
                participants={participants}
                currentParticipantId={participantId}
                onUpdate={updateItem}
                onRemove={removeItem}
                onConfirm={handleConfirmOrder}
              />
            </section>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
