
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Home, RotateCcw, Trophy, Star, Gift, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { User } from "@/api/entities";
import { calculateLevel, getXpForNextLevel, getProgressToNextLevel } from "../components/xp/XPSystem";
import LevelUpModal from "../components/xp/LevelUpModal";

export default function GameResult() {
  const navigate = useNavigate();
  const [params, setParams] = useState(null);
  const [adWatched, setAdWatched] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [levelUpData, setLevelUpData] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [adEligible, setAdEligible] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const score = urlParams.get('score');
    if (score === null) {
      navigate(createPageUrl("Home"));
      return;
    }

    setParams({
      score: parseInt(score),
      words: parseInt(urlParams.get('words')),
      crystals: parseInt(urlParams.get('crystals')),
    });

    // בדוק אם זה משחק חדש או רענון של דף קיים
    const currentGameId = localStorage.getItem('currentGameId');
    const watchedAds = JSON.parse(localStorage.getItem('watchedAds') || '[]');
    
    if (currentGameId) {
      setGameId(currentGameId);
      // בדוק אם כבר צפו בפרסומת למשחק הזה
      const alreadyWatched = watchedAds.includes(currentGameId);
      setAdWatched(alreadyWatched);
      setAdEligible(!alreadyWatched);
    } else {
      // אם אין game ID, זה אומר שזה רענון או גישה ישירה לדף
      setAdEligible(false);
      setAdWatched(true);
    }

    const loadUserData = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);

        // בדוק אם הייתה עליית רמה במשחק הקודם
        const storedLevelUpData = localStorage.getItem('lastGameLevelUpData');
        if (storedLevelUpData) {
          const parsedData = JSON.parse(storedLevelUpData);
          if (parsedData.newLevel > parsedData.oldLevel) {
            setLevelUpData({ 
              newLevel: parsedData.newLevel, 
              isMegaLevel: parsedData.newLevel % 10 === 0
            });
            setShowLevelUpModal(true);
          }
          localStorage.removeItem('lastGameLevelUpData');
        }
      } catch (e) {
        console.error("Failed to load user data or level up info:", e);
      }
    };
    loadUserData();

  }, [navigate]);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleWatchAd = async () => {
    if (adWatched || !adEligible || !gameId) return;

    setIsWatchingAd(true);

    setTimeout(async () => {
      try {
        const currentUser = await User.me();
        const currentCrystals = currentUser.crystals || 0;
        await User.updateMyUserData({ crystals: currentCrystals + 30 });
        
        // סמן שצפו בפרסומת למשחק הזה
        const watchedAds = JSON.parse(localStorage.getItem('watchedAds') || '[]');
        watchedAds.push(gameId);
        localStorage.setItem('watchedAds', JSON.stringify(watchedAds));
        
        // נקה את ה-game ID הנוכחי
        localStorage.removeItem('currentGameId');
        
        showToast("+30 crystals!");
        setCurrentUser(prev => ({ ...prev, crystals: currentCrystals + 30 }));
        setAdWatched(true);
        
        // חזור לדף הבית אחרי 2 שניות
        setTimeout(() => {
          navigate(createPageUrl("Home"));
        }, 2000);
        
      } catch (e) {
        console.error("Failed to update crystals:", e);
        showToast("Error adding crystals.");
      }
      
      setIsWatchingAd(false);
    }, 5000);
  };

  // נקה game IDs ישנים (מעל 24 שעות)
  useEffect(() => {
    const cleanupOldGameIds = () => {
      const watchedAds = JSON.parse(localStorage.getItem('watchedAds') || '[]');
      const now = Date.now();
      const oneDayAgo = now - (24 * 60 * 60 * 1000);
      
      const validAds = watchedAds.filter(adId => {
        const parts = adId.split('_');
        if (parts.length >= 3) {
          const timestamp = parseInt(parts[2]);
          return timestamp > oneDayAgo;
        }
        return false;
      });
      
      localStorage.setItem('watchedAds', JSON.stringify(validAds));
    };
    
    cleanupOldGameIds();
  }, []);

  if (!params) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
      </div>
    );
  }

  const { score, words, crystals } = params;
  const userXP = currentUser?.xp || 0;
  const userLevel = currentUser?.level || 1;
  const progressToNextLevel = getProgressToNextLevel(userXP, userLevel);
  const xpNeededForNext = getXpForNextLevel(userLevel);

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center p-4 text-center text-gray-800 relative overflow-hidden">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl text-white font-bold z-50 shadow-lg bg-green-500"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Confetti Effect - צומצם */}
      {score > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${20 + Math.random() * 60}%`, // הגבל את הקונפטי לחלק התחתון
                backgroundColor: ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6'][Math.floor(Math.random() * 5)],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Level Up Modal */}
      <LevelUpModal
        isOpen={showLevelUpModal}
        onClose={() => setShowLevelUpModal(false)}
        newLevel={levelUpData?.newLevel}
        isMegaLevel={levelUpData?.isMegaLevel}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2, type: 'spring' }}
        className="relative z-10 w-full max-w-sm mx-auto"
      >
        {/* Trophy - קטן יותר */}
        <motion.div
          animate={{ rotate: [-10, 10, -10], transition: { duration: 2, repeat: Infinity, repeatType: 'mirror' } }}
        >
          <Trophy className="w-16 h-16 sm:w-20 sm:h-20 text-yellow-500 drop-shadow-lg mx-auto mb-3 sm:mb-4" />
        </motion.div>
        
        {/* כותרות - קטנות יותר */}
        <h1 className="text-2xl sm:text-4xl font-black text-purple-700 uppercase drop-shadow-md mb-1">Game Over!</h1>
        <p className="text-gray-600 text-xs sm:text-sm mb-4 sm:mb-5">Great game! Here are your results:</p>

        {/* הריבוע הלבן - קטן הרבה יותר */}
        <div className="bg-white/70 backdrop-blur-sm p-3 sm:p-5 rounded-3xl mb-3 sm:mb-4 w-full mx-auto flex flex-col gap-3 sm:gap-4 shadow-xl">
          <div className="text-center">
            <p className="text-sm sm:text-lg text-purple-500 font-bold uppercase">Score</p>
            <p className="text-4xl sm:text-6xl font-black text-purple-800 drop-shadow-md">{score.toLocaleString()}</p>
          </div>
          <div className="flex justify-around">
            <div className="text-center">
              <p className="text-xs sm:text-sm text-rose-500 font-bold uppercase">Words</p>
              <p className="text-2xl sm:text-3xl font-black">{words}</p>
            </div>
            <div className="text-center">
              <p className="text-xs sm:text-sm text-sky-500 font-bold uppercase">Crystals</p>
              <p className="text-2xl sm:text-3xl font-black">💎 {crystals}</p>
            </div>
          </div>

          {/* XP Progress Section - קומפקטי יותר */}
          {currentUser && (
            <div className="mt-2 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Star className="w-4 h-4 text-purple-500" />
                <p className="text-sm sm:text-lg text-purple-500 font-bold uppercase">Level {userLevel}</p>
              </div>
              <p className="text-xs text-gray-600 mb-2">
                {userXP.toLocaleString()} XP {xpNeededForNext ? `/ ${xpNeededForNext.toLocaleString()} to next level` : '(Max Level!)'}
              </p>
              {xpNeededForNext && (
                <div className="bg-purple-200 rounded-full h-2 mb-1">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressToNextLevel.progress}%` }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full h-2"
                  />
                </div>
              )}
              <p className="text-xs text-gray-500">
                {progressToNextLevel.needed > 0 ? `${progressToNextLevel.needed} XP to next level` : 'Level maxed!'}
              </p>
            </div>
          )}
        </div>

        {/* כפתור פרסומת - רק אם זכאי */}
        {adEligible && (
          <div className="mb-4 sm:mb-5">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={handleWatchAd}
                disabled={adWatched || isWatchingAd}
                className="w-full text-sm sm:text-base font-bold rounded-2xl px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-pink-500 to-yellow-500 text-white shadow-lg border-b-4 border-pink-700 disabled:bg-gray-400 disabled:border-gray-500 disabled:from-gray-400 disabled:to-gray-500"
              >
                {isWatchingAd ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin w-4 h-4" />
                    <span>Watching Ad...</span>
                  </div>
                ) : adWatched ? (
                  "Thanks for watching!"
                ) : (
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4" />
                    <span>Watch ad for +30 crystals</span>
                  </div>
                )}
              </Button>
            </motion.div>
          </div>
        )}

        {/* כפתורי פעולות - מעט מרווח */}
        <div className="flex flex-col gap-2 sm:gap-3 w-full">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              onClick={() => navigate(createPageUrl("Game"))}
              className="w-full h-12 sm:h-14 text-base sm:text-lg font-bold rounded-2xl bg-green-500 hover:bg-green-600 text-white shadow-lg border-b-4 border-green-700"
            >
              <RotateCcw className="mr-2 w-4 h-4 sm:w-5 sm:h-5" />
              Play Again
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              onClick={() => navigate(createPageUrl("Home"))}
              variant="outline" 
              className="w-full h-10 sm:h-12 text-sm sm:text-base font-bold rounded-2xl bg-white/80 hover:bg-white text-gray-700 border-2 border-gray-300 shadow-md"
            >
              <Home className="mr-2 w-4 h-4 sm:w-5 sm:h-5" />
              Back Home
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
