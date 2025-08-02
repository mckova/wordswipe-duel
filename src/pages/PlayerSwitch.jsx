import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MultiplayerGame } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { ArrowRight, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

export default function PlayerSwitch() {
  const navigate = useNavigate();
  const [gameData, setGameData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadGame = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const gameId = urlParams.get('gameId');
        
        if (!gameId) {
          navigate(createPageUrl("Home"));
          return;
        }

        const games = await MultiplayerGame.list();
        const game = games.find(g => g.id === gameId);
        
        if (!game) {
          navigate(createPageUrl("Home"));
          return;
        }

        setGameData(game);
      } catch (error) {
        console.error("Error loading game:", error);
        navigate(createPageUrl("Home"));
      }
      setIsLoading(false);
    };

    loadGame();
  }, [navigate]);

  const startPlayer2Turn = () => {
    if (gameData) {
      navigate(createPageUrl(`MultiplayerGame?gameId=${gameData.id}&currentPlayer=2`));
    }
  };

  if (isLoading || !gameData) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center p-8 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
      >
        <div className="text-8xl mb-6">🔄</div>
        <h1 className="text-4xl font-black text-orange-600 uppercase drop-shadow-md mb-4">Switch Players!</h1>
        
        <div className="bg-white/70 backdrop-blur-sm p-8 rounded-3xl mb-8 shadow-xl max-w-md">
          <h3 className="text-2xl font-bold text-purple-700 mb-4">Player 1 Finished!</h3>
          <div className="text-6xl font-black text-green-600 mb-2">{gameData.player1_score || 0}</div>
          <p className="text-gray-600 mb-4">{(gameData.player1_words || []).length} words found</p>
          <p className="text-lg text-gray-700">
            Pass the device to <strong>Player 2</strong> and get ready for their turn!
          </p>
        </div>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button 
            onClick={startPlayer2Turn}
            className="text-3xl font-bold rounded-3xl px-12 py-8 bg-blue-500 hover:bg-blue-600 text-white shadow-xl border-b-8 border-blue-700"
          >
            <ArrowRight className="w-8 h-8 mr-3" />
            Player 2 Start!
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}