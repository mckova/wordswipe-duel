
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/api/entities";
import { WaitingPlayer } from "@/api/entities";
import { GameStartEvent } from "@/api/entities";
import { MultiplayerGame } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { getBeginnerGrid, isBeginnerUser } from "../components/game/BeginnerGrids";

export default function OnlineMatchmaking() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWaiting, setIsWaiting] = useState(false);
  const [showWaitingModal, setShowWaitingModal] = useState(false);
  const [opponent, setOpponent] = useState(null); // New state to hold opponent's User object

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await User.me();
        setUser({
          ...currentUser,
          nickname: currentUser.nickname || currentUser.full_name || "Player",
          avatar: currentUser.avatar || "🎮"
        });
      } catch (e) {
        navigate(createPageUrl("Home"));
      }
      setIsLoading(false);
    };
    fetchUser();
  }, [navigate]);

  // Poll for game start events when waiting
  useEffect(() => {
    if (!isWaiting || !user) return;

    const pollForGameStart = async () => {
      try {
        const events = await GameStartEvent.filter({ player1_id: user.id, game_mode: "online" });
        const recentEvent = events.find(event =>
          Date.now() - event.start_timestamp < 10000 // Within 10 seconds
        );

        if (recentEvent) {
          setIsWaiting(false);
          setShowWaitingModal(false);
          setOpponent(null); // Clear opponent state on game start
          navigate(createPageUrl(`MultiplayerGame?gameId=${recentEvent.game_id}&mode=online`));
          return;
        }

        // Also check if we're player 2
        const player2Events = await GameStartEvent.filter({ player2_id: user.id, game_mode: "online" });
        const recentPlayer2Event = player2Events.find(event =>
          Date.now() - event.start_timestamp < 10000
        );

        if (recentPlayer2Event) {
          setIsWaiting(false);
          setShowWaitingModal(false);
          setOpponent(null); // Clear opponent state on game start
          navigate(createPageUrl(`MultiplayerGame?gameId=${recentPlayer2Event.game_id}&mode=online`));
        }
      } catch (error) {
        console.error("Error polling for game start:", error);
      }
    };

    const interval = setInterval(pollForGameStart, 1000);
    return () => clearInterval(interval);
  }, [isWaiting, user, navigate]);

  const generateSharedGrid = useCallback(() => {
    // בדוק אם אחד השחקנים הוא מתחיל
    const isPlayer1Beginner = user && isBeginnerUser(user.games_played);
    const isPlayer2Beginner = opponent && isBeginnerUser(opponent.games_played);

    // אם אחד מהם מתחיל, השתמש בלוח קל
    if (isPlayer1Beginner || isPlayer2Beginner) {
      const beginnerPlayer = isPlayer1Beginner ? user : opponent;
      // Ensure games_played is treated as 0 if undefined for new users
      const gameNumber = (beginnerPlayer?.games_played || 0) + 1;
      const beginnerGrid = getBeginnerGrid(gameNumber);

      if (beginnerGrid) {
        console.log(`Using beginner grid ${gameNumber} for online multiplayer with beginner player`);
        return beginnerGrid;
      }
    }

    // אחרת, צור לוח רגיל
    const letterWeights = {
      A: 9, B: 2, C: 3, D: 4, E: 12,
      F: 2, G: 3, H: 2, I: 9, J: 1,
      K: 1, L: 4, M: 2, N: 6, O: 8,
      P: 2, Q: 1, R: 6, S: 4, T: 6,
      U: 4, V: 2, W: 2, X: 1, Y: 2,
      Z: 1
    };
    const letterPool = Object.entries(letterWeights).flatMap(([ltr, w]) => Array(w).fill(ltr));

    const grid = [];
    for (let i = 0; i < 5; i++) {
      const row = [];
      for (let j = 0; j < 5; j++) {
        row.push(letterPool[Math.floor(Math.random() * letterPool.length)]);
      }
      grid.push(row);
    }
    return grid;
  }, [user, opponent]); // הוסף תלויות

  const findMatch = async () => {
    if (!user) return;

    setIsWaiting(true);
    setShowWaitingModal(true);
    setOpponent(null); // Clear opponent state at the start of finding a match

    try {
      // Check if there's already a waiting player
      const waitingPlayers = await WaitingPlayer.list();
      const otherPlayerInQueue = waitingPlayers.find(p => p.user_id !== user.id);

      if (otherPlayerInQueue) {
        // Found a match! Create game and start event
        // Fetch the full User object for the player in the queue to get their games_played
        const actualOpponentUser = await User.get(otherPlayerInQueue.user_id);
        setOpponent(actualOpponentUser); // Set opponent state for generateSharedGrid to use

        const sharedGrid = generateSharedGrid(); // This will now correctly consider both players' game counts
        const startTimestamp = Date.now() + 3000; // Start in 3 seconds

        const newGame = await MultiplayerGame.create({
          player1_id: otherPlayerInQueue.user_id, // The player who was waiting
          player2_id: user.id, // The current user who found the match
          shared_grid: sharedGrid,
          game_mode: "online",
          status: "active",
          start_time: new Date(startTimestamp).toISOString()
        });

        // Create game start event
        await GameStartEvent.create({
          game_id: newGame.id,
          player1_id: otherPlayerInQueue.user_id,
          player2_id: user.id,
          shared_grid: sharedGrid,
          start_timestamp: startTimestamp,
          game_mode: "online"
        });

        // Remove both players from waiting queue
        await WaitingPlayer.delete(otherPlayerInQueue.id);

        // Navigate to game
        setIsWaiting(false);
        setShowWaitingModal(false);
        setOpponent(null); // Clear opponent state after successful match
        navigate(createPageUrl(`MultiplayerGame?gameId=${newGame.id}&mode=online`));
      } else {
        // No match found, add to waiting queue
        await WaitingPlayer.create({
          user_id: user.id,
          nickname: user.nickname,
          avatar: user.avatar
        });
      }
    } catch (error) {
      console.error("Error finding match:", error);
      setIsWaiting(false);
      setShowWaitingModal(false);
      setOpponent(null); // Clear opponent state on error
    }
  };

  const cancelWaiting = async () => {
    if (!user) return;

    try {
      const waitingPlayers = await WaitingPlayer.filter({ user_id: user.id });
      if (waitingPlayers.length > 0) {
        await WaitingPlayer.delete(waitingPlayers[0].id);
      }
    } catch (error) {
      console.error("Error canceling wait:", error);
    }

    setIsWaiting(false);
    setShowWaitingModal(false);
    setOpponent(null); // Clear opponent state when canceling
  };

  if (isLoading || !user) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 pb-36">
      <Link to={createPageUrl("MultiplayerMode")} className="absolute top-6 left-6">
        <Button variant="ghost" className="rounded-full p-3">
          <ArrowLeft className="w-6 h-6" />
        </Button>
      </Link>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="text-center flex flex-col items-center w-full max-w-sm mx-auto"
      >
        <div className="text-6xl sm:text-8xl mb-4 sm:mb-6">🌐</div>
        <h1 className="text-3xl sm:text-5xl font-black text-purple-700 uppercase drop-shadow-md mb-1 sm:mb-2">Online</h1>
        <h2 className="text-xl sm:text-3xl font-bold text-blue-600 mb-8 sm:mb-12">Word Duel</h2>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full mb-6 sm:mb-8">
          <Button
            onClick={findMatch}
            disabled={isWaiting}
            className="w-full h-16 sm:h-20 text-lg sm:text-2xl font-bold rounded-3xl bg-blue-500 hover:bg-blue-600 text-white shadow-xl border-b-8 border-blue-700"
          >
            <Users className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3" />
            {isWaiting ? "Searching..." : "Find Online Player"}
          </Button>
        </motion.div>

        <p className="text-gray-600 text-sm sm:text-lg max-w-xs sm:max-w-md leading-relaxed px-4 sm:px-0">
          Connect with players from around the world for an exciting word duel!
        </p>
      </motion.div>

      {/* Waiting Modal */}
      <AnimatePresence>
        <Dialog open={showWaitingModal} onOpenChange={() => {}}>
          <DialogContent className="max-w-xs bg-white rounded-3xl shadow-2xl border-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-center p-4"
            >
              <button
                onClick={cancelWaiting}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>

              <DialogHeader className="text-center mb-6">
                <div className="text-6xl mb-4">🌐</div>
                <DialogTitle className="text-2xl font-bold text-purple-800">
                  Finding Opponent...
                </DialogTitle>
              </DialogHeader>

              <div className="flex items-center justify-center gap-3 mb-6">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span className="text-lg font-semibold text-gray-700">Searching worldwide</span>
              </div>

              <p className="text-sm text-gray-600 mb-6">
                Looking for another player to challenge. This usually takes just a few seconds!
              </p>

              <Button
                onClick={cancelWaiting}
                variant="outline"
                className="w-full rounded-2xl"
              >
                Cancel Search
              </Button>
            </motion.div>
          </DialogContent>
        </Dialog>
      </AnimatePresence>
    </div>
  );
}
