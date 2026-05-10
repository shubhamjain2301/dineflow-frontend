"use client";

import { motion } from "framer-motion";
import type { MenuItem } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 80, damping: 20 },
  },
};

export default function MenuItemCard({ item, onAddToCart }: MenuItemCardProps) {
  return (
    <motion.div
      className="bg-base-surface/60 backdrop-blur-md border border-base-border rounded-2xl shadow-lg shadow-black/30 p-5 flex flex-col gap-3"
      variants={cardVariants}
      whileHover={{ scale: 1.01 }}
    >
      <div className="flex-1">
        <h3 className="text-base font-semibold text-white mb-1 truncate">
          {item.name}
        </h3>
        <p className="text-sm text-white/50 line-clamp-2">{item.description}</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-accent-blue font-semibold text-sm">
          {formatPrice(item.price)}
        </span>
        <button
          onClick={() => onAddToCart(item)}
          className="px-4 py-1.5 rounded-xl bg-accent-blue hover:bg-accent-blue/80 text-white text-sm font-medium transition-colors"
        >
          Add to Cart
        </button>
      </div>
    </motion.div>
  );
}
