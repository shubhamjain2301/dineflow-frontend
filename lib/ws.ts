/**
 * WebSocket URL utilities for DineFlow.
 *
 * Handles the ws:// (local) vs wss:// (production) distinction automatically.
 * The NEXT_PUBLIC_WS_URL env var should already contain the correct scheme,
 * but this helper also provides a safe fallback derivation from the API URL.
 */

/**
 * Returns the base WebSocket URL from environment variables.
 *
 * Priority:
 *  1. NEXT_PUBLIC_WS_URL  — explicit WS base URL (preferred)
 *  2. Derived from NEXT_PUBLIC_API_URL by swapping http(s) → ws(s)
 *  3. Hardcoded production Render URL (matches the API_URL fallback in api.ts)
 */
export function getWsBaseUrl(): string {
  // Explicit WS URL takes priority
  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  // Derive from API URL if available
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    return apiUrl
      .replace(/\/$/, "")
      .replace(/^https:\/\//, "wss://")
      .replace(/^http:\/\//, "ws://");
  }

  // Production fallback — same backend as api.ts hardcoded fallback
  return "wss://dineflow-backend-yshu.onrender.com";
}

/**
 * Builds a full WebSocket URL for a session room.
 * e.g. wss://dineflow-backend-yshu.onrender.com/ws/abc-123
 */
export function buildSessionWsUrl(sessionId: string): string | null {
  if (!sessionId) return null;
  return `${getWsBaseUrl()}/ws/${sessionId}`;
}

/**
 * Builds a full WebSocket URL for the restaurant dashboard room.
 * e.g. wss://dineflow-backend-yshu.onrender.com/ws/dashboard/rest-456
 */
export function buildDashboardWsUrl(restaurantId: string): string | null {
  if (!restaurantId) return null;
  return `${getWsBaseUrl()}/ws/dashboard/${restaurantId}`;
}
