import { useCallback, useEffect, useRef, useState } from "react";
import { useWebSocket } from "./useWebSocket";
import { buildSessionWsUrl } from "@/lib/ws";
import type { CartItem, Participant, SyncPayload } from "@/lib/types";

interface UseDiningSessionOptions {
  sessionId: string;
  participantId: string;
  displayName: string;
}

interface DiningSessionState {
  sessionId: string;
  restaurantId: string;
  inviteLink: string;
  participants: Participant[];
  cart: CartItem[];
  etaMinutes: number | null;
  connectionStatus: "connecting" | "connected" | "disconnected";
  lastCloseCode: number | null;
  addItem: (item: Omit<CartItem, "id">) => void;
  updateItem: (id: string, patch: Partial<Pick<CartItem, "quantity" | "note">>) => void;
  removeItem: (id: string) => void;
  setEta: (minutes: number) => void;
}

/**
 * Generates a UUID v4 string using the browser's crypto API when available,
 * falling back to a Math.random-based implementation for SSR safety.
 */
function generateUUID(): string {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  // Fallback: RFC 4122 v4 UUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useDiningSession(
  options: UseDiningSessionOptions
): DiningSessionState {
  const { sessionId, participantId, displayName } = options;

  // Derive the WebSocket URL — guard against SSR and empty sessionId
  const wsUrl =
    typeof window !== "undefined" && sessionId
      ? buildSessionWsUrl(sessionId)
      : null;

  const { status, send, lastMessage, lastCloseCode } = useWebSocket(wsUrl);

  // Session state
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [inviteLink, setInviteLink] = useState<string>("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);

  // Track whether we've sent the join message for this connection
  const joinedRef = useRef<boolean>(false);

  // Send join message when the WebSocket connects
  useEffect(() => {
    if (status === "connected" && !joinedRef.current) {
      joinedRef.current = true;
      send({
        type: "join",
        payload: {
          participant_id: participantId,
          display_name: displayName,
        },
      });
    }

    // Reset join flag when disconnected so we re-join on reconnect
    if (status === "disconnected") {
      joinedRef.current = false;
    }
  }, [status, participantId, displayName, send]);

  // Parse incoming sync messages and update local state
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === "sync") {
      const payload = lastMessage.payload as SyncPayload;
      setRestaurantId(payload.restaurant_id);
      setInviteLink(payload.invite_link);
      setParticipants(payload.participants);
      setCart(payload.cart);
      setEtaMinutes(payload.eta_minutes);
    }
  }, [lastMessage]);

  // addItem: optimistic update + WS message
  const addItem = useCallback(
    (item: Omit<CartItem, "id">) => {
      const id = generateUUID();
      const newItem: CartItem = { ...item, id };

      // Optimistic update
      setCart((prev) => [...prev, newItem]);

      // Send WS message
      send({
        type: "add_item",
        payload: {
          id,
          menu_item_id: item.menu_item_id,
          menu_item_name: item.menu_item_name,
          price: item.price,
          participant_id: item.participant_id,
          display_name: item.display_name,
          quantity: item.quantity,
          note: item.note,
        },
      });
    },
    [send]
  );

  // updateItem: optimistic update + WS message
  const updateItem = useCallback(
    (id: string, patch: Partial<Pick<CartItem, "quantity" | "note">>) => {
      // Optimistic update
      setCart((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
      );

      // Send WS message
      send({
        type: "update_item",
        payload: {
          id,
          ...patch,
        },
      });
    },
    [send]
  );

  // removeItem: optimistic update + WS message
  const removeItem = useCallback(
    (id: string) => {
      // Optimistic update
      setCart((prev) => prev.filter((item) => item.id !== id));

      // Send WS message
      send({
        type: "remove_item",
        payload: { id },
      });
    },
    [send]
  );

  // setEta: optimistic update + WS message
  const setEta = useCallback(
    (minutes: number) => {
      // Optimistic update
      setEtaMinutes(minutes);

      // Send WS message
      send({
        type: "set_eta",
        payload: { eta_minutes: minutes },
      });
    },
    [send]
  );

  return {
    sessionId,
    restaurantId,
    inviteLink,
    participants,
    cart,
    etaMinutes,
    connectionStatus: status,
    lastCloseCode,
    addItem,
    updateItem,
    removeItem,
    setEta,
  };
}
