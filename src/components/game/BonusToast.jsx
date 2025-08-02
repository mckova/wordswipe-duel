import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function BonusToast({ bonus, onComplete }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 1500);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2000);

    return () => {
      clearTimeout(timer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  if (!bonus) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          className="fixed top-20 right-4 z-40 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold px-4 py-2 rounded-2xl shadow-lg"
        >
          +{bonus} NEW!
        </motion.div>
      )}
    </AnimatePresence>
  );
}