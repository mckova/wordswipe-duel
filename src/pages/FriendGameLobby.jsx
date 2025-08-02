import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/api/entities";
import { FriendGame } from "@/api/entities";
import { GameStartEvent } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Copy, Share2, QrCode, Check, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function FriendGameLobby() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [game, setGame] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showWaitingModal, setShowWaitingModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await User.me();
        setUser({
          ...currentUser,
          nickname: currentUser.nickname || currentUser.full_name || "Player",
          avatar: currentUser.avatar || "🎮"
        });

        const urlParams = new URLSearchParams(window.location.search);
        const gameId = urlParams.get('gameId');
        
        if (!gameId) {
          navigate(createPageUrl("FriendMultiplayer"));
          return;
        }

        const gameData = await FriendGame.get(gameId);
        if (!gameData) {
          navigate(createPageUrl("FriendMultiplayer"));
          return;
        }

        setGame(gameData);
        
        // Generate QR code URL
        const gameUrl = `${window.location.origin}/FriendMultiplayer?join=${gameData.game_code}`;
        setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(gameUrl)}`);
        
        // Show waiting modal if we're player 1 and no player 2 yet
        if (gameData.player1_id === currentUser.id && !gameData.player2_id) {
          setShowWaitingModal(true);
        }
      } catch (error) {
        console.error("Error loading lobby:", error);
        navigate(createPageUrl("Home"));
      }
      setIsLoading(false);
    };
    loadData();
  }, [navigate]);

  // Poll for game updates
  useEffect(() => {
    if (!game) return;

    const pollForUpdates = async () => {
      try {
        const updatedGame = await FriendGame.get(game.id);
        if (updatedGame) {
          setGame(updatedGame);
          
          // If player 2 joined, hide waiting modal
          if (updatedGame.player2_id && showWaitingModal) {
            setShowWaitingModal(false);
          }
        }

        // Check for game start events
        const events = await GameStartEvent.filter({ game_id: game.id, game_mode: "friend" });
        const recentEvent = events.find(event => 
          Date.now() - event.start_timestamp < 10000
        );
        
        if (recentEvent) {
          navigate(createPageUrl(`FriendGame?gameId=${game.id}`));
        }
      } catch (error) {
        console.error("Error polling for updates:", error);
      }
    };

    const interval = setInterval(pollForUpdates, 1000);
    return () => clearInterval(interval);
  }, [game, navigate, showWaitingModal]);

  const handleReady = async () => {
    if (!user || !game) return;
    
    try {
      const isPlayer1 = game.player1_id === user.id;
      const updateData = isPlayer1 
        ? { player1_ready: true }
        : { player2_ready: true };
      
      await FriendGame.update(game.id, updateData);
      
      const updatedGame = await FriendGame.get(game.id);
      setGame(updatedGame);
      
      // If both players are ready, start the game
      if (updatedGame.player1_ready && updatedGame.player2_ready) {
        const startTimestamp = Date.now() + 3000; // Start in 3 seconds
        
        await GameStartEvent.create({
          game_id: game.id,
          player1_id: updatedGame.player1_id,
          player2_id: updatedGame.player2_id,
          shared_grid: updatedGame.grid,
          start_timestamp: startTimestamp,
          game_mode: "friend"
        });
        
        await FriendGame.update(game.id, { 
          status: "active",
          start_time: new Date(startTimestamp).toISOString()
        });
      }
    } catch (error) {
      console.error("Error updating ready state:", error);
    }
  };

  const copyGameCode = () => {
    navigator.clipboard.writeText(game.game_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareViaWhatsApp = () => {
    const gameUrl = `${window.location.origin}/FriendMultiplayer?join=${game.game_code}`;
    const message = `Join my WordSwipe Duel game! Use code: ${game.game_code} or click: ${gameUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareViaSMS = () => {
    const gameUrl = `${window.location.origin}/FriendMultiplayer?join=${game.game_code}`;
    const message = `Join my WordSwipe Duel game! Use code: ${game.game_code} or click: ${gameUrl}`;
    window.open(`sms:?body=${encodeURIComponent(message)}`, '_blank');
  };

  const shareViaLink = () => {
    const gameUrl = `${window.location.origin}/FriendMultiplayer?join=${game.game_code}`;
    navigator.clipboard.writeText(gameUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading || !user || !game) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
      </div>
    );
  }

  const isPlayer1 = game.player1_id === user.id;
  const isPlayer2 = game.player2_id === user.id;
  const myReady = isPlayer1 ? game.player1_ready : game.player2_ready;
  const opponentReady = isPlayer1 ? game.player2_ready : game.player1_ready;

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 pb-36">
      <Link to={createPageUrl("FriendMultiplayer")} className="absolute top-6 left-6">
        <Button variant="ghost" className="rounded-full p-3">
          <ArrowLeft className="w-6 h-6" />
        </Button>
      </Link>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="text-center flex flex-col items-center w-full max-w-md mx-auto"
      >
        <div className="text-6xl sm:text-8xl mb-4 sm:mb-6">👥</div>
        <h1 className="text-3xl sm:text-4xl font-black text-purple-700 uppercase drop-shadow-md mb-2">Game Lobby</h1>
        
        {/* Game Code Display */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 mb-6 shadow-xl w-full">
          <p className="text-gray-600 text-sm mb-2">Game Code</p>
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-4xl font-black text-purple-800 tracking-wider">{game.game_code}</span>
            <Button 
              onClick={copyGameCode}
              variant="ghost" 
              size="icon"
              className="rounded-full"
            >
              {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
            </Button>
          </div>
          
          <Button 
            onClick={() => setShowShareModal(true)}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share with Friend
          </Button>
        </div>

        {/* Players Status */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 mb-6 shadow-xl w-full">
          <h3 className="text-lg font-bold text-purple-800 mb-4">Players</h3>
          
          <div className="space-y-3">
            {/* Player 1 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{game.player1_avatar}</span>
                <span className="font-bold">{game.player1_nickname}</span>
                {isPlayer1 && <span className="text-sm text-blue-600">(You)</span>}
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                game.player1_ready ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`}>
                {game.player1_ready ? 'Ready' : 'Waiting'}
              </div>
            </div>

            {/* Player 2 */}
            {game.player2_id ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{game.player2_avatar}</span>
                  <span className="font-bold">{game.player2_nickname}</span>
                  {isPlayer2 && <span className="text-sm text-blue-600">(You)</span>}
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                  game.player2_ready ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {game.player2_ready ? 'Ready' : 'Waiting'}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">👤</span>
                  <span className="font-bold text-gray-500">Waiting for player...</span>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                  Empty
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ready Button */}
        {game.player2_id && (
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full">
            <Button 
              onClick={handleReady}
              disabled={myReady}
              className={`w-full h-16 text-xl font-bold rounded-3xl shadow-xl border-b-8 ${
                myReady 
                  ? 'bg-green-500 text-white border-green-700' 
                  : 'bg-purple-500 hover:bg-purple-600 text-white border-purple-700'
              }`}
            >
              {myReady ? (
                <>
                  <Check className="w-6 h-6 mr-2" />
                  Ready! {opponentReady ? 'Starting...' : 'Waiting for opponent...'}
                </>
              ) : (
                <>
                  <Users className="w-6 h-6 mr-2" />
                  Ready to Play
                </>
              )}
            </Button>
          </motion.div>
        )}
      </motion.div>

      {/* Waiting for Friend Modal */}
      <AnimatePresence>
        <Dialog open={showWaitingModal} onOpenChange={() => {}}>
          <DialogContent className="max-w-xs bg-white rounded-3xl shadow-2xl border-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-center p-4"
            >
              <DialogHeader className="text-center mb-6">
                <div className="text-6xl mb-4">👥</div>
                <DialogTitle className="text-2xl font-bold text-purple-800">
                  Waiting for Friend...
                </DialogTitle>
              </DialogHeader>

              <div className="bg-purple-100 rounded-2xl p-4 mb-4">
                <p className="text-sm text-purple-700 mb-2">Share this code:</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-black text-purple-800">{game.game_code}</span>
                  <Button 
                    onClick={copyGameCode}
                    variant="ghost" 
                    size="icon"
                    className="rounded-full w-8 h-8"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 mb-6">
                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                <span className="text-sm font-semibold text-gray-700">Waiting for friend to join</span>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowShareModal(true)}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl text-sm"
                >
                  <Share2 className="w-4 h-4 mr-1" />
                  Share
                </Button>
                <Button 
                  onClick={() => navigate(createPageUrl("FriendMultiplayer"))}
                  variant="outline"
                  className="flex-1 rounded-2xl text-sm"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
          <DialogContent className="max-w-sm bg-white rounded-3xl shadow-2xl border-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-center p-4"
            >
              <button 
                onClick={() => setShowShareModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>

              <DialogHeader className="text-center mb-6">
                <div className="text-6xl mb-4">📤</div>
                <DialogTitle className="text-2xl font-bold text-purple-800">
                  Share Game
                </DialogTitle>
              </DialogHeader>

              <div className="bg-gray-100 rounded-2xl p-4 mb-6">
                <p className="text-sm text-gray-600 mb-2">Game Code:</p>
                <span className="text-2xl font-black text-purple-800">{game.game_code}</span>
              </div>

              {/* QR Code */}
              <div className="bg-white rounded-2xl p-4 mb-6 border-2 border-gray-200">
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code" 
                  className="w-32 h-32 mx-auto mb-2"
                />
                <p className="text-xs text-gray-600">Scan to join game</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={shareViaWhatsApp}
                  className="bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold"
                >
                  WhatsApp
                </Button>
                <Button 
                  onClick={shareViaSMS}
                  className="bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold"
                >
                  SMS
                </Button>
                <Button 
                  onClick={shareViaLink}
                  className="bg-purple-500 hover:bg-purple-600 text-white rounded-2xl font-bold col-span-2"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      </AnimatePresence>
    </div>
  );
}