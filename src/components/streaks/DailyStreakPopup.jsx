import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Flame, Calendar, X } from "lucide-react";

export default function DailyStreakPopup({ isOpen, onClose, streak }) {
  if (!isOpen) return null;

  const getStreakMessage = (streak) => {
    if (streak === 1) {
      return {
        title: "🎉 Welcome Back!",
        subtitle: "Started a new login streak",
        message: "Log in daily to maintain your streak and earn special rewards!",
        color: "from-green-400 to-emerald-500"
      };
    } else {
      return {
        title: `🔥 ${streak} Day Streak!`,
        subtitle: "Great consistency!",
        message: streak < 7 ? 
          `${7 - streak} more days until first reward!` :
          streak < 14 ?
          `${14 - streak} more days until next reward!` :
          streak < 30 ?
          `${30 - streak} more days until big reward!` :
          "You're a true champion! Keep it up!",
        color: "from-orange-400 to-red-500"
      };
    }
  };

  const streakData = getStreakMessage(streak);

  return (
    <AnimatePresence>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-sm bg-white rounded-3xl shadow-2xl border-none p-0 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`bg-gradient-to-br ${streakData.color} p-6 text-white text-center`}
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Flame className="w-6 h-6" />
                <span className="font-bold">Login Streak</span>
              </div>
              <Button 
                onClick={onClose}
                variant="ghost" 
                size="icon"
                className="text-white hover:bg-white/20 rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <h2 className="text-2xl font-black mb-2">{streakData.title}</h2>
            <p className="text-lg font-semibold mb-4 opacity-90">{streakData.subtitle}</p>
            <p className="text-sm mb-6 opacity-80">{streakData.message}</p>

            {/* Progress visualization */}
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-6">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Calendar className="w-5 h-5" />
                <span className="text-sm font-bold">Current Streak</span>
              </div>
              <div className="text-4xl font-black">{streak}</div>
              <div className="text-sm text-white/70">consecutive days</div>
              
              {/* Next milestone indicator */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-white/60 mb-1">
                  <span>Today</span>
                  <span>
                    {streak < 7 ? 'Day 7' : 
                     streak < 14 ? 'Day 14' : 
                     streak < 30 ? 'Day 30' : 'Champion!'}
                  </span>
                </div>
                <div className="bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-white rounded-full h-2 transition-all duration-500"
                    style={{ 
                      width: `${Math.min(100, (streak / (
                        streak < 7 ? 7 : 
                        streak < 14 ? 14 : 
                        streak < 30 ? 30 : 30
                      )) * 100)}%` 
                    }}
                  />
                </div>
              </div>
            </div>

            <Button 
              onClick={onClose}
              className="w-full bg-white text-purple-600 hover:bg-gray-100 font-bold text-lg rounded-2xl py-3"
            >
              Continue to Game! 🎮
            </Button>
          </motion.div>
        </DialogContent>
      </Dialog>
    </AnimatePresence>
  );
}