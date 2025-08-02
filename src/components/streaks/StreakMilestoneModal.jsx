import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Flame, Gift, X } from "lucide-react";

export default function StreakMilestoneModal({ isOpen, onClose, streak, onClaimReward }) {
  if (!isOpen || ![7, 14, 30].includes(streak)) return null;

  const getMilestoneData = (streak) => {
    switch (streak) {
      case 7:
        return {
          title: "🔥 Week Warrior!",
          subtitle: "7 days streak achieved!",
          reward: "50 crystals + 2 power-ups",
          crystals: 50,
          powerups: 2,
          color: "from-orange-400 to-red-500"
        };
      case 14:
        return {
          title: "⚡ Two Week Legend!",
          subtitle: "14 days streak achieved!",
          reward: "100 crystals + 5 power-ups",
          crystals: 100,
          powerups: 5,
          color: "from-purple-400 to-pink-500"
        };
      case 30:
        return {
          title: "👑 Monthly Master!",
          subtitle: "30 days streak achieved!",
          reward: "250 crystals + 10 power-ups",
          crystals: 250,
          powerups: 10,
          color: "from-yellow-400 to-orange-500"
        };
      default:
        return null;
    }
  };

  const milestoneData = getMilestoneData(streak);
  if (!milestoneData) return null;

  const handleClaimReward = async () => {
    try {
      await onClaimReward(milestoneData.crystals, milestoneData.powerups);
      onClose();
    } catch (error) {
      console.error("Failed to claim reward:", error);
    }
  };

  return (
    <AnimatePresence>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-sm bg-white rounded-3xl shadow-2xl border-none p-0 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`bg-gradient-to-br ${milestoneData.color} p-6 text-white text-center relative`}
          >
            {/* Confetti Effect */}
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
                    rotate: [0, 180]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: Math.random() * 2
                  }}
                />
              ))}
            </div>

            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-white/70 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>

            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
            >
              <Flame className="w-16 h-16 mx-auto mb-4" />
            </motion.div>

            <DialogHeader className="text-center mb-6">
              <DialogTitle className="text-3xl font-black mb-2">
                {milestoneData.title}
              </DialogTitle>
              <p className="text-white/90 text-lg">
                {milestoneData.subtitle}
              </p>
            </DialogHeader>

            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Gift className="w-6 h-6" />
                <span className="text-lg font-bold">Streak Reward!</span>
              </div>
              <p className="text-white/90">{milestoneData.reward}</p>
            </div>

            <Button 
              onClick={handleClaimReward}
              className="w-full bg-white text-purple-600 hover:bg-gray-100 font-bold text-lg rounded-2xl py-3"
            >
              Claim Reward! 🎁
            </Button>
          </motion.div>
        </DialogContent>
      </Dialog>
    </AnimatePresence>
  );
}