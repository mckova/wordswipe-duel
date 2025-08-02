
// Enhanced XP System with level-up rewards
import { User } from "@/api/entities";
import { Gift } from "@/api/entities";

export const XP_REWARDS = {
  SOLO_GAME: 10,
  MULTIPLAYER_GAME: 20,
  DAILY_LOGIN: 5,
  DAILY_CHALLENGE: 15,
  GIFT_SENT: 5,
  GIFT_RECEIVED: 5,
  STREAK_MILESTONE: 20
};

export const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0 },
  { level: 2, xp: 100 },
  { level: 3, xp: 250 },
  { level: 4, xp: 450 },
  { level: 5, xp: 700 },
  { level: 6, xp: 1000 },
  { level: 7, xp: 1350 },
  { level: 8, xp: 1750 },
  { level: 9, xp: 2200 },
  { level: 10, xp: 2700 },
  { level: 11, xp: 3250 },
  { level: 12, xp: 3850 },
  { level: 13, xp: 4500 },
  { level: 14, xp: 5200 },
  { level: 15, xp: 5950 },
  { level: 16, xp: 6750 },
  { level: 17, xp: 7600 },
  { level: 18, xp: 8500 },
  { level: 19, xp: 9450 },
  { level: 20, xp: 10450 },
  { level: 21, xp: 11500 },
  { level: 22, xp: 12600 },
  { level: 23, xp: 13750 },
  { level: 24, xp: 14950 },
  { level: 25, xp: 16200 },
  { level: 26, xp: 17500 },
  { level: 27, xp: 18850 },
  { level: 28, xp: 20250 },
  { level: 29, xp: 21700 },
  { level: 30, xp: 23200 }
];

export function calculateLevel(xp) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i].xp) {
      return LEVEL_THRESHOLDS[i].level;
    }
  }
  return 1;
}

export function getXpForNextLevel(currentLevel) {
  const nextLevelThreshold = LEVEL_THRESHOLDS.find(t => t.level === currentLevel + 1);
  return nextLevelThreshold ? nextLevelThreshold.xp : null;
}

export function getProgressToNextLevel(xp, currentLevel) {
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
}

export async function awardXP(userId, xpAmount, reason = "") {
  try {
    const user = await User.get(userId);
    if (!user) return null;

    const oldXP = user.xp || 0;
    const newXP = oldXP + xpAmount;
    
    const oldLevel = calculateLevel(oldXP);
    const newLevel = calculateLevel(newXP);
    
    // Update user XP and level
    await User.update(userId, {
      xp: newXP,
      level: newLevel
    });

    // Check for level up rewards and notifications
    if (newLevel > oldLevel) {
      const rewards = await handleLevelUp(userId, oldLevel, newLevel);
      
      // Show level up notification
      try {
        const { showLevelUpNotification } = await import('../notifications/NotificationManager');
        showLevelUpNotification(newLevel, rewards.crystals || 0);
      } catch (error) {
        console.error('Error showing level up notification:', error);
      }
      
      return { oldLevel, newLevel, oldXP, newXP, rewards };
    }

    return { oldLevel, newLevel, oldXP, newXP };
  } catch (error) {
    console.error("Error awarding XP:", error);
    return null;
  }
}

async function handleLevelUp(userId, oldLevel, newLevel) {
  let totalCrystals = 0;
  let totalPowerups = 0;
  
  try {
    // Award gifts for each level gained
    for (let level = oldLevel + 1; level <= newLevel; level++) {
      const isMegaLevel = level % 10 === 0;
      
      if (isMegaLevel) {
        // Every 10 levels - mega reward
        totalCrystals += 100;
        totalPowerups += 3;
        
        await Gift.create({
          recipient_id: userId,
          gift_type: "mega_level_up",
          title: `🌟 Level ${level} Mega Reward!`,
          crystals: 100,
          powerups: 3
        });
      } else {
        // Regular level up reward
        totalCrystals += 20;
        totalPowerups += 1;
        
        await Gift.create({
          recipient_id: userId,
          gift_type: "level_up",
          title: `⭐ Level ${level} Reward!`,
          crystals: 20,
          powerups: 1
        });
      }
    }
    
    return { crystals: totalCrystals, powerups: totalPowerups };
  } catch (error) {
    console.error("Error handling level up:", error);
    return { crystals: 0, powerups: 0 };
  }
}
