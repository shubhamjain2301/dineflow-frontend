"use client";

import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Restaurant } from "@/lib/types";

interface RestaurantCardProps {
  restaurant: Restaurant;
  index: number;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 80, damping: 20 },
  },
};

export default function RestaurantCard({ restaurant, index }: RestaurantCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/restaurant/${restaurant.id}`);
  };

  return (
    <motion.div
      className="bg-base-surface/60 backdrop-blur-md border border-base-border rounded-2xl shadow-lg shadow-black/30 p-6 cursor-pointer"
      variants={cardVariants}
      whileHover={{ scale: 1.02 }}
      onClick={handleClick}
    >
      <h2 className="text-lg font-semibold text-white mb-1 truncate">
        {restaurant.name}
      </h2>

      <p className="text-sm text-white/50 mb-4 truncate">{restaurant.cuisine}</p>

      <div className="flex items-center gap-1.5 text-white/40 text-sm">
        <Clock className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        <span>{restaurant.prep_time} min prep</span>
      </div>
    </motion.div>
  );
}
