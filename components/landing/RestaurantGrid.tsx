"use client";

import { motion } from "framer-motion";
import type { Restaurant } from "@/lib/types";
import RestaurantCard from "./RestaurantCard";

interface RestaurantGridProps {
  restaurants: Restaurant[];
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
    },
  },
};

export default function RestaurantGrid({ restaurants }: RestaurantGridProps) {
  if (restaurants.length === 0) {
    return (
      <p className="text-center text-white/40 py-16">
        No restaurants available right now. Check back soon.
      </p>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {restaurants.map((restaurant) => (
        <RestaurantCard key={restaurant.id} restaurant={restaurant} />
      ))}
    </motion.div>
  );
}
