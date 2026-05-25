import React, { useMemo } from 'react';
import { Note } from '../types';
import { PlusIcon, SearchIcon, TrashIcon, FlameIcon, StarIcon, SunIcon, MoonIcon, CloudIcon, ZapIcon, HeartIcon, ArrowUpIcon, ArrowDownIcon, UploadIcon, BookIcon, UserIcon, MapIcon } from './Icons';
import { motion, AnimatePresence } from 'framer-motion';
import { User, signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import mammoth from 'mammoth';

interface SidebarProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onAddNote: (category?: 'chapter' | 'character' | 'location' | 'lore' | 'idea') => void;
  onImportNote: (title: string, content: string, date: number) => void;
  onDeleteNote: (id: string, e: React.MouseEvent) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  moodFilter: string | null;
  onMoodFilterChange: (mood: string | null) => void;
  showFavorites: boolean;
  onToggleFavoritesFilter: () => void;
  availableMoods: string[];
  sortBy: 'createdAt' | 'updatedAt' | 'title';
  onSortByChange: (value: 'createdAt' | 'updatedAt' | 'title') => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (value: 'asc' | 'desc') => void;

  user: User | null;
  isDarkMode: boolean;
  toggleTheme: () => void;
  currentTheme: string;
  onThemeChange: (theme: string) => void;
  appMode: 'journal' | 'novel';
  onAppModeChange: (mode: 'journal' | 'novel') => void;
  mobileTab?: 'journal' | 'novel' | 'settings' | 'favorites';
  onClose?: () => void;
}

const getMoodIcon = (mood: string, className: string, style: React.CSSProperties) => {
  const m = mood.toLowerCase();

  if (['happy', 'joy', 'excited', 'optimistic', 'positive', 'great', 'good', 'radiant', 'sunny', 'cheerful'].some(k => m.includes(k))) {
    return <SunIcon className={className} style={style} />;
  }
  if (['sad', 'gloomy', 'melancholy', 'depressed', 'negative', 'cry', 'lonely', 'grief', 'down', 'rain'].some(k => m.includes(k))) {
    return <CloudIcon className={className} style={style} />;
  }
  if (['calm', 'peaceful', 'relaxed', 'chill', 'content', 'quiet', 'sleepy', 'tired', 'rest', 'zen'].some(k => m.includes(k))) {
    return <MoonIcon className={className} style={style} />;
  }
  if (['angry', 'frustrated', 'anxious', 'stress', 'nervous', 'mad', 'energy', 'power', 'intense'].some(k => m.includes(k))) {
    return <ZapIcon className={className} style={style} />;
  }
  if (['love', 'grateful', 'thankful', 'blessed', 'heart', 'kind', 'romantic', 'appreciate'].some(k => m.includes(k))) {
    return <HeartIcon className={className} style={style} />;
  }

  return (
    <div
      className={`rounded-full shadow-sm transition-colors duration-300 ${className.replace('w-4 h-4', 'w-2.5 h-2.5')}`}
      style={style}
    />
  );
};

