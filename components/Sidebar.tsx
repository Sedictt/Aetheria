import React, { useMemo } from 'react';
import { Note } from '../types';
import { PlusIcon, SearchIcon, TrashIcon, FlameIcon, StarIcon, SunIcon, MoonIcon, CloudIcon, ZapIcon, HeartIcon, ArrowUpIcon, ArrowDownIcon } from './Icons';

interface SidebarProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onAddNote: () => void;
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
  onSortOrderChange
}) => {
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

  return (
    <div className="w-full md:w-80 bg-stone-50 border-r border-stone-200 h-full flex flex-col flex-shrink-0 transition-all duration-300">
      <div className="p-6 border-b border-stone-200 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-serif font-bold text-stone-800 tracking-tight">Atheria</h1>
          
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
            <button
              onClick={onAddNote}
              className="p-2 bg-stone-800 text-white rounded-full hover:bg-stone-700 transition-colors shadow-sm"
              aria-label="New Note"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="relative group mb-3">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-stone-600 transition-colors" />
          <input
            type="text"
            placeholder="Search journals..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200 focus:border-stone-300 transition-all"
          />
        </div>

        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2 text-[11px] text-stone-500">
            <span className="font-medium text-stone-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as any)}
              className="bg-transparent border-none outline-none font-medium text-stone-600 cursor-pointer hover:text-stone-900 focus:ring-0 p-0 text-[11px]"
            >
              <option value="updatedAt">Last Updated</option>
              <option value="createdAt">Created Date</option>
              <option value="title">Title</option>
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

        <div className="flex items-center gap-2">
            <button
                onClick={onToggleFavoritesFilter}
                className={`p-1.5 rounded-full border transition-all ${
                    showFavorites
                    ? 'bg-amber-100 border-amber-200 text-amber-500'
                    : 'bg-white border-stone-200 text-stone-400 hover:text-amber-500 hover:border-amber-200'
                }`}
                title={showFavorites ? "Show all notes" : "Show favorites only"}
            >
                <StarIcon className="w-4 h-4" filled={showFavorites} />
            </button>
            <div className="h-6 w-px bg-stone-200 mx-1"></div>
            
            <div className="flex-1 overflow-x-auto pb-1 -my-1 custom-scrollbar flex gap-2">
                <button
                    onClick={() => onMoodFilterChange(null)}
                    className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                        moodFilter === null
                        ? 'bg-stone-800 text-white border-stone-800'
                        : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                    }`}
                >
                    All
                </button>
                {availableMoods.map(mood => (
                    <button
                        key={mood}
                        onClick={() => onMoodFilterChange(mood === moodFilter ? null : mood)}
                        className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium border transition-all capitalize ${
                            moodFilter === mood
                            ? 'bg-stone-800 text-white border-stone-800'
                            : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                        }`}
                    >
                        {mood}
                    </button>
                ))}
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {notes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-stone-400 text-sm font-medium">No journals found.</p>
            <p className="text-stone-300 text-xs mt-1">
                {showFavorites 
                    ? 'No favorite moments yet.'
                    : moodFilter 
                        ? `No ${moodFilter} moments yet.` 
                        : 'Start writing your story.'}
            </p>
          </div>
        ) : (
          notes.map((note) => {
            const latestMood = note.moodHistory && note.moodHistory.length > 0
              ? note.moodHistory[note.moodHistory.length - 1]
              : null;
            const moodColor = latestMood?.color;
            const moodText = latestMood?.mood || note.mood;

            return (
              <div
                key={note.id}
                onClick={() => onSelectNote(note.id)}
                className={`group relative p-4 rounded-xl cursor-pointer border transition-all duration-200 ${
                  selectedNoteId === note.id
                    ? 'bg-white border-stone-300 shadow-md ring-1 ring-stone-100'
                    : 'bg-transparent border-transparent hover:bg-white hover:border-stone-200'
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
                  
                  <h3 className={`font-medium truncate ${
                    selectedNoteId === note.id ? 'text-stone-800' : 'text-stone-600'
                  }`}>
                    {note.title || 'Untitled Entry'}
                  </h3>
                </div>

                <p className="text-xs text-stone-400 mb-2 font-mono">
                  {formatDate(note.updatedAt)}
                </p>
                <p className="text-sm text-stone-500 line-clamp-2 h-10 font-serif leading-relaxed opacity-80">
                  {note.content || 'Empty note...'}
                </p>

                {/* Tags Preview */}
                {note.tags && note.tags.length > 0 && (
                  <div className="flex gap-1 mt-3 flex-wrap">
                    {note.tags.slice(0, 2).map((tag, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Mood indicator text badge */}
                {note.mood && (
                  <div 
                    className="absolute top-4 right-4 text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded-full opacity-90 border transition-all duration-300"
                    style={ moodColor ? { 
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
                        className={`p-1.5 rounded-lg transition-all ${
                            note.isFavorite 
                            ? 'text-amber-500 opacity-100' 
                            : `text-stone-300 hover:text-amber-400 ${selectedNoteId === note.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`
                        }`}
                        title={note.isFavorite ? "Remove from favorites" : "Add to favorites"}
                    >
                        <StarIcon className="w-4 h-4" filled={note.isFavorite} />
                    </button>
                    
                    <button
                        onClick={(e) => onDeleteNote(note.id, e)}
                        className={`p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all ${
                            selectedNoteId === note.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
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
    </div>
  );
};

export default Sidebar;