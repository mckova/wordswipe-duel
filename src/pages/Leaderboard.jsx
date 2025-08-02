import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Trophy, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";

export default function Leaderboard() {
  const [players, setPlayers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [me, topPlayers] = await Promise.all([
          User.me(), 
          User.list("-score", 100)
        ]);
        setCurrentUser(me);
        setPlayers(topPlayers);
      } catch (e) {
        console.error("Failed to load leaderboard data", e);
        // Set empty arrays as fallback
        setPlayers([]);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const rankStyles = [
    { bg: "bg-yellow-400", text: "text-yellow-800", shadow: "shadow-yellow-300" },
    { bg: "bg-gray-300", text: "text-gray-800", shadow: "shadow-gray-200" },
    { bg: "bg-yellow-600", text: "text-yellow-100", shadow: "shadow-yellow-500" },
  ];

  if (isLoading) {
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

      <header className="text-center mb-8 pt-16">
        <h1 className="text-4xl font-black text-purple-700 uppercase drop-shadow-md mb-2">Leaderboard</h1>
        <p className="text-gray-600 text-lg">The top players of WordSwipe Duel</p>
      </header>
      
      <main className="max-w-md mx-auto flex flex-col gap-4">
        {players && players.length > 0 ? (
          players.map((player, index) => {
            const isCurrentUser = currentUser && player.id === currentUser.id;
            const rank = index + 1;
            const rankStyle = rank <= 3 ? rankStyles[index] : null;
            
            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`p-4 rounded-3xl flex items-center gap-4 shadow-xl transition-all
                  ${isCurrentUser ? 'bg-purple-200 scale-105' : 'bg-white/70 backdrop-blur-sm'}`}
              >
                <div className={`text-2xl font-bold w-12 h-12 flex items-center justify-center rounded-2xl
                  ${rankStyle ? `${rankStyle.bg} ${rankStyle.text} shadow-lg ${rankStyle.shadow}`: 'bg-gray-200 text-gray-500'}`}
                >
                  {rank}
                </div>
                <div className="text-4xl bg-white p-2 rounded-full shadow-inner">{player.avatar || '🎮'}</div>
                <div className="flex-grow">
                  <h3 className="font-bold text-lg text-purple-900">{player.nickname || player.full_name}</h3>
                  <p className="text-sm text-gray-600">{player.games_played || 0} games</p>
                </div>
                <div className="text-xl font-bold text-orange-600">
                  {(player.score || 0).toLocaleString()}
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="text-center p-8">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-2xl font-bold text-gray-600 mb-2">No players yet</h3>
            <p className="text-gray-500">Be the first to play and appear on the leaderboard!</p>
          </div>
        )}
      </main>
    </div>
  );
}