const Sidebar: React.FC<SidebarProps> = ({
  notes,
  selectedNoteId,
  onSelectNote,
  onAddNote,
  onImportNote,
  onDeleteNote,
  onToggleFavorite,
  searchTerm,
  onSearchChange,
  moodFilter,
  onMoodFilterChange,
  showFavorites,
  onToggleFavoritesFilter,
  availableMoods,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,

  user,
  isDarkMode,
  toggleTheme,
  currentTheme,
  onThemeChange,
  appMode,
  onAppModeChange,
  mobileTab,
  onClose
}) => {
  const [activeNovelCategory, setActiveNovelCategory] = React.useState<'chapter' | 'character' | 'location' | 'lore' | 'idea'>('chapter');

  // Calculate Habit Streak
  const streak = useMemo(() => {
    const uniqueDates = new Set(
      notes.map(note => new Date(note.createdAt).toDateString())
    );

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const todayStr = today.toDateString();
    const yesterdayStr = yesterday.toDateString();

    if (!uniqueDates.has(todayStr) && !uniqueDates.has(yesterdayStr)) {
      return 0;
    }

    let currentStreak = 0;
    let checkDate = uniqueDates.has(todayStr) ? today : yesterday;

    while (uniqueDates.has(checkDate.toDateString())) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return currentStreak;
  }, [notes]);

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  };

  const handleSignOut = () => {
    signOut(auth).catch(error => console.error("Error signing out", error));
  };

  const processImportedContent = (content: string, lastModified: number) => {
    if (!content) return;

    const lines = content.split('\n');
    const title = lines[0].replace(/^#+\s*/, '').substring(0, 50) || 'Imported Note';

    const textToScan = content.substring(0, 500);
    let detectedDate = lastModified;

    const datePatterns = [
      /\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/,
      /\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/,
      /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i,
      /\b(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?,?\s+(\d{4})\b/i
    ];

    for (const pattern of datePatterns) {
      const match = textToScan.match(pattern);
      if (match) {
        const dateStr = match[0];
        const parsed = Date.parse(dateStr);
        if (!isNaN(parsed)) {
          detectedDate = parsed;
          break;
        }
      }
    }

    onImportNote(title, content.trim(), detectedDate);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      let content = '';
      if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        content = result.value;
      } else {
        content = await file.text();
      }

      processImportedContent(content, file.lastModified);
    } catch (error) {
      console.error("Failed to read file", error);
      alert("Error reading file. Please try again.");
    }

    event.target.value = '';
  };

  return (
    <div className="w-full h-full bg-stone-50 dark:bg-stone-900/60 border-r border-stone-200 dark:border-stone-800/80 flex flex-col flex-shrink-0 transition-all duration-300 relative">
      {/* Sidebar Header Container */}
      <div className="p-4 md:p-6 pb-2.5 md:pb-4 border-b border-stone-200 dark:border-stone-800 bg-white/40 dark:bg-stone-900/40 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3.5 md:mb-6">
          <div className="flex items-center gap-2 md:gap-2.5">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl md:rounded-2xl overflow-hidden shadow-sm flex items-center justify-center p-0.5 bg-white/20 dark:bg-stone-800/20 border border-white/30">
              <img src="/logo.png" alt="Aetheria Logo" className="w-full h-full object-cover rounded-[0.6rem] md:rounded-[0.8rem]" />
            </div>
            <h1 className="text-lg md:text-2xl font-serif font-extrabold text-stone-800 dark:text-stone-100 tracking-tight leading-none">
              Atheria
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {streak > 0 && (
              <motion.div
                whileHover={{ scale: 1.1, rotate: [0, 5, -5, 0] }}
                className="flex items-center gap-1.5 bg-orange-100/80 dark:bg-orange-950/40 text-orange-650 dark:text-orange-400 px-3 py-1.5 rounded-full text-xs font-extrabold shadow-sm border border-orange-200/50 dark:border-orange-900/30 cursor-help"
                title={`${streak} day streak! Keep it up.`}
              >
                <FlameIcon className="w-3.5 h-3.5 fill-orange-500 text-orange-500 animate-pulse" />
                <span>{streak}</span>
              </motion.div>
            )}
            <motion.label
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 md:p-2.5 bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors shadow-sm cursor-pointer border border-stone-200/50 dark:border-stone-700/50 flex items-center justify-center"
              title="Import Text File"
            >
              <input
                type="file"
                accept=".txt,.md,.docx"
                className="hidden"
                onChange={handleFileUpload}
              />
              <UploadIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </motion.label>
            <motion.button
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onAddNote(appMode === 'novel' ? activeNovelCategory : undefined)}
              className="p-2 md:p-2.5 bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900 rounded-full hover:bg-stone-750 dark:hover:bg-stone-200 transition-all shadow-sm flex items-center justify-center clay-button"
              aria-label="New Note"
            >
              <PlusIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </motion.button>
            {onClose && (
              <motion.button
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="md:hidden p-2 md:p-2.5 bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-all shadow-sm border border-stone-200/50 dark:border-stone-700/50 flex items-center justify-center"
                title="Close Sidebar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 md:w-4 md:h-4">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </motion.button>
            )}
          </div>
        </div>

        {/* Dynamic Mode Switcher (Journal vs Novel) */}
        <div className="hidden md:flex p-1 md:p-1.5 rounded-[1rem] md:rounded-[1.2rem] mb-3.5 md:mb-5 select-none clay-inset">
          <button
            onClick={() => onAppModeChange('journal')}
            className={`flex-1 py-1.5 md:py-2 px-2.5 md:px-3 text-xs font-extrabold rounded-[0.7rem] md:rounded-[0.8rem] transition-all relative ${appMode === 'journal'
              ? 'bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 shadow-md border border-stone-200/20 dark:border-stone-700/20'
              : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
          >
            {appMode === 'journal' && (
              <motion.span layoutId="modeGlow" className="absolute inset-0 rounded-[0.7rem] md:rounded-[0.8rem] bg-indigo-500/5 dark:bg-white/5 pointer-events-none" />
            )}
            Journal
          </button>
          <button
            onClick={() => onAppModeChange('novel')}
            className={`flex-1 py-1.5 md:py-2 px-2.5 md:px-3 text-xs font-extrabold rounded-[0.7rem] md:rounded-[0.8rem] transition-all relative ${appMode === 'novel'
              ? 'bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 shadow-md border border-stone-200/20 dark:border-stone-700/20'
              : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
          >
            {appMode === 'novel' && (
              <motion.span layoutId="modeGlow" className="absolute inset-0 rounded-[0.7rem] md:rounded-[0.8rem] bg-indigo-500/5 dark:bg-white/5 pointer-events-none" />
            )}
            Novel
          </button>
        </div>

        {/* Novel categories panel */}
        {appMode === 'novel' && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2.5 md:mb-3 no-scrollbar -mx-2 px-2">
            {[
              { id: 'chapter', label: 'Chapters', icon: <BookIcon className="w-3.5 h-3.5" /> },
              { id: 'character', label: 'Characters', icon: <UserIcon className="w-3.5 h-3.5" /> },
              { id: 'location', label: 'World', icon: <MapIcon className="w-3.5 h-3.5" /> }
            ].map(cat => (
              <motion.button
                key={cat.id}
                whileHover={{ y: -1 }}
                whileTap={{ y: 0 }}
                onClick={() => setActiveNovelCategory(cat.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 md:px-3.5 md:py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${activeNovelCategory === cat.id
                  ? 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 border-stone-800 dark:border-stone-100 shadow-sm'
                  : 'bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200/60 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-700'
                  }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </motion.button>
            ))}
          </div>
        )}

        {/* Claymorphic Search input */}
        <div className="relative group mb-3 md:mb-4">
          <SearchIcon className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder={appMode === 'novel' ? "Search chapters & lore..." : "Search journals..."}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 md:py-2.5 bg-stone-100/50 dark:bg-stone-950/30 border border-stone-200/20 dark:border-stone-800/35 rounded-2xl text-sm text-stone-700 dark:text-stone-200 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 dark:focus:ring-white/5 focus:border-stone-300 dark:focus:border-stone-700 transition-all clay-inset"
          />
        </div>

        {/* Sorters and Ordering */}
        <div className="hidden md:flex items-center justify-between mb-1.5 md:mb-2 px-1">
          <div className="flex items-center gap-2 text-[11px] font-bold text-stone-400">
            <span className="text-stone-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as any)}
              className="bg-transparent border-none outline-none font-bold text-stone-500 dark:text-stone-400 cursor-pointer hover:text-stone-700 dark:hover:text-stone-200 focus:ring-0 p-0 text-[11px]"
            >
              <option value="updatedAt" className="dark:bg-stone-800">Last Updated</option>
              <option value="createdAt" className="dark:bg-stone-800">Created Date</option>
              <option value="title" className="dark:bg-stone-800">Title</option>
            </select>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-1 md:p-1.5 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 rounded-lg text-stone-500 transition-colors"
            title={sortOrder === 'asc' ? "Ascending" : "Descending"}
          >
            {sortOrder === 'asc' ? <ArrowUpIcon className="w-3.5 h-3.5" /> : <ArrowDownIcon className="w-3.5 h-3.5" />}
          </motion.button>
        </div>

        {/* Journal Filters (Favorites and Moods) */}
        {appMode === 'journal' && (
          <div className="flex items-center gap-2 pt-1.5 md:pt-2 border-t border-stone-200/40 dark:border-stone-800/40">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onToggleFavoritesFilter}
              className={`p-1.5 md:p-2 rounded-xl border transition-all ${showFavorites
                ? 'bg-amber-100 dark:bg-amber-950/40 border-amber-250 dark:border-amber-900/30 text-amber-500 shadow-inner'
                : 'bg-white dark:bg-stone-800 border-stone-200/60 dark:border-stone-700 text-stone-400 hover:text-amber-500'
                }`}
              title={showFavorites ? "Show all notes" : "Show favorites"}
            >
              <StarIcon className="w-4 h-4" filled={showFavorites} />
            </motion.button>
            <div className="h-6 w-px bg-stone-200 dark:bg-stone-800 mx-1"></div>

            <div className="flex-1 overflow-x-auto pb-1 -my-1 no-scrollbar flex gap-2">
              <button
                onClick={() => onMoodFilterChange(null)}
                className={`whitespace-nowrap px-3 py-1 md:px-3.5 md:py-1.5 rounded-full text-xs font-bold border transition-all ${moodFilter === null
                  ? 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 border-stone-800 dark:border-stone-100 shadow-sm'
                  : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200/60 dark:border-stone-700 hover:border-stone-300'
                  }`}
              >
                All
              </button>
              {availableMoods.map(mood => (
                <button
                  key={mood}
                  onClick={() => onMoodFilterChange(mood === moodFilter ? null : mood)}
                  className={`whitespace-nowrap px-3 py-1 md:px-3.5 md:py-1.5 rounded-full text-xs font-bold border transition-all capitalize ${moodFilter === mood
                    ? 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 border-stone-800 dark:border-stone-100 shadow-sm'
                    : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200/60 dark:border-stone-700 hover:border-stone-300'
                    }`}
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Journal Notes List Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {notes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-stone-400 dark:text-stone-500 text-sm font-bold">
              {appMode === 'novel' ? 'No chapters found.' : 'No journals found.'}
            </p>
            <p className="text-stone-300 dark:text-stone-600 text-xs mt-2 leading-relaxed">
              {showFavorites
                ? 'No favorite items yet.'
                : moodFilter
                  ? `No ${moodFilter} moments yet.`
                  : appMode === 'novel' ? 'Start writing your novel.' : 'Start writing your story.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {notes
                .filter(note => {
                  if (appMode !== 'novel') return true;
                  if (!note.novelCategory) return activeNovelCategory === 'chapter';
                  return note.novelCategory === activeNovelCategory;
                })
                .map((note) => {
                  const latestMood = note.moodHistory && note.moodHistory.length > 0
                    ? note.moodHistory[note.moodHistory.length - 1]
                    : null;
                  const moodColor = latestMood?.color || note.mood && '#fb7185';
                  const moodText = latestMood?.mood || note.mood;

                  const isSelected = selectedNoteId === note.id;

                  return (
                    <motion.div
                      key={note.id}
                      layout
                      initial={{ opacity: 0, y: 15, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9, y: -10 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      transition={{ type: "spring", stiffness: 350, damping: 24 }}
                      onClick={() => onSelectNote(note.id)}
                      className={`group relative p-5 rounded-[1.5rem] cursor-pointer transition-all duration-300 clay-card ${isSelected
                        ? 'clay-card-active border-indigo-200/40 dark:border-stone-700/50'
                        : ''
                        }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5 pr-14">
                        {moodText && moodColor && (
                          <div title={`Mood: ${moodText}`}>
                            {getMoodIcon(moodText, "w-4 h-4 flex-shrink-0 opacity-80", { color: moodColor, fill: moodColor, fillOpacity: 0.15 })}
                          </div>
                        )}
                        {!moodText && moodColor && (
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                            style={{ backgroundColor: moodColor }}
                          />
                        )}

                        <h3 className={`font-serif font-bold text-base truncate ${isSelected ? 'text-stone-800 dark:text-stone-50' : 'text-stone-700 dark:text-stone-300'
                          }`}>
                          {note.title || 'Untitled Entry'}
                        </h3>
                      </div>

                      <p className="text-[10px] text-stone-400 dark:text-stone-500 mb-2.5 font-mono font-medium">
                        {formatDate(note.updatedAt)}
                      </p>
                      
                      <p className="text-sm text-stone-500 dark:text-stone-400 line-clamp-2 h-10 font-serif leading-relaxed opacity-90 pr-12 text-ellipsis overflow-hidden">
                        {note.content || 'Empty note...'}
                      </p>

                      {/* Tags Render */}
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex gap-1.5 mt-3.5 flex-wrap pr-12">
                          {note.tags.slice(0, 2).map((tag, i) => (
                            <span key={i} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-stone-100/80 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-200/20 dark:border-stone-700/20">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Floating detected mood badge */}
                      {note.mood && (
                        <div
                          className="absolute top-4 right-4 text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full opacity-90 border transition-all duration-300"
                          style={moodColor ? {
                            backgroundColor: `${moodColor}15`,
                            color: moodColor,
                            borderColor: `${moodColor}30`
                          } : {
                            backgroundColor: '#fff1f2',
                            color: '#e11d48',
                            borderColor: '#fecdd3'
                          }}
                        >
                          {note.mood}
                        </div>
                      )}

                      {/* Action buttons with elegant entry triggers */}
                      <div className="absolute bottom-4 right-4 flex items-center gap-1">
                        <motion.button
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => onToggleFavorite(note.id, e)}
                          className={`p-1.5 rounded-lg transition-all ${note.isFavorite
                            ? 'text-amber-500 opacity-100'
                            : `text-stone-300 dark:text-stone-600 hover:text-amber-400 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`
                            }`}
                          title={note.isFavorite ? "Remove from favorites" : "Add to favorites"}
                        >
                          <StarIcon className="w-3.5 h-3.5" filled={note.isFavorite} />
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => onDeleteNote(note.id, e)}
                          className={`p-1.5 text-stone-300 dark:text-stone-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}
                          title="Delete journal"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* User Profile and Preferences Footer */}
      {user && (
        <div className="hidden md:block p-4 border-t border-stone-200/80 dark:border-stone-800/80 bg-stone-100/50 dark:bg-stone-900/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || "User"} className="w-8 h-8 rounded-full border border-stone-200/60 shadow-sm" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-stone-300 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300 font-extrabold shadow-inner text-sm border border-stone-200/10">
                {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-extrabold text-stone-700 dark:text-stone-200 truncate">{user.displayName || 'User'}</p>
              <p className="text-[10px] text-stone-400 dark:text-stone-500 truncate font-mono">{user.email}</p>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 rounded-lg transition-colors border border-stone-200/10 flex items-center justify-center"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSignOut}
              className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors border border-stone-200/10 flex items-center justify-center"
              title="Sign Out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </motion.button>
          </div>

          {/* Color theme selectors */}
          <div className="mt-4 flex items-center justify-between px-1">
            <span className="text-[9px] font-extrabold text-stone-400 uppercase tracking-widest">Aura Theme</span>
            <div className="flex gap-2">
              {[
                { id: 'stone', color: '#a8a29e', label: 'Stone' },
                { id: 'rose', color: '#fb7185', label: 'Rose' },
                { id: 'lavender', color: '#a78bfa', label: 'Lavender' },
                { id: 'midnight', color: '#64748b', label: 'Midnight' },
                { id: 'forest', color: '#4ade80', label: 'Forest' }
              ].map((t) => (
                <motion.button
                  key={t.id}
                  whileHover={{ scale: 1.25 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onThemeChange(t.id)}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-300 relative border border-white/20 ${currentTheme === t.id ? 'scale-125 ring-2 ring-stone-400 dark:ring-stone-500' : 'opacity-80 hover:opacity-100 shadow-sm'}`}
                  style={{ backgroundColor: t.id === 'forest' ? '#4ade80' : t.color }}
                  title={t.label}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;