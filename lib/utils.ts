import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { CartItem } from "./types";

// shadcn/ui standard cn utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns the initials derived from a display name.
 * Takes the first letter of each whitespace-separated word, up to 2 letters, in uppercase.
 *
 * Examples:
 *   "Alex Johnson"       → "AJ"
 *   "Alex"               → "A"
 *   "alex johnson smith" → "AJ"
 *   ""                   → ""
 */
export function getInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

/**
 * Formats a numeric price as a USD string with 2 decimal places.
 *
 * Examples:
 *   12.5  → "$12.50"
 *   0     → "$0.00"
 *   9.99  → "$9.99"
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Computes the subtotal for a cart by summing price × quantity for each item,
 * rounded to 2 decimal places.
 *
 * Examples:
 *   [{ price: 10, quantity: 2 }, { price: 5.5, quantity: 1 }] → 25.50
 *   []                                                         → 0
 */
export function computeSubtotal(
  cart: Array<Pick<CartItem, "price" | "quantity">>
): number {
  const raw = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return Math.round(raw * 100) / 100;
}
