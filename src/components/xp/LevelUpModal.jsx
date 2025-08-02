import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Star, Gift, Sparkles } from "lucide-react";

export default function LevelUpModal({ isOpen, onClose, newLevel, isMegaLevel }) {
  if (!isOpen) return null;

  const rewards = isMegaLevel ? 
    { crystals: 100, powerups: 3, title: "Mega Level Up!" } :
    { crystals: 20, powerups: 1, title: "Level Up!" };

  return (
    <AnimatePresence>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-sm bg-white rounded-3xl shadow-2xl border-none p-0 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`bg-gradient-to-br ${isMegaLevel ? 'from-yellow-400 to-orange-500' : 'from-purple-400 to-pink-500'} p-8 text-white text-center relative`}
          >
            {/* Celebration particles */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    backgroundColor: ['#fbbf24', '#ef4444', '#10b981', '#3b82f6'][Math.floor(Math.random() * 4)],
                  }}
                  animate={{
                    opacity: [1, 0],
                    scale: [0, 1, 0],
                    y: [-20, -60]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: Math.random() * 2
                  }}
                />
              ))}
            </div>

            <motion.div
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 0.6, repeat: 2 }}
            >
              {isMegaLevel ? 
                <Sparkles className="w-20 h-20 mx-auto mb-4" /> :
                <Star className="w-16 h-16 mx-auto mb-4" />
              }
            </motion.div>

            <DialogHeader className="text-center mb-6">
              <DialogTitle className="text-4xl font-black mb-2">
                {rewards.title}
              </DialogTitle>
              <p className="text-white/90 text-xl">
                You reached Level {newLevel}!
              </p>
            </DialogHeader>

            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Gift className="w-6 h-6" />
                <span className="text-lg font-bold">Reward Package</span>
              </div>
              <div className="space-y-2">
                <p className="text-white/90">💎 {rewards.crystals} Crystals</p>
                <p className="text-white/90">⚡ {rewards.powerups} Power-up{rewards.powerups > 1 ? 's' : ''}</p>
              </div>
            </div>

            <Button 
              onClick={onClose}
              className="w-full bg-white text-purple-600 hover:bg-gray-100 font-bold text-lg rounded-2xl py-3"
            >
              Collect Reward! 🎁
            </Button>
          </motion.div>
        </DialogContent>
      </Dialog>
    </AnimatePresence>
  );
}