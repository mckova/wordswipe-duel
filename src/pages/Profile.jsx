
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, Gamepad2, Gem, LogOut, Edit, Save, X, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("");

  const avatarOptions = ["🎮", "🎯", "🏆", "⭐", "💎", "🔥", "⚡", "🚀", "🦊", "🐼", "🦄", "🦁"];

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        setNickname(currentUser.nickname || currentUser.full_name || "");
        setAvatar(currentUser.avatar || "🎮");
      } catch (error) {
        navigate(createPageUrl("Home"));
      }
      setIsLoading(false);
    };
    loadProfile();
  }, [navigate]);

  const handleSave = async () => {
    if (!user) return;
    try {
      await User.updateMyUserData({ nickname, avatar });
      setUser(prev => ({ ...prev, nickname, avatar }));
      setIsEditing(false);
    } catch (e) {
      console.error("Failed to save profile", e);
    }
  };

  const handleLogout = async () => {
    await User.logout();
    navigate(createPageUrl("Home"));
  };

  // XP and Level utilities
  const getProgressToNextLevel = (xp, currentLevel) => {
    const LEVEL_THRESHOLDS = [
      { level: 1, xp: 0 },
      { level: 2, xp: 100 },
      { level: 3, xp: 250 },
      { level: 4, xp: 500 },
      { level: 5, xp: 850 },
      { level: 6, xp: 1300 },
      { level: 7, xp: 1850 },
      { level: 8, xp: 2500 },
      { level: 9, xp: 3250 },
      { level: 10, xp: 4100 },
      { level: 11, xp: 5050 },
      { level: 12, xp: 6100 },
      { level: 13, xp: 7250 },
      { level: 14, xp: 8500 },
      { level: 15, xp: 10000 }
    ];

    const currentThreshold = LEVEL_THRESHOLDS.find(t => t.level === currentLevel);
    const nextThreshold = LEVEL_THRESHOLDS.find(t => t.level === currentLevel + 1);
    
    if (!currentThreshold || !nextThreshold) {
      return { progress: 100, current: xp, needed: 0 };
    }
    
    const xpInCurrentLevel = xp - currentThreshold.xp;
    const xpNeededForNext = nextThreshold.xp - currentThreshold.xp;
    const progress = Math.min(100, (xpInCurrentLevel / xpNeededForNext) * 100);
    
    return {
      progress: Math.round(progress),
      current: xpInCurrentLevel,
      needed: xpNeededForNext - xpInCurrentLevel
    };
  };

  if (isLoading || !user) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
      </div>
    );
  }

  const levelProgress = getProgressToNextLevel(user.xp || 0, user.level || 1);

  return (
    <div className="w-full min-h-screen p-6 text-gray-800">
      <Link to={createPageUrl("Home")} className="absolute top-6 left-6 z-10">
        <Button variant="ghost" className="rounded-full p-3 bg-white/70 backdrop-blur-sm shadow-md">
          <ArrowLeft className="w-6 h-6" />
        </Button>
      </Link>

      <header className="text-center mb-8 pt-16">
        <h1 className="text-4xl font-black text-purple-700 uppercase drop-shadow-md mb-2">Profile</h1>
      </header>

      <main className="max-w-md mx-auto">
        <div className="bg-white/70 backdrop-blur-sm p-8 rounded-3xl mb-6 flex flex-col items-center shadow-xl">
          {isEditing ? (
            <>
              <div className="grid grid-cols-6 gap-3 mb-6">
                {avatarOptions.map(opt => (
                  <motion.button 
                    key={opt} 
                    onClick={() => setAvatar(opt)} 
                    className={`text-3xl p-2 rounded-2xl transition-all duration-200 ${avatar === opt ? 'bg-purple-500 scale-110' : 'bg-white/50'}`}
                    whileHover={{ scale: 1.1 }}
                  >
                    {opt}
                  </motion.button>
                ))}
              </div>
              <Input 
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="bg-white/80 border-purple-300 text-purple-800 text-center text-xl font-bold rounded-2xl mb-4 h-14 shadow-inner"
              />
              <div className="flex gap-4">
                <Button onClick={() => setIsEditing(false)} variant="ghost" className="rounded-xl p-3 h-auto"><X className="text-gray-600"/></Button>
                <Button onClick={handleSave} className="bg-green-500 hover:bg-green-600 rounded-xl p-3 h-auto text-white"><Save /></Button>
              </div>
            </>
          ) : (
            <>
              <div className="text-8xl mb-4 p-4 bg-white rounded-3xl shadow-lg">{user.avatar}</div>
              <h2 className="text-4xl font-bold text-purple-800">{user.nickname}</h2>
              <p className="text-gray-500 mb-4">{user.email}</p>
              
              {/* Level and XP Display */}
              <div className="bg-gradient-to-r from-purple-100 to-blue-100 p-4 rounded-2xl mb-4 w-full text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-2xl">⭐</span>
                  <p className="text-xl font-black text-purple-700">Level {user.level || 1}</p>
                </div>
                <p className="text-sm text-purple-600 mb-2">
                  {user.xp || 0} XP {levelProgress.needed > 0 ? `(${levelProgress.needed} to next level)` : '(Max Level!)'}
                </p>
                {levelProgress.needed > 0 && (
                  <div className="bg-purple-200 rounded-full h-2">
                    <div 
                      className="bg-purple-500 rounded-full h-2 transition-all duration-500"
                      style={{ width: `${levelProgress.progress}%` }}
                    />
                  </div>
                )}
              </div>
              
              <Button onClick={() => setIsEditing(true)} variant="ghost" className="text-purple-600 hover:text-purple-800 font-bold">
                <Edit className="w-4 h-4 mr-2"/> Edit Profile
              </Button>
            </>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white/70 backdrop-blur-sm p-4 rounded-3xl text-center shadow-lg">
            <Star className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
            <p className="text-2xl font-bold">{(user.score || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-600 uppercase font-semibold">Score</p>
          </div>
          <div className="bg-white/70 backdrop-blur-sm p-4 rounded-3xl text-center shadow-lg">
            <Gamepad2 className="w-8 h-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold">{user.games_played || 0}</p>
            <p className="text-xs text-gray-600 uppercase font-semibold">Games</p>
          </div>
          <div className="bg-white/70 backdrop-blur-sm p-4 rounded-3xl text-center shadow-lg">
            <Gem className="w-8 h-8 mx-auto text-sky-500 mb-2" />
            <p className="text-2xl font-bold">{user.crystals || 0}</p>
            <p className="text-xs text-gray-600 uppercase font-semibold">Crystals</p>
          </div>
        </div>

        {/* Login Streak Display */}
        <div className="bg-gradient-to-r from-orange-100 to-red-100 p-6 rounded-3xl mb-8 text-center shadow-lg">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-4xl">🔥</span>
            <div>
              <p className="text-2xl font-black text-orange-700">
                {user.current_streak || 0} Day Streak
              </p>
              <p className="text-sm text-orange-600">
                Keep logging in daily for rewards!
              </p>
            </div>
          </div>
          
          {/* Progress bar for next milestone */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-orange-600 mb-1">
              <span>Current</span>
              <span>
                {(user.current_streak || 0) < 7 ? 'Next: Day 7' : 
                 (user.current_streak || 0) < 14 ? 'Next: Day 14' : 
                 (user.current_streak || 0) < 30 ? 'Next: Day 30' : 'Champion!'}
              </span>
            </div>
            <div className="bg-orange-200 rounded-full h-2">
              <div 
                className="bg-orange-500 rounded-full h-2 transition-all duration-500"
                style={{ 
                  width: `${Math.min(100, ((user.current_streak || 0) / (
                    (user.current_streak || 0) < 7 ? 7 : 
                    (user.current_streak || 0) < 14 ? 14 : 
                    (user.current_streak || 0) < 30 ? 30 : 30
                  )) * 100)}%` 
                }}
              />
            </div>
          </div>
        </div>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button onClick={handleLogout} className="w-full h-16 text-lg rounded-2xl bg-rose-500 hover:bg-rose-600 text-white shadow-lg border-b-4 border-rose-700 font-bold">
            <LogOut className="mr-2" /> Logout
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
