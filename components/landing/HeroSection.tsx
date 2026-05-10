"use client";

import { motion } from "framer-motion";

export default function HeroSection() {
  const handleBrowseClick = () => {
    const section = document.getElementById("restaurants");
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <motion.section
      className="flex flex-col items-center justify-center text-center px-4 py-20 md:py-32"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 80, damping: 20 }}
    >
      <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
        <span className="bg-gradient-to-r from-accent-blue via-accent-purple to-accent-cyan bg-clip-text text-transparent">
          Skip the restaurant wait.
        </span>
      </h1>

      <p className="text-base md:text-xl text-white/60 max-w-xl mb-10">
        Order together before you arrive. No waiting, just dining.
      </p>

      <button
        onClick={handleBrowseClick}
        className="px-8 py-3 rounded-xl bg-accent-blue hover:bg-accent-blue/80 text-white font-semibold text-base transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
      >
        Browse Restaurants
      </button>
    </motion.section>
  );
}
