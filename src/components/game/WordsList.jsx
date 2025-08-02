import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function WordsList({ foundWords, title }) {
  return (
    <div className="w-full">
      <h3 className="text-center text-gray-600 uppercase font-bold mb-2 text-xs">
        {title || `Found Words`} ({foundWords.length})
      </h3>
      <div className="h-20 bg-white/50 backdrop-blur-sm rounded-2xl p-2 flex flex-wrap content-start items-start gap-1 overflow-y-auto shadow-inner">
        <AnimatePresence>
          {foundWords.map(word => (
            <motion.div
              key={word}
              layout
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="bg-green-200 text-green-800 px-2 py-1 rounded-full font-bold text-xs shadow-sm"
            >
              {word}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}