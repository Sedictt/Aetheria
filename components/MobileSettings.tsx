import React from 'react';
import { User, signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { motion } from 'framer-motion';
import { SunIcon, MoonIcon, FlameIcon } from './Icons';

interface MobileSettingsProps {
  user: User | null;
  streak: number;
  isDarkMode: boolean;
  toggleTheme: () => void;
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}

const MobileSettings: React.FC<MobileSettingsProps> = ({
  user,
  streak,
  isDarkMode,
  toggleTheme,
  currentTheme,
  onThemeChange,
}) => {
  const handleSignOut = () => {
    signOut(auth).catch(error => console.error("Error signing out", error));
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 22 } },
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-stone-50 dark:bg-stone-900/60 p-6 pb-28 md:hidden flex flex-col transition-colors duration-300">
      
      {/* Header */}
      <div className="mb-6 mt-2">
        <h2 className="text-2xl font-serif font-extrabold text-stone-800 dark:text-stone-100 tracking-tight">
          Settings
        </h2>
        <p className="text-xs text-stone-400 dark:text-stone-500 font-medium">
          Customize your writing sanctuary
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-5"
      >
        {/* User Profile Card */}
        {user && (
          <motion.div variants={cardVariants} className="p-5 rounded-[1.5rem] clay-card flex flex-col items-center text-center">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                className="w-16 h-16 rounded-full border-2 border-white/80 dark:border-stone-700/80 shadow-md mb-3 object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-stone-300 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300 font-extrabold shadow-inner text-2xl border border-stone-200/10 mb-3">
                {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
              </div>
            )}
            <h3 className="text-lg font-serif font-extrabold text-stone-800 dark:text-stone-100 leading-tight">
              {user.displayName || 'Writer'}
            </h3>
            <p className="text-xs text-stone-400 dark:text-stone-500 font-mono mb-4">
              {user.email}
            </p>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSignOut}
              className="w-full py-2.5 px-4 bg-rose-500 text-white rounded-[1rem] font-bold text-xs shadow-md border border-rose-600/30 flex items-center justify-center gap-2 hover:bg-rose-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </motion.button>
          </motion.div>
        )}

        {/* Streaks Card */}
        {streak > 0 && (
          <motion.div variants={cardVariants} className="p-5 rounded-[1.5rem] clay-card bg-orange-500/5 dark:bg-orange-950/20 border-orange-200/40 dark:border-orange-900/30">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shadow-inner flex-shrink-0">
                <FlameIcon className="w-8 h-8 fill-orange-500 text-orange-500 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-orange-650 dark:text-orange-400">
                  {streak} Day Streak!
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed mt-0.5">
                  Your creative momentum is flowing. Keep up the habit and watch your ideas grow.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Display & Dark Mode Card */}
        <motion.div variants={cardVariants} className="p-5 rounded-[1.5rem] clay-card space-y-4">
          <h4 className="text-sm font-serif font-extrabold text-stone-850 dark:text-stone-100 uppercase tracking-wider">
            Appearance
          </h4>
          
          <div className="flex items-center justify-between p-2.5 rounded-[1rem] bg-stone-100/50 dark:bg-stone-950/40 clay-inset">
            <span className="text-xs font-bold text-stone-600 dark:text-stone-300 ml-2">
              Dark Mode
            </span>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className="p-2 bg-white dark:bg-stone-800 text-stone-650 dark:text-stone-300 rounded-[0.8rem] shadow-sm border border-stone-250/20 dark:border-stone-700/50 flex items-center justify-center"
            >
              {isDarkMode ? (
                <div className="flex items-center gap-1.5 px-1">
                  <SunIcon className="w-4 h-4 text-amber-500" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wide">Light</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-1">
                  <MoonIcon className="w-4 h-4 text-indigo-500" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wide">Dark</span>
                </div>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Aura Themes Card */}
        <motion.div variants={cardVariants} className="p-5 rounded-[1.5rem] clay-card space-y-4.5">
          <div className="flex flex-col">
            <h4 className="text-sm font-serif font-extrabold text-stone-850 dark:text-stone-100 uppercase tracking-wider">
              Aura Theme
            </h4>
            <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
              Select a color palette for your writing space
            </p>
          </div>

          <div className="grid grid-cols-5 gap-3 pt-2">
            {[
              { id: 'stone', color: '#a8a29e', label: 'Stone' },
              { id: 'rose', color: '#fb7185', label: 'Rose' },
              { id: 'lavender', color: '#a78bfa', label: 'Lavender' },
              { id: 'midnight', color: '#64748b', label: 'Midnight' },
              { id: 'forest', color: '#4ade80', label: 'Forest' }
            ].map((t) => {
              const isSelected = currentTheme === t.id;
              return (
                <motion.button
                  key={t.id}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onThemeChange(t.id)}
                  className={`flex flex-col items-center gap-2 p-2.5 rounded-2xl transition-all duration-300 border ${
                    isSelected
                      ? 'bg-stone-100/80 dark:bg-stone-800 border-indigo-400/30 dark:border-stone-600 shadow-inner'
                      : 'bg-white/40 dark:bg-stone-900/40 border-stone-200/10 dark:border-stone-800/10 hover:bg-stone-100/20'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full shadow-md relative border border-white/20 flex-shrink-0 flex items-center justify-center`}
                    style={{ backgroundColor: t.id === 'forest' ? '#4ade80' : t.color }}
                  >
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-stone-900 shadow-sm" />
                    )}
                  </span>
                  <span className="text-[9px] font-extrabold text-stone-550 dark:text-stone-400 capitalize">
                    {t.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default MobileSettings;
