// Push Notification Service for multiplayer invites and other real-time notifications
import { sendPushNotification } from './NotificationManager';

// Send game invite push notification
export async function sendGameInvitePush(recipientId, senderName, gameId) {
  try {
    await sendPushNotification(
      recipientId,
      'Game Invite!',
      `${senderName} invited you to play WordSwipe Duel!`,
      {
        type: 'game_invite',
        gameId: gameId,
        action_url: `/FriendGameLobby?gameId=${gameId}`
      }
    );
  } catch (error) {
    console.error('Failed to send game invite push:', error);
  }
}

// Send level up push notification (as backup to local notification)
export async function sendLevelUpPush(userId, newLevel, crystalsEarned) {
  try {
    const body = crystalsEarned > 0 
      ? `Congratulations, you reached Level ${newLevel} and earned ${crystalsEarned} crystals!`
      : `Congratulations, you reached Level ${newLevel}!`;
      
    await sendPushNotification(
      userId,
      'Level Up!',
      body,
      {
        type: 'level_up',
        level: newLevel,
        crystals: crystalsEarned,
        action_url: '/Profile'
      }
    );
  } catch (error) {
    console.error('Failed to send level up push:', error);
  }
}

// Send daily challenge reminder push (as backup to local notification)
export async function sendDailyChallengeReminderPush(userId) {
  try {
    await sendPushNotification(
      userId,
      'Daily Challenge Reminder',
      "You haven't completed your Daily Challenge yet—come back and play!",
      {
        type: 'daily_challenge_reminder',
        action_url: '/DailyChallenge'
      }
    );
  } catch (error) {
    console.error('Failed to send daily challenge reminder push:', error);
  }
}

// Send friend request notification
export async function sendFriendRequestPush(recipientId, senderName) {
  try {
    await sendPushNotification(
      recipientId,
      'New Friend Request',
      `${senderName} wants to be your friend!`,
      {
        type: 'friend_request',
        action_url: '/Friends'
      }
    );
  } catch (error) {
    console.error('Failed to send friend request push:', error);
  }
}