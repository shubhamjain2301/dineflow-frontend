import type {
  Restaurant,
  MenuItem,
  GroupOrder,
  OrderStatus,
} from "./types";

// Server-side: use BACKEND_URL (not exposed to browser, used by Vercel SSR)
// Client-side: use NEXT_PUBLIC_API_URL (baked into the browser bundle)
// Hardcoded fallback ensures SSR never fails due to missing env vars
const API_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://dineflow-backend-yshu.onrender.com";

/**
 * Shared fetch helper. Throws an Error with the backend `detail` message
 * on any non-2xx response.
 */
async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // ignore JSON parse errors — keep the status-based message
    }
    throw new Error(detail);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Payload types
// ---------------------------------------------------------------------------

export interface OrderItemPayload {
  menu_item_id: string;
  menu_item_name: string;
  price: number;
  participant_id: string;
  display_name: string;
  quantity: number;
  note?: string;
}

export interface ConfirmOrderPayload {
  session_id: string;
  restaurant_id: string;
  eta_minutes: number | null;
  items: OrderItemPayload[];
}

// ---------------------------------------------------------------------------
// REST API wrappers
// ---------------------------------------------------------------------------

/** GET /api/restaurants → Restaurant[] */
export async function getRestaurants(): Promise<Restaurant[]> {
  return apiFetch<Restaurant[]>("/api/restaurants");
}

/**
 * GET /api/restaurants → find by id
 * Fetches all restaurants and returns the one matching the given ID,
 * or null if not found.
 */
export async function getRestaurant(restaurantId: string): Promise<Restaurant | null> {
  const restaurants = await apiFetch<Restaurant[]>("/api/restaurants");
  return restaurants.find((r) => r.id === restaurantId) ?? null;
}

/** GET /api/restaurants/{restaurantId}/menu → MenuItem[] */
export async function getMenu(restaurantId: string): Promise<MenuItem[]> {
  return apiFetch<MenuItem[]>(`/api/restaurants/${restaurantId}/menu`);
}

/** POST /api/sessions → { session_id: string; invite_link: string } */
export async function createSession(
  restaurantId: string
): Promise<{ session_id: string; invite_link: string }> {
  return apiFetch<{ session_id: string; invite_link: string }>("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ restaurant_id: restaurantId }),
  });
}

/** POST /api/orders → { id: string; status: string } */
export async function confirmOrder(
  payload: ConfirmOrderPayload
): Promise<{ id: string; status: string }> {
  return apiFetch<{ id: string; status: string }>("/api/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** PATCH /api/orders/{orderId}/status → { id: string; status: string } */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<{ id: string; status: string }> {
  return apiFetch<{ id: string; status: string }>(
    `/api/orders/${orderId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );
}

/** GET /api/orders?restaurant_id={restaurantId} → GroupOrder[] */
export async function getOrders(restaurantId: string): Promise<GroupOrder[]> {
  return apiFetch<GroupOrder[]>(
    `/api/orders?restaurant_id=${encodeURIComponent(restaurantId)}`
  );
}
