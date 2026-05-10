import { useCallback, useEffect, useRef, useState } from "react";
import type { WsMessage } from "@/lib/types";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface UseWebSocketReturn {
  status: ConnectionStatus;
  send: (message: object) => void;
  lastMessage: WsMessage | null;
}

const MIN_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;

export function useWebSocket(url: string | null): UseWebSocketReturn {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);

  // Use refs to avoid stale closures in event handlers
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef<number>(MIN_BACKOFF_MS);
  // Track whether the hook is still mounted so we don't reconnect after unmount
  const mountedRef = useRef<boolean>(true);
  // Keep a stable ref to the current url so the connect closure always sees the latest value
  const urlRef = useRef<string | null>(url);

  useEffect(() => {
    urlRef.current = url;
  }, [url]);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    // Guard against SSR
    if (typeof window === "undefined") return;

    const currentUrl = urlRef.current;
    if (!currentUrl) return;

    // Close any existing socket before opening a new one
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus("connecting");

    const ws = new WebSocket(currentUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setStatus("connected");
      // Reset backoff on successful connection
      backoffRef.current = MIN_BACKOFF_MS;
    };

    ws.onmessage = (event: MessageEvent) => {
      if (!mountedRef.current) return;
      try {
        const parsed = JSON.parse(event.data as string) as WsMessage;
        setLastMessage(parsed);
      } catch {
        // Ignore malformed messages
      }
    };

    const scheduleReconnect = () => {
      if (!mountedRef.current) return;
      setStatus("disconnected");

      clearReconnectTimer();
      const delay = backoffRef.current;
      // Advance backoff: double it, capped at MAX_BACKOFF_MS
      backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);

      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current && urlRef.current) {
          connect();
        }
      }, delay);
    };

    ws.onclose = () => {
      scheduleReconnect();
    };

    ws.onerror = () => {
      // onerror is always followed by onclose, so we let onclose handle reconnect
      // but we still mark as disconnected immediately for UI feedback
      if (!mountedRef.current) return;
      setStatus("disconnected");
    };
  }, [clearReconnectTimer]);

  // Connect / disconnect when url changes
  useEffect(() => {
    mountedRef.current = true;

    if (url) {
      // Reset backoff whenever we get a new URL
      backoffRef.current = MIN_BACKOFF_MS;
      connect();
    } else {
      // No URL — close any open socket and stay disconnected
      clearReconnectTimer();
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      setStatus("disconnected");
    }

    return () => {
      mountedRef.current = false;
      clearReconnectTimer();
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const send = useCallback((message: object) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(message));
  }, []);

  return { status, send, lastMessage };
}
