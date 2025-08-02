import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FriendGame as FriendGameEntity } from "@/api/entities";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Home, RotateCcw, Trophy, Crown } from "lucide-react";
import { motion } from "framer-motion";

export default function FriendGameResult() {
  const navigate = useNavigate();
  const [gameData, setGameData] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [opponentFinished, setOpponentFinished] = useState(false);

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
          FriendGameEntity.list()
        ]);
        
        const game = games.find(g => g.id === gameId);
        
        if (!game) {
          navigate(createPageUrl("Home"));
          return;
        }

        setUser(currentUser);
        setGameData(game);

        const isPlayer1 = currentUser.id === game.player1_id;
        setOpponentFinished(isPlayer1 ? game.player2_finished : game.player1_finished);

      } catch (error) {
        console.error("Error loading results:", error);
        navigate(createPageUrl("Home"));
      }
      setIsLoading(false);
    };

    loadResults();
  }, [navigate]);

  useEffect(() => {
    if (!gameData || opponentFinished) return;

    const interval = setInterval(async () => {
      try {
        const games = await FriendGameEntity.list();
        const updatedGame = games.find(g => g.id === gameData.id);
        if (updatedGame) {
          const isPlayer1 = user.id === updatedGame.player1_id;
          const hasOpponentFinished = isPlayer1 ? updatedGame.player2_finished : updatedGame.player1_finished;
          if (hasOpponentFinished) {
            setGameData(updatedGame);
            setOpponentFinished(true);
            clearInterval(interval);
          }
        }
      } catch(e) {
        console.error("Error polling for opponent finish status:", e);
      }
    }, 3000);

    return () => clearInterval(interval);

  }, [gameData, opponentFinished, user]);

  if (isLoading || !gameData || !user) {
    return <div className="w-full h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div></div>;
  }
  
  if (!opponentFinished) {
    return (
        <div className="w-full h-screen flex flex-col items-center justify-center p-8 text-center">
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, type: 'spring' }}>
                <div className="text-6xl mb-6">⏳</div>
                <h1 className="text-3xl font-black text-purple-700">Waiting for Opponent</h1>
                <p className="text-lg text-gray-600 mt-4">Your score is saved. We're waiting for your friend to finish their turn.</p>
                <div className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl mt-8">
                    <h3 className="text-xl font-bold text-purple-700 mb-2">Your Score</h3>
                    <div className="text-4xl font-black text-green-600 mb-1">{user.id === gameData.player1_id ? gameData.player1_score : gameData.player2_score}</div>
                    <p className="text-gray-600">{(user.id === gameData.player1_id ? gameData.player1_words : gameData.player2_words || []).length} words</p>
                </div>
                <Link to={createPageUrl("Home")} className="mt-8 inline-block">
                    <Button variant="outline" className="text-lg font-bold rounded-2xl px-6 py-4 bg-white/80 border-2 border-gray-300 hover:bg-white text-gray-700 shadow-lg">
                        <Home className="mr-2" /> Back to Home
                    </Button>
                </Link>
            </motion.div>
        </div>
    );
  }

  const player1Score = gameData.player1_score || 0;
  const player2Score = gameData.player2_score || 0;
  const player1Words = (gameData.player1_words || []).length;
  const player2Words = (gameData.player2_words || []).length;
  
  const player1Name = gameData.player1_nickname;
  const player2Name = gameData.player2_nickname;
  
  let winnerText;
  if (player1Score > player2Score) {
      winnerText = `${player1Name} Wins!`;
  } else if (player2Score > player1Score) {
      winnerText = `${player2Name} Wins!`;
  } else {
      winnerText = "It's a Tie!";
  }

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
       <div className="absolute inset-0 pointer-events-none">
          {[...Array(50)].map((_, i) => (
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
      <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2, type: 'spring' }} className="relative z-10">
        <motion.div animate={{ rotate: [-10, 10, -10], transition: { duration: 2, repeat: Infinity, repeatType: 'mirror' } }}>
          {winnerText.includes("Tie") ? (
            <Trophy className="w-28 h-28 text-yellow-500 drop-shadow-lg mx-auto mb-6" />
          ) : (
            <Crown className="w-28 h-28 text-yellow-500 drop-shadow-lg mx-auto mb-6" />
          )}
        </motion.div>
        
        <h1 className="text-4xl font-black text-purple-700 uppercase drop-shadow-md mb-4">{winnerText}</h1>

        <div className="grid grid-cols-2 gap-6 mb-8 max-w-lg">
          <div className={`bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl ${player1Score > player2Score ? 'ring-4 ring-yellow-400' : ''}`}>
            <h3 className="text-xl font-bold text-purple-700 mb-2">{player1Name}</h3>
            <div className="text-4xl font-black text-green-600 mb-1">{player1Score}</div>
            <p className="text-gray-600">{player1Words} words</p>
          </div>
          
          <div className={`bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl ${player2Score > player1Score ? 'ring-4 ring-yellow-400' : ''}`}>
            <h3 className="text-xl font-bold text-purple-700 mb-2">{player2Name}</h3>
            <div className="text-4xl font-black text-blue-600 mb-1">{player2Score}</div>
            <p className="text-gray-600">{player2Words} words</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to={createPageUrl("Home")}>
              <Button variant="outline" className="w-full sm:w-auto text-xl font-bold rounded-2xl px-8 py-6 bg-white/80 border-2 border-gray-300 hover:bg-white text-gray-700 shadow-lg"><Home className="mr-3" /> Home</Button>
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to={createPageUrl("FriendMultiplayer")}>
              <Button className="w-full sm:w-auto text-xl font-bold rounded-2xl px-8 py-6 bg-green-500 hover:bg-green-600 text-white shadow-lg border-b-4 border-green-700"><RotateCcw className="mr-3" /> Play Again</Button>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}