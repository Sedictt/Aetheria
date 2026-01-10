import React, { useMemo } from 'react';
import { Note } from '../types';
import { PlusIcon, SearchIcon, TrashIcon, FlameIcon, StarIcon, SunIcon, MoonIcon, CloudIcon, ZapIcon, HeartIcon, ArrowUpIcon, ArrowDownIcon, UploadIcon, BookIcon, UserIcon, MapIcon } from './Icons';

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
}

const getMoodIcon = (mood: string, className: string, style: React.CSSProperties) => {
  const m = mood.toLowerCase();

  // Happy / Positive
  if (['happy', 'joy', 'excited', 'optimistic', 'positive', 'great', 'good', 'radiant', 'sunny', 'cheerful'].some(k => m.includes(k))) {
    return <SunIcon className={className} style={style} />;
  }

  // Sad / Gloomy
  if (['sad', 'gloomy', 'melancholy', 'depressed', 'negative', 'cry', 'lonely', 'grief', 'down', 'rain'].some(k => m.includes(k))) {
    return <CloudIcon className={className} style={style} />;
  }

  // Calm / Peaceful
  if (['calm', 'peaceful', 'relaxed', 'chill', 'content', 'quiet', 'sleepy', 'tired', 'rest', 'zen'].some(k => m.includes(k))) {
    return <MoonIcon className={className} style={style} />;
  }

  // Energetic / Intense / Negative High Energy
  if (['angry', 'frustrated', 'anxious', 'stress', 'nervous', 'mad', 'energy', 'power', 'intense'].some(k => m.includes(k))) {
    return <ZapIcon className={className} style={style} />;
  }

  // Love / Gratitude
  if (['love', 'grateful', 'thankful', 'blessed', 'heart', 'kind', 'romantic', 'appreciate'].some(k => m.includes(k))) {
    return <HeartIcon className={className} style={style} />;
  }

  // Fallback (use a simple circle if no match, essentially the old dot but as an SVG for consistency in alignment)
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
  onAppModeChange
}) => {
  const [activeNovelCategory, setActiveNovelCategory] = React.useState<'chapter' | 'character' | 'location' | 'lore' | 'idea'>('chapter');

  // Calculate Streak
  const streak = useMemo(() => {
    // Get unique dates from notes (using createdAt to track daily journaling habit)
    const uniqueDates = new Set(
      notes.map(note => new Date(note.createdAt).toDateString())
    );

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const todayStr = today.toDateString();
    const yesterdayStr = yesterday.toDateString();

    // If no entry for today or yesterday, streak is broken
    if (!uniqueDates.has(todayStr) && !uniqueDates.has(yesterdayStr)) {
      return 0;
    }

    let currentStreak = 0;
    // Start counting from today if exists, else from yesterday
    let checkDate = uniqueDates.has(todayStr) ? today : yesterday;

    while (uniqueDates.has(checkDate.toDateString())) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return currentStreak;
  }, [notes]);

  // Format date helper
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

    // Extract title (first line)
    const lines = content.split('\n');
    const title = lines[0].replace(/^#+\s*/, '').substring(0, 50) || 'Imported Note';

    // Try to detect date in the first 500 chars
    const textToScan = content.substring(0, 500);
    let detectedDate = lastModified;

    // Common Date Regex Patterns
    const datePatterns = [
      /\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/, // YYYY-MM-DD or YYYY/MM/DD
      /\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/, // MM/DD/YYYY or DD/MM/YYYY (Assuming MM/DD/YYYY for ambiguity usually)
      /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i, // Month DD, YYYY
      /\b(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?,?\s+(\d{4})\b/i // DD Month YYYY
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

    // Reset inputs
    event.target.value = '';
  };

  return (
    <div className="w-full md:w-80 bg-stone-50 dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 h-full flex flex-col flex-shrink-0 transition-all duration-300">
      <div className="p-6 border-b border-stone-200 dark:border-stone-800 bg-white/50 dark:bg-stone-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Aetheria Logo" className="w-8 h-8 rounded-md object-cover" />
            <h1 className="text-xl font-serif font-bold text-stone-800 dark:text-stone-100 tracking-tight">Atheria</h1>
          </div>

          <div className="flex items-center gap-2">
            {streak > 0 && (
              <div
                className="flex items-center gap-1.5 bg-orange-50 text-orange-600 px-2.5 py-1.5 rounded-full text-xs font-bold border border-orange-100 shadow-sm cursor-help transition-all hover:bg-orange-100"
                title={`${streak} day streak! Keep it up.`}
              >
                <FlameIcon className="w-3.5 h-3.5 fill-orange-500" />
                <span>{streak}</span>
              </div>
            )}
            <label
              className="p-2 bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded-full hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors shadow-sm cursor-pointer border border-stone-200 dark:border-stone-700"
              title="Import Text File"
            >
              <input
                type="file"
                accept=".txt,.md,.docx"
                className="hidden"
                onChange={handleFileUpload}
              />
              <UploadIcon className="w-5 h-5" />
            </label>
            <button
              onClick={() => onAddNote(appMode === 'novel' ? activeNovelCategory : undefined)}
              className="p-2 bg-stone-800 text-white rounded-full hover:bg-stone-700 transition-colors shadow-sm"
              aria-label="New Note"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
        </div>



        <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl mb-4 select-none">
          <button
            onClick={() => onAppModeChange('journal')}
            className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${appMode === 'journal'
              ? 'bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 shadow-sm border border-stone-200 dark:border-stone-600'
              : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
          >
            Journal
          </button>
          <button
            onClick={() => onAppModeChange('novel')}
            className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${appMode === 'novel'
              ? 'bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 shadow-sm border border-stone-200 dark:border-stone-600'
              : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
          >
            Novel
          </button>
        </div>

        {appMode === 'novel' && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2 custom-scrollbar -mx-2 px-2">
            <button
              onClick={() => setActiveNovelCategory('chapter')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${activeNovelCategory === 'chapter'
                ? 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 border-stone-800 dark:border-stone-100'
                : 'bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:border-stone-300'
                }`}
            >
              <BookIcon className="w-3.5 h-3.5" />
              <span>Chapters</span>
            </button>
            <button
              onClick={() => setActiveNovelCategory('character')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${activeNovelCategory === 'character'
                ? 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 border-stone-800 dark:border-stone-100'
                : 'bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:border-stone-300'
                }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Characters</span>
            </button>
            <button
              onClick={() => setActiveNovelCategory('location')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${activeNovelCategory === 'location'
                ? 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 border-stone-800 dark:border-stone-100'
                : 'bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:border-stone-300'
                }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>World</span>
            </button>
          </div>
        )}

        <div className="relative group mb-3">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-stone-600 transition-colors" />
          <input
            type="text"
            placeholder="Search journals..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-700 dark:text-stone-200 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200 dark:focus:ring-stone-600 focus:border-stone-300 dark:focus:border-stone-500 transition-all"
          />
        </div>

        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2 text-[11px] text-stone-500">
            <span className="font-medium text-stone-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as any)}
              className="bg-transparent border-none outline-none font-medium text-stone-600 dark:text-stone-400 cursor-pointer hover:text-stone-900 dark:hover:text-stone-200 focus:ring-0 p-0 text-[11px]"
            >
              <option value="updatedAt" className="dark:bg-stone-800">Last Updated</option>
              <option value="createdAt" className="dark:bg-stone-800">Created Date</option>
              <option value="title" className="dark:bg-stone-800">Title</option>
            </select>
          </div>
          <button
            onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-1 hover:bg-stone-200 rounded text-stone-500 transition-colors"
            title={sortOrder === 'asc' ? "Ascending (Oldest First)" : "Descending (Newest First)"}
          >
            {sortOrder === 'asc' ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />}
          </button>
        </div>

        {appMode === 'journal' && (
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleFavoritesFilter}
              className={`p-1.5 rounded-full border transition-all ${showFavorites
                ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800/50 text-amber-500'
                : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-400 hover:text-amber-500 hover:border-amber-200 dark:hover:border-amber-800'
                }`}
              title={showFavorites ? "Show all notes" : "Show favorites only"}
            >
              <StarIcon className="w-4 h-4" filled={showFavorites} />
            </button>
            <div className="h-6 w-px bg-stone-200 mx-1"></div>

            <div className="flex-1 overflow-x-auto pb-1 -my-1 custom-scrollbar flex gap-2">
              <button
                onClick={() => onMoodFilterChange(null)}
                className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium border transition-all ${moodFilter === null
                  ? 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 border-stone-800 dark:border-stone-100'
                  : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-stone-300'
                  }`}
              >
                All
              </button>
              {availableMoods.map(mood => (
                <button
                  key={mood}
                  onClick={() => onMoodFilterChange(mood === moodFilter ? null : mood)}
                  className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium border transition-all capitalize ${moodFilter === mood
                    ? 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 border-stone-800 dark:border-stone-100'
                    : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-stone-300'
                    }`}
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {notes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-stone-400 text-sm font-medium">
              {appMode === 'novel' ? 'No chapters found.' : 'No journals found.'}
            </p>
            <p className="text-stone-300 text-xs mt-1">
              {showFavorites
                ? 'No favorite items yet.'
                : moodFilter
                  ? `No ${moodFilter} moments yet.`
                  : appMode === 'novel' ? 'Start writing your novel.' : 'Start writing your story.'}
            </p>
          </div>
        ) : (
          notes
            .filter(note => {
              if (appMode !== 'novel') return true;
              // Filter by active category in Novel mode
              // If category is chapter, include chapters AND items with no category (backwards compat)
              if (!note.novelCategory) return activeNovelCategory === 'chapter';
              return note.novelCategory === activeNovelCategory;
            })
            .map((note) => {
              const latestMood = note.moodHistory && note.moodHistory.length > 0
                ? note.moodHistory[note.moodHistory.length - 1]
                : null;
              const moodColor = latestMood?.color;
              const moodText = latestMood?.mood || note.mood;

              return (
                <div
                  key={note.id}
                  onClick={() => onSelectNote(note.id)}
                  className={`group relative p-4 rounded-xl cursor-pointer border transition-all duration-200 ${selectedNoteId === note.id
                    ? 'bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-600 shadow-md ring-1 ring-stone-100 dark:ring-stone-700'
                    : 'bg-transparent border-transparent hover:bg-white dark:hover:bg-stone-800 hover:border-stone-200 dark:hover:border-stone-700'
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1 pr-16">
                    {moodText && moodColor && (
                      <div title={`Mood: ${moodText}`}>
                        {getMoodIcon(moodText, "w-4 h-4 flex-shrink-0 opacity-80", { color: moodColor, fill: moodColor, fillOpacity: 0.1 })}
                      </div>
                    )}
                    {!moodText && moodColor && (
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: moodColor }}
                      />
                    )}

                    <h3 className={`font-medium truncate ${selectedNoteId === note.id ? 'text-stone-800 dark:text-stone-100' : 'text-stone-600 dark:text-stone-400'
                      }`}>
                      {note.title || 'Untitled Entry'}
                    </h3>
                  </div>

                  <p className="text-xs text-stone-400 mb-2 font-mono">
                    {formatDate(note.updatedAt)}
                  </p>
                  <p className="text-sm text-stone-500 dark:text-stone-400 line-clamp-2 h-10 font-serif leading-relaxed opacity-80">
                    {note.content || 'Empty note...'}
                  </p>

                  {/* Tags Preview */}
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex gap-1 mt-3 flex-wrap">
                      {note.tags.slice(0, 2).map((tag, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-300">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Mood indicator text badge */}
                  {note.mood && (
                    <div
                      className="absolute top-4 right-4 text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded-full opacity-90 border transition-all duration-300"
                      style={moodColor ? {
                        backgroundColor: `${moodColor}15`, // ~10% opacity
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

                  {/* Action Buttons */}
                  <div className="absolute bottom-4 right-4 flex items-center gap-1">
                    <button
                      onClick={(e) => onToggleFavorite(note.id, e)}
                      className={`p-1.5 rounded-lg transition-all ${note.isFavorite
                        ? 'text-amber-500 opacity-100'
                        : `text-stone-300 hover:text-amber-400 ${selectedNoteId === note.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`
                        }`}
                      title={note.isFavorite ? "Remove from favorites" : "Add to favorites"}
                    >
                      <StarIcon className="w-4 h-4" filled={note.isFavorite} />
                    </button>

                    <button
                      onClick={(e) => onDeleteNote(note.id, e)}
                      className={`p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all ${selectedNoteId === note.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      title="Delete journal"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
        )}
      </div>

      {/* User Profile Footer */}
      {
        user && (
          <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || "User"} className="w-8 h-8 rounded-full border border-stone-200" />
              ) : (

                <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-stone-500 dark:text-stone-300 font-bold">
                  {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-700 dark:text-stone-200 truncate">{user.displayName || 'User'}</p>
                <p className="text-xs text-stone-400 truncate">{user.email}</p>
              </div>

              <button
                onClick={toggleTheme}
                className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg transition-colors"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
              </button>

              <button
                onClick={handleSignOut}
                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg transition-colors"
                title="Sign Out"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>

            {/* Theme Selector */}
            <div className="mt-4 flex items-center justify-between px-1">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Theme</span>
              <div className="flex gap-2">
                {[
                  { id: 'stone', color: '#a8a29e', label: 'Stone' },
                  { id: 'rose', color: '#fb7185', label: 'Rose' },
                  { id: 'lavender', color: '#a78bfa', label: 'Lavender' },
                  { id: 'midnight', color: '#64748b', label: 'Midnight' },
                  { id: 'forest', color: '#4ade80', label: 'Forest' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onThemeChange(t.id)}
                    className={`w-4 h-4 rounded-full transition-all duration-300 ${currentTheme === t.id ? 'scale-125 ring-2 ring-stone-400 dark:ring-stone-500' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
                    style={{ backgroundColor: t.id === 'forest' ? '#4ade80' : t.color }} // Manual override for forest to be vibrant
                    title={t.label}
                  />
                ))}
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default Sidebar;