import { notFound } from "next/navigation";
import { getMenu, getRestaurant } from "@/lib/api";
import PrepTimeIndicator from "@/components/restaurant/PrepTimeIndicator";
import RestaurantPageClient from "./RestaurantPageClient";
import PageTransition from "@/components/ui/PageTransition";

interface RestaurantPageProps {
  params: Promise<{ restaurantId: string }>;
}

export default async function RestaurantPage({ params }: RestaurantPageProps) {
  const { restaurantId } = await params;

  const [restaurant, menuItems] = await Promise.all([
    getRestaurant(restaurantId),
    getMenu(restaurantId).catch(() => []),
  ]);

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
