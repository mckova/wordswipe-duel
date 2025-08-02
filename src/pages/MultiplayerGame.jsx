
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/api/entities";
import { MultiplayerGame } from "@/api/entities";
import { ValidatedWord } from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Timer, Star, RotateCcw, X, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import GameGrid from "../components/game/GameGrid";
import WordsList from "../components/game/WordsList";
import { wordCache } from "../components/game/WordCache";
import { awardXP } from "../components/xp/XPSystem";
import LevelUpModal from "../components/xp/LevelUpModal";

export default function MultiplayerGamePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [game, setGame] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  
  // My game state
  const [myGameState, setMyGameState] = useState({
    selectedCells: [],
    currentWord: "",
    foundWords: [],
    score: 0,
    timeRemaining: 60,
    gameActive: false, // Initially false for skeleton loader
    toast: null,
    isSubmittingWord: false,
  });

  // Opponent's game state (synced from server)
  const [opponentState, setOpponentState] = useState({
    foundWords: [],
    score: 0,
    timeRemaining: 60,
    gameActive: false, // Initially false for skeleton loader
  });

  const [gameStarted, setGameStarted] = useState(false); // Controls the actual start of gameplay after initial setup
  const [gameEnded, setGameEnded] = useState(false);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [levelUpData, setLevelUpData] = useState({ newLevel: 1, isMegaLevel: false });
  
  // Ref to prevent endGame from being called multiple times
  const gameFinishedRef = useRef(false);

  useEffect(() => {
    const loadGame = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const gameId = urlParams.get('gameId');
        const playerNumber = parseInt(urlParams.get('currentPlayer'));

        if (!gameId) {
          navigate(createPageUrl("Home"));
          return;
        }

        const [currentUser, gameData] = await Promise.all([
          User.me(),
          MultiplayerGame.list().then(games => games.find(g => g.id === gameId))
        ]);

        if (!gameData) {
          navigate(createPageUrl("Home"));
          return;
        }

        setUser(currentUser);
        setGame(gameData);
        setCurrentPlayer(playerNumber);

        // Load opponent info
        const opponentId = playerNumber === 1 ? gameData.player2_id : gameData.player1_id;
        if (opponentId !== "local_player_2") {
          const opponentData = await User.list().then(users => 
            users.find(u => u.id === opponentId)
          );
          setOpponent(opponentData);
        } else {
          setOpponent({ nickname: "Player 2", avatar: "🎮" });
        }

        // Start simultaneous game after a brief delay for setup/skeleton
        startSimultaneousGame();
        
      } catch (error) {
        console.error("Error loading game:", error);
        navigate(createPageUrl("Home"));
      }
      setIsLoading(false); // Main page loading is done, game-specific loading may still occur
    };

    loadGame();
  }, [navigate]);

  const startSimultaneousGame = useCallback(() => {
    // Reset states to "pre-game" to allow for skeleton loader and initial setup
    setMyGameState(prev => ({
      ...prev,
      selectedCells: [],
      currentWord: "",
      foundWords: [],
      score: 0,
      timeRemaining: 60,
      gameActive: false, // Keep inactive while loading/setting up
      toast: null,
      isSubmittingWord: false,
    }));

    setOpponentState(prev => ({
      ...prev,
      foundWords: [],
      score: 0,
      timeRemaining: 60,
      gameActive: false, // Keep inactive while loading/setting up
    }));

    setGameStarted(false); // Mark game as not yet fully started

    // Introduce a small delay to allow the GameGrid skeleton to show
    // before the game becomes fully active and interactive.
    setTimeout(() => {
      setMyGameState(prev => ({
        ...prev,
        gameActive: true, // Activate my game
        startTime: Date.now(),
      }));

      setOpponentState(prev => ({
        ...prev,
        gameActive: true, // Activate opponent's game (for timer simulation, etc.)
        startTime: Date.now(),
      }));

      setGameStarted(true); // Mark game as fully started and interactive
    }, 300); // 300ms delay to show skeleton loader, as per outline
  }, []);

  const showToast = (message, type) => {
    setMyGameState(prev => ({ ...prev, toast: { message, type } }));
    setTimeout(() => {
      setMyGameState(prev => ({ ...prev, toast: null }));
    }, 1500);
  };

  // Synchronize game end for both players, now with XP award logic
  const endGame = useCallback(async () => {
    if (gameFinishedRef.current) return; // Prevent multiple calls to endGame
    
    gameFinishedRef.current = true; // Mark game as finishing
    setMyGameState(prev => ({ ...prev, gameActive: false }));
    setOpponentState(prev => ({ ...prev, gameActive: false }));
    setGameEnded(true); // Update gameEnded state for UI

    // Save my results to the server
    if (game && user) {
      try {
        const isPlayer1 = currentPlayer === 1;
        const updateData = isPlayer1 ? {
          player1_words: myGameState.foundWords,
          player1_score: myGameState.score,
          status: "finished"
        } : {
          player2_words: myGameState.foundWords,
          player2_score: myGameState.score,
          status: "finished"
        };

        await MultiplayerGame.update(game.id, updateData);
        
        // Award XP for multiplayer game completion
        const xpResult = await awardXP(user.id, 20, "Multiplayer game completed");
        if (xpResult && xpResult.newLevel > xpResult.oldLevel) {
          setLevelUpData({ 
            newLevel: xpResult.newLevel, 
            isMegaLevel: xpResult.newLevel % 10 === 0 
          });
          setShowLevelUpModal(true);
        }

        // Navigate to shared result screen after a brief delay
        setTimeout(() => {
          navigate(createPageUrl(`MultiplayerResult?gameId=${game.id}&currentPlayer=${currentPlayer}`));
        }, 2000);
      } catch (error) {
        console.error("Error saving game or awarding XP:", error);
      }
    }
  }, [game, user, currentPlayer, myGameState.foundWords, myGameState.score, navigate]);

  // My independent game timer
  useEffect(() => {
    if (!myGameState.gameActive || gameEnded) return;
    
    if (myGameState.timeRemaining <= 0) {
      endGame();
      return;
    }

    const timer = setInterval(() => {
      setMyGameState(prev => ({ ...prev, timeRemaining: prev.timeRemaining - 1 }));
    }, 1000);

    return () => clearInterval(timer);
  }, [myGameState.timeRemaining, myGameState.gameActive, gameEnded, endGame]);

  // Opponent timer simulation (in real implementation, this would sync from server)
  useEffect(() => {
    if (!opponentState.gameActive || gameEnded) return;
    
    if (opponentState.timeRemaining <= 0) {
      endGame();
      return;
    }

    const timer = setInterval(() => {
      setOpponentState(prev => {
        const newTime = prev.timeRemaining - 1;
        
        // Simulate opponent finding words occasionally
        let newFoundWords = [...prev.foundWords];
        let newScore = prev.score;
        
        if (Math.random() < 0.04 && newTime > 0) { // 4% chance per second
          const sampleWords = ["cat", "dog", "run", "jump", "play", "game", "word", "test", "fire", "water", "earth", "wind"];
          const availableWords = sampleWords.filter(w => !newFoundWords.includes(w));
          
          if (availableWords.length > 0) {
            const randomWord = availableWords[Math.floor(Math.random() * availableWords.length)];
            const randomScore = [30, 60, 90][Math.floor(Math.random() * 3)];
            
            newFoundWords = [...newFoundWords, randomWord];
            newScore = newScore + randomScore;
          }
        }
        
        return {
          ...prev,
          timeRemaining: newTime,
          foundWords: newFoundWords,
          score: newScore,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [opponentState.timeRemaining, opponentState.gameActive, gameEnded, endGame]);

  // Polling to sync opponent's actual progress from server (in real multiplayer)
  useEffect(() => {
    if (!game || !gameStarted || gameEnded) return;
    
    const pollInterval = setInterval(async () => {
      try {
        const updatedGame = await MultiplayerGame.list().then(games => 
          games.find(g => g.id === game.id)
        );
        
        if (updatedGame) {
          // Update opponent's real progress
          const opponentWords = currentPlayer === 1 ? 
            updatedGame.player2_words : updatedGame.player1_words;
          const opponentScore = currentPlayer === 1 ? 
            updatedGame.player2_score : updatedGame.player1_score;
            
          if (opponentWords && opponentWords.length > 0) {
            setOpponentState(prev => ({
              ...prev,
              foundWords: opponentWords,
              score: opponentScore || 0,
            }));
          }
        }
      } catch (error) {
        console.error("Error syncing opponent progress:", error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [game, gameStarted, gameEnded, currentPlayer]);

  const handleCellSelect = (row, col) => {
    if (!myGameState.gameActive || gameEnded) return;

    const cellKey = `${row}-${col}`;
    const existingIndex = myGameState.selectedCells.findIndex(cell => cell.key === cellKey);

    if (existingIndex !== -1) {
      const newSelectedCells = myGameState.selectedCells.slice(0, existingIndex);
      const newWord = newSelectedCells.map(cell => cell.letter).join("").toLowerCase();
      
      setMyGameState(prev => ({
        ...prev,
        selectedCells: newSelectedCells,
        currentWord: newWord
      }));
    } else {
      const newCell = { key: cellKey, row, col, letter: game.shared_grid[row][col] };
      const newSelectedCells = [...myGameState.selectedCells, newCell];
      const newWord = newSelectedCells.map(cell => cell.letter).join("").toLowerCase();
        
      setMyGameState(prev => ({
        ...prev,
        selectedCells: newSelectedCells,
        currentWord: newWord
      }));
    }
  };

  const clearSelection = () => {
    setMyGameState(prev => ({
      ...prev,
      selectedCells: [],
      currentWord: ""
    }));
  };

  const submitWord = async () => {
    const word = myGameState.currentWord.toLowerCase();
    if (myGameState.isSubmittingWord || !myGameState.gameActive || gameEnded) return;

    if (word.length < 2) {
      showToast("Word too short!", "error");
      clearSelection();
      return;
    }
    if (myGameState.foundWords.includes(word)) {
      showToast("Already found!", "error");
      clearSelection();
      return;
    }
    
    setMyGameState(prev => ({ ...prev, isSubmittingWord: true }));

    const handleValidWord = (validWord) => {
      let wordScore = 0;
      let bonusMessages = [];
      
      if (validWord.length >= 8) {
          wordScore = 90;
      } else if (validWord.length >= 5) {
          wordScore = 60;
      } else {
          wordScore = 30;
      }
      
      const isNewWord = wordCache.isNewWord(validWord);
      let newWordBonus = 0;
      if (isNewWord) {
        newWordBonus = 20;
        wordScore += newWordBonus;
        bonusMessages.push("🎁 NEW WORD! (+20)");
        wordCache.addWord(validWord);
      }
      
      setMyGameState(prev => ({
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
      setMyGameState(prev => ({ ...prev, isSubmittingWord: false }));
    }
  };

  if (isLoading || !user || !game) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col text-gray-800 relative overflow-hidden">
      <AnimatePresence>
        {myGameState.toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.8 }}
            className={`fixed top-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl text-white font-bold z-40 shadow-lg text-sm
              ${myGameState.toast.type === 'success' ? 'bg-green-500' : myGameState.toast.type === 'info' ? 'bg-blue-500' : 'bg-red-500'}`}
          >
            {myGameState.toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <LevelUpModal
        isOpen={showLevelUpModal}
        onClose={() => setShowLevelUpModal(false)}
        newLevel={levelUpData.newLevel}
        isMegaLevel={levelUpData.isMegaLevel}
      />

      {/* Simultaneous Dual Player HUD */}
      <div className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
        {/* My Stats */}
        <div className="flex items-center gap-2">
          <div className="text-3xl">{user.avatar || "🎮"}</div>
          <div>
            <p className="text-sm font-bold">{user.nickname || "You"}</p>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              <span className="font-bold">{myGameState.score}</span>
            </div>
          </div>
          <div className="ml-4">
            <Timer className="w-6 h-6" />
            <span className={`text-2xl font-black ${myGameState.timeRemaining <= 10 ? 'text-red-300 animate-pulse' : ''}`}>
              {myGameState.timeRemaining}
            </span>
          </div>
        </div>

        {/* Live VS Indicator */}
        <div className="text-center">
          <div className="text-2xl font-black">VS</div>
          <div className="text-xs opacity-80">LIVE</div>
          {gameEnded && (
            <div className="text-sm mt-1">
              {myGameState.score > opponentState.score ? "🏆 WIN!" : 
               myGameState.score < opponentState.score ? "💔 LOSE" : "🤝 TIE!"}
            </div>
          )}
        </div>

        {/* Opponent Stats */}
        <div className="flex items-center gap-2 flex-row-reverse">
          <div className="text-3xl">{opponent?.avatar || "🎮"}</div>
          <div className="text-right">
            <p className="text-sm font-bold">{opponent?.nickname || "Opponent"}</p>
            <div className="flex items-center gap-2 justify-end">
              <span className="font-bold">{opponentState.score}</span>
              <Star className="w-4 h-4" />
            </div>
          </div>
          <div className="mr-4 text-right">
            <Timer className="w-6 h-6" />
            <span className={`text-2xl font-black ${opponentState.timeRemaining <= 10 ? 'text-red-300 animate-pulse' : ''}`}>
              {opponentState.timeRemaining}
            </span>
          </div>
        </div>
      </div>

      {/* Current Word Display */}
      <div className="text-center py-2 bg-white/80">
        <p className="text-gray-600 text-sm">Current Word</p>
        <p className="text-2xl text-purple-800 font-black tracking-widest uppercase">
          {myGameState.currentWord || "_"}
        </p>
      </div>

      {/* Shared Game Grid - Main focus with skeleton loader support */}
      <div className="flex-grow flex justify-center items-center px-3">
        <GameGrid
          grid={game.shared_grid}
          selectedCells={myGameState.selectedCells}
          onCellSelect={handleCellSelect}
          // Pass isLoading prop to GameGrid to trigger skeleton display
          // The grid shows skeleton if the game hasn't officially started (after data fetch)
          isLoading={!gameStarted} 
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center px-3 py-3">
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button 
            onClick={clearSelection} 
            variant="outline" 
            className="rounded-2xl border-2 border-gray-300 bg-white/80 hover:bg-white text-gray-600 p-4 shadow-lg"
            disabled={!myGameState.gameActive || gameEnded}
          >
            <RotateCcw size={28} />
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button 
            onClick={submitWord} 
            disabled={myGameState.isSubmittingWord || !myGameState.gameActive || gameEnded}
            className="text-white text-xl font-bold rounded-2xl px-8 py-4 bg-green-500 hover:bg-green-600 border-b-4 border-green-700 shadow-xl disabled:bg-gray-400 disabled:border-b-4 disabled:border-gray-600"
          >
            {myGameState.isSubmittingWord ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Checking...</span>
              </div>
            ) : "Submit Word"}
          </Button>
        </motion.div>
      </div>

      {/* Live Found Words Lists */}
      <div className="px-3 pb-3">
        <div className="flex gap-4">
          <div className="flex-1">
            <WordsList foundWords={myGameState.foundWords} title="Your Words" />
          </div>
          <div className="flex-1">
            <WordsList foundWords={opponentState.foundWords} title="Opponent's Words" />
          </div>
        </div>
      </div>
    </div>
  );
}
