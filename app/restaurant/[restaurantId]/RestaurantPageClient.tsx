"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users, User } from "lucide-react";
import type { MenuItem, Restaurant } from "@/lib/types";
import { createSession } from "@/lib/api";
import MenuSection from "@/components/restaurant/MenuSection";

interface StoredSession {
  session_id: string;
  display_name: string;
  participant_id: string;
  restaurant_id: string;
}

interface RestaurantPageClientProps {
  restaurant: Restaurant;
  menuItems: MenuItem[];
}

/**
 * Generates a UUID v4 string using the browser's crypto API when available,
 * falling back to a Math.random-based implementation.
 */
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

function getStoredSession(restaurantId: string): StoredSession | null {
  try {
    const raw = localStorage.getItem("dineflow_session");
    if (!raw) return null;
    const session: StoredSession = JSON.parse(raw);
    // Only return the session if it belongs to this restaurant
    if (session.restaurant_id !== restaurantId) return null;
    return session;
  } catch {
    return null;
  }
}

function storeSession(session: StoredSession): void {
  try {
    localStorage.setItem("dineflow_session", JSON.stringify(session));
  } catch {
    // localStorage unavailable — graceful degradation
  }
}

/** Persist the pending item so the session page can add it after connecting. */
function storePendingItem(item: MenuItem): void {
  try {
    sessionStorage.setItem("dineflow_pending_item", JSON.stringify(item));
  } catch {
    // sessionStorage unavailable — graceful degradation
  }
}

type ModalStep = "choice" | "group-name";

export default function RestaurantPageClient({
  restaurant,
  menuItems,
}: RestaurantPageClientProps) {
  const router = useRouter();

  // Whether a session already exists for this restaurant
  const [existingSession, setExistingSession] = useState<StoredSession | null>(null);

  // Modal state
  const [modalStep, setModalStep] = useState<ModalStep | null>(null);
  const [pendingItem, setPendingItem] = useState<MenuItem | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [nameError, setNameError] = useState("");

  // Check localStorage for an existing session on mount
  useEffect(() => {
    const session = getStoredSession(restaurant.id);
    setExistingSession(session);
  }, [restaurant.id]);

  const handleAddToCart = useCallback(
    (item: MenuItem) => {
      if (existingSession) {
        // Session exists — store the pending item and navigate to the session
        storePendingItem(item);
        router.push(`/session/${existingSession.session_id}`);
      } else {
        // No session — show the choice modal
        setPendingItem(item);
        setModalStep("choice");
      }
    },
    [existingSession, router]
  );

  /** Solo order: create a session with an auto-generated name, no group UI needed */
  const handleSoloOrder = useCallback(async () => {
    if (!pendingItem) return;
    setIsCreating(true);
    try {
      const { session_id } = await createSession(restaurant.id);
      const participant_id = generateUUID();
      const soloName = "Me";

      const session: StoredSession = {
        session_id,
        display_name: soloName,
        participant_id,
        restaurant_id: restaurant.id,
      };

      storeSession(session);
      setExistingSession(session);
      storePendingItem(pendingItem);
      setModalStep(null);

      router.push(`/session/${session_id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start order.";
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  }, [pendingItem, restaurant.id, router]);

  /** Group order: ask for a display name first */
  const handleCreateGroup = useCallback(async () => {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setNameError("Please enter a display name.");
      return;
    }
    if (trimmedName.length > 50) {
      setNameError("Display name must be 50 characters or fewer.");
      return;
    }

    setNameError("");
    setIsCreating(true);

    try {
      const { session_id } = await createSession(restaurant.id);
      const participant_id = generateUUID();

      const session: StoredSession = {
        session_id,
        display_name: trimmedName,
        participant_id,
        restaurant_id: restaurant.id,
      };

      storeSession(session);
      setExistingSession(session);
      if (pendingItem) storePendingItem(pendingItem);
      setModalStep(null);

      router.push(`/session/${session_id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create Dining Group.";
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  }, [displayName, pendingItem, restaurant.id, router]);

  const handleCloseModal = useCallback(() => {
    setModalStep(null);
    setPendingItem(null);
    setDisplayName("");
    setNameError("");
  }, []);

  return (
    <>
      {/* Menu section */}
      <MenuSection items={menuItems} onAddToCart={handleAddToCart} />

      {/* Choice modal — solo vs group */}
      {modalStep === "choice" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-choice-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
        >
          <div className="bg-base-surface border border-base-border rounded-2xl shadow-xl shadow-black/40 p-6 w-full max-w-md">
            <h2
              id="order-choice-title"
              className="text-xl font-semibold text-white mb-1"
            >
              How would you like to order?
            </h2>

            {pendingItem && (
              <p className="text-sm text-white/50 mb-6">
                Adding{" "}
                <span className="text-white/80 font-medium">
                  {pendingItem.name}
                </span>{" "}
                to your cart.
              </p>
            )}

            <div className="flex flex-col gap-3">
              {/* Solo option */}
              <button
                onClick={handleSoloOrder}
                disabled={isCreating}
                className="flex items-center gap-4 w-full rounded-xl border border-base-border bg-base-DEFAULT hover:border-accent-blue/60 hover:bg-accent-blue/5 px-5 py-4 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-blue/10 text-accent-blue">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Order Solo</p>
                  <p className="text-xs text-white/50 mt-0.5">
                    Just for yourself — quick and simple
                  </p>
                </div>
              </button>

              {/* Group option */}
              <button
                onClick={() => setModalStep("group-name")}
                disabled={isCreating}
                className="flex items-center gap-4 w-full rounded-xl border border-base-border bg-base-DEFAULT hover:border-accent-purple/60 hover:bg-accent-purple/5 px-5 py-4 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-purple/10 text-accent-purple">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Create a Group</p>
                  <p className="text-xs text-white/50 mt-0.5">
                    Invite friends to order together in real-time
                  </p>
                </div>
              </button>
            </div>

            <button
              onClick={handleCloseModal}
              className="mt-4 w-full px-4 py-2 rounded-xl border border-base-border text-white/50 hover:text-white hover:border-white/30 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Group name modal */}
      {modalStep === "group-name" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-group-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
        >
          <div className="bg-base-surface border border-base-border rounded-2xl shadow-xl shadow-black/40 p-6 w-full max-w-md">
            <h2
              id="create-group-title"
              className="text-xl font-semibold text-white mb-1"
            >
              Create a Dining Group
            </h2>

            <p className="text-sm text-white/60 mb-5">
              Enter a display name so your group knows who you are.
            </p>

            <label
              htmlFor="display-name-input"
              className="block text-sm font-medium text-white/70 mb-1.5"
            >
              Your display name
            </label>
            <input
              id="display-name-input"
              type="text"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                if (nameError) setNameError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateGroup();
              }}
              placeholder="e.g. Alex"
              maxLength={50}
              autoFocus
              className="w-full bg-base-surface border border-base-border rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/60 mb-1"
              aria-describedby={nameError ? "name-error" : undefined}
            />
            {nameError && (
              <p id="name-error" className="text-red-400 text-xs mb-3" role="alert">
                {nameError}
              </p>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setModalStep("choice")}
                className="flex-1 px-4 py-2.5 rounded-xl border border-base-border text-white/60 hover:text-white hover:border-white/30 text-sm font-medium transition-colors"
                disabled={isCreating}
              >
                Back
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={isCreating}
                className="flex-1 px-4 py-2.5 rounded-xl bg-accent-blue hover:bg-accent-blue/80 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {isCreating ? "Creating…" : "Create Group"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
