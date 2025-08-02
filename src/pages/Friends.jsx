
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/api/entities";
import { Friendship } from "@/api/entities";
import { FriendGame } from "@/api/entities";
import { GameInvite } from "@/api/entities";
import { generateGrid } from "../components/utils/gameUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Users, UserPlus, Share, QrCode, Copy, Check, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { sendGameInvitePush } from "../components/notifications/PushNotificationService";

export default function Friends() {
  const [user, setUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [isJoining, setIsJoining] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    loadFriendsData();
  }, []);

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const loadFriendsData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      const code = `${currentUser.id.slice(-4)}-${generateInviteCode()}`;
      setInviteCode(code);

      const allFriendships = await Friendship.list();
      
      const userFriendships = allFriendships.filter(f => 
        f.requester_id === currentUser.id || f.recipient_id === currentUser.id
      );

      const acceptedFriends = userFriendships.filter(f => f.status === 'accepted');
      const pending = userFriendships.filter(f => f.status === 'pending');

      const friendIds = acceptedFriends.map(f => 
        f.requester_id === currentUser.id ? f.recipient_id : f.requester_id
      );
      
      if (friendIds.length > 0) {
        const allUsers = await User.list();
        const friendUsers = allUsers.filter(u => friendIds.includes(u.id));
        setFriends(friendUsers);
      }

      setPendingRequests(pending);
      
    } catch (error) {
      console.error("Error loading friends data:", error);
    }
    setIsLoading(false);
  };

  const showFeedback = (message, type) => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const showToast = (message, type) => {
    toast({
      title: type === "success" ? "Success!" : type === "error" ? "Error!" : "Info",
      description: message,
      variant: type === "success" ? "default" : type === "error" ? "destructive" : "default",
    });
  };

  const sendGameInvite = async (friendId) => {
    if (!user) {
      showToast("User not loaded. Please try again.", "error");
      return;
    }
    
    try {
      const gameCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const grid = generateGrid();
      
      const friendGame = await FriendGame.create({
        game_code: gameCode,
        grid: grid,
        player1_id: user.id,
        player1_nickname: user.nickname || user.full_name,
        player1_avatar: user.avatar || "🎮",
        status: "waiting"
      });

      const friend = friends.find(f => f.id === friendId);
      if (!friend) {
        showToast("Friend not found.", "error");
        return;
      }
      
      const invite = await GameInvite.create({
        sender_id: user.id,
        recipient_id: friendId,
        sender_nickname: user.nickname || user.full_name,
        sender_avatar: user.avatar || "🎮",
        game_id: friendGame.id,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });

      // Send both local and push notifications
      try {
        const { showMultiplayerInviteNotification } = await import('../components/notifications/NotificationManager');
        showMultiplayerInviteNotification(user.nickname || user.full_name, friendGame.id);
        
        // Also send push notification
        await sendGameInvitePush(friendId, user.nickname || user.full_name, friendGame.id);
      } catch (error) {
        console.error('Error sending invite notification:', error);
      }

      showToast(`Game invite sent to ${friend.nickname || friend.full_name}!`, "success");
      
    } catch (error) {
      console.error("Error sending game invite:", error);
      showToast("Failed to send invite", "error");
    }
  };

  const handleJoinWithCode = async () => {
    if (!inputCode.trim() || isJoining) return;

    setIsJoining(true);
    
    try {
      const codePrefix = inputCode.trim().toUpperCase().split('-')[0];
      
      if (!codePrefix || codePrefix.length !== 4) {
        showFeedback("Invalid code format", "error");
        setIsJoining(false);
        return;
      }

      const allUsers = await User.list();
      const targetUser = allUsers.find(u => u.id.slice(-4) === codePrefix);
      
      if (!targetUser) {
        showFeedback("User not found with this code", "error");
        setIsJoining(false);
        return;
      }

      if (targetUser.id === user.id) {
        showFeedback("Cannot add yourself as friend", "error");
        setIsJoining(false);
        return;
      }

      const existingFriendship = await Friendship.filter({
        requester_id: user.id,
        recipient_id: targetUser.id
      });
      
      const existingReverse = await Friendship.filter({
        requester_id: targetUser.id,
        recipient_id: user.id
      });

      if (existingFriendship.length > 0 || existingReverse.length > 0) {
        showFeedback("Already friends or request exists", "info");
        setIsJoining(false);
        return;
      }

      await Friendship.create({
        requester_id: user.id,
        recipient_id: targetUser.id,
        status: "pending"
      });

      showFeedback(`Friend request sent to ${targetUser.nickname || targetUser.full_name}`, "success");
      setInputCode("");
      loadFriendsData();
      
    } catch (error) {
      console.error("Error joining with code:", error);
      showFeedback("Error adding friend", "error");
    }
    
    setIsJoining(false);
  };

  const handleAcceptRequest = async (friendship) => {
    try {
      await Friendship.update(friendship.id, { status: "accepted" });
      showFeedback("Friend request accepted!", "success");
      loadFriendsData();
    } catch (error) {
      console.error("Error accepting request:", error);
      showFeedback("Error accepting request", "error");
    }
  };

  const handleDeclineRequest = async (friendship) => {
    try {
      await Friendship.update(friendship.id, { status: "declined" });
      showFeedback("Friend request declined", "info");
      loadFriendsData();
    } catch (error) {
      console.error("Error declining request:", error);
      showFeedback("Error declining request", "error");
    }
  };

  const copyInviteCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      showFeedback("Invite code copied!", "success");
    } catch (error) {
      showFeedback("Cannot copy to clipboard", "error");
    }
  };

  const shareInviteLink = async () => {
    const shareData = {
      title: 'Join me on WordSwipe Duel!',
      text: `Let's play the new word game together! Use code: ${inviteCode}`,
      url: `https://wordswipe.app/invite?code=${inviteCode}`
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        const textToShare = `${shareData.text}\n${shareData.url}`;
        await navigator.clipboard.writeText(textToShare);
        showFeedback("Link copied! Share with friends", "success");
      }
    } catch (error) {
      console.error('Error sharing:', error);
      try {
        const textToShare = `Join me on WordSwipe Duel! Code: ${inviteCode}`;
        await navigator.clipboard.writeText(textToShare);
        showFeedback("Invite text copied!", "success");
      } catch (copyError) {
        showFeedback("Cannot share at this time", "error");
      }
    }
  };

  const generateQRCode = (data) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;
    return qrUrl;
  };

  if (isLoading || !user) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen p-6 text-gray-800">
      <Link to={createPageUrl("Home")} className="absolute top-6 left-6 z-10">
        <Button variant="ghost" className="rounded-full p-3 bg-white/70 backdrop-blur-sm shadow-md">
          <ArrowLeft className="w-6 h-6" />
        </Button>
      </Link>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl text-white font-bold z-50 shadow-lg ${
              feedback.type === 'success' ? 'bg-green-500' : 
              feedback.type === 'info' ? 'bg-blue-500' : 
              'bg-red-500'
            }`}
          >
            {feedback.message}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="text-center mb-8 pt-16">
        <div className="text-6xl mb-4">👥</div>
        <h1 className="text-4xl font-black text-purple-700 uppercase drop-shadow-md mb-2">Friends</h1>
        <p className="text-gray-600 text-lg">Add friends and play together!</p>
      </header>

      <main className="max-w-md mx-auto space-y-6">
        {/* Add Friends Section */}
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl">
          <h2 className="text-xl font-bold text-purple-800 mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add Friends
          </h2>
          
          <div className="space-y-3">
            <Button 
              onClick={() => setShowInviteModal(true)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-2xl py-3 font-bold"
            >
              <Share className="w-5 h-5 mr-2" />
              Invite Friends
            </Button>

            <div className="flex gap-2">
              <Input
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Enter friend's code..."
                className="flex-1 bg-white/80 border-gray-300 rounded-2xl text-center font-bold"
                dir="ltr"
              />
              <Button 
                onClick={handleJoinWithCode}
                disabled={!inputCode.trim() || isJoining}
                className="bg-green-500 hover:bg-green-600 text-white rounded-2xl px-4 font-bold"
              >
                {isJoining ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  "Add"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl">
            <h2 className="text-xl font-bold text-orange-600 mb-4">Pending Friend Requests</h2>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-orange-100 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">👤</div>
                    <span className="font-bold">New friend request</span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleAcceptRequest(request)}
                      className="bg-green-500 hover:bg-green-600 text-white rounded-xl px-3 py-1 text-sm"
                    >
                      Accept
                    </Button>
                    <Button 
                      onClick={() => handleDeclineRequest(request)}
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50 rounded-xl px-3 py-1 text-sm"
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends List */}
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl">
          <h2 className="text-xl font-bold text-purple-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            My Friends ({friends.length})
          </h2>
          
          {friends.length > 0 ? (
            <div className="space-y-3">
              {friends.map((friend) => (
                <div key={friend.id} className="flex items-center justify-between p-4 bg-purple-100 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{friend.avatar || "🎮"}</div>
                    <div>
                      <p className="font-bold text-purple-800">{friend.nickname || friend.full_name}</p>
                      <p className="text-sm text-purple-600">Score: {(friend.score || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => sendGameInvite(friend.id)}
                    className="bg-red-500 hover:bg-red-600 text-white rounded-2xl px-4 py-2 font-bold"
                  >
                    Challenge
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">😊</div>
              <p className="text-gray-600">No friends yet</p>
              <p className="text-sm text-gray-500">Invite friends to play together!</p>
            </div>
          )}
        </div>
      </main>

      {/* Invite Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="max-w-sm bg-white rounded-3xl shadow-2xl border-none p-6">
          <DialogHeader className="text-center mb-4">
            <DialogTitle className="text-xl font-bold text-purple-800">
              Invite Friends to Play
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Invite Code */}
            <div className="text-center">
              <p className="text-gray-600 mb-2 text-sm">Your code:</p>
              <div className="bg-purple-100 rounded-2xl p-3 flex items-center justify-between">
                <span className="text-xl font-black text-purple-800 font-mono tracking-wider" dir="ltr">
                  {inviteCode}
                </span>
                <Button 
                  onClick={copyInviteCode}
                  variant="ghost" 
                  size="icon"
                  className="text-purple-600 hover:bg-purple-200 h-8 w-8"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* QR Code */}
            <div className="text-center">
              <p className="text-gray-600 mb-2 text-sm">Or scan QR code:</p>
              <div className="bg-white p-3 rounded-2xl shadow-inner flex justify-center">
                <img 
                  src={generateQRCode(`https://wordswipe.app/invite?code=${inviteCode}`)}
                  alt="QR Code"
                  className="w-32 h-32"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div className="hidden text-gray-500 text-center">
                  <QrCode className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm">QR Code unavailable</p>
                </div>
              </div>
            </div>

            {/* Share Button */}
            <Button 
              onClick={shareInviteLink}
              className="w-full bg-green-500 hover:bg-green-600 text-white rounded-2xl py-2.5 font-bold text-sm"
            >
              <Share className="w-4 h-4 mr-2" />
              Share Link
            </Button>

            {/* Info */}
            <div className="bg-blue-50 p-3 rounded-2xl">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-800">
                  <p className="font-bold mb-1">How it works:</p>
                  <p className="mb-0.5">1. Share the code or link with friends</p>
                  <p className="mb-0.5">2. They enter the code in the app</p>
                  <p>3. You'll receive a friend request to approve</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
