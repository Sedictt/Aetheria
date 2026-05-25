import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Note, MoodEntry } from '../types';
import { BrainIcon, SparklesIcon } from './Icons';
import { motion } from 'framer-motion';

interface AIInsightsProps {
  note: Note;
  isOpen: boolean;
  onClose: () => void;
  onUpdateNote: (updates: Partial<Note>) => void;
}

const MoodTimeline: React.FC<{ history: MoodEntry[] }> = ({ history }) => {
  if (history.length < 2) return null;

  const width = 240;
  const height = 65;
  const padding = 12;

  const getX = (index: number) => padding + (index / (history.length - 1)) * (width - 2 * padding);
  const getY = (score: number) => height - padding - (score / 10) * (height - 2 * padding);

  const points = history.map((entry, i) => `${getX(i)},${getY(entry.score)}`).join(' ');

  // SVG drawing animation details
  const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { 
      pathLength: 1, 
      opacity: 1, 
      transition: { 
        duration: 1.5, 
        ease: "easeInOut",
        delay: 0.2
      } 
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-stone-200/30 dark:border-stone-700/30">
      <span className="text-[10px] font-extrabold text-stone-400 dark:text-stone-500 uppercase tracking-widest block mb-3.5">
        Emotional Flow
      </span>

      {/* Volumetric Visual Color bar */}
      <div className="h-2.5 w-full rounded-full mb-5 flex overflow-hidden shadow-inner border border-stone-200/10 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 p-[1px]">
        {history.map((entry, i) => (
          <div
            key={i}
            className="flex-1 h-full rounded-full first:rounded-l-full last:rounded-r-full transition-all duration-300 hover:scale-y-110"
            style={{ backgroundColor: entry.color }}
            title={`${entry.mood} (${entry.score}/10)`}
          />
        ))}
      </div>

      {/* SVG Line Chart with Path draw animation */}
      <div className="relative h-18 w-full clay-inset p-2 bg-stone-100/30 dark:bg-stone-950/20 rounded-xl overflow-hidden">
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
          {/* Guide dash lines */}
          <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="currentColor" className="text-stone-200/80 dark:text-stone-800/85" strokeWidth="1" strokeDasharray="3 3" />

          {/* Animated Line */}
          <motion.polyline
            points={points}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            variants={pathVariants}
            initial="hidden"
            animate="visible"
          />

          {/* Line Gradient configuration */}
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
          </defs>

          {/* Dynamic Interactive Dot plot */}
          {history.map((entry, i) => (
            <g key={i} className="group">
              <motion.circle
                cx={getX(i)}
                cy={getY(entry.score)}
                r="4.5"
                fill={entry.color}
                stroke="white"
                strokeWidth="2.5"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 * i + 0.5 }}
                className="transition-all duration-300 cursor-pointer hover:r-6 shadow-[0_2px_4px_rgba(0,0,0,0.1)]"
              />
              <foreignObject x={getX(i) - 40} y={getY(entry.score) - 34} width="80" height="28" className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                <div className="text-[9px] bg-stone-800 text-white dark:bg-stone-50 dark:text-stone-900 font-bold text-center py-1 px-1.5 rounded-lg shadow-md border border-white/10">
                  {entry.mood}
                </div>
              </foreignObject>
            </g>
          ))}
        </svg>
      </div>
      <div className="flex justify-between text-[9px] text-stone-400 font-mono font-bold mt-2 px-1">
        <span>Start</span>
        <span>Now</span>
      </div>
    </div>
  );
};

