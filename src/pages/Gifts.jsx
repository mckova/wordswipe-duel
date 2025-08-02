
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/api/entities";
import { Gift } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Gift as GiftIcon, Star, Calendar, Users, Trophy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Gifts() {
  const [user, setUser] = useState(null);
  const [gifts, setGifts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);

  useEffect(() => {
    loadGifts();
  }, []);

  const loadGifts = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      const userGifts = await Gift.filter({ recipient_id: currentUser.id }, "-created_date");
      setGifts(userGifts);
    } catch (error) {
      console.error("Error loading gifts:", error);
    }
    setIsLoading(false);
  };

  const claimGift = async (gift) => {
    if (!user || claimingId === gift.id) return;

    setClaimingId(gift.id);
    
    try {
      // Update user's crystals and power-ups
      const crystalsToAdd = gift.crystals || 0;
      const powerupsToAdd = gift.powerups || 0;
      
      const updateData = {
        crystals: (user.crystals || 0) + crystalsToAdd
      };

      // Distribute power-ups evenly
      if (powerupsToAdd > 0) {
        const extraTimeBonus = Math.ceil(powerupsToAdd / 4);
        const wordHintBonus = Math.ceil(powerupsToAdd / 4);
        const doubleScoreBonus = Math.ceil(powerupsToAdd / 4);
        const swapBoardBonus = Math.floor(powerupsToAdd / 4);

        updateData.extra_time_powerups = (user.extra_time_powerups || 0) + extraTimeBonus;
        updateData.word_hint_powerups = (user.word_hint_powerups || 0) + wordHintBonus;
        updateData.double_score_powerups = (user.double_score_powerups || 0) + doubleScoreBonus;
        updateData.swap_board_powerups = (user.swap_board_powerups || 0) + swapBoardBonus;
      }

      await User.updateMyUserData(updateData);
      
      // Mark gift as claimed
      await Gift.update(gift.id, {
        status: "claimed",
        claimed_at: new Date().toISOString()
      });

      // Update local state
      setUser(prev => ({ ...prev, ...updateData }));
      setGifts(prev => prev.map(g => 
        g.id === gift.id 
          ? { ...g, status: "claimed", claimed_at: new Date().toISOString() }
          : g
      ));

    } catch (error) {
      console.error("Error claiming gift:", error);
    } finally {
      setClaimingId(null);
    }
  };

  const getGiftIcon = (type) => {
    switch (type) {
      case 'level_up':
      case 'mega_level_up':
        return <Star className="w-8 h-8 text-yellow-500" />;
      case 'login_streak':
      case 'daily_challenge':
        return <Calendar className="w-8 h-8 text-blue-500" />;
      case 'friend_gift':
        return <Users className="w-8 h-8 text-green-500" />;
      case 'weekly_leaderboard':
        return <Trophy className="w-8 h-8 text-orange-500" />;
      default:
        return <GiftIcon className="w-8 h-8 text-purple-500" />;
    }
  };

  const getGiftColor = (type) => {
    switch (type) {
      case 'level_up':
        return 'from-purple-100 to-pink-100 border-purple-200';
      case 'mega_level_up':
        return 'from-yellow-100 to-orange-100 border-yellow-300';
      case 'login_streak':
      case 'daily_challenge':
        return 'from-blue-100 to-cyan-100 border-blue-200';
      case 'friend_gift':
        return 'from-green-100 to-emerald-100 border-green-200';
      case 'weekly_leaderboard':
        return 'from-orange-100 to-red-100 border-orange-300';
      default:
        return 'from-gray-100 to-gray-200 border-gray-200';
    }
  };

  if (isLoading || !user) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
      </div>
    );
  }

  const pendingGifts = gifts.filter(g => g.status === 'pending');
  const claimedGifts = gifts.filter(g => g.status === 'claimed');

  return (
    <div className="w-full min-h-screen p-6 text-gray-800">
      <Link to={createPageUrl("Home")} className="absolute top-6 left-6 z-10">
        <Button variant="ghost" className="rounded-full p-3 bg-white/70 backdrop-blur-sm shadow-md">
          <ArrowLeft className="w-6 h-6" />
        </Button>
      </Link>

      <header className="text-center mb-8 pt-16">
        <div className="text-6xl mb-4">🎁</div>
        <h1 className="text-4xl font-black text-purple-700 uppercase drop-shadow-md mb-2">Gifts</h1>
        <p className="text-gray-600 text-lg">Your rewards and presents</p>
      </header>

      <main className="max-w-md mx-auto">
        {/* Pending Gifts */}
        {pendingGifts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-purple-800 mb-4 flex items-center gap-2">
              <GiftIcon className="w-6 h-6" />
              New Gifts ({pendingGifts.length})
            </h2>
            
            <div className="space-y-4">
              {pendingGifts.map((gift) => (
                <motion.div
                  key={gift.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`bg-gradient-to-r ${getGiftColor(gift.gift_type)} p-6 rounded-3xl border-2 shadow-lg`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="bg-white p-3 rounded-2xl shadow-md">
                        {getGiftIcon(gift.gift_type)}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-800">{gift.title}</h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {new Date(gift.created_date).toLocaleDateString()}
                        </p>
                        {gift.sender_nickname && (
                          <p className="text-sm text-gray-600">From: {gift.sender_nickname}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-700">
                      {gift.crystals > 0 && <span>💎 {gift.crystals} crystals</span>}
                      {gift.crystals > 0 && gift.powerups > 0 && <span> • </span>}
                      {gift.powerups > 0 && <span>⚡ {gift.powerups} power-ups</span>}
                    </div>

                    <Button
                      onClick={() => claimGift(gift)}
                      disabled={claimingId === gift.id}
                      className="bg-green-500 hover:bg-green-600 text-white rounded-2xl px-4 py-2 font-bold"
                    >
                      {claimingId === gift.id ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Claiming...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>Claim</span>
                          <div className="text-xs">
                            {gift.crystals > 0 && <span>💎{gift.crystals}</span>}
                            {gift.crystals > 0 && gift.powerups > 0 && <span> </span>}
                            {gift.powerups > 0 && <span>⚡{gift.powerups}</span>}
                          </div>
                        </div>
                      )}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Claimed Gifts */}
        {claimedGifts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-600 mb-4 flex items-center gap-2">
              <Check className="w-6 h-6" />
              Claimed Gifts ({claimedGifts.length})
            </h2>
            
            <div className="space-y-3">
              {claimedGifts.slice(0, 10).map((gift) => (
                <div
                  key={gift.id}
                  className="bg-gray-100 p-4 rounded-2xl border opacity-75"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-xl shadow-sm">
                        {getGiftIcon(gift.gift_type)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-700">{gift.title}</h3>
                        <p className="text-xs text-gray-500">
                          Claimed {new Date(gift.claimed_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Gifts */}
        {gifts.length === 0 && (
          <div className="text-center p-8">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-2xl font-bold text-gray-600 mb-2">No gifts yet</h3>
            <p className="text-gray-500">Keep playing to earn rewards and level up!</p>
          </div>
        )}
      </main>
    </div>
  );
}
