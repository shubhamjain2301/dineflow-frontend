import { useCallback, useEffect, useRef, useState } from "react";
import type { WsMessage } from "@/lib/types";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface UseWebSocketReturn {
  status: ConnectionStatus;
  send: (message: object) => void;
  lastMessage: WsMessage | null;
  /** Close code from the last WebSocket close event, e.g. 4004 = session not found */
  lastCloseCode: number | null;
}

const MIN_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;

/** Close codes that mean "don't reconnect — the session is gone" */
const FATAL_CLOSE_CODES = new Set([4004]);

export function useWebSocket(url: string | null): UseWebSocketReturn {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);
  const [lastCloseCode, setLastCloseCode] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef<number>(MIN_BACKOFF_MS);
  const mountedRef = useRef<boolean>(true);
  const urlRef = useRef<string | null>(url);
  // Prevent reconnect after a fatal close
  const fatalRef = useRef<boolean>(false);

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
    if (typeof window === "undefined") return;
    if (fatalRef.current) return;

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
      backoffRef.current = MIN_BACKOFF_MS;
    };

    ws.onmessage = (event: MessageEvent) => {
      if (!mountedRef.current) return;
      try {
        const parsed = JSON.parse(event.data as string) as WsMessage;
        // Respond to server pings to keep the connection alive
        if ((parsed as { type: string }).type === "ping") {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "pong" }));
          }
          return;
        }
        setLastMessage(parsed);
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = (event: CloseEvent) => {
      if (!mountedRef.current) return;
      setStatus("disconnected");
      setLastCloseCode(event.code);

      // Fatal close — don't reconnect
      if (FATAL_CLOSE_CODES.has(event.code)) {
        fatalRef.current = true;
        return;
      }

      clearReconnectTimer();
      const delay = backoffRef.current;
      backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);

      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current && urlRef.current && !fatalRef.current) {
          connect();
        }
      }, delay);
    };

    ws.onerror = () => {
      if (!mountedRef.current) return;
      setStatus("disconnected");
    };
  }, [clearReconnectTimer]);

  useEffect(() => {
    mountedRef.current = true;
    fatalRef.current = false;

    if (url) {
      backoffRef.current = MIN_BACKOFF_MS;
      connect();
    } else {
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

  return { status, send, lastMessage, lastCloseCode };
}
