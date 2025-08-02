// Service Worker utilities for notifications
// Note: Since we can't use blob URLs for service workers in production,
// we'll handle notifications through the existing notification manager

export function createServiceWorker() {
  // Skip service worker registration in this environment
  // Instead, we'll rely on the existing notification system
  console.log('Service Worker registration skipped - using direct notification API');
  return Promise.resolve();
}

// Handle notification clicks through existing notification manager
export function handleNotificationClick(notification, action) {
  if (notification.tag.startsWith('invite-')) {
    const gameId = notification.tag.replace('invite-', '');
    
    if (action === 'accept') {
      window.location.href = `/FriendGameLobby?gameId=${gameId}`;
    } else if (action === 'decline') {
      console.log('Invite declined');
    } else {
      // Default click - open the game
      window.location.href = `/FriendGameLobby?gameId=${gameId}`;
    }
  } else if (notification.tag === 'daily-challenge-reminder') {
    window.location.href = '/DailyChallenge';
  } else if (notification.tag.startsWith('level-up-')) {
    window.location.href = '/Profile';
  }
  
  notification.close();
}