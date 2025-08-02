
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Gem, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { haptics } from "../utils/HapticFeedback";

const powerUpData = {
  extra_time: { icon: "⏸️", name: "Time Freeze", price: 20 },
  word_hint: { icon: "🔍", name: "Word Hint", price: 30 },
  swap_board: { icon: "🔄", name: "Swap Board", price: 120 },
  double_score: { icon: "💥", name: "Double Score", price: 100 }
};

export default function PowerUpHUD({ 
  userPowerUps, 
  userCrystals, 
  onUsePowerUp, 
  onBuyPowerUp,
  gameActive 
}) {
  const [showBuyModal, setShowBuyModal] = useState(null);
  const [isShaking, setIsShaking] = useState(null);

  const handlePowerUpClick = (powerUpType) => {
    if (!gameActive) return;
    
    haptics.impact();
    
    const count = userPowerUps[powerUpType] || 0;
    
    if (count > 0) {
      onUsePowerUp(powerUpType);
    } else {
      setShowBuyModal(powerUpType);
    }
  };

  const handleBuy = async (powerUpType) => {
    const price = powerUpData[powerUpType].price;
    
    if (userCrystals < price) {
      haptics.warning();
      setIsShaking(powerUpType);
      setTimeout(() => setIsShaking(null), 500);
      return;
    }
    
    try {
      haptics.success();
      await onBuyPowerUp(powerUpType, price);
      setShowBuyModal(null);
    } catch (error) {
      haptics.warning();
      console.error("Failed to buy power-up:", error);
    }
  };

  return (
    <>
      <div className="flex justify-center items-center gap-1 sm:gap-1.5">
        {Object.entries(powerUpData).map(([type, data]) => {
          const count = userPowerUps[type] || 0;
          const canUse = count > 0 && gameActive;
          
          return (
            <motion.button
              key={type}
              onClick={() => handlePowerUpClick(type)}
              whileHover={{ scale: gameActive ? 1.05 : 1 }}
              whileTap={{ scale: gameActive ? 0.95 : 1 }}
              className={`
                relative flex items-center justify-center rounded-xl shadow-md 
                transition-all touch-manipulation
                w-9 h-9 sm:w-10 sm:h-10 min-h-[36px] min-w-[36px]
                ${canUse 
                  ? 'bg-white/90 hover:bg-white' 
                  : gameActive
                    ? 'bg-white/70 hover:bg-white/80'
                    : 'bg-gray-300 cursor-not-allowed'
                }
              `}
              disabled={!gameActive}
              style={{ 
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <span className="text-sm sm:text-base">{data.icon}</span>
              
              {count > 0 ? (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                  {count}
                </div>
              ) : gameActive && (
                <div className="absolute -top-0.5 -right-0.5 flex items-center gap-0.5 bg-blue-500 text-white rounded-full px-1 py-0.5 text-xs font-bold shadow-sm">
                  <Gem className="w-1.5 h-1.5" />
                  <span className="text-xs leading-none">{data.price}</span>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {showBuyModal && (
          <Dialog open={!!showBuyModal} onOpenChange={() => setShowBuyModal(null)}>
            <DialogContent className="max-w-xs bg-white rounded-3xl shadow-2xl border-none">
              <motion.div
                animate={{ 
                  x: isShaking === showBuyModal ? [-5, 5, -5, 5, 0] : 0 
                }}
                transition={{ duration: 0.5 }}
              >
                <DialogHeader className="text-center pb-4">
                  <div className="text-6xl mb-2">{powerUpData[showBuyModal].icon}</div>
                  <DialogTitle className="text-2xl font-bold text-purple-800">
                    {powerUpData[showBuyModal].name}
                  </DialogTitle>
                </DialogHeader>

                <div className="text-center mb-6">
                  <p className="text-gray-600 mb-4">Buy for</p>
                  <div className="flex items-center justify-center gap-2 text-3xl font-bold text-blue-600">
                    <Gem className="w-8 h-8" />
                    <span>{powerUpData[showBuyModal].price}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Your crystals: {userCrystals}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowBuyModal(null)}
                    className="flex-1 rounded-2xl"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => handleBuy(showBuyModal)}
                    disabled={userCrystals < powerUpData[showBuyModal].price}
                    className={`flex-1 rounded-2xl text-white font-bold ${
                      userCrystals >= powerUpData[showBuyModal].price
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Buy
                  </Button>
                </div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
}
