
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/api/entities";
import { MultiplayerGame } from "@/api/entities";
import { ValidatedWord } from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Timer, Star, RotateCcw, X, Users, ArrowRight, Play, Trophy, Medal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import GameGrid from "../components/game/GameGrid";
import WordsList from "../components/game/WordsList";
import { wordCache } from "../components/game/WordCache";
import { haptics } from "../components/utils/HapticFeedback";
import { getBeginnerGrid, isBeginnerUser } from "../components/game/BeginnerGrids";

export default function LocalDuel() {
  const navigate = useNavigate();
  // Renamed 'user' to 'player1Info' for clarity as per outline's intent
  const [player1Info, setPlayer1Info] = useState(null); 
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showGameResults, setShowGameResults] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [gamePhase, setGamePhase] = useState("instructions"); // "instructions", "playing", "switching", "finished"
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  
  const [gameState, setGameState] = useState({
    grid: [],
    selectedCells: [],
    currentWord: "",
    player1Words: [],
    player2Words: [],
    player1Score: 0,
    player2Score: 0,
    timeRemaining: 60,
    gameActive: false,
    toast: null,
    isSubmittingWord: false,
    player1Finished: false,
    player2Finished: false,
    gameStarted: false
  });

  const [dictionaryWorker, setDictionaryWorker] = useState(null);
  const [workerReady, setWorkerReady] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Network status detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize dictionary worker
  useEffect(() => {
    if (typeof Worker === "undefined") {
      console.warn("Web Workers are not supported in this environment.");
      setWorkerReady(false);
      return;
    }

    const workerScript = `
      const WORD_LIST = [
        "am", "an", "as", "at", "be", "by", "do", "go", "he", "if", "in", "is", "it", "me", "my", "no", "of", "on", "or", "so", "to", "up", "we",
        "add", "age", "ago", "aid", "aim", "air", "all", "and", "any", "app", "are", "arm", "art", "ask", "bad", "bag", "bar", "bat", "bay", "bed", "bee", "bet", "big", "bit", "box", "boy", "bug", "bus", "but", "buy", "can", "car", "cat", "cup", "cut", "day", "did", "die", "dig", "dog", "dot", "dry", "due", "ear", "eat", "egg", "end", "era", "eye", "fan", "far", "fat", "few", "fit", "fix", "fly", "for", "fox", "fun", "gap", "gas", "get", "god", "got", "gun", "guy", "had", "has", "hat", "her", "hey", "him", "his", "hit", "hot", "how", "ice", "job", "joy", "key", "kid", "law", "lay", "led", "leg", "let", "lie", "lot", "low", "mad", "man", "map", "may", "mix", "mom", "new", "not", "now", "odd", "off", "old", "one", "our", "out", "own", "pay", "pen", "pet", "pie", "pig", "put", "ran", "red", "run", "sad", "say", "sea", "see", "set", "she", "shy", "sit", "six", "sky", "son", "sun", "tax", "tea", "ten", "the", "tie", "tip", "top", "toy", "try", "two", "use", "van", "war", "was", "way", "web", "who", "why", "win", "yes", "yet", "you", "zoo"
      ];
      
      const WORD_SET = new Set(WORD_LIST.map(word => word.toLowerCase()));
      
      self.addEventListener('message', function(e) {
        const { word, messageId } = e.data;
        
        if (!word) {
          self.postMessage({ valid: false, messageId });
          return;
        }
        
        const normalizedWord = word.toLowerCase().trim();
        const isValid = WORD_SET.has(normalizedWord);
        
        self.postMessage({ valid: isValid, messageId, word: normalizedWord });
      });
      
      self.postMessage({ ready: true });
    `;

    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    worker.onmessage = function(e) {
      const { ready } = e.data;
      if (ready) {
        setWorkerReady(true);
        console.log('Dictionary worker ready');
      }
    };

    worker.onerror = function(error) {
      console.error('Dictionary worker error:', error);
      setWorkerReady(false);
    };

    setDictionaryWorker(worker);

    return () => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
    };
  }, []);

  const generateGrid = useCallback(() => {
    // If the first player is a beginner, use an easy grid
    // Dependency now specifically on player1Info.games_played to avoid unnecessary re-creation
    if (player1Info && isBeginnerUser(player1Info.games_played)) {
      const gameNumber = (player1Info.games_played || 0) + 1; // Increment for the current game
      const beginnerGrid = getBeginnerGrid(gameNumber);
      
      if (beginnerGrid) {
        console.log(`Using beginner grid ${gameNumber} for new player in Local Duel`);
        return beginnerGrid;
      }
    }
    
    // Otherwise, generate a regular random grid
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
  }, [player1Info?.games_played]); // Dependency changed to player1Info?.games_played

  const startNewGame = useCallback(() => {
    const newGrid = generateGrid();
    
    // Fully reset game state for a new game
    setGameState({
      grid: newGrid, 
      selectedCells: [],
      currentWord: "",
      player1Words: [],
      player2Words: [],
      player1Score: 0,
      player2Score: 0,
      timeRemaining: 30, // Updated from 60 to 30
      gameActive: true, 
      toast: null,
      isSubmittingWord: false,
      player1Finished: false, 
      player2Finished: false, 
      gameStarted: true 
    });

    setCurrentPlayer(1);
    setGamePhase("playing");
    setShowInstructions(false);
  }, [generateGrid]);

  useEffect(() => {
    const init = async () => {
      try {
        const u = await User.me();
        setPlayer1Info(u); // Update player1Info state
      } catch (e) {
        navigate(createPageUrl("Home"));
      }
    };
    init();
  }, [navigate]);

  // New useEffect to start game automatically once player info is loaded, if in instructions phase
  useEffect(() => {
    // Start game only after player1Info is loaded and if we are in the initial instructions phase
    // and the grid hasn't been generated yet (i.e., game hasn't started or reset fully).
    if (player1Info && gameState.grid.length === 0 && gamePhase === "instructions") {
      startNewGame();
    }
  }, [player1Info, gameState.grid.length, gamePhase, startNewGame]);

  const showToast = (message, type) => {
    setGameState(prev => ({ ...prev, toast: { message, type } }));
    
    if (type === 'success') {
      haptics.success();
    } else if (type === 'error') {
      haptics.warning();
    }
    
    setTimeout(() => {
      setGameState(prev => ({ ...prev, toast: null }));
    }, 1500);
  };

  const finishPlayerTurn = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      gameActive: false,
      timeRemaining: 0, // Ensure time is truly 0
      [`player${currentPlayer}Finished`]: true
    }));

    if (currentPlayer === 1) {
      setShowSwitchDialog(true);
    } else {
      setGamePhase("finished");
      setShowGameResults(true);
    }
  }, [currentPlayer]);

  const switchToPlayer2 = () => {
    setShowSwitchDialog(false);
    setCurrentPlayer(2);
    setGameState(prev => ({
      ...prev,
      selectedCells: [],
      currentWord: "",
      timeRemaining: 30, // Also setting to 30 for player 2's turn
      gameActive: true,
      toast: null
    }));
  };

  // Timer effect - Main fix
  useEffect(() => {
    if (!gameState.gameActive || gamePhase !== "playing") return;
    
    // If time is 0 or less, end the turn immediately
    if (gameState.timeRemaining <= 0) {
      finishPlayerTurn();
      return;
    }
    
    const timer = setInterval(() => {
      setGameState(prev => {
        const newTimeRemaining = prev.timeRemaining - 1;
        
        // If time reaches 0 or less, set to 0 and indicate game is no longer active for that player
        if (newTimeRemaining <= 0) {
          return { ...prev, timeRemaining: 0, gameActive: false };
        }
        
        return { ...prev, timeRemaining: newTimeRemaining };
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameState.timeRemaining, gameState.gameActive, gamePhase, finishPlayerTurn]);

  // Additional effect to ensure the game stops when time reaches 0
  useEffect(() => {
    if (gameState.timeRemaining === 0 && gameState.gameActive && gamePhase === "playing") {
      finishPlayerTurn();
    }
  }, [gameState.timeRemaining, gameState.gameActive, gamePhase, finishPlayerTurn]);

  const handleCellSelect = (row, col) => {
    // Ensure game is active and there's time remaining
    if (!gameState.gameActive || gameState.timeRemaining <= 0) return;

    const cellKey = `${row}-${col}`;
    const existingIndex = gameState.selectedCells.findIndex(cell => cell.key === cellKey);

    if (existingIndex !== -1) {
      const newSelectedCells = gameState.selectedCells.slice(0, existingIndex);
      const newWord = newSelectedCells.map(cell => cell.letter).join("").toLowerCase();
      
      setGameState(prev => ({
        ...prev,
        selectedCells: newSelectedCells,
        currentWord: newWord
      }));
    } else {
      const newCell = { key: cellKey, row, col, letter: gameState.grid[row][col] };
      const newSelectedCells = [...gameState.selectedCells, newCell];
      const newWord = newSelectedCells.map(cell => cell.letter).join("").toLowerCase();
        
      setGameState(prev => ({
        ...prev,
        selectedCells: newSelectedCells,
        currentWord: newWord
      }));
    }
  };

  const clearSelection = () => {
    setGameState(prev => ({
      ...prev,
      selectedCells: [],
      currentWord: ""
    }));
  };

  const submitWord = async () => {
    const word = gameState.currentWord.toLowerCase();
    
    // וודא שהמשחק פעיל ויש זמן לפני שליחת המילה
    if (gameState.isSubmittingWord || !gameState.gameActive || gameState.timeRemaining <= 0) return;

    const currentPlayerWords = currentPlayer === 1 ? gameState.player1Words : gameState.player2Words;
    
    if (word.length < 2) {
      showToast("Word too short!", "error");
      clearSelection();
      return;
    }
    
    if (currentPlayerWords.includes(word)) {
      showToast("Already found!", "error");
      clearSelection();
      return;
    }
    
    setGameState(prev => ({ ...prev, isSubmittingWord: true }));

    const handleValidWord = (validWord) => {
      // וודא שעדיין יש זמן לפני הוספת הניקוד
      if (gameState.timeRemaining <= 0 || !gameState.gameActive) {
        return; 
      }

      let wordScore = 0;
      
      if (validWord.length >= 8) {
          wordScore = 90;
      } else if (validWord.length >= 5) {
          wordScore = 60;
      } else {
          wordScore = 30;
      }
      
      const isNewWord = wordCache.isNewWord(validWord);
      if (isNewWord) {
        wordScore += 20;
        wordCache.addWord(validWord);
        showToast(`✨ "${validWord.toUpperCase()}" - ${wordScore} points 🎁 NEW WORD! (+20)`, "success");
      } else {
        showToast(`✨ "${validWord.toUpperCase()}" - ${wordScore} points`, "success");
      }
      
      setGameState(prev => ({
        ...prev,
        [`player${currentPlayer}Words`]: [...prev[`player${currentPlayer}Words`], validWord],
        [`player${currentPlayer}Score`]: prev[`player${currentPlayer}Score`] + wordScore
      }));
    };

    try {
      let wordProcessed = false;

      // תמיד נסה worker קודם (מקומי ומהיר)
      if (dictionaryWorker && workerReady) {
        const messageId = Date.now();
        
        const workerPromise = new Promise((resolve) => {
          const handler = (e) => {
            const { valid, messageId: responseId } = e.data;
            if (responseId === messageId) {
              dictionaryWorker.removeEventListener('message', handler);
              resolve(valid);
            }
          };
          dictionaryWorker.addEventListener('message', handler);
        });
        
        dictionaryWorker.postMessage({ word, messageId });
        const isValidInDictionary = await workerPromise;
        
        if (isValidInDictionary) {
          handleValidWord(word);
          wordProcessed = true;
        }
      }

      // אם המילה לא נמצאה במילון המקומי ויש חיבור לאינטרנט
      if (!wordProcessed && isOnline) {
        // נסה מסד נתונים עם timeout
        try {
          const dbPromise = ValidatedWord.filter({ word: word });
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Database timeout')), 5000)
          );
          
          const validatedWords = await Promise.race([dbPromise, timeoutPromise]);
          
          if (validatedWords.length > 0) {
            const validatedWord = validatedWords[0];
            if (validatedWord.is_valid) {
              handleValidWord(word);
            } else {
              showToast("❌ Not a valid word!", "error");
            }
            wordProcessed = true;
          }
        } catch (dbError) {
          console.error("Database error:", dbError);
          // המשך לAPI
        }

        // אם עדיין לא מעובד, נסה API עם timeout
        if (!wordProcessed) {
          try {
            const apiPromise = InvokeLLM({
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
            
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('API timeout')), 10000)
            );
            
            const response = await Promise.race([apiPromise, timeoutPromise]);
            
            // נסה לשמור במסד הנתונים (אופציונלי)
            try {
              await ValidatedWord.create({
                word: word,
                is_valid: response && response.isValid
              });
            } catch (saveError) {
              console.error("Error saving word validation (non-critical):", saveError);
            }
            
            if (response && response.isValid) {
              handleValidWord(word);
            } else {
              showToast("❌ Not a valid word!", "error");
            }
            wordProcessed = true;
          } catch (apiError) {
            console.error("API error:", apiError);
            // נמשיך לfallback למטה
          }
        }
      }

      // Fallback אחרון - אם שום דבר לא עבד
      if (!wordProcessed) {
        if (!isOnline) {
          showToast("❌ Not a valid word! (Offline mode)", "error");
        } else {
          showToast("❌ Not a valid word! (Connection issues)", "error");
        }
      }

    } catch (error) {
      console.error("Unexpected error during word validation:", error);
      showToast("❌ An unexpected error occurred.", "error");
    } finally {
      clearSelection();
      setGameState(prev => ({ ...prev, isSubmittingWord: false }));
    }
  };

  const getCurrentPlayerWords = () => {
    return currentPlayer === 1 ? gameState.player1Words : gameState.player2Words;
  };

  const getCurrentPlayerScore = () => {
    return currentPlayer === 1 ? gameState.player1Score : gameState.player2Score;
  };

  const getWinner = () => {
    if (gameState.player1Score > gameState.player2Score) return 1;
    if (gameState.player2Score > gameState.player1Score) return 2;
    return 0; // Tie
  };

  if (!player1Info) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
      </div>
    );
  }

  // Instructions Screen
  if (showInstructions) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md text-center"
        >
          <div className="text-6xl mb-4">🎮</div>
          <h1 className="text-3xl font-black text-purple-700 mb-6">Local Duel</h1>
          
          <div className="space-y-4 text-left mb-8">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 rounded-full p-2 mt-1">
                <span className="text-lg">👥</span>
              </div>
              <div>
                <h3 className="font-bold text-purple-700">Two Players, Same Device</h3>
                <p className="text-sm text-gray-600">Take turns playing on the same board</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-green-100 rounded-full p-2 mt-1">
                <span className="text-lg">⏰</span>
              </div>
              <div>
                <h3 className="font-bold text-purple-700">30 Seconds Each</h3> {/* Updated to 30 seconds */}
                <p className="text-sm text-gray-600">Each player gets 30 seconds to find words</p> {/* Updated to 30 seconds */}
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-orange-100 rounded-full p-2 mt-1">
                <span className="text-lg">🏆</span>
              </div>
              <div>
                <h3 className="font-bold text-purple-700">Highest Score Wins</h3>
                <p className="text-sm text-gray-600">Find more and longer words to win!</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl("Home"))}
              className="flex-1 rounded-2xl"
            >
              Back
            </Button>
            <Button
              onClick={startNewGame} // This button still triggers starting a new game
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold"
            >
              <Play className="w-5 h-5 mr-2" />
              Start Game
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Game Results Screen
  if (showGameResults) {
    const winner = getWinner();
    
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-yellow-100 via-orange-100 to-red-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md text-center"
        >
          <div className="text-6xl mb-4">
            {winner === 0 ? "🤝" : winner === 1 ? "🥇" : "🥈"}
          </div>
          
          <h1 className="text-3xl font-black text-purple-700 mb-2">
            {winner === 0 ? "It's a Tie!" : `Player ${winner} Wins!`}
          </h1>
          
          <p className="text-gray-600 mb-8">
            {winner === 0 ? "Great game from both players!" : "Congratulations!"}
          </p>

          {/* Scores */}
          <div className="space-y-4 mb-8">
            <div className={`flex items-center justify-between p-4 rounded-2xl ${
              winner === 1 ? 'bg-yellow-100 border-2 border-yellow-300' : 'bg-gray-100'
            }`}>
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                  1
                </div>
                <span className="font-bold">Player 1</span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-purple-700">{gameState.player1Score}</p>
                <p className="text-xs text-gray-600">{gameState.player1Words.length} words</p>
              </div>
            </div>

            <div className={`flex items-center justify-between p-4 rounded-2xl ${
              winner === 2 ? 'bg-yellow-100 border-2 border-yellow-300' : 'bg-gray-100'
            }`}>
              <div className="flex items-center gap-3">
                <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                  2
                </div>
                <span className="font-bold">Player 2</span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-purple-700">{gameState.player2Score}</p>
                <p className="text-xs text-gray-600">{gameState.player2Words.length} words</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl("MultiplayerMode"))}
              className="flex-1 rounded-2xl"
            >
              Back to Menu
            </Button>
            <Button
              onClick={() => {
                setShowGameResults(false);
                setShowInstructions(true);
                setGamePhase("instructions");
                // The `startNewGame` function will be called by the user clicking the "Start Game" button 
                // on the instructions screen, or via the useEffect if conditions met (e.g. initial load).
                // No explicit call here as gameState.grid.length will not be 0.
              }}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold"
            >
              Play Again
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col text-gray-800 relative overflow-hidden">
      <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exit Game?</DialogTitle>
            <DialogDescription>
              Are you sure you want to exit? Your current game progress will be lost.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-4 mt-4">
            <Button variant="ghost" onClick={() => setShowExitConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => navigate(createPageUrl("Home"))}>Exit Game</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Switch Player Dialog */}
      <Dialog open={showSwitchDialog} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm bg-white rounded-3xl border-none p-6">
          <DialogHeader className="text-center mb-4">
            <div className="text-6xl mb-4">🔄</div>
            <DialogTitle className="text-2xl font-bold text-purple-800 mb-2">
              Player 1 Finished!
            </DialogTitle>
            <DialogDescription className="text-gray-600 text-lg">
              Time for Player 2 to play with the same board.
            </DialogDescription>
          </DialogHeader>
          
          <div className="text-center mb-6">
            <p className="text-lg text-purple-600 font-bold">
              Player 1 Score: {gameState.player1Score}
            </p>
            <p className="text-sm text-gray-500">
              Words found: {gameState.player1Words.length}
            </p>
          </div>

          <Button 
            onClick={switchToPlayer2}
            className="w-full bg-green-500 hover:bg-green-600 text-white rounded-2xl py-3 text-lg font-bold"
          >
            <ArrowRight className="w-5 h-5 mr-2" />
            Start Player 2 Turn
          </Button>
        </DialogContent>
      </Dialog>
      
      <AnimatePresence>
        {gameState.toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.8 }}
            className={`fixed top-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl text-white font-bold z-40 shadow-lg text-sm
              ${gameState.toast.type === 'success' ? 'bg-green-500' : gameState.toast.type === 'info' ? 'bg-blue-500' : 'bg-red-500'}`}
          >
            {gameState.toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex justify-between items-center p-4 relative z-30">
        <Button
          onClick={() => setShowExitConfirm(true)}
          variant="ghost"
          className="h-10 w-10 rounded-full bg-white/60 backdrop-blur-sm shadow-md"
        >
          <X className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl shadow-md text-lg font-bold ${
            currentPlayer === 1 ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-600'
          }`}>
            <Users className="w-5 h-5" />
            <span>P1: {gameState.player1Score}</span>
          </div>
          
          <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl shadow-md text-lg font-bold ${
            currentPlayer === 2 ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
          }`}>
            <Users className="w-5 h-5" />
            <span>P2: {gameState.player2Score}</span>
          </div>
        </div>
      </header>

      {/* Current Player Indicator */}
      <div className="text-center pb-2">
        <motion.div
          key={currentPlayer}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-xl shadow-lg ${
            currentPlayer === 1 ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
          }`}
        >
          <Users className="w-6 h-6" />
          <span>Player {currentPlayer}'s Turn</span>
        </motion.div>
      </div>

      {/* Timer */}
      <div className="text-center pb-4">
        <motion.p 
          className={`text-5xl sm:text-6xl font-black transition-colors duration-300 ${gameState.timeRemaining <= 10 ? 'text-red-500' : 'text-gray-800'}`}
          animate={gameState.timeRemaining <= 10 ? { scale: [1, 1.1, 1], opacity: [1, 0.7, 1] } : {}}
          transition={gameState.timeRemaining <= 10 ? { duration: 1, repeat: Infinity } : {}}
        >
          {Math.max(0, gameState.timeRemaining)}
        </motion.p>
      </div>

      {/* Current Word Display */}
      <div className="text-center pb-4">
        <p className="text-gray-600 text-xs mb-1">Current Word</p>
        <p className="text-xl sm:text-2xl text-purple-800 font-black tracking-widest uppercase">
          {gameState.currentWord || "_"}
        </p>
      </div>

      {/* Game Grid */}
      <div className="flex-shrink-0 flex justify-center px-4 pb-4">
        <GameGrid
          grid={gameState.grid}
          selectedCells={gameState.selectedCells}
          onCellSelect={handleCellSelect}
          isLoading={!gameState.gameActive || gameState.grid.length === 0}
        />
      </div>

      {/* Action Buttons - תיקון גדלים והבהוב */}
      <div className="flex gap-2 sm:gap-3 justify-center px-4 pb-3">
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button 
            onClick={() => {
              haptics.impact();
              clearSelection();
            }} 
            variant="outline" 
            disabled={!gameState.gameActive || gameState.timeRemaining <= 0}
            className="rounded-2xl border-2 border-gray-300 bg-white/80 backdrop-blur-sm hover:bg-white text-gray-600 p-2 sm:p-3 shadow-lg disabled:opacity-50 min-w-[44px] min-h-[44px]"
          >
            <RotateCcw size={18} className="sm:w-5 sm:h-5" />
          </Button>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button 
            onClick={() => {
              haptics.mediumImpact();
              submitWord();
            }}
            disabled={gameState.isSubmittingWord || !gameState.gameActive || gameState.timeRemaining <= 0}
            className="text-white text-base sm:text-lg font-bold rounded-2xl px-4 sm:px-6 py-2 sm:py-3 bg-green-500 hover:bg-green-600 border-b-4 border-green-700 shadow-xl disabled:bg-gray-400 disabled:border-b-4 disabled:border-gray-600 min-h-[44px]"
          >
            {gameState.isSubmittingWord ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                <span>Checking...</span>
              </div>
            ) : "Submit Word"}
          </Button>
        </motion.div>
        
        {/* כפתור Finish Turn - מהבהב רק כשהזמן נגמר */}
        <motion.div 
          whileHover={{ scale: 1.1 }} 
          whileTap={{ scale: 0.9 }}
          animate={{ 
            scale: gameState.timeRemaining === 0 ? [1, 1.1, 1] : 1,
            boxShadow: gameState.timeRemaining === 0 ? [
              "0 4px 25px rgba(255, 165, 0, 0.4)",
              "0 6px 35px rgba(255, 165, 0, 0.8)", 
              "0 4px 25px rgba(255, 165, 0, 0.4)"
            ] : "none"
          }}
          transition={{ 
            duration: 1, 
            repeat: gameState.timeRemaining === 0 ? Infinity : 0,
            ease: "easeInOut"
          }}
        >
          <Button 
            onClick={() => {
              haptics.mediumImpact();
              finishPlayerTurn();
            }} 
            disabled={!gameState.gameActive && gameState.timeRemaining > 0}
            className={`rounded-2xl px-3 sm:px-4 py-2 sm:py-3 shadow-lg font-bold transition-all duration-300 border-b-4 text-sm sm:text-base min-h-[44px] ${
              (gameState.gameActive || gameState.timeRemaining === 0)
                ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-red-700 ring-1 sm:ring-2 ring-orange-300' 
                : 'bg-gray-400 text-gray-600 border-gray-600 opacity-50 cursor-not-allowed'
            }`}
            style={{
              textShadow: (gameState.gameActive || gameState.timeRemaining === 0) ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'
            }}
          >
            <div className="flex items-center gap-1 sm:gap-2">
              {gameState.timeRemaining === 0 && (
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  className="text-base sm:text-lg"
                >
                  ⏰
                </motion.span>
              )}
              Finish Turn
            </div>
          </Button>
        </motion.div>
      </div>

      {/* Found Words List */}
      <div className="px-4 pb-3 flex-grow-0">
        <WordsList 
          foundWords={getCurrentPlayerWords()} 
          title={`Player ${currentPlayer} Words`}
        />
      </div>
    </div>
  );
}
