
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, User as UserIcon, Trophy, ShoppingBag, Gamepad2, Calendar, Users } from "lucide-react";
import { User } from "@/api/entities";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { name: "Home", icon: Home, page: "Home" },
  { name: "Game", icon: Gamepad2, page: "Game" },
  { name: "Challenge", icon: Calendar, page: "DailyChallenge" },
  { name: "Shop", icon: ShoppingBag, page: "Shop" },
  { name: "Friends", icon: Users, page: "Friends" },
  { name: "Leaders", icon: Trophy, page: "Leaderboard" },
  { name: "Profile", icon: UserIcon, page: "Profile" },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (e) {
        setUser(null);
      }
    };
    fetchUser();
  }, [location.pathname]);

  // Initialize notification service worker on app load - with error handling
  useEffect(() => {
    const initNotifications = async () => {
      try {
        const { createServiceWorker } = await import('./components/notifications/ServiceWorker');
        await createServiceWorker();
      } catch (error) {
        console.log('Notification service worker not available:', error);
        // Continue without service worker
      }
    };
    
    initNotifications();
  }, []);

  return (
    <div className="min-h-screen font-sans bg-gradient-to-br from-sky-200 via-rose-200 to-purple-300">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700;800;900&display=swap');
        
        body, .font-sans {
          font-family: 'Rubik', sans-serif;
        }
      `}</style>
      
      <main>{children}</main>
    </div>
  );
}
