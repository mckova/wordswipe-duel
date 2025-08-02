
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/api/entities";
import { Game as GameEntity } from "@/api/entities";
import { ValidatedWord }
 from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Timer, Star, RotateCcw, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import GameGrid from "../components/game/GameGrid";
import WordsList from "../components/game/WordsList";
import PowerUpHUD from "../components/game/PowerUpHUD";
import { wordCache } from "../components/game/WordCache";
import { awardXP } from "../components/xp/XPSystem";
import LevelUpModal from "../components/xp/LevelUpModal"; // This import remains as per instructions, even if not directly rendered here anymore.
import { haptics } from "../components/utils/HapticFeedback";
import { getBeginnerGrid, isBeginnerUser } from "../components/game/BeginnerGrids";

export default function Game() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userPowerUps, setUserPowerUps] = useState({});
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine); // Added network status state
  const [gameState, setGameState] = useState({
    grid: [],
    selectedCells: [],
    currentWord: "",
    foundWords: [],
    score: 0,
    timeRemaining: 60,
    gameActive: false,
    toast: null,
    isSubmittingWord: false,
    doubleScoreActive: false,
    doubleScoreTimeLeft: 0,
    isFrozen: false,
    frozenTimeLeft: 0,
    newWordBonus: 0, // Track bonus from new words
  });
  // Removed showLevelUpModal and levelUpData states as level-up logic moves to GameResult page
  const [dictionaryWorker, setDictionaryWorker] = useState(null);
  const [workerReady, setWorkerReady] = useState(false);

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
    // Check if Worker is supported in the browser environment
    if (typeof Worker === "undefined") {
      console.warn("Web Workers are not supported in this environment.");
      setWorkerReady(false);
      return;
    }

    // Create worker from the component file as a blob URL since we can't use public folder
    const workerScript = `
      // Dictionary Web Worker code embedded inline
      const WORD_LIST = [
        "am", "an", "as", "at", "be", "by", "do", "go", "he", "if", "in", "is", "it", "me", "my", "no", "of", "on", "or", "so", "to", "up", "we",
        "add", "age", "ago", "aid", "aim", "air", "all", "and", "any", "app", "are", "arm", "art", "ask", "bad", "bag", "bar", "bat", "bay", "bed", "bee", "bet", "big", "bit", "box", "boy", "bug", "bus", "but", "buy", "can", "car", "cat", "cup", "cut", "day", "did", "die", "dig", "dog", "dot", "dry", "due", "ear", "eat", "egg", "end", "era", "eye", "fan", "far", "fat", "few", "fit", "fix", "fly", "for", "fox", "fun", "gap", "gas", "get", "god", "got", "gun", "guy", "had", "has", "hat", "her", "hey", "him", "his", "hit", "hot", "how", "ice", "job", "joy", "key", "kid", "law", "lay", "led", "leg", "let", "lie", "lot", "low", "mad", "man", "map", "may", "mix", "mom", "new", "not", "now", "odd", "off", "old", "one", "our", "out", "own", "pay", "pen", "pet", "pie", "pig", "put", "ran", "red", "run", "sad", "say", "sea", "see", "set", "she", "shy", "sin", "sit", "six", "sky", "son", "sun", "tax", "tea", "ten", "the", "tie", "tip", "top", "toy", "try", "two", "use", "van", "war", "was", "way", "web", "who", "why", "win", "yes", "yet", "you", "zoo",
        "able", "acid", "aged", "also", "area", "army", "away", "baby", "back", "ball", "band", "bank", "base", "bath", "beam", "bear", "beat", "been", "beer", "bell", "belt", "best", "bike", "bill", "bird", "blow", "blue", "boat", "body", "bone", "book", "boom", "boot", "born", "boss", "both", "bowl", "bulk", "burn", "busy", "cake", "call", "calm", "came", "camp", "card", "care", "case", "cash", "cast", "cell", "chip", "city", "club", "coal", "coat", "code", "cold", "come", "cool", "copy", "core", "corn", "cost", "crew", "crop", "dark", "data", "date", "dawn", "days", "dead", "deal", "dear", "deck", "deep", "desk", "dial", "died", "diet", "dish", "does", "done", "door", "down", "draw", "drew", "drop", "drug", "drum", "dual", "duck", "duty", "each", "earn", "ease", "east", "easy", "edge", "else", "even", "ever", "evil", "exam", "exit", "face", "fact", "fail", "fair", "fall", "farm", "fast", "fate", "fear", "feed", "feel", "feet", "fell", "felt", "file", "fill", "film", "find", "fine", "fire", "firm", "fish", "fist", "five", "flag", "flat", "flee", "flew", "flow", "food", "foot", "form", "fort", "four", "free", "from", "fuel", "full", "fund", "gain", "game", "gate", "gave", "gear", "gift", "girl", "give", "glad", "goal", "goes", "gold", "golf", "gone", "good", "grab", "gray", "grew", "grip", "grow", "hair", "half", "hall", "hand", "hang", "hard", "harm", "hate", "have", "head", "hear", "heat", "held", "hell", "help", "here", "hero", "hide", "high", "hill", "hint", "hire", "hold", "hole", "holy", "home", "hope", "host", "hour", "huge", "hung", "hunt", "hurt", "idea", "inch", "into", "iron", "item", "jail", "join", "joke", "jump", "june", "jury", "just", "keep", "kept", "kick", "kill", "kind", "king", "knee", "knew", "know", "lack", "lady", "laid", "lake", "land", "lane", "last", "late", "lead", "leaf", "lean", "left", "lens", "less", "life", "lift", "like", "line", "link", "list", "live", "load", "loan", "lock", "long", "look", "loop", "lord", "lose", "loss", "lost", "loud", "love", "luck", "made", "mail", "main", "make", "male", "mall", "many", "mark", "mass", "mate", "math", "meal", "mean", "meat", "meet", "menu", "mess", "mind", "mine", "miss", "mode", "mood", "moon", "more", "most", "move", "much", "must", "name", "navy", "near", "neck", "need", "news", "next", "nice", "nine", "node", "none", "noon", "nose", "note", "noun", "odds", "once", "only", "open", "oral", "over", "pace", "pack", "page", "paid", "pain", "pair", "pale", "palm", "park", "part", "pass", "past", "path", "peak", "pick", "pile", "pill", "pink", "pipe", "plan", "play", "plot", "plus", "poem", "poet", "poll", "pool", "poor", "port", "post", "pour", "pray", "pull", "pure", "push", "quit", "race", "rail", "rain", "rank", "rare", "rate", "read", "real", "rear", "rely", "rent", "rest", "rich", "ride", "ring", "rise", "risk", "road", "rock", "role", "roll", "roof", "room", "root", "rose", "rule", "safe", "said", "sail", "sale", "salt", "same", "sand", "save", "seal", "seat", "seed", "seek", "seem", "seen", "self", "sell", "send", "sent", "ship", "shoe", "shop", "shot", "show", "shut", "sick", "side", "sign", "sing", "sink", "site", "size", "skin", "skip", "slip", "slow", "snap", "snow", "soap", "soft", "soil", "sold", "sole", "song", "soon", "sort", "soul", "soup", "spin", "spot", "star", "stay", "step", "stir", "stop", "such", "suit", "sure", "swim", "take", "tale", "talk", "tall", "tank", "tape", "task", "team", "tear", "tell", "term", "test", "text", "than", "this", "thus", "tide", "tied", "ties", "time", "tiny", "tips", "tire", "told", "tone", "took", "tool", "tour", "town", "tree", "trim", "trip", "true", "tune", "turn", "twin", "type", "unit", "upon", "used", "user", "vast", "very", "view", "vote", "wage", "wait", "wake", "walk", "wall", "want", "ward", "warm", "warn", "wash", "wave", "ways", "weak", "wear", "week", "well", "went", "were", "west", "what", "when", "wide", "wife", "wild", "will", "wind", "wine", "wing", "wire", "wise", "wish", "with", "wolf", "wood", "word", "work", "worn", "yard", "year", "yoga", "your", "zero", "zone",
        "about", "above", "abuse", "actor", "acute", "admit", "adopt", "adult", "after", "again", "agent", "agree", "ahead", "alarm", "album", "alert", "alien", "align", "alike", "alive", "allow", "alone", "along", "alter", "among", "anger", "angle", "angry", "apart", "apple", "apply", "arena", "argue", "arise", "array", "arrow", "aside", "asset", "atlas", "audit", "avoid", "awake", "award", "aware", "badly", "baker", "bases", "basic", "beach", "began", "begin", "being", "below", "bench", "billy", "birth", "black", "blame", "blank", "blast", "blind", "block", "blood", "bloom", "blown", "blues", "blunt", "blurt", "board", "boast", "bobby", "boost", "booth", "bound", "boxer", "brain", "brake", "brand", "brass", "brave", "bread", "break", "breed", "brief", "bring", "broad", "broke", "brown", "brush", "build", "built", "buyer", "cable", "calif", "carry", "catch", "cause", "chain", "chair", "chaos", "charm", "chart", "chase", "cheap", "check", "chest", "chief", "child", "china", "chose", "civil", "claim", "class", "clean", "clear", "click", "climb", "clock", "close", "cloud", "clown", "clubs", "coach", "coast", "could", "count", "court", "cover", "craft", "crash", "crazy", "cream", "crime", "cross", "crowd", "crown", "crude", "curve", "cycle", "daily", "dance", "dated", "dealt", "death", "debut", "delay", "depth", "doing", "doubt", "dozen", "draft", "drama", "drank", "dream", "dress", "drill", "drink", "drive", "drove", "dying", "eager", "early", "earth", "eight", "elite", "empty", "enemy", "enjoy", "enter", "entry", "equal", "error", "event", "every", "exact", "exist", "extra", "faith", "false", "fault", "fiber", "field", "fifth", "fifty", "fight", "final", "first", "fixed", "flash", "fleet", "floor", "fluid", "focus", "force", "forth", "forty", "forum", "found", "frame", "frank", "fraud", "fresh", "front", "fruit", "fully", "funny", "giant", "given", "glass", "globe", "going", "grace", "grade", "grand", "grant", "grass", "grave", "great", "green", "gross", "group", "grown", "guard", "guess", "guest", "guide", "happy", "harry", "heart", "heavy", "henry", "horse", "hotel", "house", "human", "hurry", "image", "index", "inner", "input", "issue", "japan", "jimmy", "joint", "jones", "judge", "known", "label", "large", "laser", "later", "laugh", "layer", "learn", "lease", "least", "leave", "legal", "level", "lewis", "light", "limit", "links", "lives", "local", "loose", "lower", "lucky", "lunch", "lying", "magic", "major", "maker", "march", "maria", "match", "maybe", "mayor", "meant", "media", "metal", "might", "minor", "minus", "mixed", "model", "money", "month", "moral", "motor", "mount", "mouse", "mouth", "moved", "movie", "music", "needs", "never", "newly", "night", "noise", "north", "noted", "novel", "nurse", "occur", "ocean", "offer", "often", "order", "other", "ought", "paint", "panel", "paper", "party", "peace", "peter", "phase", "phone", "photo", "piano", "piece", "pilot", "pitch", "place", "plain", "plane", "plant", "plate", "point", "pound", "power", "press", "price", "pride", "prime", "print", "prior", "prize", "proof", "proud", "prove", "queen", "quick", "quiet", "quite", "radio", "raise", "range", "rapid", "ratio", "reach", "ready", "realm", "rebel", "refer", "relax", "repay", "reply", "right", "rigid", "rival", "river", "robin", "roger", "roman", "rough", "round", "route", "royal", "rural", "scale", "scene", "scope", "score", "sense", "serve", "seven", "shall", "shape", "share", "sharp", "sheet", "shelf", "shell", "shift", "shine", "shirt", "shock", "shoot", "short", "shown", "sides", "sight", "silly", "since", "sixth", "sixty", "sized", "skill", "sleep", "slide", "small", "smart", "smile", "smith", "smoke", "snake", "solid", "solve", "sorry", "sound", "south", "space", "spare", "speak", "speed", "spend", "spent", "split", "spoke", "sport", "staff", "stage", "stake", "stand", "start", "state", "steam", "steel", "stick", "still", "stock", "stone", "stood", "store", "storm", "story", "strip", "stuck", "study", "stuff", "style", "sugar", "suite", "super", "sweet", "swift", "swing", "sworn", "table", "taken", "taste", "taxes", "teach", "teams", "tears", "terry", "texas", "thank", "their", "these", "thick", "thing", "think", "third", "those", "three", "threw", "throw", "thumb", "tight", "timer", "tired", "title", "today", "topic", "total", "touch", "tough", "tower", "track", "trade", "train", "treat", "trend", "trial", "tribe", "trick", "tried", "tries", "truck", "truly", "trust", "truth", "tudor", "twice", "uncle", "under", "undue", "union", "unity", "until", "upper", "upset", "urban", "usage", "usual", "valid", "value", "video", "virus", "visit", "vital", "vocal", "voice", "waste", "watch", "water", "wheel", "where", "which", "while", "white", "whole", "whose", "woman", "women", "world", "worry", "worse", "worst", "worth", "would", "write", "wrong", "wrote", "young", "youth"
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

    // Cleanup worker on unmount
    return () => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
    };
  }, []);

  const generateGrid = useCallback(() => {
    // אם המשתמש הוא מתחיל, השתמש בלוח קל
    if (user && isBeginnerUser(user.games_played)) {
      const gameNumber = (user.games_played || 0) + 1; // המשחק הבא
      const beginnerGrid = getBeginnerGrid(gameNumber);
      
      if (beginnerGrid) {
        console.log(`Using beginner grid ${gameNumber} for new player`);
        return beginnerGrid;
      }
    }
    
    // אחרת, צור לוח רגיל
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
  }, [user?.games_played]); // תלות רק במספר המשחקים, לא בכל אובייקט המשתמש

  const startNewGame = useCallback(() => {
    // יצור לוח מיד במקום להתחיל עם לוח ריק
    const newGrid = generateGrid();
    
    setGameState(prev => ({
      ...prev,
      grid: newGrid, // התחל עם הלוח הנכון מיד
      selectedCells: [],
      currentWord: "",
      foundWords: [],
      score: 0,
      timeRemaining: 60,
      gameActive: true, // הפעל מיד
      toast: null,
      isSubmittingWord: false,
      doubleScoreActive: false,
      doubleScoreTimeLeft: 0,
      isFrozen: false,
      frozenTimeLeft: 0,
      newWordBonus: 0,
    }));
  }, [generateGrid]);
  
  // Initial user data fetch
  useEffect(() => {
    const init = async () => {
      try {
        const u = await User.me();
        setUser(u);
        
        setUserPowerUps({
          extra_time: u.extra_time_powerups || 0,
          word_hint: u.word_hint_powerups || 0,
          double_score: u.double_score_powerups || 0,
          swap_board: u.swap_board_powerups || 0,
        });
      } catch (e) {
        navigate(createPageUrl("Home"));
      }
    };
    init();
  }, [navigate]);

  // Start game only after user is loaded and grid is not yet initialized
  useEffect(() => {
    if (user && gameState.grid.length === 0) {
      startNewGame();
    }
  }, [user, startNewGame, gameState.grid.length]);

  const showToast = (message, type) => {
    setGameState(prev => ({ ...prev, toast: { message, type } }));
    
    // Add haptic feedback based on toast type
    if (type === 'success') {
      haptics.success();
    } else if (type === 'error') {
      haptics.warning();
    }
    
    setTimeout(() => {
      setGameState(prev => ({ ...prev, toast: null }));
    }, 1500);
  };
  
  const handleTimeUp = useCallback(async () => {
    setGameState(prev => ({ ...prev, gameActive: false }));
    
    if (user) {
      const crystalsEarned = Math.floor(gameState.score / 20);
      const gameId = `game_${user.id}_${Date.now()}`; // יצירת ID ייחודי למשחק
      
      try {
        await GameEntity.create({
          player_id: user.id,
          score: gameState.score,
          words_found: gameState.foundWords,
          crystals_earned: crystalsEarned
        });
        
        await User.updateMyUserData({
          score: (user.score || 0) + gameState.score,
          crystals: (user.crystals || 0) + crystalsEarned,
          games_played: (user.games_played || 0) + 1
        });

        // Award XP for solo game
        const xpResult = await awardXP(user.id, 10, "Solo game completed");
        if (xpResult && xpResult.newLevel > xpResult.oldLevel) {
          localStorage.setItem('lastGameLevelUpData', JSON.stringify(xpResult));
        } else {
          localStorage.removeItem('lastGameLevelUpData');
        }
        
        // שמור מזהה משחק לבדיקת פרסומת
        localStorage.setItem('currentGameId', gameId);
        
      } catch (error) {
        console.error("Failed to save game:", error);
      }
    }
    
    navigate(createPageUrl(`GameResult?score=${gameState.score}&words=${gameState.foundWords.length}&crystals=${Math.floor(gameState.score / 20)}`));

  }, [user, gameState.score, gameState.foundWords, navigate]);

  // Main game timer
  useEffect(() => {
    // Timer pauses if game is not active or if time is frozen
    if (!gameState.gameActive || gameState.isFrozen) return; 
    if (gameState.timeRemaining <= 0) {
      handleTimeUp();
      return;
    }
    const timer = setInterval(() => {
      setGameState(prev => ({ ...prev, timeRemaining: prev.timeRemaining - 1 }));
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState.timeRemaining, gameState.gameActive, gameState.isFrozen, handleTimeUp]); // Added gameState.isFrozen to dependencies

  // Freeze timer effect
  useEffect(() => {
    if (!gameState.isFrozen || !gameState.gameActive) return; // Only run if frozen and game is active

    const timer = setInterval(() => {
      setGameState(prev => {
        if (prev.frozenTimeLeft <= 1) {
          showToast("Timer un-frozen!", "info"); // Assuming showToast is stable
          return { ...prev, isFrozen: false, frozenTimeLeft: 0 };
        }
        return { ...prev, frozenTimeLeft: prev.frozenTimeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.isFrozen, gameState.gameActive]); // Dependencies for freeze timer

  // Handle double score timer
  useEffect(() => {
    if (!gameState.doubleScoreActive || gameState.doubleScoreTimeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setGameState(prev => {
        if (prev.doubleScoreTimeLeft <= 1) {
          showToast("Double score ended!", "info"); 
          return { ...prev, doubleScoreActive: false, doubleScoreTimeLeft: 0 };
        }
        return { ...prev, doubleScoreTimeLeft: prev.doubleScoreTimeLeft - 1 };
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameState.doubleScoreActive, gameState.doubleScoreTimeLeft]);

  const handleBuyPowerUp = async (powerUpType, price) => {
    if (!user || user.crystals < price) {
      showToast("Not enough crystals!", "error");
      throw new Error("Insufficient crystals");
    }

    try {
      const newCrystals = user.crystals - price;
      const powerUpField = `${powerUpType}_powerups`;
      const newCount = (user[powerUpField] || 0) + 1;

      const updateData = {
        crystals: newCrystals,
        [powerUpField]: newCount
      };

      await User.updateMyUserData(updateData);
      
      // Update local state
      setUser(prev => ({ ...prev, ...updateData }));
      setUserPowerUps(prev => ({
        ...prev,
        [powerUpType]: newCount
      }));

      showToast("Power-up purchased!", "success");
    } catch (error) {
      showToast("Purchase failed!", "error");
      throw error;
    }
  };

  const usePowerUp = async (powerUpType) => {
    if (!gameState.gameActive || !userPowerUps[powerUpType] || userPowerUps[powerUpType] <= 0) {
      return; // The HUD component should already prevent calling this if conditions are not met
    }
    
    try {
      switch (powerUpType) {
        case "extra_time": // This power-up is now for time freeze
          if (gameState.isFrozen) {
            showToast("Timer is already frozen!", "info");
            return;
          }
          setGameState(prev => ({ 
            ...prev, 
            isFrozen: true,
            frozenTimeLeft: 10 // Freeze timer for 10 seconds
          }));
          showToast("⏸️ Timer frozen for 10 seconds!", "success");
          break;
          
        case "word_hint":
          showToast("💡 Look for 3+ letter words!", "success");
          break;

        case "swap_board":
          const newGrid = generateGrid(); // רק כאן יוצר לוח חדש במפורש
          setGameState(prev => ({
            ...prev,
            grid: newGrid,
            selectedCells: [],
            currentWord: "",
          }));
          showToast("🔄 Board Swapped!", "success");
          break;
          
        case "double_score":
          if (gameState.doubleScoreActive) {
            showToast("Double score already active!", "info");
            return; 
          }
          setGameState(prev => ({ 
            ...prev, 
            doubleScoreActive: true, 
            doubleScoreTimeLeft: 30 
          }));
          showToast("💥 Double Score for 30s!", "success");
          break;
        default:
          console.warn(`Unknown power-up type: ${powerUpType}`);
          return;
      }
      
      // Update power-up count in local state
      const newCount = userPowerUps[powerUpType] - 1;
      setUserPowerUps(prev => ({
        ...prev,
        [powerUpType]: newCount
      }));
      
      // Update user data in backend
      const updateData = {};
      updateData[`${powerUpType}_powerups`] = newCount;
      await User.updateMyUserData(updateData);
      
    } catch (error) {
      console.error("Error using power-up:", error);
      showToast("Failed to use power-up", "error");
    }
  };

  const handleCellSelect = (row, col) => {
    if (!gameState.gameActive) return;

    const cellKey = `${row}-${col}`;
    const existingIndex = gameState.selectedCells.findIndex(cell => cell.key === cellKey);

    if (existingIndex !== -1) {
      // If clicking on an already selected cell, remove it and all cells after it
      const newSelectedCells = gameState.selectedCells.slice(0, existingIndex);
      const newWord = newSelectedCells.map(cell => cell.letter).join("").toLowerCase();
      
      setGameState(prev => ({
        ...prev,
        selectedCells: newSelectedCells,
        currentWord: newWord
      }));
    } else {
      // Add the new cell
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
    if (gameState.isSubmittingWord) return;

    if (word.length < 2) {
      showToast("Word too short!", "error");
      clearSelection();
      return;
    }
    if (gameState.foundWords.includes(word)) {
      showToast("Already found!", "error");
      clearSelection();
      return;
    }
    
    setGameState(prev => ({ ...prev, isSubmittingWord: true }));

    const handleValidWord = (validWord) => {
      let wordScore = 0;
      let bonusMessages = [];
      
      // Base score calculation
      if (validWord.length >= 8) {
          wordScore = 90;
      } else if (validWord.length >= 5) {
          wordScore = 60;
      } else {
          wordScore = 30;
      }
      
      // Check if this is a new word for bonus
      const isNewWord = wordCache.isNewWord(validWord);
      let newWordBonus = 0;
      if (isNewWord) {
        newWordBonus = 20;
        wordScore += newWordBonus;
        bonusMessages.push("🎁 NEW WORD! (+20)");
        wordCache.addWord(validWord); // Add to cache for future checks
      }
      
      // Apply double score power-up if active
      if (gameState.doubleScoreActive) {
        wordScore *= 2;
        bonusMessages.push("💥 2x Power-up!");
      }
      
      setGameState(prev => ({
        ...prev,
        foundWords: [...prev.foundWords, validWord],
        score: prev.score + wordScore,
        newWordBonus: prev.newWordBonus + newWordBonus, // Accumulate new word bonus
      }));
      
      let finalToastMessage = `✨ "${validWord.toUpperCase()}" - ${wordScore} points`;
      if (bonusMessages.length > 0) {
        finalToastMessage += ` ${bonusMessages.join(" ")}`;
      }
      showToast(finalToastMessage, "success");
    };

    try {
      // If offline, only use worker/local validation
      if (!isOnline) {
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
          } else {
            showToast("❌ Not a valid word!", "error");
          }
        } else {
          // Fallback to basic validation if worker not available
          showToast("❌ Not a valid word!", "error");
        }
        
        clearSelection();
        setGameState(prev => ({ ...prev, isSubmittingWord: false }));
        return; // Exit here, no further checks for offline mode
      }

      // Online mode - use full validation chain
      // First, check with dictionary worker if available
      if (dictionaryWorker && workerReady) {
        const messageId = Date.now(); // Simple unique ID for correlating messages
        
        const workerPromise = new Promise((resolve) => {
          const handler = (e) => {
            const { valid, messageId: responseId } = e.data;
            if (responseId === messageId) { // Ensure response is for this specific request
              dictionaryWorker.removeEventListener('message', handler); // Clean up listener
              resolve(valid);
            }
          };
          dictionaryWorker.addEventListener('message', handler);
        });
        
        dictionaryWorker.postMessage({ word, messageId });
        const isValidInDictionary = await workerPromise;
        
        if (isValidInDictionary) {
          handleValidWord(word);
          clearSelection();
          setGameState(prev => ({ ...prev, isSubmittingWord: false }));
          return; // Word was valid by worker, no need for further checks
        }
        // If not valid by worker, proceed to database/LLM checks
      }

      // Check database cache if worker failed or word not in dictionary
      const validatedWords = await ValidatedWord.filter({ word: word });
      
      if (validatedWords.length > 0) {
        // Word found in database - use cached result
        const validatedWord = validatedWords[0];
        if (validatedWord.is_valid) {
          handleValidWord(word);
        } else {
          showToast("❌ Not a valid word!", "error");
        }
        clearSelection();
        setGameState(prev => ({ ...prev, isSubmittingWord: false }));
        return;
      }

      // Word not in dictionary or database - call API as fallback (only when online)
      const response = await InvokeLLM({
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
      
      // Save the validation result to database for all users
      try {
        await ValidatedWord.create({
          word: word,
          is_valid: response && response.isValid
        });
      } catch (dbError) {
        console.error("Error saving word validation:", dbError);
        // Continue even if saving to DB fails
      }
      
      if (response && response.isValid) {
        handleValidWord(word);
      } else {
        showToast("❌ Not a valid word!", "error");
      }
    } catch (error) {
      console.error("Error validating word:", error);
      if (isOnline) {
        showToast("Could not check word.", "error");
      } else {
        // In offline mode, any validation failure means it's considered invalid.
        showToast("❌ Not a valid word!", "error");
      }
    } finally {
      clearSelection();
      setGameState(prev => ({ ...prev, isSubmittingWord: false }));
    }
  };

  if (!user || (!gameState.grid.length && !showExitConfirm)) { // showLevelUpModal removed from condition
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
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

      {/* LevelUpModal removed from here as per new design to show on GameResult page */}

      {/* Header - Exit button and Score - simplified */}
      <header className="flex justify-between items-center p-3 sm:p-4 relative z-30">
        <Button
          onClick={() => setShowExitConfirm(true)}
          variant="ghost"
          className="h-10 w-10 rounded-full bg-white/60 backdrop-blur-sm shadow-md touch-manipulation"
          style={{ touchAction: 'manipulation' }}
        >
          <X className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/70 backdrop-blur-sm rounded-2xl shadow-md text-lg sm:text-xl font-bold">
          <Star className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
          <span className="text-yellow-800">{gameState.score}</span>
        </div>
      </header>

      {/* Power-ups Row - more compact with better spacing */}
      <div className="px-3 sm:px-4 pb-3 sm:pb-5">
        <PowerUpHUD
          userPowerUps={userPowerUps}
          userCrystals={user.crystals}
          onUsePowerUp={usePowerUp}
          onBuyPowerUp={handleBuyPowerUp}
          gameActive={gameState.gameActive}
        />
      </div>

      {/* Timer - kept prominent with more space from power-ups */}
      <div className="text-center pb-3 sm:pb-4">
        <motion.p 
          className={`text-4xl sm:text-5xl md:text-6xl font-black transition-colors duration-300 ${gameState.timeRemaining <= 10 ? 'text-red-500' : 'text-gray-800'}`}
          animate={gameState.timeRemaining <= 10 ? { scale: [1, 1.1, 1], opacity: [1, 0.7, 1] } : {}}
          transition={gameState.timeRemaining <= 10 ? { duration: 1, repeat: Infinity } : {}}
        >
          {gameState.timeRemaining}
        </motion.p>
        {gameState.isFrozen && <p className="text-blue-500 font-bold text-sm mt-1">Frozen ({gameState.frozenTimeLeft}s)</p>}
        {gameState.doubleScoreActive && <p className="text-orange-500 font-bold text-sm mt-1">Double Score ({gameState.doubleScoreTimeLeft}s)</p>}
      </div>

      {/* Current Word Display - simplified */}
      <div className="text-center pb-3 sm:pb-4">
        <p className="text-gray-600 text-xs mb-1">Current Word</p>
        <p className="text-lg sm:text-xl md:text-2xl text-purple-800 font-black tracking-widest uppercase px-4">
          {gameState.currentWord || "_"}
        </p>
      </div>

      {/* Game Grid - Main focus with proper spacing and touch optimization */}
      <div className="flex-shrink-0 flex justify-center px-3 sm:px-4 pb-3 sm:pb-4">
        <GameGrid
          grid={gameState.grid}
          selectedCells={gameState.selectedCells}
          onCellSelect={handleCellSelect}
          isLoading={!gameState.gameActive || gameState.grid.length === 0}
        />
      </div>

      {/* Action Buttons - compact with better touch targets */}
      <div className="flex gap-2 sm:gap-3 justify-center px-3 sm:px-4 pb-2 sm:pb-3">
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button 
            onClick={() => {
              haptics.impact();
              clearSelection();
            }} 
            variant="outline" 
            className="rounded-2xl border-2 border-gray-300 bg-white/80 hover:bg-white text-gray-600 p-3 shadow-lg touch-manipulation min-h-[48px] min-w-[48px]"
            style={{ touchAction: 'manipulation' }}
          >
            <RotateCcw size={20} />
          </Button>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button 
            onClick={() => {
              haptics.mediumImpact();
              submitWord();
            }}
            disabled={gameState.isSubmittingWord || !gameState.gameActive}
            className="text-white text-base sm:text-lg font-bold rounded-2xl px-4 sm:px-6 py-3 bg-green-500 hover:bg-green-600 border-b-4 border-green-700 shadow-xl disabled:bg-gray-400 disabled:border-b-4 disabled:border-gray-600 touch-manipulation min-h-[48px]"
            style={{ touchAction: 'manipulation' }}
          >
            {gameState.isSubmittingWord ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Checking...</span>
              </div>
            ) : "Submit Word"}
          </Button>
        </motion.div>
      </div>

      {/* Found Words List - Bottom, compact */}
      <div className="px-3 sm:px-4 pb-2 sm:pb-3 flex-grow-0">
        <WordsList foundWords={gameState.foundWords} />
      </div>
    </div>
  );
}
