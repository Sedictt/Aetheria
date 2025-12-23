import React, { useState } from 'react';
import { Note, MoodEntry } from '../types';
import { BrainIcon, SparklesIcon } from './Icons';

interface AIInsightsProps {
  note: Note;
  isOpen: boolean;
  onClose: () => void;
  onUpdateNote: (updates: Partial<Note>) => void;
}

const MoodTimeline: React.FC<{ history: MoodEntry[] }> = ({ history }) => {
  if (history.length < 2) return null;

  // Chart configuration
  const width = 240;
  const height = 60;
  const padding = 10;

  // Calculate X and Y positions
  // Y axis: 10 is top (0), 0 is bottom (height)
  const getX = (index: number) => padding + (index / (history.length - 1)) * (width - 2 * padding);
  const getY = (score: number) => height - padding - (score / 10) * (height - 2 * padding);

  // Create path data
  const points = history.map((entry, i) => `${getX(i)},${getY(entry.score)}`).join(' ');

  return (
    <div className="mt-4 pt-4 border-t border-stone-100">
      <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-3">Emotional Flow</span>

      {/* Visual Gradient Strip */}
      <div className="h-2 w-full rounded-full mb-4 flex overflow-hidden shadow-inner">
        {history.map((entry, i) => (
          <div
            key={i}
            className="flex-1 h-full transition-all"
            style={{ backgroundColor: entry.color }}
            title={`${entry.mood} (${entry.score}/10)`}
          />
        ))}
      </div>

      {/* SVG Line Chart */}
      <div className="relative h-16 w-full">
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
          {/* Guide lines */}
          <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#f5f5f4" strokeWidth="1" strokeDasharray="4 4" />

          {/* Trend Line */}
          <polyline
            points={points}
            fill="none"
            stroke="#d6d3d1"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {history.map((entry, i) => (
            <g key={i} className="group">
              <circle
                cx={getX(i)}
                cy={getY(entry.score)}
                r="4"
                fill={entry.color}
                stroke="white"
                strokeWidth="2"
                className="transition-all duration-300 cursor-pointer hover:r-5 shadow-sm"
              />
              {/* Tooltip on hover */}
              <foreignObject x={getX(i) - 40} y={getY(entry.score) - 30} width="80" height="25" className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="text-[10px] bg-stone-800 text-white text-center py-0.5 rounded shadow-sm">
                  {entry.mood}
                </div>
              </foreignObject>
            </g>
          ))}
        </svg>
        <div className="flex justify-between text-[10px] text-stone-300 font-mono mt-1">
          <span>Start</span>
          <span>Now</span>
        </div>
      </div>
    </div>
  );
};

