import { notFound } from "next/navigation";
import { getMenu, getRestaurant } from "@/lib/api";
import PrepTimeIndicator from "@/components/restaurant/PrepTimeIndicator";
import RestaurantPageClient from "./RestaurantPageClient";
import PageTransition from "@/components/ui/PageTransition";
import type { Restaurant, MenuItem } from "@/lib/types";

interface RestaurantPageProps {
  params: Promise<{ restaurantId: string }>;
}

export default async function RestaurantPage({ params }: RestaurantPageProps) {
  const { restaurantId } = await params;

  // Fetch restaurant details and menu items in parallel
  let restaurant: Restaurant | undefined;
  let menuItems: MenuItem[] = [];

  try {
    const [restaurantData, items] = await Promise.all([
      getRestaurant(restaurantId),
      getMenu(restaurantId),
    ]);

    restaurant = restaurantData ?? undefined;
    menuItems = items;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[RestaurantPage] fetch failed for ${restaurantId}:`, message);
    // Only treat genuine 404s as not-found — let other errors surface
    if (message.includes("404") || message.toLowerCase().includes("not found")) {
      notFound();
    }
    // For network/server errors, continue with empty menu
    menuItems = [];
  }

  // Restaurant not found — show the Next.js not-found page
  if (!restaurant) {
    notFound();
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
