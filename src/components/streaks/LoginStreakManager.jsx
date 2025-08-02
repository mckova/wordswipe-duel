import React, { useEffect, useRef } from "react";
import { User } from "@/api/entities";

export default function LoginStreakManager({ user, onStreakUpdate }) {
  const hasRunRef = useRef(false);

  useEffect(() => {
    const updateLoginStreak = async () => {
      if (!user || hasRunRef.current) return;

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const lastLoginDate = user.last_login_date;
      let currentStreak = user.current_streak || 0;

      // Don't update if already logged in today
      if (lastLoginDate === today) {
        hasRunRef.current = true;
        return;
      }

      // Calculate new streak
      if (lastLoginDate === yesterday) {
        currentStreak++; // Continue streak
      } else {
        currentStreak = 1; // Start new streak
      }

      try {
        hasRunRef.current = true; // Mark as running to prevent duplicate calls
        
        await User.updateMyUserData({
          last_login_date: today,
          current_streak: currentStreak
        });

        if (onStreakUpdate) {
          onStreakUpdate(currentStreak);
        }
      } catch (error) {
        console.error("Failed to update login streak:", error);
        hasRunRef.current = false; // Reset on error so it can retry later
      }
    };

    // Add a small delay to prevent immediate multiple calls
    const timeoutId = setTimeout(updateLoginStreak, 500);
    
    return () => clearTimeout(timeoutId);
  }, [user?.id, onStreakUpdate]); // Only depend on user ID, not the entire user object

  return null; // This is a utility component
}