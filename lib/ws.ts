/**
 * WebSocket URL utilities for DineFlow.
 */

const PRODUCTION_WS_URL = "wss://dineflow-backend-yshu.onrender.com";

/**
 * Returns the base WebSocket URL.
 * Uses NEXT_PUBLIC_WS_URL if explicitly set, otherwise the hardcoded production URL.
 * Never falls back to localhost — that caused the production disconnect bug.
 */
export function getWsBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  // Only use the env var if it's set AND points to a real server (not localhost)
  if (explicit && !explicit.includes("localhost")) {
    return explicit.replace(/\/$/, "");
  }
  return PRODUCTION_WS_URL;
}

export function buildSessionWsUrl(sessionId: string): string | null {
  if (!sessionId) return null;
  return `${getWsBaseUrl()}/ws/${sessionId}`;
}

export function buildDashboardWsUrl(restaurantId: string): string | null {
  if (!restaurantId) return null;
  return `${getWsBaseUrl()}/ws/dashboard/${restaurantId}`;
}