const AIInsights: React.FC<AIInsightsProps> = ({ note, isOpen, onClose, onUpdateNote }) => {
  const [tagInput, setTagInput] = useState('');

  if (!isOpen) return null;

  const hasAnalysis = note.mood || note.aiSummary || note.aiReflection;

  // Backwards compatibility: if no history but has mood, create synthetic history item
  const displayHistory = note.moodHistory && note.moodHistory.length > 0
    ? note.moodHistory
    : (note.mood ? [{ mood: note.mood, score: 5, color: '#fb7185', timestamp: note.updatedAt }] as MoodEntry[] : []);

  const currentMood = displayHistory[displayHistory.length - 1];

  const handleColorChange = (newColor: string) => {
    if (!note.moodHistory || note.moodHistory.length === 0) {
      // Handle legacy case
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

    // Update the most recent mood entry
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
      const newTag = tagInput.trim().replace(/^#/, ''); // Remove # if user typed it
      if (!note.tags.includes(newTag)) {
        onUpdateNote({ tags: [...(note.tags || []), newTag] });
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateNote({ tags: (note.tags || []).filter(t => t !== tagToRemove) });
  };

  return (
    <div className="w-80 bg-stone-50 dark:bg-stone-900 border-l border-stone-200 dark:border-stone-800 h-full overflow-y-auto p-6 shadow-xl absolute right-0 top-0 z-20 md:static md:shadow-none transition-all animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
          <BrainIcon className="w-5 h-5 text-indigo-500" />
          Insights
        </h2>
        <button
          onClick={onClose}
          className="md:hidden text-stone-400 hover:text-stone-600"
        >
          ✕
        </button>
      </div>

      {!hasAnalysis ? (
        <div className="text-center py-10 space-y-4">
          <div className="w-16 h-16 bg-white dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <SparklesIcon className="w-8 h-8 text-stone-300 dark:text-stone-600" />
          </div>
          <p className="text-stone-500 dark:text-stone-400 text-sm leading-relaxed">
            Click "Reflect & Organize" in the editor to let Gemini analyze your thoughts, detect your mood, and offer perspective.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Mood Card */}
          {currentMood && (
            <div className="bg-white dark:bg-stone-800 p-5 rounded-xl shadow-sm border border-stone-100 dark:border-stone-700 overflow-hidden relative group/card transition-colors duration-300">
              <div
                className="absolute top-0 right-0 w-16 h-16 opacity-10 rounded-bl-full pointer-events-none transition-colors duration-300"
                style={{ backgroundColor: currentMood.color }}
              />
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">Detected Mood</span>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-serif capitalize" style={{ color: currentMood.color }}>
                      {currentMood.mood}
                    </div>
                    {/* Color Picker Interaction */}
                    <div className="relative group/picker mt-1">
                      <input
                        type="color"
                        value={currentMood.color}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                        title="Change mood color"
                      />
                      <div
                        className="w-4 h-4 rounded-full border border-stone-100 dark:border-stone-600 shadow-sm transition-transform group-hover/picker:scale-110 cursor-pointer"
                        style={{ backgroundColor: currentMood.color }}
                      />
                      <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 text-[9px] text-stone-400 opacity-0 group-hover/picker:opacity-100 whitespace-nowrap pointer-events-none transition-opacity bg-stone-50 dark:bg-stone-700 px-1 py-0.5 rounded border border-stone-200 dark:border-stone-600">
                        Customize
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-stone-300 uppercase tracking-wider block mb-1">Score</span>
                  <span className="text-sm font-mono text-stone-500">{currentMood.score}/10</span>
                </div>
              </div>

              {/* Mood Timeline Visualization */}
              <MoodTimeline history={displayHistory} />
            </div>
          )}

          {/* Tags */}
          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-2">Themes</span>
            <div className="flex flex-wrap gap-2 mb-2">
              {(note.tags || []).map(tag => (
                <span key={tag} className="group flex items-center gap-1 px-3 py-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-full text-xs text-stone-600 dark:text-stone-300 shadow-sm hover:border-stone-300 dark:hover:border-stone-600 transition-colors">
                  #{tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 text-stone-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                    aria-label={`Remove tag ${tag}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="+ Add tag..."
                className="text-xs bg-transparent border border-transparent hover:border-stone-200 dark:hover:border-stone-700 focus:border-stone-300 dark:focus:border-stone-600 focus:bg-white dark:focus:bg-stone-800 rounded-full px-3 py-1 outline-none text-stone-600 dark:text-stone-300 placeholder-stone-400 transition-all w-24 focus:w-32"
              />
            </div>
          </div>

          {/* Summary */}
          {note.aiSummary && (
            <div className="bg-white dark:bg-stone-800 p-5 rounded-xl shadow-sm border border-stone-100 dark:border-stone-700">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-2">Summary</span>
              <p className="text-stone-700 dark:text-stone-300 text-sm leading-relaxed">{note.aiSummary}</p>
            </div>
          )}

          {/* Reflection */}
          {note.aiReflection && (
            <div className="bg-indigo-50/50 dark:bg-indigo-900/20 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
              <span className="text-xs font-bold text-indigo-400 dark:text-indigo-300 uppercase tracking-wider block mb-2">Thought Provoker</span>
              <p className="text-indigo-900 dark:text-indigo-200 font-serif italic text-sm leading-relaxed">
                "{note.aiReflection}"
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIInsights;