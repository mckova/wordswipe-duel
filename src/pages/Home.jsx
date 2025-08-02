
import React, { useState, useEffect, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { User } from "@/api/entities";
import { haptics } from "../components/utils/HapticFeedback";

// Lazy load heavy components
const LoginStreakManager = lazy(() => import("../components/streaks/LoginStreakManager"));
const StreakMilestoneModal = lazy(() => import("../components/streaks/StreakMilestoneModal"));
const DailyStreakPopup = lazy(() => import("../components/streaks/DailyStreakPopup"));
const LevelUpModal = lazy(() => import("../components/xp/LevelUpModal"));
const OnboardingTutorial = lazy(() => import("../components/onboarding/OnboardingTutorial"));

const ONBOARDING_KEY = "wordSwipeOnboardingCompleted";
const TUTORIAL_KEY = "wordSwipeTutorialSeen";

const slides = [
  {
    title: "Swipe letters to form words",
    text: "Drag your finger across adjacent tiles to create a valid English word.",
    emoji: "✍️",
  },
  {
    title: "Longer words = more points",
    text: "Standard words are 30 pts. Get 60 pts for 5+ letters, and a massive 90 pts for 8+ letters!",
    emoji: "💯",
  },
  {
    title: "Beat the clock & opponent",
    text: "Fill the progress bar before your rival or the timer hits zero.",
    emoji: "⏱️⚔️",
  },
];

function Tutorial({ onClose }) {
  const [idx, setIdx] = useState(0);
  const [dontShow, setDontShow] = useState(false);
  const isLast = idx === slides.length - 1;

  const next = () => setIdx((i) => (isLast ? i : i + 1));
  const prev = () => setIdx((i) => (i === 0 ? 0 : i - 1));

  const { title, text, emoji } = slides[idx];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white w-11/12 max-w-lg p-8 rounded-3xl shadow-2xl text-center select-none"
      >
        <div className="text-5xl mb-4">{emoji}</div>
        <h2 className="text-2xl font-extrabold text-purple-700 mb-2">{title}</h2>
        <p className="text-gray-700 mb-8 leading-relaxed">{text}</p>

        <div className="flex justify-center gap-2 mb-6">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-3 w-3 rounded-full ${i === idx ? "bg-purple-600" : "bg-gray-300"}`}
            />
          ))}
        </div>

        <div className="flex justify-between items-center gap-4 mb-6">
          <Button
            onClick={prev}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700"
            disabled={idx === 0}
          >
            Prev
          </Button>
          <Button
            onClick={isLast ? () => onClose(dontShow) : next}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isLast ? "Start" : "Next"}
          </Button>
        </div>

        <label className="flex items-center gap-2 justify-center text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={dontShow}
            onChange={(e) => setDontShow(e.target.checked)}
            className="h-4 w-4 text-purple-600 rounded"
          />
          Don't show again
        </label>
      </motion.div>
    </div>
  );
}

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingGiftsCount, setPendingGiftsCount] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [milestoneStreak, setMilestoneStreak] = useState(0);
  const [showDailyStreakPopup, setShowDailyStreakPopup] = useState(false);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [levelUpData, setLevelUpData] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const u = await User.me();
        setUser({
          ...u,
          nickname: u.nickname || u.full_name || "Player",
          score: u.score ?? 0,
          crystals: u.crystals ?? 0,
          current_streak: u.current_streak ?? 0,
          extra_time_powerups: u.extra_time_powerups ?? 0,
          double_score_powerups: u.double_score_powerups ?? 0,
          level: u.level ?? 1,
          xp: u.xp ?? 0,
        });
        
        // Load pending gifts count asynchronously (don't block main UI)
        setTimeout(async () => {
          try {
            const { Gift } = await import('@/api/entities');
            const pendingGifts = await Gift.filter({ recipient_id: u.id, status: 'pending' });
            setPendingGiftsCount(pendingGifts.length);
          } catch (giftError) {
            console.error("Failed to load pending gifts:", giftError);
            setPendingGiftsCount(0);
          }
        }, 100);

        // Initialize notifications asynchronously (don't block main UI)
        setTimeout(async () => {
          try {
            const { useNotificationSetup, scheduleDailyChallengeReminder, setupDailyReminderSchedule } = await import('../components/notifications/NotificationManager');
            useNotificationSetup();
            
            const today = new Date().toISOString().split('T')[0];
            const hasCompletedToday = u.daily_challenge_date === today && u.daily_challenge_completed;
            scheduleDailyChallengeReminder(hasCompletedToday);
            setupDailyReminderSchedule();
          } catch (notificationError) {
            console.log('Notifications not available:', notificationError);
          }
        }, 200);
        
      } catch (e) {
        console.log('User not logged in:', e);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Check for onboarding and tutorial on app load
  useEffect(() => {
    if (loading) return;
    
    const onboardingCompleted = localStorage.getItem(ONBOARDING_KEY);
    const tutorialSeen = localStorage.getItem(TUTORIAL_KEY);
    
    if (!onboardingCompleted) {
      setShowOnboarding(true);
    } else if (!tutorialSeen) {
      setShowTutorial(true);
    }
  }, [loading]);

  const handleOnboardingComplete = (dontShow) => {
    if (dontShow) {
      localStorage.setItem(ONBOARDING_KEY, "completed");
    }
    setShowOnboarding(false);
  };

  const handleCloseTutorial = (dontShow) => {
    if (dontShow) localStorage.setItem(TUTORIAL_KEY, "1");
    setShowTutorial(false);
  };

  const handleStreakUpdate = (newStreak) => {
    setShowDailyStreakPopup(true);
    
    if ([7, 14, 30].includes(newStreak)) {
      setMilestoneStreak(newStreak);
      setShowMilestoneModal(true);
    }
    
    setUser(prev => prev ? { ...prev, current_streak: newStreak } : null);
  };

  const handleClaimMilestoneReward = async (crystals, powerups) => {
    if (!user) return;

    try {
      const updateData = {
        crystals: (user.crystals || 0) + crystals,
        extra_time_powerups: (user.extra_time_powerups || 0) + Math.floor(powerups / 2),
        double_score_powerups: (user.double_score_powerups || 0) + Math.floor(powerups / 2)
      };

      await User.updateMyUserData(updateData);
      setUser(prev => ({ ...prev, ...updateData }));
    } catch (error) {
      console.error("Failed to claim milestone reward:", error);
      throw error;
    }
  };

  const handleXPGain = async (xpGained) => {
    if (!user) return;
    try {
      const { awardXP } = await import('../components/xp/XPSystem');
      const { newLevel, oldLevel, newXP, rewards } = await awardXP(user.id, xpGained);

      setUser(prev => prev ? { ...prev, level: newLevel, xp: newXP } : null);

      if (newLevel > oldLevel) {
        setLevelUpData({ oldLevel, newLevel, rewards });
        setShowLevelUpModal(true);
      }
    } catch (error) {
      console.error("Failed to gain XP:", error);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-[#b7e5f8] via-[#ead1e2] to-[#f8c5b6]">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  // Show onboarding tutorial first
  if (showOnboarding) {
    return (
      <Suspense fallback={
        <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-[#b7e5f8] via-[#ead1e2] to-[#f8c5b6]">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent" />
        </div>
      }>
        <OnboardingTutorial onComplete={handleOnboardingComplete} />
      </Suspense>
    );
  }

  if (!user) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center p-4 sm:p-8 text-center bg-gradient-to-br from-[#b7e5f8] via-[#ead1e2] to-[#f8c5b6] overflow-hidden">
        {showTutorial && <Tutorial onClose={handleCloseTutorial} />}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.5, type: "spring" }}
          className="w-full max-w-sm mx-auto"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase text-purple-700 drop-shadow-lg mb-2 px-2">
            WordSwipe
          </h1>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white bg-pink-500 px-3 py-1 sm:px-4 sm:py-1 rounded-2xl inline-block mb-8 sm:mb-12 shadow-lg">
            Duel
          </h2>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              onClick={() => User.login()} 
              className="w-full max-w-xs bg-green-500 hover:bg-green-600 text-white rounded-2xl px-8 sm:px-12 py-6 sm:py-8 text-xl sm:text-2xl md:text-3xl shadow-xl border-b-8 border-green-700 font-bold"
            >
              Login & Play
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  const menuItems = [
    { title: "Multiplayer", page: "MultiplayerMode", color: "bg-red-500 hover:bg-red-600 border-red-700", emoji: "⚔️" },
    { title: "Friends", page: "Friends", color: "bg-blue-500 hover:bg-blue-600 border-blue-700", emoji: "👥" },
    { title: "Leaders", page: "Leaderboard", color: "bg-orange-500 hover:bg-orange-600 border-orange-700", emoji: "🏆" },
  ];

  return (
    <div className="w-full min-h-screen flex flex-col justify-center items-center p-4 sm:p-8 bg-gradient-to-br from-[#b7e5f8] via-[#ead1e2] to-[#f8c5b6]">
      <Suspense fallback={null}>
        {user && (
          <LoginStreakManager 
            user={user} 
            onStreakUpdate={handleStreakUpdate}
          />
        )}
        
        <StreakMilestoneModal
          isOpen={showMilestoneModal}
          onClose={() => setShowMilestoneModal(false)}
          streak={milestoneStreak}
          onClaimReward={handleClaimMilestoneReward}
        />

        <DailyStreakPopup
          isOpen={showDailyStreakPopup}
          onClose={() => setShowDailyStreakPopup(false)}
          streak={user?.current_streak || 0}
        />

        <LevelUpModal
          isOpen={showLevelUpModal}
          onClose={() => setShowLevelUpModal(false)}
          levelUpData={levelUpData}
          onClaimReward={(rewards) => {
            console.log("Claiming level-up rewards:", rewards);
            setShowLevelUpModal(false);
          }}
        />
      </Suspense>

      {showTutorial && <Tutorial onClose={handleCloseTutorial} />}

      <header className="absolute top-4 sm:top-6 left-4 sm:left-6 right-4 sm:right-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to={createPageUrl("DailyChallenge")}>
            <motion.div whileHover={{ scale: 1.1 }} className="relative bg-white/70 backdrop-blur-sm rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shadow-md text-xl sm:text-2xl">
              📅
              {/* נוטיפיקיישן באדג' לדיילי צ'אלנג' */}
              {user && (!user.daily_challenge_completed || user.daily_challenge_date !== new Date().toISOString().split('T')[0]) && (
                <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md animate-pulse">
                  !
                </div>
              )}
            </motion.div>
          </Link>
          
          <Link to={createPageUrl("Gifts")}>
            <motion.div whileHover={{ scale: 1.1 }} className="relative bg-white/70 backdrop-blur-sm rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shadow-md text-xl sm:text-2xl">
              🎁
              {pendingGiftsCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md">
                  {pendingGiftsCount > 9 ? '9+' : pendingGiftsCount}
                </div>
              )}
            </motion.div>
          </Link>
          
          <Link to={createPageUrl("Shop")}>
            <motion.div whileHover={{ scale: 1.1 }} className="bg-white/70 backdrop-blur-sm rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shadow-md text-xl sm:text-2xl">
              🛍️
            </motion.div>
          </Link>
          
          <motion.div whileHover={{ scale: 1.05 }} className="bg-white/70 backdrop-blur-sm rounded-2xl px-3 py-2 sm:px-4 sm:py-2 flex items-center gap-1 sm:gap-2 shadow-md">
            <span className="text-xl sm:text-2xl animate-pulse">💎</span>
            <span className="text-lg sm:text-xl font-bold text-blue-800">{user.crystals.toLocaleString()}</span>
          </motion.div>
        </div>

        <div className="flex items-center">
          <Link to={createPageUrl("Profile")}>
            <motion.div whileHover={{ scale: 1.1 }} className="bg-white/70 backdrop-blur-sm rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shadow-md text-xl sm:text-2xl">
              {user.avatar || "👤"}
            </motion.div>
          </Link>
        </div>
      </header>

      <main className="flex-grow flex flex-col justify-center items-center text-center w-full pt-20 sm:pt-0">
        <h1 className="text-4xl sm:text-5xl font-black uppercase text-purple-700 drop-shadow-md mb-8 sm:mb-12">WordSwipe</h1>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full max-w-sm mb-6 sm:mb-8">
          <Link to={createPageUrl("Game")}>
            <Button 
              onClick={() => haptics.mediumImpact()}
              className="w-full h-24 sm:h-28 text-3xl sm:text-4xl font-extrabold rounded-3xl bg-green-500 hover:bg-green-600 text-white shadow-xl border-b-8 border-green-700"
            >
              🎮 Play!
            </Button>
          </Link>
        </motion.div>

        <div className="w-full max-w-sm grid grid-cols-1 gap-4 sm:gap-6">
          {menuItems.map((item) => (
            <motion.div
              key={item.title}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link to={createPageUrl(item.page)}>
                <Button 
                  onClick={() => haptics.impact()}
                  className={`w-full h-16 sm:h-20 text-xl sm:text-2xl font-bold justify-center p-4 rounded-3xl text-white shadow-lg border-b-8 ${item.color}`}
                >
                  <span className="text-2xl sm:text-3xl mr-3">{item.emoji}</span> {item.title}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
