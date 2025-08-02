
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/api/entities";
import { DailyChallenge } from "@/api/entities";
import { ValidatedWord } from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CheckCircle2, Share } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import GameGrid from "../components/game/GameGrid";
import WordsList from "../components/game/WordsList";
// Removed: getBeginnerGrid, isBeginnerUser - as they are no longer used in Daily Challenge grid generation

export default function DailyChallengeGame() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [todaysChallenge, setTodaysChallenge] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentGuess, setCurrentGuess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [foundWords, setFoundWords] = useState([]);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(3);

  // Game grid state
  const [gameState, setGameState] = useState({
    grid: [],
    selectedCells: [],
    currentWord: "",
  });

  // Main grid generation function
  // תוקן: הוסר השימוש בלוח המתחילים בדיילי צ'אלנג'
  const generateGrid = useCallback((targetWord) => {
    console.log("Generating grid for daily challenge with word:", targetWord);
    
    // Convert target word to array of letters, preserving ALL duplicates
    const requiredLetters = targetWord.split('');
    
    // Create array of all 25 grid positions
    const allPositions = [];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        allPositions.push({ row, col });
      }
    }
    
    // Shuffle positions using Fisher-Yates algorithm
    for (let i = allPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allPositions[i], allPositions[j]] = [allPositions[j], allPositions[i]];
    }
    
    // Create empty 5x5 grid
    const grid = Array(5).fill(null).map(() => Array(5).fill(''));
    
    // Place EACH required letter (including duplicates) in the grid
    for (let i = 0; i < requiredLetters.length && i < 25; i++) {
      const position = allPositions[i];
      grid[position.row][position.col] = requiredLetters[i];
    }
    
    // Fill remaining positions with random letters
    const letterWeights = {
      A: 9, B: 2, C: 3, D: 4, E: 12,
      F: 2, G: 3, H: 2, I: 9, J: 1,
      K: 1, L: 4, M: 2, N: 6, O: 8,
      P: 2, Q: 1, R: 6, S: 4, T: 6,
      U: 4, V: 2, W: 2, X: 1, Y: 2,
      Z: 1
    };
    
    const letterPool = Object.entries(letterWeights).flatMap(([letter, weight]) => 
      Array(weight).fill(letter)
    );
    
    // Fill remaining empty positions
    for (let i = requiredLetters.length; i < 25; i++) {
      const position = allPositions[i];
      const randomLetter = letterPool[Math.floor(Math.random() * letterPool.length)];
      grid[position.row][position.col] = randomLetter;
    }
    
    return grid;
  }, []); // הוסר user מה-dependencies כדי למנוע יצירה מחדש

  // Load data only once when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const wordParam = urlParams.get('word');
        
        if (!wordParam) {
          navigate(createPageUrl("DailyChallenge"));
          return;
        }

        const currentUser = await User.me();
        setUser(currentUser);

        // Create challenge object from URL parameter instead of fetching from API
        const today = new Date().toISOString().split('T')[0];
        const challengeFromParam = {
          date: today,
          word: wordParam.toUpperCase(),
          used_by: []
        };
        
        setTodaysChallenge(challengeFromParam);
        setAttemptsLeft(3 - (currentUser.daily_challenge_attempts || 0));

        // Show skeleton first, then generate grid with delay
        setGameState(prev => ({ ...prev, grid: [] })); // Empty grid triggers skeleton
        
        setTimeout(() => {
          const grid = generateGrid(wordParam.toUpperCase());
          setGameState(prev => ({ ...prev, grid }));
        }, 300); // 300ms delay to show skeleton loader
        
      } catch (error) {
        console.error("Error loading daily challenge game:", error);
        navigate(createPageUrl("Home"));
      }
      setIsLoading(false);
    };

    loadData();
  }, [navigate, generateGrid]); // generateGrid כעת יציב יותר

  const showFeedback = (message, type, crystals = 0) => {
    setFeedback({ message, type, crystals });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSubmitGuess = async () => {
    if (!currentGuess.trim() || !todaysChallenge || !user || isSubmitting) return;
    
    const guess = currentGuess.trim().toLowerCase();
    
    if (guess.length < 3) {
      showFeedback("Word must be at least 3 letters!", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if word is valid
      const validatedWords = await ValidatedWord.filter({ word: guess });
      let isValid = false;
      
      if (validatedWords.length > 0) {
        isValid = validatedWords[0].is_valid;
      } else {
        // Call API to validate
        const response = await InvokeLLM({
          prompt: `Is "${guess}" a real, common English word? Answer only in JSON.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              isValid: { type: "boolean" }
            },
            required: ["isValid"]
          }
        });
        
        isValid = response && response.isValid;
        
        // Save validation result
        try {
          await ValidatedWord.create({
            word: guess,
            is_valid: isValid
          });
        } catch (dbError) {
          console.error("Error saving word validation:", dbError);
        }
      }

      if (!isValid) {
        showFeedback("Not a valid English word!", "error");
        setCurrentGuess("");
        setIsSubmitting(false);
        return;
      }

      // Check if it's the correct word
      const isCorrect = guess === todaysChallenge.word.toLowerCase();
      const newAttempts = (user.daily_challenge_attempts || 0) + 1;

      if (isCorrect) {
        // Correct answer - 30 crystals + create gift
        const newCrystals = (user.crystals || 0) + 30;
        await User.updateMyUserData({
          crystals: newCrystals,
          daily_challenge_attempts: newAttempts,
          daily_challenge_completed: true
        });
        
        // Create a gift for completing the daily challenge
        try {
          const { Gift } = await import("@/api/entities");
          await Gift.create({
            recipient_id: user.id,
            gift_type: "daily_challenge",
            title: "🎯 Daily Challenge Completed!",
            crystals: 50,
            powerups: 0
          });
          console.log("Daily challenge gift created successfully");
        } catch (giftError) {
          console.error("Error creating daily challenge gift:", giftError);
        }
        
        setUser(prev => ({
          ...prev,
          crystals: newCrystals,
          daily_challenge_attempts: newAttempts,
          daily_challenge_completed: true
        }));

        setGameCompleted(true);
        showFeedback("🎉 Correct! You found today's word!", "success", 30);
      } else {
        // Wrong answer but valid word - 1 crystal
        const newCrystals = (user.crystals || 0) + 1;
        await User.updateMyUserData({
          crystals: newCrystals,
          daily_challenge_attempts: newAttempts
        });
        
        setUser(prev => ({
          ...prev,
          crystals: newCrystals,
          daily_challenge_attempts: newAttempts
        }));

        const newAttemptsLeft = 3 - newAttempts;
        setAttemptsLeft(newAttemptsLeft);
        
        if (newAttemptsLeft > 0) {
          showFeedback(`Good word, but not today's challenge! ${newAttemptsLeft} attempts left.`, "info", 1);
          setFoundWords(prev => [...prev, guess]);
        } else {
          showFeedback("No attempts left! The word was: " + todaysChallenge.word.toUpperCase(), "error", 1);
          setTimeout(() => {
            navigate(createPageUrl("DailyChallenge"));
          }, 3000);
        }
      }

      setCurrentGuess("");
    } catch (error) {
      console.error("Error submitting guess:", error);
      showFeedback("Error checking word. Try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const shareResult = async () => {
    const today = new Date().toLocaleDateString();
    const text = `I completed today's WordSwipe Daily Challenge! 🎉\nDate: ${today}\nWord: ${todaysChallenge.word.toUpperCase()}\n\nTry it yourself!`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'WordSwipe Daily Challenge',
          text: text,
        });
      } catch (error) {
        navigator.clipboard.writeText(text);
        showFeedback("Result copied to clipboard!", "success");
      }
    } else {
      navigator.clipboard.writeText(text);
      showFeedback("Result copied to clipboard!", "success");
    }
  };

  const handleCellSelect = (row, col) => {
    const cellKey = `${row}-${col}`;
    const existingIndex = gameState.selectedCells.findIndex(cell => cell.row === row && cell.col === col);

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

  const submitWordFromGrid = () => {
    if (gameState.currentWord.length >= 3) {
      setCurrentGuess(gameState.currentWord);
      clearSelection();
      // Auto-submit the word
      setTimeout(() => {
        handleSubmitGuess();
      }, 100);
    }
  };

  if (isLoading || !user || !todaysChallenge) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
      </div>
    );
  }

  if (gameCompleted) {
    return (
      <div className="w-full min-h-screen p-6 text-gray-800 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-green-400 to-emerald-500 p-8 rounded-3xl text-center shadow-xl text-white max-w-md"
        >
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4" />
          <h3 className="text-3xl font-bold mb-4">Challenge Completed!</h3>
          <p className="text-xl mb-6">You found today's word!</p>
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-6">
            <p className="text-lg">The word was:</p>
            <p className="text-3xl font-black">{todaysChallenge.word.toUpperCase()}</p>
          </div>
          <div className="flex flex-col gap-4">
            <Button 
              onClick={shareResult}
              className="bg-white/20 hover:bg-white/30 text-white font-bold rounded-2xl py-3"
            >
              <Share className="w-5 h-5 mr-2" />
              Share Result
            </Button>
            <Button 
              onClick={() => navigate(createPageUrl("Home"))}
              className="bg-white text-green-600 hover:bg-gray-100 font-bold rounded-2xl py-3"
            >
              Back to Home
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen p-6 text-gray-800">
      <div className="flex justify-between items-center mb-6">
        <Button
          onClick={() => navigate(createPageUrl("DailyChallenge"))}
          variant="ghost"
          className="rounded-full p-3"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-purple-700">Daily Challenge</h1>
          <p className="text-sm text-gray-600">Attempts left: {attemptsLeft}</p>
        </div>
        <div className="w-12"></div>
      </div>

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
            <div className="flex items-center gap-2">
              <span>{feedback.message}</span>
              {feedback.crystals > 0 && (
                <div className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-1">
                  <span className="text-sm">💎 +{feedback.crystals}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-md mx-auto">
        {/* Target word hint */}
        <div className="bg-purple-100 rounded-2xl p-4 mb-6 text-center">
          <p className="text-sm text-gray-600 mb-2">Find this word:</p>
          <p className="text-2xl font-black text-purple-800 tracking-wider">
            {todaysChallenge.word.split('').map((letter, i) => {
              // Use the same hint generation logic as in DailyChallenge page
              let seed = 0;
              for (let j = 0; j < todaysChallenge.word.length; j++) {
                seed += todaysChallenge.word.charCodeAt(j);
              }
              
              const positions = [];
              let tempSeed = seed;
              
              while (positions.length < 2 && positions.length < todaysChallenge.word.length) {
                const pos = tempSeed % todaysChallenge.word.length;
                if (!positions.includes(pos)) {
                  positions.push(pos);
                }
                tempSeed = Math.floor(tempSeed / todaysChallenge.word.length) + seed;
              }
              
              return (
                <span key={i} className="mx-1">
                  {positions.includes(i) ? letter : '?'}
                </span>
              );
            })}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {todaysChallenge.word.length} letters
          </p>
        </div>

        {/* Input guess */}
        <div className="mb-6">
          <Input
            value={currentGuess}
            onChange={(e) => setCurrentGuess(e.target.value)}
            placeholder="Type your guess..."
            className="text-center text-xl font-bold bg-white/80 mb-4"
            onKeyPress={(e) => e.key === 'Enter' && handleSubmitGuess()}
            disabled={isSubmitting}
          />
          <Button 
            onClick={handleSubmitGuess}
            disabled={isSubmitting || !currentGuess.trim()}
            className="w-full text-lg font-bold rounded-2xl px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-xl"
          >
            {isSubmitting ? "Checking..." : "Submit Guess"}
          </Button>
        </div>

        {/* OR divider */}
        <div className="text-center mb-6">
          <div className="flex items-center">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-gray-500 text-sm">OR</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>
        </div>

        {/* Game grid */}
        <div className="flex-shrink-0 flex justify-center px-3 mb-6">
          <GameGrid
            grid={gameState.grid}
            selectedCells={gameState.selectedCells}
            onCellSelect={handleCellSelect}
            isLoading={gameState.grid.length === 0}
          />
        </div>

        {/* Current word from grid */}
        {gameState.currentWord && (
          <div className="text-center mb-4">
            <p className="text-lg font-bold text-purple-800">
              {gameState.currentWord.toUpperCase()}
            </p>
            <Button
              onClick={submitWordFromGrid}
              className="mt-2 bg-green-500 hover:bg-green-600 text-white rounded-xl px-4 py-2"
            >
              Submit Word
            </Button>
          </div>
        )}

        {/* Found words */}
        {foundWords.length > 0 && (
          <div className="mt-6">
            <WordsList foundWords={foundWords} title="Valid Words Found" />
          </div>
        )}
      </main>
    </div>
  );
}
