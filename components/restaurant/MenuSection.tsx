"use client";

import { motion } from "framer-motion";
import type { MenuItem } from "@/lib/types";
import MenuItemCard from "./MenuItemCard";

interface MenuSectionProps {
  items: MenuItem[];
  onAddToCart: (item: MenuItem) => void;
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
    },
  },
};

export default function MenuSection({ items, onAddToCart }: MenuSectionProps) {
  // Group items by category, preserving insertion order
  const grouped = items.reduce<Map<string, MenuItem[]>>((map, item) => {
    const group = map.get(item.category) ?? [];
    group.push(item);
    map.set(item.category, group);
    return map;
  }, new Map());

  return (
    <div className="flex flex-col gap-10">
      {Array.from(grouped.entries()).map(([category, categoryItems]) => (
        <section key={category}>
          <h2 className="text-lg font-semibold text-white/70 mb-4">
            {category}
          </h2>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {categoryItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                onAddToCart={onAddToCart}
              />
            ))}
          </motion.div>
        </section>
      ))}
    </div>
  );
}
