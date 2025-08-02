
import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function PowerUpBar({ userPowerUps, onUsePowerUp, gameActive, availablePowerUps }) {
  const allPowerUpTypes = [
    { type: "extra_time", icon: "⏸️", name: "Time Freeze", color: "bg-blue-500 hover:bg-blue-600 border-blue-700" },
    { type: "word_hint", icon: "🔍", name: "Word Hint", color: "bg-purple-500 hover:bg-purple-600 border-purple-700" },
    { type: "swap_board", icon: "🔄", name: "Swap Board", color: "bg-teal-500 hover:bg-teal-600 border-teal-700" },
    { type: "double_score", icon: "💥", name: "Double Score", color: "bg-orange-500 hover:bg-orange-600 border-orange-700" }
  ];

  const powerUpTypes = availablePowerUps 
    ? allPowerUpTypes.filter(p => availablePowerUps.includes(p.type))
    : allPowerUpTypes;

  return (
    <div className="flex justify-center gap-3 my-4">
      {powerUpTypes.map((powerUp) => {
        const count = userPowerUps[powerUp.type] || 0;
        const canUse = count > 0 && gameActive;
        
        return (
          <motion.div
            key={powerUp.type}
            whileHover={{ scale: canUse ? 1.1 : 1 }}
            whileTap={{ scale: canUse ? 0.9 : 1 }}
            className="relative"
          >
            <Button
              onClick={() => canUse && onUsePowerUp(powerUp.type)}
              disabled={!canUse}
              className={`w-14 h-14 rounded-2xl text-2xl font-bold shadow-lg border-b-4 transition-all ${
                canUse 
                  ? `${powerUp.color} text-white`
                  : 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
              }`}
            >
              {powerUp.icon}
            </Button>
            
            {count > 0 && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md">
                {count}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
