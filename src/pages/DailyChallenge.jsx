
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/api/entities";
import { DailyChallenge } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Trophy, CheckCircle, AlertCircle, Play, Target, Gift, Flame } from "lucide-react";
import { motion } from "framer-motion";

export default function DailyChallengePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [todaysChallenge, setTodaysChallenge] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeUntilNext, setTimeUntilNext] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);

        const today = new Date().toISOString().split('T')[0];
        
        // Reset attempts if it's a new day
        if (currentUser.daily_challenge_date !== today) {
          await User.updateMyUserData({
            daily_challenge_attempts: 0,
            daily_challenge_date: today,
            daily_challenge_completed: false
          });
          setUser(prev => ({
            ...prev,
            daily_challenge_attempts: 0,
            daily_challenge_date: today,
            daily_challenge_completed: false
          }));
          
          // Schedule new daily challenge reminder since it's a new day
          try {
            const { scheduleDailyChallengeReminder } = await import('../components/notifications/NotificationManager');
            scheduleDailyChallengeReminder(false); // Not completed since it's a new day
          } catch (error) {
            console.error('Error scheduling daily challenge reminder:', error);
          }
        } else {
          // Update reminder based on completion status
          try {
            const { scheduleDailyChallengeReminder } = await import('../components/notifications/NotificationManager');
            scheduleDailyChallengeReminder(currentUser.daily_challenge_completed);
          } catch (error) {
            console.error('Error updating daily challenge reminder:', error);
          }
        }

        // Get today's challenge
        const challenges = await DailyChallenge.list();
        const todayChallenge = challenges.find(c => c.date === today);
        
        if (todayChallenge) {
          setTodaysChallenge(todayChallenge);
        } else {
          // Create sample challenge if none exists
          const sampleWords = ["ELEPHANT", "MYSTERY", "BRILLIANT", "ADVENTURE", "FANTASTIC"];
          const randomWord = sampleWords[Math.floor(Math.random() * sampleWords.length)];
          
          const newChallenge = await DailyChallenge.create({
            date: today,
            word: randomWord,
            used_by: []
          });
          setTodaysChallenge(newChallenge);
        }
      } catch (error) {
        console.error("Error loading daily challenge:", error);
        navigate(createPageUrl("Home"));
      }
      setIsLoading(false);
    };

    loadData();
  }, [navigate]);

  // Timer for next challenge
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const timeLeft = tomorrow - now;
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      
      setTimeUntilNext(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const startDailyChallenge = () => {
    if (!todaysChallenge) return;
    navigate(createPageUrl(`DailyChallengeGame?word=${todaysChallenge.word}`));
  };

  if (isLoading || !user) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const attemptsUsed = user.daily_challenge_attempts || 0;
  const attemptsLeft = 3 - attemptsUsed;
  const hasCompleted = user.daily_challenge_completed;
  const canPlay = attemptsLeft > 0 && !hasCompleted && user.daily_challenge_date === today;

  // Daily tasks data - will be expanded in the future
  const dailyTasks = [
    {
      id: "word_challenge",
      title: "Word Challenge",
      description: "Find today's mystery word",
      icon: Target,
      reward: "💎 30",
      status: hasCompleted ? "completed" : canPlay ? "available" : "locked",
      action: startDailyChallenge,
      canPlay: canPlay,
      attemptsLeft: attemptsLeft
    }
    // Future tasks will be added here
  ];

  return (
    <div className="w-full min-h-screen p-6 text-gray-800">
      <Link to={createPageUrl("Home")} className="absolute top-6 left-6">
        <Button variant="ghost" className="rounded-full p-3">
          <ArrowLeft className="w-6 h-6" />
        </Button>
      </Link>

      <header className="text-center mb-8 pt-16">
        <div className="text-6xl mb-4">📅</div>
        <h1 className="text-4xl font-black text-purple-700 uppercase drop-shadow-md mb-2">Daily Tasks</h1>
        <p className="text-gray-600 text-lg">Complete daily challenges to earn rewards!</p>
      </header>

      <main className="max-w-md mx-auto">
        {/* Streak Display */}
        <div className="bg-gradient-to-r from-orange-100 to-red-100 p-4 rounded-3xl mb-6 text-center shadow-lg">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Flame className="w-6 h-6 text-orange-500" />
            <div>
              <p className="text-xl font-black text-orange-700">
                {user.current_streak || 0} Day Streak
              </p>
              <p className="text-sm text-orange-600">
                Keep it up!
              </p>
            </div>
          </div>
        </div>

        {/* Daily Tasks */}
        <div className="space-y-4 mb-6">
          {dailyTasks.map((task) => {
            const TaskIcon = task.icon;
            
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl border-2 
                  ${task.status === 'completed' ? 'border-green-300 bg-green-50' : 
                    task.status === 'available' ? 'border-purple-300' : 'border-gray-300 opacity-60'}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-2xl shadow-md
                      ${task.status === 'completed' ? 'bg-green-200' : 
                        task.status === 'available' ? 'bg-purple-200' : 'bg-gray-200'}`}>
                      <TaskIcon className={`w-6 h-6 
                        ${task.status === 'completed' ? 'text-green-700' : 
                          task.status === 'available' ? 'text-purple-700' : 'text-gray-500'}`} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-purple-800">{task.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-blue-600 font-bold">Reward: {task.reward}</span>
                        {task.status === 'available' && task.attemptsLeft > 0 && (
                          <span className="text-orange-600">• {task.attemptsLeft} attempts left</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {task.status === 'completed' && (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  )}
                </div>
                
                <div className="flex justify-end">
                  {task.status === 'completed' ? (
                    <div className="flex items-center gap-2 text-green-600 font-bold">
                      <CheckCircle className="w-4 h-4" />
                      <span>Completed!</span>
                    </div>
                  ) : task.status === 'available' && task.canPlay ? (
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button 
                        onClick={task.action}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl px-6 py-2 font-bold"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Challenge
                      </Button>
                    </motion.div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-500">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">
                        {task.status === 'locked' ? 'No attempts left' : 'Locked'}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Next Reset Timer */}
        <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 text-center">
          <p className="text-sm text-gray-600 mb-2">New tasks available in:</p>
          <p className="text-2xl font-bold text-purple-800">{timeUntilNext}</p>
        </div>

        {/* Coming Soon */}
        <div className="mt-6 bg-gradient-to-r from-blue-100 to-purple-100 p-4 rounded-2xl text-center">
          <Gift className="w-8 h-8 mx-auto text-blue-600 mb-2" />
          <p className="text-sm text-blue-800 font-bold">More daily tasks coming soon!</p>
          <p className="text-xs text-blue-600">Stay tuned for exciting new challenges</p>
        </div>
      </main>
    </div>
  );
}
