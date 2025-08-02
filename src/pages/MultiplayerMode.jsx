
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Users, Smartphone, Globe, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function MultiplayerMode() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading || !user) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 pb-36">
      <Link to={createPageUrl("Home")} className="absolute top-6 left-6">
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
        <div className="text-6xl sm:text-8xl mb-4 sm:mb-6">⚔️</div>
        <h1 className="text-3xl sm:text-5xl font-black text-purple-700 uppercase drop-shadow-md mb-1 sm:mb-2">Multiplayer</h1>
        <h2 className="text-xl sm:text-3xl font-bold text-pink-600 mb-8 sm:mb-12">Word Duel</h2>
        
        <div className="space-y-4 sm:space-y-6 w-full mb-6 sm:mb-8">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to={createPageUrl("OnlineMatchmaking")} className="block">
              <Button className="w-full h-16 sm:h-20 text-lg sm:text-2xl font-bold rounded-3xl bg-blue-500 hover:bg-blue-600 text-white shadow-xl border-b-8 border-blue-700">
                <Globe className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3" />
                Find Online Player
              </Button>
            </Link>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to={createPageUrl("FriendMultiplayer")} className="block">
              <Button className="w-full h-16 sm:h-20 text-lg sm:text-2xl font-bold rounded-3xl bg-green-500 hover:bg-green-600 text-white shadow-xl border-b-8 border-green-700">
                <Users className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3" />
                Play with Friend
              </Button>
            </Link>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to={createPageUrl("LocalDuel")} className="block">
              <Button className="w-full h-16 sm:h-20 text-lg sm:text-2xl font-bold rounded-3xl bg-orange-500 hover:bg-orange-600 text-white shadow-xl border-b-8 border-orange-700">
                <Smartphone className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3" />
                Same Device
              </Button>
            </Link>
          </motion.div>
        </div>

        <p className="text-gray-600 text-sm sm:text-lg max-w-xs sm:max-w-md leading-relaxed px-4 sm:px-0">
          Challenge friends locally or compete with players from around the world!
        </p>
      </motion.div>
    </div>
  );
}
