
import { useEffect } from 'react';
import { User } from '@/api/entities';

// Notification permission and setup
export function useNotificationSetup() {
  useEffect(() => {
    const setupNotifications = async () => {
      // Check if notifications are supported
      if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return;
      }

      // Request permission if not already granted
      if (Notification.permission === 'default') {
        try {
          const permission = await Notification.requestPermission();
          console.log('Notification permission:', permission);
        } catch (error) {
          console.error('Error requesting notification permission:', error);
        }
      }

      // Initialize FCM if available
      try {
        await initializeFCM();
      } catch (error) {
        console.log('FCM initialization failed:', error);
      }
    };

    setupNotifications();
  }, []);
}

// Initialize Firebase Cloud Messaging
async function initializeFCM() {
  // Check if Firebase is available
  if (typeof window !== 'undefined' && window.firebase) {
    try {
      const messaging = window.firebase.messaging();
      
      // Request permission for notifications
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // Get FCM token
        const token = await messaging.getToken({
          vapidKey: 'YOUR_VAPID_KEY_HERE' // Replace with actual VAPID key
        });
        
        console.log('FCM Token:', token);
        
        // Send token to your backend to store for push notifications
        await sendTokenToBackend(token);
        
        // Handle foreground messages
        messaging.onMessage((payload) => {
          console.log('Foreground message received:', payload);
          showLocalNotification(payload.notification.title, payload.notification.body);
        });
      }
    } catch (error) {
      console.error('FCM initialization error:', error);
    }
  }
}

// Send FCM token to backend (placeholder)
async function sendTokenToBackend(token) {
  try {
    // This would send the token to your backend for storage
    console.log('Sending FCM token to backend:', token);
    // await fetch('/api/store-fcm-token', { method: 'POST', body: JSON.stringify({ token }) });
  } catch (error) {
    console.error('Failed to send FCM token to backend:', error);
  }
}

// Show local notification
function showLocalNotification(title, body, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const notification = new Notification(title, {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    ...options
  });

  // Auto-close after 5 seconds
  setTimeout(() => {
    notification.close();
  }, 5000);

  return notification;
}

// Schedule daily challenge reminder
export function scheduleDailyChallengeReminder(hasCompletedToday = false) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  // Clear any existing reminder
  clearDailyChallengeReminder();

  if (hasCompletedToday) {
    return; // Don't schedule if already completed
  }

  const now = new Date();
  const reminderTime = new Date();
  reminderTime.setHours(17, 0, 0, 0); // 5:00 PM local time

  // If it's already past 5 PM today, schedule for tomorrow
  if (now.getTime() > reminderTime.getTime()) {
    reminderTime.setDate(reminderTime.getDate() + 1);
  }

  const timeUntilReminder = reminderTime.getTime() - now.getTime();

  const timeoutId = setTimeout(() => {
    // Check again if challenge was completed before showing notification
    checkAndShowDailyChallengeReminder();
  }, timeUntilReminder);

  // Store timeout ID for cleanup
  localStorage.setItem('dailyChallengeReminderTimeout', timeoutId.toString());
}

async function checkAndShowDailyChallengeReminder() {
  try {
    const user = await User.me();
    const today = new Date().toISOString().split('T')[0];
    
    // Check if user completed today's challenge
    if (user.daily_challenge_date === today && user.daily_challenge_completed) {
      return; // Already completed, don't show notification
    }

    // Show the notification with click handler
    const notification = showLocalNotification(
      'Daily Challenge Reminder',
      "You haven't completed your Daily Challenge yet—come back and play!",
      {
        tag: 'daily-challenge-reminder',
        requireInteraction: false,
        silent: false
      }
    );

    // Handle notification click
    if (notification) {
      notification.onclick = function() {
        window.focus();
        window.location.href = '/DailyChallenge';
        notification.close();
      };
    }

  } catch (error) {
    console.error('Error checking daily challenge status:', error);
  }
}

export function clearDailyChallengeReminder() {
  const timeoutId = localStorage.getItem('dailyChallengeReminderTimeout');
  if (timeoutId) {
    clearTimeout(parseInt(timeoutId));
    localStorage.removeItem('dailyChallengeReminderTimeout');
  }
}

// Show level up notification
export function showLevelUpNotification(newLevel, crystalsEarned = 0) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const body = crystalsEarned > 0 
    ? `Congratulations, you reached Level ${newLevel} and earned ${crystalsEarned} crystals!`
    : `Congratulations, you reached Level ${newLevel}!`;

  const notification = showLocalNotification(
    'Level Up!',
    body,
    {
      tag: `level-up-${newLevel}`,
      requireInteraction: false,
      silent: false
    }
  );

  // Handle notification click
  if (notification) {
    notification.onclick = function() {
      window.focus();
      window.location.href = '/Profile';
      notification.close();
    };
  }
}

// Show multiplayer invite notification
export function showMultiplayerInviteNotification(senderName, gameId) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const notification = showLocalNotification(
    'Game Invite!',
    `${senderName} invited you to play WordSwipe Duel!`,
    {
      tag: `invite-${gameId}`,
      requireInteraction: true,
      silent: false
    }
  );

  // Handle notification click
  if (notification) {
    notification.onclick = function() {
      window.focus();
      window.location.href = `/FriendGameLobby?gameId=${gameId}`;
      notification.close();
    };
  }
}

// Send push notification via FCM (backend integration)
export async function sendPushNotification(userId, title, body, data = {}) {
  try {
    // This would call your backend API to send push notification
    console.log('Sending push notification:', { userId, title, body, data });
    
    // Example API call:
    // await fetch('/api/send-push-notification', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ userId, title, body, data })
    // });
    
  } catch (error) {
    console.error('Failed to send push notification:', error);
  }
}

// Schedule recurring daily reminders
export function setupDailyReminderSchedule() {
  // Set up a daily check at midnight to schedule the next day's reminder
  const now = new Date();
  const nextMidnight = new Date();
  nextMidnight.setDate(nextMidnight.getDate() + 1);
  nextMidnight.setHours(0, 0, 0, 0);
  
  const timeUntilMidnight = nextMidnight.getTime() - now.getTime();
  
  setTimeout(() => {
    // Check if user completed challenge and schedule if not
    checkAndScheduleDailyReminder();
    
    // Set up recurring check every 24 hours
    setInterval(checkAndScheduleDailyReminder, 24 * 60 * 60 * 1000);
  }, timeUntilMidnight);
}

async function checkAndScheduleDailyReminder() {
  try {
    const user = await User.me();
    const today = new Date().toISOString().split('T')[0];
    
    const hasCompletedToday = user.daily_challenge_date === today && user.daily_challenge_completed;
    scheduleDailyChallengeReminder(hasCompletedToday);
  } catch (error) {
    console.error('Error checking daily challenge for reminder:', error);
  }
}
