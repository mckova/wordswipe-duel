// XP and Level calculation utilities

export const XP_REWARDS = {
  GAME_WIN: 10,
  GAME_LOSS: 2,
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