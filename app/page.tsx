"use client";

import { useEffect, useState } from "react";
import { getRestaurants } from "@/lib/api";
import HeroSection from "@/components/landing/HeroSection";
import RestaurantGrid from "@/components/landing/RestaurantGrid";
import PageTransition from "@/components/ui/PageTransition";
import type { Restaurant } from "@/lib/types";

export default function Home() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRestaurants()
      .then(setRestaurants)
      .catch(() => {
        // Gracefully degrade — show empty state
      })
      .finally(() => setLoading(false));
  }, []);

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

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="flex flex-col items-center gap-4 text-white/40">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-blue border-t-transparent" />
                <p className="text-sm">Loading restaurants…</p>
              </div>
            </div>
          ) : (
            <RestaurantGrid restaurants={restaurants} />
          )}
        </section>
      </main>
    </PageTransition>
  );
}
