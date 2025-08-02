
import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Users, Plus, Key, Copy } from "lucide-react";
import { motion } from "framer-motion";
import { getBeginnerGrid, isBeginnerUser } from "../components/game/BeginnerGrids";

export default function FriendMultiplayer() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState("select"); // select, create, join (though 'create' mode UI will be skipped now)
  const [joinCode, setJoinCode] = useState(""); // Used for joining games, renamed from inputCode
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (e) {
        navigate(createPageUrl("Home"));
      }
      setIsLoading(false);
    };
    fetchUser();
  }, [navigate]);

  const showFeedback = (message, type) => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const generateGrid = useCallback(() => {
    // אם יוצר המשחק הוא מתחיל, השתמש בלוח קל
    if (user && isBeginnerUser(user.games_played)) {
      const gameNumber = (user.games_played || 0) + 1;
      const beginnerGrid = getBeginnerGrid(gameNumber);
      
      if (beginnerGrid) {
        console.log(`Using beginner grid ${gameNumber} for friend multiplayer creator`);
        return beginnerGrid;
      }
    }
    
    // אחרת, צור לוח רגיל
    const letterWeights = {
      A: 9,  B: 2,  C: 3,  D: 4,  E: 12,
      F: 2,  G: 3,  H: 2,  I: 9,  J: 1,
      K: 1,  L: 4,  M: 2,  N: 6,  O: 8,
      P: 2,  Q: 1,  R: 6,  S: 4,  T: 6,
      U: 4,  V: 2,  W: 2,  X: 1,  Y: 2,  
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
  }, [user]); // Dependency on user for beginner check

  const createGame = async () => {
    if (!user) {
      showFeedback("User not logged in.", "error");
      return;
    }

    try {
      // Generate 6-digit game code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Generate shared grid using the new function
      const grid = generateGrid();

      const gameData = {
        game_code: code,
        grid: grid,
        player1_id: user.id,
        player1_nickname: user.nickname || user.full_name || "Player 1",
        player1_avatar: user.avatar || "🎮",
        status: "waiting"
      };

      const { FriendGame } = await import("@/api/entities");
      const newGame = await FriendGame.create(gameData);
      
      // Immediately navigate to the lobby as player 1
      navigate(createPageUrl(`FriendGameLobby?gameId=${newGame.id}`));
    } catch (error) {
      console.error("Error creating game:", error);
      showFeedback("Failed to create game", "error");
    }
  };

  const joinGame = useCallback(async () => {
    if (!user) {
      showFeedback("User not logged in.", "error");
      return;
    }
    if (!joinCode.trim()) {
      showFeedback("Please enter a game code", "error");
      return;
    }

    try {
      const { FriendGame } = await import("@/api/entities");
      // Filter by uppercase code as per outline
      const games = await FriendGame.filter({ game_code: joinCode.trim().toUpperCase() });
      
      const game = games[0]; // Assuming game code is unique and only one game will be found

      if (!game) {
        showFeedback("Game not found. Please check the code.", "error");
        return;
      }
      
      if (game.player1_id === user.id) {
        // Player is trying to join their own game, navigate directly
        navigate(createPageUrl(`FriendGameLobby?gameId=${game.id}`));
        return;
      }
      
      if (game.player2_id) {
        showFeedback("Game is full.", "error");
        return;
      }

      // Join the game
      await FriendGame.update(game.id, {
        player2_id: user.id,
        player2_nickname: user.nickname || user.full_name || "Player 2", // Use robust fallback
        player2_avatar: user.avatar || "🎮" // Use robust fallback
      });

      // Navigate to the lobby as player 2
      navigate(createPageUrl(`FriendGameLobby?gameId=${game.id}`));
    } catch (error) {
      console.error("Error joining game:", error);
      showFeedback("Failed to join game. Please try again.", "error");
    }
  }, [user, joinCode, navigate, showFeedback]);

  // Auto-join functionality from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const joinParam = urlParams.get('join');
    
    // Only attempt to auto-join if user is loaded, a join parameter exists,
    // we are in the initial 'select' mode, and the current joinCode doesn't already match the param
    // (to prevent re-triggering if setJoinCode causes a re-render).
    if (user && joinParam && mode === "select" && joinCode !== joinParam) {
      setJoinCode(joinParam); // Set the input field with the code from URL
      setMode("join"); // Switch the UI to the join game mode

      // Small delay to ensure state updates (joinCode, mode) are processed
      // and UI is potentially ready before attempting to join.
      const timer = setTimeout(() => {
        joinGame();
      }, 500);

      // Cleanup timeout if component unmounts or dependencies change before it fires
      return () => clearTimeout(timer);
    }
  }, [user, navigate, joinGame, setJoinCode, setMode, mode, joinCode]); // Dependencies for useEffect

  if (isLoading || !user) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center p-8">
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className={`fixed top-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl text-white font-bold z-50 shadow-lg
            ${feedback.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}
        >
          {feedback.message}
        </motion.div>
      )}

      <Link to={createPageUrl("MultiplayerMode")} className="absolute top-6 left-6">
        <Button variant="ghost" className="rounded-full p-3">
          <ArrowLeft className="w-6 h-6" />
        </Button>
      </Link>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="text-center max-w-md w-full"
      >
        <div className="text-8xl mb-6">👥</div>
        <h1 className="text-4xl font-black text-green-600 uppercase drop-shadow-md mb-4">Play with Friend</h1>
        <p className="text-lg text-gray-600 mb-8">Each player uses their own device!</p>

        {mode === "select" && (
          <div className="space-y-6">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={createGame}
                className="w-full h-20 text-2xl font-bold rounded-3xl bg-blue-500 hover:bg-blue-600 text-white shadow-xl border-b-8 border-blue-700"
              >
                <Plus className="w-8 h-8 mr-3" />
                Create Game
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={() => setMode("join")}
                className="w-full h-20 text-2xl font-bold rounded-3xl bg-purple-500 hover:bg-purple-600 text-white shadow-xl border-b-8 border-purple-700"
              >
                <Key className="w-8 h-8 mr-3" />
                Join Game
              </Button>
            </motion.div>
          </div>
        )}

        {/* The 'create' mode UI block is removed as createGame now navigates directly */}
        
        {mode === "join" && (
          <div className="space-y-6">
            <div className="bg-white/70 backdrop-blur-sm p-8 rounded-3xl shadow-xl">
              <h3 className="text-2xl font-bold text-purple-700 mb-4">Join Game</h3>
              <p className="text-gray-600 mb-4">Enter your friend's game code:</p>
              <Input
                value={joinCode} // Renamed from inputCode
                onChange={(e) => setJoinCode(e.target.value)} // Renamed from setInputCode
                placeholder="123456"
                className="text-center text-3xl font-black tracking-widest h-16 mb-4 bg-white/90 border-2 border-purple-300 rounded-2xl"
                maxLength={6}
              />
            </div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={joinGame}
                disabled={!joinCode.trim()} // Renamed from inputCode
                className="w-full h-16 text-xl font-bold rounded-3xl bg-green-500 hover:bg-green-600 text-white shadow-xl border-b-8 border-green-700 disabled:bg-gray-400 disabled:border-gray-600"
              >
                Join Game
              </Button>
            </motion.div>

            <Button 
              onClick={() => setMode("select")}
              variant="outline"
              className="w-full rounded-2xl border-2 border-gray-300 bg-white/80 hover:bg-white text-gray-700 shadow-lg"
            >
              Back
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
