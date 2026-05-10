"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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

export default function RestaurantPageClient({
  restaurant,
  menuItems,
}: RestaurantPageClientProps) {
  const router = useRouter();

  // Whether a session already exists for this restaurant
  const [existingSession, setExistingSession] = useState<StoredSession | null>(null);

  // Modal state for "Create Dining Group" flow
  const [showCreateModal, setShowCreateModal] = useState(false);
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
        // Session exists — navigate to the session view where the item can be added
        router.push(`/session/${existingSession.session_id}`);
      } else {
        // No session — prompt to create a Dining Group
        setPendingItem(item);
        setShowCreateModal(true);
      }
    },
    [existingSession, router]
  );

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
      setShowCreateModal(false);

      router.push(`/session/${session_id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create Dining Group.";
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  }, [displayName, restaurant.id, router]);

  const handleCloseModal = useCallback(() => {
    setShowCreateModal(false);
    setPendingItem(null);
    setDisplayName("");
    setNameError("");
  }, []);

  return (
    <>
      {/* Menu section */}
      <MenuSection items={menuItems} onAddToCart={handleAddToCart} />

      {/* Create Dining Group modal */}
      {showCreateModal && (
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

            {pendingItem && (
              <p className="text-sm text-white/50 mb-4">
                To add{" "}
                <span className="text-white/80 font-medium">
                  {pendingItem.name}
                </span>{" "}
                to your cart, start a Dining Group first.
              </p>
            )}

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
              className="w-full bg-base/60 border border-base-border rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/60 mb-1"
              aria-describedby={nameError ? "name-error" : undefined}
            />
            {nameError && (
              <p id="name-error" className="text-red-400 text-xs mb-3" role="alert">
                {nameError}
              </p>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2.5 rounded-xl border border-base-border text-white/60 hover:text-white hover:border-white/30 text-sm font-medium transition-colors"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={isCreating}
                className="flex-1 px-4 py-2.5 rounded-xl bg-accent-blue hover:bg-accent-blue/80 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {isCreating ? "Creating…" : "Create Dining Group"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
