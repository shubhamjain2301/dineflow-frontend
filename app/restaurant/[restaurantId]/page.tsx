"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getMenu, getRestaurant } from "@/lib/api";
import PrepTimeIndicator from "@/components/restaurant/PrepTimeIndicator";
import RestaurantPageClient from "./RestaurantPageClient";
import PageTransition from "@/components/ui/PageTransition";
import type { Restaurant, MenuItem } from "@/lib/types";

export default function RestaurantPage() {
  const params = useParams();
  const router = useRouter();
  const restaurantId = params.restaurantId as string;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurantId) return;

    Promise.all([getRestaurant(restaurantId), getMenu(restaurantId)])
      .then(([restaurantData, items]) => {
        if (!restaurantData) {
          setError("Restaurant not found");
        } else {
          setRestaurant(restaurantData);
          setMenuItems(items);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load restaurant");
      })
      .finally(() => setLoading(false));
  }, [restaurantId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-base flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-white/40">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-blue border-t-transparent" />
          <p className="text-sm">Loading restaurant…</p>
        </div>
      </main>
    );
  }

  if (error || !restaurant) {
    return (
      <main className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center text-white/60">
          <p className="text-lg font-medium text-white mb-2">Restaurant not found</p>
          <p className="text-sm mb-6">{error ?? "This restaurant does not exist."}</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-xl bg-accent-blue text-white text-sm font-medium hover:opacity-90"
          >
            Back to home
          </button>
        </div>
      </main>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-base text-white">
        {/* Restaurant header */}
        <div className="max-w-6xl mx-auto px-4 pt-12 pb-8">
          <div className="mb-2">
            <span className="text-xs font-medium uppercase tracking-widest text-accent-purple/80">
              {restaurant.cuisine}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            {restaurant.name}
          </h1>

          <p className="text-white/60 text-base max-w-2xl mb-4">
            {restaurant.description}
          </p>

          <PrepTimeIndicator prepTime={restaurant.prep_time} />
        </div>

        {/* Divider */}
        <div className="border-t border-base-border" />

        {/* Menu + client-side cart logic */}
        <div className="max-w-6xl mx-auto px-4 py-10">
          <h2 className="text-xl font-semibold text-white/80 mb-8">Menu</h2>
          <RestaurantPageClient restaurant={restaurant} menuItems={menuItems} />
        </div>
      </main>
    </PageTransition>
  );
}
