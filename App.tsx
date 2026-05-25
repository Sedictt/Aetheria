import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, onSnapshot, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db } from './services/firebase';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import Login from './components/Login';
import MobileSettings from './components/MobileSettings';
import { motion, AnimatePresence } from 'framer-motion';
import { Note, MoodEntry } from './types';

const STORAGE_KEY = 'atheria-journal-notes';
const LEGACY_STORAGE_KEY = 'serenity-journal-notes';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [moodFilter, setMoodFilter] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [appMode, setAppMode] = useState<'journal' | 'novel'>('journal');
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isReadingMode, setIsReadingMode] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [mobileTab, setMobileTab] = useState<'journal' | 'favorites' | 'novel' | 'settings'>('journal');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Keep mobileTab and showFavorites / appMode in sync
  useEffect(() => {
    if (mobileTab === 'favorites') {
      setShowFavorites(true);
    } else {
      setShowFavorites(false);
      if (appMode === 'journal' && mobileTab !== 'journal' && mobileTab !== 'settings') {
        setMobileTab('journal');
      } else if (appMode === 'novel' && mobileTab !== 'novel' && mobileTab !== 'settings') {
        setMobileTab('novel');
      }
    }
  }, [appMode, mobileTab]);

  const handleMobileTabChange = (tab: 'journal' | 'favorites' | 'novel' | 'settings') => {
    setMobileTab(tab);
    setSelectedNoteId(null); // Return to list view / settings root of selected tab
    if (tab === 'journal' || tab === 'novel') {
      setAppMode(tab);
    }
  };

  // Calculate Streak for Mobile Settings View
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

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check local storage or system preference
    const savedTheme = localStorage.getItem('atheria-theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Apply theme class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('atheria-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('atheria-theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Color Theme State
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('atheria-color-theme') || 'stone';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('atheria-color-theme', theme);
  }, [theme]);

  // Sorting State
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'title'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Reset selection when switching modes
  useEffect(() => {
    setSelectedNoteId(null);
    setSearchTerm('');
    setMoodFilter(null);
    setShowFavorites(false);
  }, [appMode]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync / Load Notes from Firestore
  useEffect(() => {
    if (!user) {
      setNotes([]);
      return;
    }

    const q = query(collection(db, 'notes'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotes = snapshot.docs.map(doc => doc.data() as Note);

      setNotes(prevNotes => {
        const localNotesMap = new Map(prevNotes.map(n => [n.id, n]));

        const mergedNotes = fetchedNotes.map(serverNote => {
          const localNote = localNotesMap.get(serverNote.id);
          // If local version is newer (unsaved changes), keep local
          if (localNote && localNote.updatedAt > serverNote.updatedAt) {
            return localNote;
          }
          return serverNote;
        });

        return mergedNotes;
      });
    });

    return () => unsubscribe();
  }, [user]);

  // Save changes to Firestore
  const saveNoteToFirestore = async (note: Note) => {
    if (!user) return;
    try {
      // Remove undefined fields which Firestore doesn't support
      const noteToSave = Object.entries(note).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);

      await setDoc(doc(db, 'notes', note.id), {
        ...noteToSave,
        userId: user.uid // Ensure note is linked to user
      }, { merge: true });
    } catch (error) {
      console.error("Error saving note: ", error);
      throw error;
    }
  };

  const debouncedSave = useCallback((note: Note) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSavingStatus('saving');

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveNoteToFirestore(note);
        setSavingStatus('saved');
        // Reset to idle after a moment
        setTimeout(() => setSavingStatus('idle'), 2000);
      } catch (error) {
        setSavingStatus('error');
      }
    }, 500);
  }, [user]); // Re-create if user changes, though user uid is stable usually

  // Warn user if they try to close the tab while saving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (savingStatus === 'saving' || saveTimeoutRef.current) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [savingStatus]);

  // Load notes from local storage on mount
  useEffect(() => {
    // Try to load from the new key first
    const savedNotes = localStorage.getItem(STORAGE_KEY);
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
        return;
      } catch (e) {
        console.error('Failed to parse notes from new key', e);
      }
    }

    // Fallback: try to load from the legacy key (migration)
    const legacyNotes = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyNotes) {
      try {
        setNotes(JSON.parse(legacyNotes));
        // We will save to the new key in the next effect when `notes` updates
      } catch (e) {
        console.error('Failed to parse notes from legacy key', e);
      }
    }
  }, []);

  // Save notes to local storage whenever they change
  // No longer strictly needed as we save on edit, but good for backup or offline-first later
  useEffect(() => {
    if (user) {
      localStorage.setItem(`${STORAGE_KEY}-${user.uid}`, JSON.stringify(notes));
    }
  }, [notes, user]);

  const createNote = (novelCategory?: 'chapter' | 'character' | 'location' | 'lore' | 'idea') => {
    const newNote: Note = {
      id: uuidv4(),
      title: '',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
      isFavorite: false,
      type: appMode,
      novelCategory: appMode === 'novel' ? (novelCategory || 'chapter') : undefined
    };

    // Optimistic Update
    setNotes(prev => [newNote, ...prev]);
    saveNoteToFirestore(newNote);

    setSelectedNoteId(newNote.id);
    // Reset filters when creating a new note to ensure it's visible
    setSearchTerm('');
    setMoodFilter(null);
    setShowFavorites(false);
    // Default sort to see the new note
    setSortBy('createdAt');
    setSortOrder('desc');
  };

  const importNote = (title: string, content: string, date: number) => {
    const newNote: Note = {
      id: uuidv4(),
      title: title,
      content: content,
      createdAt: date,
      updatedAt: Date.now(),
      tags: [],
      isFavorite: false,
      type: appMode,
    };

    setNotes(prev => [newNote, ...prev]);
    saveNoteToFirestore(newNote);

    setSelectedNoteId(newNote.id);
    setSearchTerm('');
    setMoodFilter(null);
    setShowFavorites(false);
    setSortBy('createdAt');
    setSortOrder('desc');
  };

  const updateNote = useCallback((updates: Partial<Note>) => {
    if (!selectedNoteId) return;

    setNotes(prevNotes => {
      const updatedNotes = prevNotes.map(note => {
        if (note.id === selectedNoteId) {
          const updatedNote = { ...note, ...updates, updatedAt: Date.now() };
          debouncedSave(updatedNote);
          return updatedNote;
        }
        return note;
      });
      return updatedNotes;
    });
  }, [selectedNoteId, debouncedSave]);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const noteToUpdate = notes.find(n => n.id === id);
    if (noteToUpdate) {
      const updatedNote = { ...noteToUpdate, isFavorite: !noteToUpdate.isFavorite };
      // Optimistic
      setNotes(prev => prev.map(n => n.id === id ? updatedNote : n));
      saveNoteToFirestore(updatedNote);
    }
  };

  const deleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this journal?')) {
      // Optimistic
      setNotes(prevNotes => prevNotes.filter(n => n.id !== id));
      if (selectedNoteId === id) {
        setSelectedNoteId(null);
      }

      if (user) {
        try {
          await deleteDoc(doc(db, 'notes', id));
        } catch (err) {
          console.error("Failed to delete", err);
        }
      }
    }
  };
  // Calculate available moods for the filter
  const availableMoods = useMemo(() => {
    const moods = new Set<string>();
    notes.forEach(note => {
      if (note.mood) {
        moods.add(note.mood);
      }
    });
    return Array.from(moods).sort();
  }, [notes]);

  const sortedFilteredNotes = useMemo(() => {
    // First filter
    const filtered = notes.filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesMood = moodFilter ? note.mood === moodFilter : true;
      const matchesFavorite = showFavorites ? note.isFavorite : true;
      const matchesType = appMode === 'novel'
        ? note.type === 'novel'
        : (!note.type || note.type === 'journal');

      return matchesSearch && matchesMood && matchesFavorite && matchesType;
    });

    // Then sort
    return filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
        case 'createdAt':
          comparison = a.createdAt - b.createdAt;
          break;
        case 'updatedAt':
          comparison = a.updatedAt - b.updatedAt;
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [notes, searchTerm, moodFilter, showFavorites, sortBy, sortOrder, appMode]);

  const selectedNote = notes.find(n => n.id === selectedNoteId);

  // Auto-select the first note if none is selected
  useEffect(() => {
    if (!selectedNoteId && sortedFilteredNotes.length > 0) {
      setSelectedNoteId(sortedFilteredNotes[0].id);
    }
  }, [sortedFilteredNotes, selectedNoteId]);

  if (authLoading) {
    return (
      <div className="flex h-screen w-screen bg-stone-50 dark:bg-stone-950 items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-stone-200 dark:bg-stone-800 mb-4"></div>
          <div className="h-4 w-32 bg-stone-200 dark:bg-stone-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex h-screen w-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans overflow-hidden transition-colors duration-300">
      {!isReadingMode && (
        <>
          {/* Desktop Sidebar: persistent on desktop */}
          <div className="hidden md:block w-80 h-full flex-shrink-0">
            <Sidebar
              notes={sortedFilteredNotes}
              selectedNoteId={selectedNoteId}
              onSelectNote={setSelectedNoteId}
              onAddNote={createNote}
              onImportNote={importNote}
              onDeleteNote={deleteNote}
              onToggleFavorite={toggleFavorite}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              moodFilter={moodFilter}
              onMoodFilterChange={setMoodFilter}
              showFavorites={showFavorites}
              onToggleFavoritesFilter={() => setShowFavorites(!showFavorites)}
              availableMoods={availableMoods}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
              user={user}
              isDarkMode={isDarkMode}
              toggleTheme={toggleTheme}
              currentTheme={theme}
              onThemeChange={setTheme}
              appMode={appMode}
              onAppModeChange={setAppMode}
              mobileTab={mobileTab}
            />
          </div>

          {/* Mobile Collapsible Sidebar Drawer overlay */}
          <AnimatePresence>
            {isSidebarOpen && (
              <>
                {/* Translucent Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsSidebarOpen(false)}
                  className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
                />

                {/* Drawer Container */}
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="fixed inset-y-0 left-0 w-[80vw] max-w-[320px] h-full z-50 md:hidden shadow-2xl"
                >
                  <Sidebar
                    notes={sortedFilteredNotes}
                    selectedNoteId={selectedNoteId}
                    onSelectNote={(id) => {
                      setSelectedNoteId(id);
                      setIsSidebarOpen(false); // Auto-close drawer on selection
                    }}
                    onAddNote={(cat) => {
                      createNote(cat);
                      setIsSidebarOpen(false);
                    }}
                    onImportNote={(t, c, d) => {
                      importNote(t, c, d);
                      setIsSidebarOpen(false);
                    }}
                    onDeleteNote={deleteNote}
                    onToggleFavorite={toggleFavorite}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    moodFilter={moodFilter}
                    onMoodFilterChange={setMoodFilter}
                    showFavorites={showFavorites}
                    onToggleFavoritesFilter={() => setShowFavorites(!showFavorites)}
                    availableMoods={availableMoods}
                    sortBy={sortBy}
                    onSortByChange={setSortBy}
                    sortOrder={sortOrder}
                    onSortOrderChange={setSortOrder}
                    user={user}
                    isDarkMode={isDarkMode}
                    toggleTheme={toggleTheme}
                    currentTheme={theme}
                    onThemeChange={setTheme}
                    appMode={appMode}
                    onAppModeChange={setAppMode}
                    mobileTab={mobileTab}
                    onClose={() => setIsSidebarOpen(false)}
                  />
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Dedicated Settings View on Mobile: visible only if mobileTab is settings */}
          {!selectedNoteId && mobileTab === 'settings' && (
            <MobileSettings
              user={user}
              streak={streak}
              isDarkMode={isDarkMode}
              toggleTheme={toggleTheme}
              currentTheme={theme}
              onThemeChange={setTheme}
            />
          )}
        </>
      )}

      {selectedNote && (mobileTab !== 'settings' || !isReadingMode) ? (
        <div className="flex-1 flex flex-row relative h-full">
          <Editor
            note={selectedNote}
            onChange={updateNote}
            savingStatus={savingStatus}
            isReadingMode={isReadingMode}
            onToggleReadingMode={() => setIsReadingMode(!isReadingMode)}
            onBack={() => setSelectedNoteId(null)}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          />
        </div>
      ) : (
        /* Empty-state / no-note-selected fallback on Mobile & Desktop */
        <div className="flex flex-1 flex flex-col items-center justify-center bg-white dark:bg-stone-900 text-stone-300 dark:text-stone-600 transition-colors duration-300 px-6">
          <div className="w-24 h-24 mb-6 rounded-full bg-stone-50 dark:bg-stone-800 flex items-center justify-center transition-colors duration-300 shadow-inner clay-card">
            <span className="text-4xl">✒️</span>
          </div>
          <h2 className="text-2xl font-serif text-stone-800 dark:text-stone-200 mb-2">Atheria</h2>
          <p className="max-w-md text-center text-stone-500 dark:text-stone-400 mb-6">
            {appMode === 'novel'
              ? 'Create a new chapter or character to begin your novel.'
              : 'Create a new journal entry to begin reflecting.'}
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => createNote()}
            className="px-6 py-2.5 bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl font-bold text-sm shadow-md clay-button flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Create Entry</span>
          </motion.button>
        </div>
      )}

      {/* Symmetrical Floating Bottom Navigation Bar (Mobile Viewports Only, hides only in reading mode) */}
      {!isReadingMode && (
        <div className="fixed bottom-6 left-6 right-6 z-40 md:hidden flex justify-between items-center bg-white/60 dark:bg-stone-950/60 backdrop-blur-xl border border-stone-250/20 dark:border-stone-800/40 p-2.5 rounded-[1.8rem] shadow-xl clay-card">
          {/* Journal Tab */}
          <button
            onClick={() => handleMobileTabChange('journal')}
            className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all duration-300 relative ${
              mobileTab === 'journal'
                ? 'text-stone-800 dark:text-stone-100 font-extrabold'
                : 'text-stone-400 dark:text-stone-550'
            }`}
          >
            {mobileTab === 'journal' && (
              <motion.span layoutId="mobileTabGlow" className="absolute inset-0 bg-stone-100/80 dark:bg-stone-850/40 rounded-xl pointer-events-none" />
            )}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            <span className="text-[9px] uppercase tracking-wider font-bold">Journal</span>
          </button>

          {/* Favorites Tab */}
          <button
            onClick={() => handleMobileTabChange('favorites')}
            className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all duration-300 relative ${
              mobileTab === 'favorites'
                ? 'text-stone-800 dark:text-stone-100 font-extrabold'
                : 'text-stone-400 dark:text-stone-550'
            }`}
          >
            {mobileTab === 'favorites' && (
              <motion.span layoutId="mobileTabGlow" className="absolute inset-0 bg-stone-100/80 dark:bg-stone-850/40 rounded-xl pointer-events-none" />
            )}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <span className="text-[9px] uppercase tracking-wider font-bold">Favorites</span>
          </button>

          {/* Central Pulsing FAB */}
          <div className="relative -mt-6 mx-2 select-none">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => createNote()}
              className="w-14 h-14 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 rounded-full hover:bg-stone-800 dark:hover:bg-stone-200 transition-all flex items-center justify-center shadow-lg border border-white/20 dark:border-stone-800/20 clay-button"
              aria-label="New Entry"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </motion.button>
          </div>

          {/* Novel Tab */}
          <button
            onClick={() => handleMobileTabChange('novel')}
            className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all duration-300 relative ${
              mobileTab === 'novel'
                ? 'text-stone-800 dark:text-stone-100 font-extrabold'
                : 'text-stone-400 dark:text-stone-550'
            }`}
          >
            {mobileTab === 'novel' && (
              <motion.span layoutId="mobileTabGlow" className="absolute inset-0 bg-stone-100/80 dark:bg-stone-850/40 rounded-xl pointer-events-none" />
            )}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            <span className="text-[9px] uppercase tracking-wider font-bold">Novel</span>
          </button>

          {/* Settings Tab */}
          <button
            onClick={() => handleMobileTabChange('settings')}
            className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all duration-300 relative ${
              mobileTab === 'settings'
                ? 'text-stone-800 dark:text-stone-100 font-extrabold'
                : 'text-stone-400 dark:text-stone-550'
            }`}
          >
            {mobileTab === 'settings' && (
              <motion.span layoutId="mobileTabGlow" className="absolute inset-0 bg-stone-100/80 dark:bg-stone-850/40 rounded-xl pointer-events-none" />
            )}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <span className="text-[9px] uppercase tracking-wider font-bold">Settings</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default App;