const AIInsights: React.FC<AIInsightsProps> = ({ note, isOpen, onClose, onUpdateNote }) => {
  const [tagInput, setTagInput] = useState('');

  if (!isOpen) return null;

  const hasAnalysis = !!(note.mood || note.aiSummary || note.aiReflection);

  const displayHistory = note.moodHistory && note.moodHistory.length > 0
    ? note.moodHistory
    : (note.mood ? [{ mood: note.mood, score: 5, color: '#fb7185', timestamp: note.updatedAt }] as MoodEntry[] : []);

  const currentMood = displayHistory[displayHistory.length - 1];

  const handleColorChange = (newColor: string) => {
    if (!note.moodHistory || note.moodHistory.length === 0) {
      if (note.mood) {
        onUpdateNote({
          moodHistory: [{
            mood: note.mood,
            score: 5,
            color: newColor,
            timestamp: note.updatedAt
          }]
        });
      }
      return;
    }

    const updatedHistory = [...note.moodHistory];
    const lastIndex = updatedHistory.length - 1;
    updatedHistory[lastIndex] = {
      ...updatedHistory[lastIndex],
      color: newColor
    };

    onUpdateNote({ moodHistory: updatedHistory });
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().replace(/^#/, '');
      if (!note.tags.includes(newTag)) {
        onUpdateNote({ tags: [...(note.tags || []), newTag] });
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateNote({ tags: (note.tags || []).filter(t => t !== tagToRemove) });
  };

  // Motion Variants for Staggered children loads
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 22
      }
    }
  };

  return (
    <motion.div 
      initial={{ x: "100%", opacity: 0.8 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0.8 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="w-full md:w-80 bg-stone-50/90 dark:bg-stone-900/90 border-l border-stone-200/40 dark:border-stone-800/40 h-full overflow-y-auto p-6 shadow-2xl absolute right-0 top-0 z-20 md:static md:shadow-none transition-all custom-scrollbar flex flex-col"
    >
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-serif font-extrabold text-stone-800 dark:text-stone-100 flex items-center gap-2.5">
          <BrainIcon className="w-5 h-5 text-indigo-500" />
          <span>Insights</span>
        </h2>
        <motion.button
          whileHover={{ scale: 1.15, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center border border-stone-200/10"
        >
          ✕
        </motion.button>
      </div>

      {!hasAnalysis ? (
        <div className="text-center py-16 px-4 space-y-5 flex-1 flex flex-col items-center justify-center">
          <div className="w-18 h-18 bg-white dark:bg-stone-800 rounded-[1.5rem] flex items-center justify-center shadow-md clay-card border border-stone-200/10">
            <SparklesIcon className="w-8 h-8 text-stone-300 dark:text-stone-600 animate-pulse" />
          </div>
          <p className="text-stone-500 dark:text-stone-400 text-sm font-medium leading-relaxed max-w-[220px]">
            Click <strong className="text-indigo-650 dark:text-indigo-400">"Spark Insights"</strong> in the editor to let Gemini analyze your thoughts, color-track your mood, and offer visual perspectives.
          </p>
        </div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* Detected Mood Clay Widget */}
          {currentMood && (
            <motion.div 
              variants={itemVariants}
              className="clay-card p-5 overflow-hidden relative group/card border-none"
            >
              {/* Backlight matching the detected mood color */}
              <div
                className="absolute top-0 right-0 w-24 h-24 opacity-[0.06] rounded-bl-full pointer-events-none transition-colors duration-300"
                style={{ backgroundColor: currentMood.color }}
              />
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-extrabold text-stone-400 dark:text-stone-500 uppercase tracking-widest block mb-1">
                    Detected Mood
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="text-3xl font-serif font-extrabold capitalize leading-tight" style={{ color: currentMood.color }}>
                      {currentMood.mood}
                    </div>
                    {/* Claymorphic Color Customize pick */}
                    <div className="relative group/picker mt-1">
                      <input
                        type="color"
                        value={currentMood.color}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                        title="Change mood color"
                      />
                      <motion.div
                        whileHover={{ scale: 1.15 }}
                        className="w-4.5 h-4.5 rounded-full border-2 border-white dark:border-stone-800 shadow-md cursor-pointer flex items-center justify-center p-[2px]"
                        style={{ backgroundColor: currentMood.color }}
                      />
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-extrabold text-stone-300 dark:text-stone-600 uppercase tracking-widest block mb-1">
                    Score
                  </span>
                  <span className="text-sm font-mono font-bold text-stone-500 dark:text-stone-400">
                    {currentMood.score}/10
                  </span>
                </div>
              </div>

              {/* Mood Timeline component */}
              <MoodTimeline history={displayHistory} />
            </motion.div>
          )}

          {/* Interactive Themes Tagging Block */}
          <motion.div variants={itemVariants} className="clay-card p-5 border-none">
            <span className="text-[10px] font-extrabold text-stone-400 dark:text-stone-500 uppercase tracking-widest block mb-3.5">
              Detected Themes
            </span>
            <div className="flex flex-wrap gap-2.5 mb-1">
              {(note.tags || []).map(tag => (
                <motion.span 
                  key={tag} 
                  whileHover={{ scale: 1.03 }}
                  className="group flex items-center gap-1.5 px-3 py-1.5 bg-stone-100/50 dark:bg-stone-950/20 border border-stone-200/20 dark:border-stone-800/10 rounded-xl text-xs font-bold text-stone-600 dark:text-stone-300 shadow-sm transition-colors"
                >
                  <span>#{tag}</span>
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="text-stone-400 hover:text-red-500 transition-colors ml-0.5 text-[10px]"
                    aria-label={`Remove tag ${tag}`}
                  >
                    ✕
                  </button>
                </motion.span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="+ Add Aura..."
                className="text-xs bg-stone-200/40 dark:bg-stone-950/40 border border-stone-200/20 dark:border-stone-800/10 rounded-xl px-3 py-1.5 outline-none text-stone-600 dark:text-stone-300 placeholder-stone-400 focus:bg-white dark:focus:bg-stone-950 focus:ring-1 focus:ring-indigo-500/10 focus:border-stone-300 dark:focus:border-stone-700 transition-all w-24 focus:w-32 clay-inset"
              />
            </div>
          </motion.div>

          {/* AI generated Summary Card */}
          {note.aiSummary && (
            <motion.div 
              variants={itemVariants}
              className="clay-card p-5 border-none bg-white dark:bg-stone-800"
            >
              <span className="text-[10px] font-extrabold text-stone-400 dark:text-stone-500 uppercase tracking-widest block mb-2.5">
                AI Summary
              </span>
              <div className="prose prose-sm dark:prose-invert max-w-none text-stone-700 dark:text-stone-350 leading-relaxed font-serif text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.aiSummary}</ReactMarkdown>
              </div>
            </motion.div>
          )}

          {/* Deep Reflection Provoker */}
          {note.aiReflection && (
            <motion.div 
              variants={itemVariants}
              className="p-5 rounded-[1.5rem] bg-indigo-50/50 dark:bg-indigo-950/25 border border-indigo-100/20 dark:border-indigo-900/10 shadow-sm relative overflow-hidden clay-flat"
            >
              <span className="text-[10px] font-extrabold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest block mb-2.5">
                Thought Provoker
              </span>
              <div className="prose prose-sm dark:prose-invert max-w-none text-indigo-950 dark:text-indigo-200 font-serif italic text-sm leading-relaxed font-medium">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.aiReflection}</ReactMarkdown>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default AIInsights;