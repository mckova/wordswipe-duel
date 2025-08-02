
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Gem, Sparkles, X, Gift, ArrowLeft, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { haptics } from "../components/utils/HapticFeedback";

export default function Shop() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [shopItems, setShopItems] = useState([]);
  const [userPowerUps, setUserPowerUps] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [purchasingId, setPurchasingId] = useState(null);
  const [showPurchaseSheet, setShowPurchaseSheet] = useState(false);
  const [showPlayStoreModal, setShowPlayStoreModal] = useState(false);
  const [selectedCrystalPack, setSelectedCrystalPack] = useState(null);
  const [shakeId, setShakeId] = useState(null);

  const crystalPacks = [
    { 
      amount: 120, 
      price: "$1.99", 
      realPrice: 1.99,
      icon: "💎", 
      id: "crystals_120",
      note: "Perfect starter pack",
      color: "bg-blue-500"
    },
    { 
      amount: 600, 
      price: "$7.99", 
      realPrice: 7.99,
      icon: "💎💎", 
      id: "crystals_600",
      note: "Most popular choice",
      color: "bg-purple-500",
      bestValue: true // Mark as best value
    },
    { 
      amount: 1600, 
      bonusAmount: 100,
      price: "$17.99", 
      realPrice: 17.99,
      icon: "💎💎💎", 
      id: "crystals_1700",
      note: "Includes 100 bonus crystals!",
      color: "bg-gradient-to-r from-yellow-500 to-orange-500",
      bonus: true
    },
    { 
      amount: 750, 
      price: "$4.99", 
      realPrice: 4.99,
      icon: "📆", 
      id: "daily_booster",
      note: "750 crystals over 30 days",
      color: "bg-green-500",
      subscription: true,
      dailyAmount: 25
    }
  ];

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await User.me();
        
        const defaultItems = [
          { id: "1", name: "Time Freeze", description: "Freeze timer for 10 seconds", price: 20, icon: "⏸️", power_up_type: "extra_time" },
          { id: "2", name: "Word Hint", description: "Reveal a random word", price: 30, icon: "🔍", power_up_type: "word_hint" },
          { id: "4", name: "Swap Board", description: "Get a new letter grid", price: 120, icon: "🔄", power_up_type: "swap_board" },
          { id: "3", name: "Double Score", description: "2x points for 30s", price: 100, icon: "💥", power_up_type: "double_score" }
        ];
        setShopItems(defaultItems);

        const initialUserPowerUps = {};
        for (const item of defaultItems) {
          const powerUpField = `${item.power_up_type}_powerups`;
          if (typeof currentUser[powerUpField] === 'number') {
            initialUserPowerUps[item.power_up_type] = currentUser[powerUpField];
          } else {
            initialUserPowerUps[item.power_up_type] = 0;
          }
        }
        setUserPowerUps(initialUserPowerUps);

        setUser({
          ...currentUser,
          crystals: currentUser.crystals ?? 100,
        });
        
      } catch (error) {
        console.error("Error loading shop data:", error);
        navigate(createPageUrl("Home"));
      }
      setIsLoading(false);
    };
    loadData();
  }, [navigate]);
  
  const showFeedback = (message, type) => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleCrystalPackPurchase = (pack) => {
    haptics.mediumImpact(); // Haptic feedback for crystal pack purchase attempt
    // Check if Google Play Billing is available (it won't be in web environment)
    if (typeof window !== 'undefined' && !window.googlePlayBilling) {
      setSelectedCrystalPack(pack);
      setShowPlayStoreModal(true);
    } else {
      // If billing is available, initiate purchase
      initiatePurchase(pack);
    }
  };

  const initiatePurchase = async (pack) => {
    try {
      // This would integrate with actual Google Play Billing
      console.log(`Initiating purchase for ${pack.id} - ${pack.price}`);
      showFeedback("Purchase initiated! Check Google Play.", "info");
    } catch (error) {
      console.error("Purchase failed:", error);
      showFeedback("Purchase failed. Please try again.", "error");
    }
  };

  const handleGoToPlayStore = () => {
    // In a real app, this would open the Play Store or initiate the purchase flow
    showFeedback("Redirecting to Google Play Store...", "info");
    setShowPlayStoreModal(false);
    // window.open('https://play.google.com/store/apps/details?id=your.app.id', '_blank');
  };

  const getFeedbackClass = (type) => {
    switch (type) {
        case 'success': return 'bg-green-500';
        case 'error': return 'bg-red-500';
        case 'info': return 'bg-blue-500';
        default: return 'bg-gray-500';
    }
  }

  const handlePurchase = async (item) => {
    if (!user || user.crystals < item.price) {
      haptics.warning(); // Haptic feedback for insufficient crystals
      showFeedback("Not enough crystals!", "error");
      setShakeId(item.id);
      setTimeout(() => setShakeId(null), 500);
      return;
    }
    
    haptics.impact(); // Haptic feedback for purchase attempt
    setPurchasingId(item.id);
    
    try {
      const newCrystalCount = user.crystals - item.price;
      const powerUpField = `${item.power_up_type}_powerups`;
      
      const updateData = {
        crystals: newCrystalCount,
        [powerUpField]: (user[powerUpField] || 0) + 1,
      };
      
      await User.updateMyUserData(updateData);
      
      setUser(prev => ({ ...prev, ...updateData }));
      setUserPowerUps(prev => ({
        ...prev,
        [item.power_up_type]: (prev[item.power_up_type] || 0) + 1
      }));
      
      haptics.success(); // Haptic feedback for successful purchase
      showFeedback("Purchased successfully!", "success");
      
    } catch (error) {
      haptics.warning(); // Haptic feedback for purchase failure
      console.error("Purchase failed:", error);
      showFeedback("Purchase failed. Please try again.", "error");
    } finally {
      setPurchasingId(null);
    }
  };

  if (isLoading || !user) {
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

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl text-white font-bold z-50 shadow-lg ${
              getFeedbackClass(feedback.type)
            }`}
          >
            {feedback.message}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="text-center mb-8">
        <h1 className="text-4xl font-black text-purple-700 uppercase drop-shadow-md mb-6">Crystal Shop</h1>
        
        <motion.div 
          className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-400 to-purple-500 rounded-3xl text-white font-bold text-2xl shadow-2xl mb-6"
          whileHover={{ scale: 1.05 }}
        >
          <Gem className="w-8 h-8 animate-pulse" />
          <span>{user.crystals.toLocaleString()}</span>
          <span className="text-blue-100">Crystals</span>
        </motion.div>
      </header>

      {/* Crystal Packages Section */}
      <div className="max-w-md mx-auto mb-8">
        <h2 className="text-2xl font-bold text-purple-800 mb-4 text-center flex items-center justify-center gap-2">
          <Sparkles className="w-6 h-6" />
          Crystal Packages
        </h2>
        
        <div className="grid gap-4">
          {crystalPacks.map((pack, index) => (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`relative p-5 rounded-2xl shadow-lg transition-all hover:shadow-xl border-2 ${
                pack.bestValue 
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-yellow-300 ring-2 ring-yellow-400' 
                  : pack.bonus 
                    ? 'bg-gradient-to-r from-orange-400 to-yellow-500 text-white border-orange-300'
                    : pack.subscription
                      ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white border-green-300'
                      : 'bg-white border-purple-200 hover:border-purple-300'
              }`}
            >
              {pack.bestValue && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-4 py-1 rounded-full uppercase shadow-md flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  Best Value
                </div>
              )}
              
              {pack.bonus && (
                <div className="absolute -top-3 right-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase shadow-md flex items-center gap-1">
                  <Gift className="w-3 h-3" />
                  Bonus
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <div className="text-4xl bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                    {pack.icon}
                  </div>
                  <div>
                    <h4 className={`text-xl font-bold ${!pack.bestValue && !pack.bonus && !pack.subscription ? 'text-purple-800' : 'text-white'}`}>
                      {pack.subscription ? (
                        <>
                          {pack.dailyAmount} Crystals/Day
                          <div className="text-sm opacity-80">for 30 days</div>
                        </>
                      ) : (
                        <>
                          {pack.amount.toLocaleString()} Crystals
                          {pack.bonusAmount && (
                            <span className="text-yellow-200 font-bold"> + {pack.bonusAmount} Bonus!</span>
                          )}
                        </>
                      )}
                    </h4>
                    <p className={`text-sm opacity-80 ${!pack.bestValue && !pack.bonus && !pack.subscription ? 'text-gray-600' : 'text-white/80'}`}>
                      {pack.note}
                    </p>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={() => handleCrystalPackPurchase(pack)}
                className={`w-full font-bold rounded-xl py-3 shadow-md border-b-4 transition-all ${
                  pack.bestValue || pack.bonus || pack.subscription
                    ? 'bg-white text-purple-600 border-gray-200 hover:bg-gray-100'
                    : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-green-700 hover:from-green-600 hover:to-emerald-600'
                }`}
              >
                {pack.subscription ? `Subscribe – ${pack.price}` : `Buy ${pack.amount}${pack.bonusAmount ? `+${pack.bonusAmount}` : ''} Crystals – ${pack.price}`}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Power-ups Section */}
      <main className="max-w-md mx-auto flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-purple-800 mb-4 text-center flex items-center justify-center gap-2">
          <Sparkles className="w-6 h-6" />
          Power-Ups
        </h2>
        {shopItems.map((item, index) => {
          const owned = userPowerUps[item.power_up_type] || 0;
          const canAfford = user.crystals >= item.price;
          
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl shadow-xl border-2 border-gray-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="text-6xl bg-white p-4 rounded-2xl shadow-lg">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-purple-800">{item.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                    {owned > 0 && (
                      <div className="flex items-center gap-1 text-green-600 text-sm font-bold">
                        <Sparkles className="w-4 h-4" />
                        <span>Owned: {owned}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <motion.div 
                className="flex items-center justify-between"
                animate={{ x: shakeId === item.id ? [-5, 5, -5, 5, 0] : 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                <div className="flex items-center gap-2 text-2xl font-bold text-blue-600">
                  <Gem className="w-6 h-6" />
                  <span>{item.price}</span>
                </div>
                
                <motion.div 
                  whileHover={{ scale: canAfford ? 1.05 : 1 }} 
                  whileTap={{ scale: canAfford ? 0.95 : 1 }}
                >
                  <Button 
                    onClick={() => handlePurchase(item)}
                    disabled={purchasingId === item.id || !canAfford}
                    className={`font-bold rounded-2xl px-6 py-3 shadow-lg border-b-4 transition-all ${
                      canAfford 
                        ? 'bg-green-500 hover:bg-green-600 text-white border-green-700' 
                        : 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {purchasingId === item.id ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Buying...</span>
                      </div>
                    ) : "Buy Now" }
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>
          );
        })}
      </main>

      {/* Google Play Store Modal */}
      <Dialog open={showPlayStoreModal} onOpenChange={setShowPlayStoreModal}>
        <DialogContent className="sm:max-w-md bg-white border-none rounded-3xl p-6 shadow-2xl">
          <DialogHeader className="text-center mb-4">
            <DialogTitle className="text-2xl font-bold text-purple-800 mb-2">
              Available in Google Play
            </DialogTitle>
            <DialogDescription className="text-gray-600 text-lg">
              This purchase will be completed via Google Play. Click below to proceed.
            </DialogDescription>
          </DialogHeader>
          
          {selectedCrystalPack && (
            <div className="bg-gradient-to-r from-purple-100 to-blue-100 p-4 rounded-2xl mb-6 text-center">
              <div className="text-3xl mb-2">{selectedCrystalPack.icon}</div>
              <h3 className="font-bold text-lg text-purple-800">
                {selectedCrystalPack.amount}{selectedCrystalPack.bonusAmount ? `+${selectedCrystalPack.bonusAmount}` : ''} Crystals
              </h3>
              <p className="text-2xl font-bold text-green-600">{selectedCrystalPack.price}</p>
            </div>
          )}
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowPlayStoreModal(false)}
              className="flex-1 rounded-2xl"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleGoToPlayStore}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold"
            >
              Go to Play Store
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
