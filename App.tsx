import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, onSnapshot, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db } from './services/firebase';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import Login from './components/Login';
import { Note, MoodEntry } from './types';
import { continueWriting } from './services/geminiService';

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
  const [isContinuing, setIsContinuing] = useState(false);
  const [appMode, setAppMode] = useState<'journal' | 'novel'>('journal');
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      await setDoc(doc(db, 'notes', note.id), {
        ...note,
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



  const handleAIContinue = async () => {
    const currentNote = notes.find(n => n.id === selectedNoteId);
    if (!currentNote) return;

    setIsContinuing(true);
    try {
      const continuation = await continueWriting(currentNote.content);
      if (continuation) {
        // Append with a space if needed
        const spacer = currentNote.content.endsWith(' ') ? '' : ' ';
        updateNote({
          content: currentNote.content + spacer + continuation
        });
      }
    } catch (error) {
      alert('Failed to generate text. Please try again.');
    } finally {
      setIsContinuing(false);
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
      />

      {selectedNote ? (
        <div className="flex-1 flex flex-row relative h-full">
          <Editor
            note={selectedNote}
            onChange={updateNote}
            onContinue={handleAIContinue}
            isContinuing={isContinuing}
            savingStatus={savingStatus}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-stone-900 text-stone-300 dark:text-stone-600 transition-colors duration-300">
          <div className="w-24 h-24 mb-6 rounded-full bg-stone-50 dark:bg-stone-800 flex items-center justify-center transition-colors duration-300">
            <span className="text-4xl">✒️</span>
          </div >
          <h2 className="text-2xl font-serif text-stone-800 dark:text-stone-200 mb-2">Atheria</h2>
          <p className="max-w-md text-center text-stone-500 dark:text-stone-400">
            {appMode === 'novel'
              ? 'Select a chapter from the sidebar or create a new one to continue your novel.'
              : 'Select a journal from the sidebar or create a new one to start reflecting.'}
          </p>
        </div >
      )}
    </div >
  );
};

export default App;