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

export function useDiningSession(
  options: UseDiningSessionOptions
): DiningSessionState {
  const { sessionId, participantId, displayName } = options;

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

  // Queue of WS messages to flush once connected + joined
  const pendingMessagesRef = useRef<object[]>([]);

  // Flush queued messages after join
  const flushPending = useCallback(() => {
    const msgs = pendingMessagesRef.current;
    if (msgs.length === 0) return;
    pendingMessagesRef.current = [];
    for (const msg of msgs) {
      send(msg);
    }
  }, [send]);

  // Send join message when connected, then flush any queued messages
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
      // Flush queued messages after a short delay to ensure join is processed first
      setTimeout(flushPending, 100);
    }

    if (status === "disconnected") {
      joinedRef.current = false;
    }
  }, [status, participantId, displayName, send, flushPending]);

  // Parse incoming sync messages — authoritative state from server
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

  // addItem: optimistic update + send (or queue if not yet connected)
  const addItem = useCallback(
    (item: Omit<CartItem, "id">) => {
      const id = generateUUID();
      const newItem: CartItem = { ...item, id };

      // Always optimistically update local state immediately
      setCart((prev) => [...prev, newItem]);

      const msg = {
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
      };

      if (joinedRef.current) {
        send(msg);
      } else {
        // Queue to send once connected + joined
        pendingMessagesRef.current.push(msg);
      }
    },
    [send]
  );

  // updateItem: optimistic update + send
  const updateItem = useCallback(
    (id: string, patch: Partial<Pick<CartItem, "quantity" | "note">>) => {
      setCart((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
      );
      send({ type: "update_item", payload: { id, ...patch } });
    },
    [send]
  );

  // removeItem: optimistic update + send
  const removeItem = useCallback(
    (id: string) => {
      setCart((prev) => prev.filter((item) => item.id !== id));
      send({ type: "remove_item", payload: { id } });
    },
    [send]
  );

  // setEta: optimistic update + send
  const setEta = useCallback(
    (minutes: number) => {
      setEtaMinutes(minutes);
      send({ type: "set_eta", payload: { eta_minutes: minutes } });
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
