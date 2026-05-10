// Restaurant and menu
export interface Restaurant {
  id: string;
  name: string;
  description: string;
  cuisine: string;
  prep_time: number;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
}

// Session participants and cart
export interface Participant {
  id: string;
  display_name: string;
}

export interface CartItem {
  id: string;
  menu_item_id: string;
  menu_item_name: string;
  price: number;
  participant_id: string;
  display_name: string;
  quantity: number;
  note: string;
}

// Dining session state
export interface DiningSession {
  session_id: string;
  restaurant_id: string;
  invite_link: string;
  participants: Participant[];
  cart: CartItem[];
  eta_minutes: number | null;
}

// Orders
export type OrderStatus = "pending" | "preparing" | "ready";

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  menu_item_name?: string;
  participant_id: string;
  display_name: string;
  quantity: number;
  note: string;
}

export interface GroupOrder {
  id: string;
  restaurant_id: string;
  session_id: string;
  eta_minutes: number | null;
  status: OrderStatus;
  created_at: string;
  items: OrderItem[];
}

// WebSocket message types
export interface SyncPayload {
  session_id: string;
  restaurant_id: string;
  invite_link: string;
  participants: Participant[];
  cart: CartItem[];
  eta_minutes: number | null;
}

export interface StatusUpdatePayload {
  order_id: string;
  status: OrderStatus;
}

export type WsMessage =
  | { type: "sync"; payload: SyncPayload }
  | { type: "new_order"; payload: GroupOrder }
  | { type: "status_update"; payload: StatusUpdatePayload }
  | { type: "error"; payload: { message: string } };
