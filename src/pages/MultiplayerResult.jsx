
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MultiplayerGame } from "@/api/entities";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Home, RotateCcw } from "lucide-react"; // Removed Trophy, Crown icons as they are replaced by emojis
import { motion } from "framer-motion";

export default function MultiplayerResult() {
  const navigate = useNavigate();
  const [gameData, setGameData] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scoreBreakdown, setScoreBreakdown] = useState(null); // Added new state for score breakdown

  /**
   * Calculates the base score for a given word based on its length.
   * @param {string} word - The word to score.
   * @returns {number} The base score for the word.
   */
  const getWordBaseScore = (word) => {
    if (word.length >= 8) return 90;
    if (word.length >= 5) return 60;
    return 30;
  };

  /**
   * Calculates the detailed score breakdown for both players, including base scores and unique word bonuses.
   * @param {object} game - The game data object.
   * @returns {object} An object containing player1 and player2 score breakdowns.
   */
  const calculateScoreBreakdown = (game) => {
    const player1Words = game.player1_words || [];
    const player2Words = game.player2_words || [];
    
    // Use Sets for efficient checking of unique words
    const player1Set = new Set(player1Words);
    const player2Set = new Set(player2Words);
    
    // Calculate base scores for each player by summing up individual word base scores
    const player1BaseScore = player1Words.reduce((sum, word) => sum + getWordBaseScore(word), 0);
    const player2BaseScore = player2Words.reduce((sum, word) => sum + getWordBaseScore(word), 0);
    
    // Calculate unique word bonuses: words present in one player's list but not the other's.
    // Each unique word gives a 5-point bonus.
    const player1UniqueCount = [...player1Set].filter(word => !player2Set.has(word)).length;
    const player2UniqueCount = [...player2Set].filter(word => !player1Set.has(word)).length;

    const player1UniqueBonus = player1UniqueCount * 5;
    const player2UniqueBonus = player2UniqueCount * 5;
    
    return {
      player1: {
        words: player1Words,
        baseScore: player1BaseScore,
        uniqueBonus: player1UniqueBonus,
        totalScore: player1BaseScore + player1UniqueBonus
      },
      player2: {
        words: player2Words,
        baseScore: player2BaseScore,
        uniqueBonus: player2UniqueBonus,
        totalScore: player2BaseScore + player2UniqueBonus
      }
    };
  };

  /**
   * Determines how a single word should be displayed, including its score and unique bonus status.
   * @param {string} word - The word to display.
   * @param {Set<string>} opponentWordsSet - A Set of the opponent's words for efficient uniqueness check.
   * @returns {object} An object with word, score, hasBonus, and bonusType for display.
   */
  const getWordDisplay = (word, opponentWordsSet) => {
    const baseScore = getWordBaseScore(word);
    // Check if the word is unique to this player (not found in the opponent's set)
    const isUnique = !opponentWordsSet.has(word); 
    const uniqueBonus = isUnique ? 5 : 0;
    const totalScore = baseScore + uniqueBonus;
    
    return {
      word,
      score: totalScore,
      hasBonus: isUnique,
      bonusType: isUnique ? "⚡" : "" // "⚡" indicates a unique word bonus
    };
  };

  useEffect(() => {
    const loadResults = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const gameId = urlParams.get('gameId');
        
        if (!gameId) {
          navigate(createPageUrl("Home"));
          return;
        }

        const [currentUser, games] = await Promise.all([
          User.me(),
          MultiplayerGame.list()
        ]);
        
        const game = games.find(g => g.id === gameId);
        
        if (!game) {
          navigate(createPageUrl("Home"));
          return;
        }

        setUser(currentUser);
        setGameData(game);
        
        // Calculate score breakdown with bonuses once game data is loaded
        const breakdown = calculateScoreBreakdown(game);
        setScoreBreakdown(breakdown);
      } catch (error) {
        console.error("Error loading results:", error);
        navigate(createPageUrl("Home"));
      }
      setIsLoading(false);
    };

    loadResults();
  }, [navigate]);

  // Show a loading spinner if data is not yet available
  if (isLoading || !gameData || !user || !scoreBreakdown) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
      </div>
    );
  }

  // Destructure score breakdown for easier access
  const { player1, player2 } = scoreBreakdown;

  // Determine the winner based on total scores
  let winnerKey; // 'player1' or 'player2' or 'Tie'
  if (player1.totalScore > player2.totalScore) {
    winnerKey = "player1";
  } else if (player2.totalScore > player1.totalScore) {
    winnerKey = "player2";
  } else {
    winnerKey = "Tie";
  }

  // Determine display names for players based on game mode and current user
  let player1DisplayName, player2DisplayName;
  if (gameData.game_mode === "local") {
    player1DisplayName = "Player 1";
    player2DisplayName = "Player 2";
  } else {
    const isPlayer1 = user.id === gameData.player1_id;
    player1DisplayName = isPlayer1 ? "You" : "Opponent";
    player2DisplayName = isPlayer1 ? "Opponent" : "You";
  }

  // Create Sets of words for efficient lookup when displaying individual words
  const player1WordsSet = new Set(player1.words);
  const player2WordsSet = new Set(player2.words);

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Confetti Effect (kept as in original code) */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full animate-bounce"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              backgroundColor: ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6'][Math.floor(Math.random() * 5)],
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2, type: 'spring' }}
        className="relative z-10 w-full max-w-4xl" // Added max-w-4xl for better content layout
      >
        <div className="text-6xl mb-4">
          {/* Replaced Trophy/Crown icons with emojis */}
          {winnerKey === "Tie" ? "🤝" : "🏆"} 
        </div>
        
        <h1 className="text-3xl font-black text-purple-700 uppercase drop-shadow-md mb-8">
          {winnerKey === "Tie" ? "It's a Tie!" : 
           `${winnerKey === "player1" ? player1DisplayName : player2DisplayName} Wins!`}
        </h1>

        {/* Score Summary Section */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className={`bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl ${winnerKey === "player1" ? 'ring-4 ring-yellow-400' : ''}`}>
            <h3 className="text-xl font-bold text-purple-700 mb-4">{player1DisplayName}</h3>
            <div className="text-4xl font-black text-green-600 mb-2">{player1.totalScore}</div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Base: {player1.baseScore} pts</div>
              {/* Only show unique bonus if it's greater than 0 */}
              {player1.uniqueBonus > 0 && <div className="text-orange-600">Unique: +{player1.uniqueBonus} pts</div>}
              <div>{player1.words.length} words</div>
            </div>
          </div>
          
          <div className={`bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl ${winnerKey === "player2" ? 'ring-4 ring-yellow-400' : ''}`}>
            <h3 className="text-xl font-bold text-purple-700 mb-4">{player2DisplayName}</h3>
            <div className="text-4xl font-black text-blue-600 mb-2">{player2.totalScore}</div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Base: {player2.baseScore} pts</div>
              {/* Only show unique bonus if it's greater than 0 */}
              {player2.uniqueBonus > 0 && <div className="text-orange-600">Unique: +{player2.uniqueBonus} pts</div>}
              <div>{player2.words.length} words</div>
            </div>
          </div>
        </div>

        {/* Word Lists Section */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl shadow-lg">
            <h4 className="font-bold text-purple-700 mb-3">{player1DisplayName}'s Words</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto"> {/* Added max-height and overflow for scrolling */}
              {player1.words.length === 0 ? (
                <p className="text-gray-500">No words found.</p>
              ) : (
                player1.words.map((word, index) => {
                  const display = getWordDisplay(word, player2WordsSet); // Pass opponent's words set
                  return (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-1">
                        {display.word}
                        {display.hasBonus && <span className="text-orange-500">{display.bonusType}</span>}
                      </span>
                      <span className="font-bold">{display.score}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
          <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl shadow-lg">
            <h4 className="font-bold text-purple-700 mb-3">{player2DisplayName}'s Words</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto"> {/* Added max-height and overflow for scrolling */}
              {player2.words.length === 0 ? (
                <p className="text-gray-500">No words found.</p>
              ) : (
                player2.words.map((word, index) => {
                  const display = getWordDisplay(word, player1WordsSet); // Pass opponent's words set
                  return (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-1">
                        {display.word}
                        {display.hasBonus && <span className="text-orange-500">{display.bonusType}</span>}
                      </span>
                      <span className="font-bold">{display.score}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500 mb-6">
          ⚡ = Unique word bonus (+5 pts)
        </div>

        {/* Action Buttons (kept as in original code) */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to={createPageUrl("Home")}>
              <Button variant="outline" className="w-full sm:w-auto text-xl font-bold rounded-2xl px-8 py-6 bg-white/80 border-2 border-gray-300 hover:bg-white text-gray-700 shadow-lg">
                <Home className="mr-3" /> Home
              </Button>
            </Link>
          </motion.div>
          
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to={createPageUrl("MultiplayerMode")}>
              <Button className="w-full sm:w-auto text-xl font-bold rounded-2xl px-8 py-6 bg-green-500 hover:bg-green-600 text-white shadow-lg border-b-4 border-green-700">
                <RotateCcw className="mr-3" /> Play Again
              </Button>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
