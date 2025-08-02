
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/api/entities";
import { FriendGame as FriendGameEntity } from "@/api/entities";
import { ValidatedWord } from "@/api/entities"; // New import
import { InvokeLLM } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Timer, Star, RotateCcw, Users, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import GameGrid from "../components/game/GameGrid";
import WordsList from "../components/game/WordsList";
import PowerUpBar from "../components/game/PowerUpBar";
import { wordCache } from "../components/game/WordCache"; // New import

export default function FriendGame() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [game, setGame] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMyTurn, setIsMyTurn] = useState(false); // Added based on outline
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [gameState, setGameState] = useState({
    selectedCells: [],
    currentWord: "",
    foundWords: [],
    score: 0,
    timeRemaining: 60,
    gameActive: false,
    toast: null,
    isSubmittingWord: false,
    doubleScoreActive: false,
    doubleScoreTimeLeft: 0,
    gameFinished: false, // Added based on outline
  });
  const [userPowerUps, setUserPowerUps] = useState({});

  useEffect(() => {
    const init = async () => { // Renamed from initGame
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('gameId'); // Renamed to id
        
        if (!id) {
          navigate(createPageUrl("Home"));
          return;
        }

        setGameId(id); // Set gameId state
        const currentUser = await User.me();
        setUser(currentUser);

        // Get game data
        const gameData = await FriendGameEntity.get(id); // Use FriendGameEntity and get by id
        if (!gameData) {
          navigate(createPageUrl("Home"));
          return;
        }

        setGame(gameData); // Set game state

        setUserPowerUps({
          extra_time: currentUser.extra_time_powerups || 0,
          word_hint: currentUser.word_hint_powerups || 0,
          double_score: currentUser.double_score_powerups || 0,
          swap_board: currentUser.swap_board_powerups || 0,
        });
        
        // Determine if it's this player's turn based on game status
        // Both players start simultaneously in friend games
        setIsMyTurn(true); // As per outline
        
        setGameState(prev => ({
          ...prev,
          gameActive: true,
          timeRemaining: 60, // As per outline
          // Note: foundWords and score will start at their initial values (empty array, 0)
          // based on the provided outline for setGameState.
          // The previous logic for player1/player2 specific words/score is removed here.
        }));

      } catch (error) {
        console.error("Error initializing friend game:", error);
        navigate(createPageUrl("Home"));
      }
      setIsLoading(false);
    };

    init();
  }, [navigate]);

  const showToast = (message, type) => {
    setGameState(prev => ({ ...prev, toast: { message, type } }));
    setTimeout(() => {
      setGameState(prev => ({ ...prev, toast: null }));
    }, 1500);
  };

  const handleTimeUp = useCallback(async () => {
    if (!game || !user) return; // Use 'game' instead of 'gameData'

    setGameState(prev => ({ ...prev, gameActive: false }));

    try {
      const updateData = {};
      // Determine if the current user is player 1 or player 2
      const isCurrentPlayer1 = user.id === game.player1_id;

      if (isCurrentPlayer1) {
        updateData.player1_words = gameState.foundWords;
        updateData.player1_score = gameState.score;
        updateData.player1_finished = true;
      } else {
        updateData.player2_words = gameState.foundWords;
        updateData.player2_score = gameState.score;
        updateData.player2_finished = true;
      }

      await FriendGameEntity.update(game.id, updateData); // Use 'game.id'
      
      navigate(createPageUrl(`FriendGameResult?gameId=${game.id}`)); // Use 'game.id'

    } catch (error) {
      console.error("Error updating friend game:", error);
    }
  }, [game, user, gameState.foundWords, gameState.score, navigate]); // Updated dependencies

  useEffect(() => {
    if (!gameState.gameActive) return;
    if (gameState.timeRemaining <= 0) {
      handleTimeUp();
      return;
    }
    const timer = setInterval(() => {
      setGameState(prev => ({ ...prev, timeRemaining: prev.timeRemaining - 1 }));
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState.timeRemaining, gameState.gameActive, handleTimeUp]);

  useEffect(() => {
    if (!gameState.doubleScoreActive || gameState.doubleScoreTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setGameState(prev => {
        if (prev.doubleScoreTimeLeft <= 1) {
          showToast("Double score ended!", "info");
          return { ...prev, doubleScoreActive: false, doubleScoreTimeLeft: 0 };
        }
        return { ...prev, doubleScoreTimeLeft: prev.doubleScoreTimeLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState.doubleScoreActive, gameState.doubleScoreTimeLeft]);

  const handleCellSelect = (row, col) => {
    if (!gameState.gameActive) return;
    const cellKey = `${row}-${col}`;
    const existingIndex = gameState.selectedCells.findIndex(cell => cell.key === cellKey);
    if (existingIndex !== -1) {
      const newSelectedCells = gameState.selectedCells.slice(0, existingIndex);
      const newWord = newSelectedCells.map(cell => cell.letter).join("").toLowerCase();
      setGameState(prev => ({...prev, selectedCells: newSelectedCells, currentWord: newWord}));
    } else {
      const newCell = { key: cellKey, row, col, letter: game.grid[row][col] }; // Use 'game.grid'
      const newSelectedCells = [...gameState.selectedCells, newCell];
      const newWord = newSelectedCells.map(cell => cell.letter).join("").toLowerCase();
      setGameState(prev => ({...prev, selectedCells: newSelectedCells, currentWord: newWord}));
    }
  };

  const clearSelection = () => {
    setGameState(prev => ({...prev, selectedCells: [], currentWord: ""}));
  };

  const usePowerUp = async (powerUpType) => {
    if (powerUpType === 'swap_board') {
      showToast("Swap Board is only available in single-player games.", "info");
      return;
    }

    if (!gameState.gameActive || !userPowerUps[powerUpType] || userPowerUps[powerUpType] <= 0) {
      showToast("No power-ups left or game not active!", "error");
      return;
    }
    
    try {
      let updatedUserPowerUps = { ...userPowerUps };
      updatedUserPowerUps[powerUpType] = updatedUserPowerUps[powerUpType] - 1;

      switch (powerUpType) {
        case "extra_time":
          setGameState(prev => ({ ...prev, timeRemaining: Math.min(prev.timeRemaining + 10, 99) }));
          showToast("⏰ +10 seconds!", "success");
          break;
        case "word_hint":
          showToast("💡 Look for 3+ letter words!", "success");
          break;
        case "double_score":
          if (!gameState.doubleScoreActive) {
            setGameState(prev => ({ ...prev, doubleScoreActive: true, doubleScoreTimeLeft: 30 }));
            showToast("💥 Double Score for 30s!", "success");
          } else {
            showToast("Double score already active!", "info");
            return;
          }
          break;
        default:
            return;
      }
      
      setUserPowerUps(updatedUserPowerUps);
      
      const updateData = {};
      updateData[`${powerUpType}_powerups`] = updatedUserPowerUps[powerUpType];
      await User.updateMyUserData(updateData);
      
    } catch (error) {
      console.error("Error using power-up:", error);
      showToast("Failed to use power-up", "error");
    }
  };

  const submitWord = async () => {
    const word = gameState.currentWord.toLowerCase();
    if (gameState.isSubmittingWord || !gameState.gameActive) return; // Added !gameState.gameActive

    if (word.length < 2) {
      showToast("Word too short!", "error");
      clearSelection();
      return;
    }
    if (gameState.foundWords.includes(word)) {
      showToast("Already found!", "error");
      clearSelection();
      return;
    }
    
    setGameState(prev => ({ ...prev, isSubmittingWord: true }));

    const handleValidWord = (validWord) => {
      let wordScore = 0;
      let bonusMessages = [];
      
      // Base score calculation
      if (validWord.length >= 8) {
          wordScore = 90;
      } else if (validWord.length >= 5) {
          wordScore = 60;
      } else {
          wordScore = 30;
      }
      
      // Check if this is a new word for bonus
      const isNewWord = wordCache.isNewWord(validWord);
      let newWordBonus = 0;
      if (isNewWord) {
        newWordBonus = 20;
        wordScore += newWordBonus;
        bonusMessages.push("🎁 NEW WORD! (+20)");
        wordCache.addWord(validWord);
      }

      // Apply double score power-up if active
      if (gameState.doubleScoreActive) {
        wordScore *= 2;
        bonusMessages.push("💥 2x Bonus!");
      }
      
      setGameState(prev => ({
        ...prev,
        foundWords: [...prev.foundWords, validWord],
        score: prev.score + wordScore,
      }));
      
      let finalToastMessage = `✨ "${validWord.toUpperCase()}" - ${wordScore} points`;
      if (bonusMessages.length > 0) {
        finalToastMessage += ` ${bonusMessages.join(" ")}`;
      }
      showToast(finalToastMessage, "success");
    };

    try {
      // First, check if word exists in ValidatedWord database
      const validatedWords = await ValidatedWord.filter({ word: word });
      
      if (validatedWords.length > 0) {
        // Word found in database - use cached result
        const validatedWord = validatedWords[0];
        if (validatedWord.is_valid) {
          handleValidWord(word);
        } else {
          showToast("❌ Not a valid word!", "error");
        }
      } else {
        // Word not in database - call API and save result
        const response = await InvokeLLM({
          prompt: `Is "${word}" a real, common English word? Answer only in JSON.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              isValid: {
                type: "boolean",
                description: "True if the word is a valid and common English word, false otherwise."
              }
            },
            required: ["isValid"]
          }
        });
        
        // Save the validation result to database for all users
        try {
          await ValidatedWord.create({
            word: word,
            is_valid: response && response.isValid
          });
        } catch (dbError) {
          console.error("Error saving word validation:", dbError);
          // Continue even if saving to DB fails
        }
        
        if (response && response.isValid) {
          handleValidWord(word);
        } else {
          showToast("❌ Not a valid word!", "error");
        }
      }
    } catch (error) {
      console.error("Error validating word:", error);
      showToast("Could not check word.", "error");
    } finally {
      clearSelection();
      setGameState(prev => ({ ...prev, isSubmittingWord: false }));
    }
  };

  if (isLoading || !game || !user) { // Use 'game' instead of 'gameData'
    return <div className="w-full h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div></div>;
  }

  // Determine current player's nickname based on user.id and game data
  let currentPlayersNickname = "You";
  if (user && game) {
    if (user.id === game.player1_id) {
      currentPlayersNickname = game.player1_nickname || "You";
    } else if (user.id === game.player2_id) {
      currentPlayersNickname = game.player2_nickname || "You";
    }
  }
  const playerName = currentPlayersNickname;

  return (
    <div className="w-full min-h-screen flex flex-col p-4 text-gray-800 relative">
      <Button onClick={() => setShowExitConfirm(true)} variant="ghost" className="absolute top-4 left-4 z-50 h-14 w-14 rounded-full bg-white/60 backdrop-blur-sm shadow-md">
        <X className="w-7 h-7" />
      </Button>

      <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quit Game?</DialogTitle>
            <DialogDescription>Are you sure you want to quit? Quitting an online match may result in a loss.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-4 mt-4">
            <Button variant="ghost" onClick={() => setShowExitConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => navigate(createPageUrl("Home"))}>Quit Game</Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <AnimatePresence>
        {gameState.toast && (
          <motion.div initial={{ opacity: 0, y: -50, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.8 }} className={`fixed top-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl text-white font-bold z-50 shadow-lg ${gameState.toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
            {gameState.toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex justify-between items-center text-2xl font-bold mb-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-2xl shadow-md">
          <Timer className="w-7 h-7 text-rose-500" />
          <span className="text-rose-800">{gameState.timeRemaining}</span>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-2xl shadow-md">
          <Users className="w-7 h-7 text-purple-500" />
          <span className="text-purple-800">{playerName}</span>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-2xl shadow-md">
          <Star className="w-7 h-7 text-yellow-500" />
          <span className="text-yellow-800">{gameState.score}</span>
        </div>
        {gameState.doubleScoreActive && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-2xl shadow-md animate-pulse">
            <span>💥</span>
            <span className="text-sm">2X ({gameState.doubleScoreTimeLeft}s)</span>
          </motion.div>
        )}
      </header>

      <PowerUpBar 
        userPowerUps={userPowerUps}
        onUsePowerUp={usePowerUp}
        gameActive={gameState.gameActive}
        availablePowerUps={["extra_time", "word_hint", "swap_board", "double_score"]}
      />

      <main className="flex-grow flex flex-col items-center justify-center">
        <div className="mb-4 text-center h-20 flex flex-col justify-center">
          <p className="text-gray-600">Current Word</p>
          <p className="text-4xl text-purple-800 font-black tracking-widest uppercase h-12">{gameState.currentWord || "_"}</p>
        </div>

        <GameGrid grid={game.grid} selectedCells={gameState.selectedCells} onCellSelect={handleCellSelect} /> {/* Use 'game.grid' */}

        <div className="flex gap-4 mt-6">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button onClick={clearSelection} variant="outline" className="rounded-2xl border-2 border-gray-300 bg-white/80 hover:bg-white text-gray-600 p-5 shadow-lg"><RotateCcw size={32} /></Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={submitWord} disabled={gameState.isSubmittingWord} className="text-white text-2xl font-bold rounded-2xl px-10 py-8 bg-green-500 hover:bg-green-600 border-b-8 border-green-700 shadow-xl disabled:bg-gray-400 disabled:border-b-8 disabled:border-gray-600">
              {gameState.isSubmittingWord ? (
                <div className="flex items-center gap-2"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div><span>Checking...</span></div>
              ) : "Submit Word"}
            </Button>
          </motion.div>
        </div>
      </main>

      <div className="mt-auto">
        <WordsList foundWords={gameState.foundWords} />
      </div>
    </div>
  );
}
