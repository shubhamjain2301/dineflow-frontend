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
  invite_link?: string;
  is_solo?: boolean;
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
// Name-entry prompt (shown when joining via invite link with no stored name)
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
              <p id="join-name-error" className="text-red-400 text-xs mt-1" role="alert">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-accent-blue px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Join Group
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Order confirmed screen
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
          The restaurant has been notified. Your order is on its way.
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
  const [mounted, setMounted] = useState(false);
  const [participantId, setParticipantId] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [isSolo, setIsSolo] = useState(false);
  const [needsName, setNeedsName] = useState(false);
  // Fallback restaurant_id and invite_link from localStorage (available before WS sync)
  const [localRestaurantId, setLocalRestaurantId] = useState<string>("");
  const [localInviteLink, setLocalInviteLink] = useState<string>("");

  useEffect(() => {
    const stored = readStoredSession();

    if (stored && stored.session_id === sessionId && stored.display_name) {
      // Returning participant for this exact session
      setParticipantId(stored.participant_id);
      setDisplayName(stored.display_name);
      setIsSolo(stored.is_solo ?? false);
      if (stored.restaurant_id) setLocalRestaurantId(stored.restaurant_id);
      if (stored.invite_link) setLocalInviteLink(stored.invite_link);
    } else if (stored && stored.display_name) {
      // Joining via invite link — reuse name, fresh participant_id, never solo
      const newParticipantId = generateUUID();
      const updated: StoredSession = {
        session_id: sessionId,
        display_name: stored.display_name,
        participant_id: newParticipantId,
        restaurant_id: stored.restaurant_id,
        invite_link: stored.invite_link,
        is_solo: false,
      };
      writeStoredSession(updated);
      setParticipantId(newParticipantId);
      setDisplayName(stored.display_name);
      setIsSolo(false);
      if (stored.restaurant_id) setLocalRestaurantId(stored.restaurant_id);
      if (stored.invite_link) setLocalInviteLink(stored.invite_link);
    } else {
      // No stored name — prompt (invite link with no prior session)
      const newParticipantId = generateUUID();
      setParticipantId(newParticipantId);
      setNeedsName(true);
    }

    setMounted(true);
  }, [sessionId]);

  const handleNameSubmit = useCallback(
    (name: string) => {
      const session: StoredSession = {
        session_id: sessionId,
        display_name: name,
        participant_id: participantId,
        is_solo: false,
      };
      writeStoredSession(session);
      setDisplayName(name);
      setIsSolo(false);
      setNeedsName(false);
    },
    [sessionId, participantId]
  );

  // ── Session hook ─────────────────────────────────────────────────────────
  const ready = mounted && !needsName && !!displayName && !!participantId;

  const {
    restaurantId,
    inviteLink,
    participants,
    cart,
    etaMinutes,
    connectionStatus,
    lastCloseCode,
    addItem,
    updateItem,
    removeItem,
    setEta,
  } = useDiningSession({
    sessionId: ready ? sessionId : "",
    participantId: ready ? participantId : "",
    displayName: ready ? displayName : "",
  });

  // Merge WS sync data with local fallbacks
  const effectiveRestaurantId = restaurantId || localRestaurantId;
  const effectiveInviteLink = inviteLink || localInviteLink;

  // ── Session-not-found detection ──────────────────────────────────────────
  // Only redirect when the server explicitly closes with code 4004.
  // Normal disconnects (network hiccup, Render cold start) should just reconnect.
  const sessionNotFoundHandled = useRef(false);

  useEffect(() => {
    if (
      ready &&
      lastCloseCode === 4004 &&
      !sessionNotFoundHandled.current
    ) {
      sessionNotFoundHandled.current = true;
      toast.error("Session has ended or does not exist");
      router.push("/");
    }
  }, [lastCloseCode, ready, router]);

  // ── Menu items ───────────────────────────────────────────────────────────
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const fetchedRestaurantId = useRef<string>("");

  useEffect(() => {
    if (!effectiveRestaurantId || effectiveRestaurantId === fetchedRestaurantId.current) return;
    fetchedRestaurantId.current = effectiveRestaurantId;

    getMenu(effectiveRestaurantId)
      .then(setMenuItems)
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to load menu.";
        toast.error(message);
      });
  }, [effectiveRestaurantId]);

  // ── Order confirmation ───────────────────────────────────────────────────
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirmOrder = useCallback(async () => {
    if (isConfirming) return;
    setIsConfirming(true);

    try {
      await confirmOrder({
        session_id: sessionId,
        restaurant_id: effectiveRestaurantId,
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
      const message = err instanceof Error ? err.message : "Failed to confirm order.";
      toast.error(message);
    } finally {
      setIsConfirming(false);
    }
  }, [isConfirming, sessionId, effectiveRestaurantId, etaMinutes, cart]);

  // ── Pending item from restaurant page ────────────────────────────────────
  // Consume immediately on mount — addItem queues internally if WS not ready yet.
  const pendingItemConsumed = useRef(false);

  useEffect(() => {
    if (pendingItemConsumed.current) return;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantId, displayName]);

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

  if (!mounted) return null;

  if (needsName) {
    return <NameEntryPrompt onSubmit={handleNameSubmit} />;
  }

  if (orderConfirmed) {
    return (
      <main className="min-h-screen bg-base px-4 py-8">
        <OrderConfirmedScreen />
      </main>
    );
  }

  // ── Solo layout ──────────────────────────────────────────────────────────
  if (isSolo) {
    return (
      <main className="min-h-screen bg-base px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
          className="mx-auto max-w-3xl"
        >
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">My Order</h1>
            <ConnectionPulse status={connectionStatus} />
          </div>

          <div className="flex flex-col gap-6">
            {/* Who's ordering + ETA row */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Participant name card */}
              <div className="flex-1 rounded-2xl border border-base-border bg-base-surface/60 p-4 backdrop-blur-md shadow-lg shadow-black/30">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">Ordering as</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-blue to-accent-purple text-sm font-bold text-white shadow-md">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-base font-semibold text-white">{displayName}</span>
                </div>
              </div>

              {/* ETA */}
              <div className="flex-1">
                <EtaControl onSetEta={setEta} currentEta={etaMinutes} />
              </div>
            </div>

            {/* ETA countdown */}
            <EtaCountdown etaMinutes={etaMinutes} />

            {/* Menu */}
            {menuItems.length > 0 && (
              <section className="rounded-2xl border border-base-border bg-base-surface/60 p-4 backdrop-blur-md shadow-lg shadow-black/30">
                <h2 className="mb-4 text-sm font-semibold text-white/70 uppercase tracking-wide">Menu</h2>
                <MenuSection items={menuItems} onAddToCart={handleAddToCart} />
              </section>
            )}

            {/* Cart */}
            <section className="rounded-2xl border border-base-border bg-base-surface/60 p-4 backdrop-blur-md shadow-lg shadow-black/30">
              <SharedCart
                cart={cart}
                participants={participants}
                currentParticipantId={participantId}
                onUpdate={updateItem}
                onRemove={removeItem}
                onConfirm={handleConfirmOrder}
                isSolo
              />
            </section>
          </div>
        </motion.div>
      </main>
    );
  }

  // ── Group layout ─────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-base px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        className="mx-auto max-w-7xl"
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Dining Group</h1>
          <ConnectionPulse status={connectionStatus} />
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
          {/* Left column */}
          <aside className="flex flex-col gap-4 lg:w-72 lg:shrink-0">
            <section className="rounded-2xl border border-base-border bg-base-surface/60 p-4 backdrop-blur-md shadow-lg shadow-black/30">
              <h2 className="mb-3 text-sm font-semibold text-white/70 uppercase tracking-wide">
                Participants
              </h2>
              <ParticipantList
                participants={participants}
                currentParticipantId={participantId}
              />
            </section>

            {effectiveInviteLink && (
              <section className="rounded-2xl border border-base-border bg-base-surface/60 p-4 backdrop-blur-md shadow-lg shadow-black/30">
                <h2 className="mb-3 text-sm font-semibold text-white/70 uppercase tracking-wide">
                  Invite Link
                </h2>
                <InviteLink inviteLink={effectiveInviteLink} />
              </section>
            )}

            <EtaControl onSetEta={setEta} currentEta={etaMinutes} />
            <EtaCountdown etaMinutes={etaMinutes} />
          </aside>

          {/* Right column */}
          <div className="flex flex-col gap-6 flex-1 min-w-0">
            {menuItems.length > 0 && (
              <section className="rounded-2xl border border-base-border bg-base-surface/60 p-4 backdrop-blur-md shadow-lg shadow-black/30">
                <h2 className="mb-4 text-sm font-semibold text-white/70 uppercase tracking-wide">Menu</h2>
                <MenuSection items={menuItems} onAddToCart={handleAddToCart} />
              </section>
            )}

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
