import { getRestaurants } from "@/lib/api";
import HeroSection from "@/components/landing/HeroSection";
import RestaurantGrid from "@/components/landing/RestaurantGrid";
import PageTransition from "@/components/ui/PageTransition";
import type { Restaurant } from "@/lib/types";

export default async function Home() {
  let restaurants: Restaurant[] = [];

  try {
    restaurants = await getRestaurants();
  } catch {
    // Gracefully degrade — render empty state rather than crashing
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-base text-white">
        <HeroSection />

        <section
          id="restaurants"
          className="max-w-6xl mx-auto px-4 pb-20"
          aria-label="Restaurant list"
        >
          <h2 className="text-2xl font-semibold mb-8 text-white/80">
            Choose a restaurant
          </h2>
          <RestaurantGrid restaurants={restaurants} />
        </section>
      </main>
    </PageTransition>
  );
}
