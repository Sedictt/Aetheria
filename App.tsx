import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import AIInsights from './components/AIInsights';
import { Note, MoodEntry } from './types';
import { analyzeJournalEntry, continueWriting } from './services/geminiService';

const STORAGE_KEY = 'atheria-journal-notes';
const LEGACY_STORAGE_KEY = 'serenity-journal-notes';

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [moodFilter, setMoodFilter] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [showInsights, setShowInsights] = useState(true);
  
  // Sorting State
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'title'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  const createNote = () => {
    const newNote: Note = {
      id: uuidv4(),
      title: '',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
      isFavorite: false,
    };
    setNotes([newNote, ...notes]);
    setSelectedNoteId(newNote.id);
    // Reset filters when creating a new note to ensure it's visible
    setSearchTerm('');
    setMoodFilter(null);
    setShowFavorites(false);
    // Default sort to see the new note
    setSortBy('createdAt');
    setSortOrder('desc');
  };

  const updateNote = useCallback((updates: Partial<Note>) => {
    if (!selectedNoteId) return;

    setNotes(prevNotes => prevNotes.map(note => {
      if (note.id === selectedNoteId) {
        return { ...note, ...updates, updatedAt: Date.now() };
      }
      return note;
    }));
  }, [selectedNoteId]);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotes(prevNotes => prevNotes.map(note => {
      if (note.id === id) {
        return { ...note, isFavorite: !note.isFavorite };
      }
      return note;
    }));
  };

  const deleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this journal?')) {
      setNotes(prevNotes => prevNotes.filter(n => n.id !== id));
      if (selectedNoteId === id) {
        setSelectedNoteId(null);
      }
    }
  };

  const handleAIAnalyze = async () => {
    const currentNote = notes.find(n => n.id === selectedNoteId);
    if (!currentNote || !currentNote.content) return;

    setIsAnalyzing(true);
    try {
      const result = await analyzeJournalEntry(currentNote.content);
      
      const newMoodEntry: MoodEntry = {
        mood: result.mood,
        score: result.moodScore,
        color: result.moodColor,
        timestamp: Date.now()
      };

      const updatedHistory = currentNote.moodHistory 
        ? [...currentNote.moodHistory, newMoodEntry] 
        : [newMoodEntry];

      updateNote({
        mood: result.mood,
        moodHistory: updatedHistory,
        tags: result.tags,
        aiSummary: result.summary,
        aiReflection: result.reflectionQuestion
      });
      setShowInsights(true);
    } catch (error) {
      console.error(error);
      alert('Failed to analyze entry. Please try again.');
    } finally {
      setIsAnalyzing(false);
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

      return matchesSearch && matchesMood && matchesFavorite;
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
  }, [notes, searchTerm, moodFilter, showFavorites, sortBy, sortOrder]);

  const selectedNote = notes.find(n => n.id === selectedNoteId);

  return (
    <div className="flex h-screen w-screen bg-stone-50 text-stone-900 font-sans overflow-hidden">
      <Sidebar 
        notes={sortedFilteredNotes}
        selectedNoteId={selectedNoteId}
        onSelectNote={setSelectedNoteId}
        onAddNote={createNote}
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
      />
      
      {selectedNote ? (
        <div className="flex-1 flex flex-row relative h-full">
          <Editor 
            note={selectedNote}
            onChange={updateNote}
            onAnalyze={handleAIAnalyze}
            onContinue={handleAIContinue}
            isAnalyzing={isAnalyzing}
            isContinuing={isContinuing}
          />
          <div className="hidden lg:block h-full">
            <AIInsights 
              note={selectedNote}
              isOpen={showInsights}
              onClose={() => setShowInsights(false)}
              onUpdateNote={updateNote}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-white text-stone-300">
          <div className="w-24 h-24 mb-6 rounded-full bg-stone-50 flex items-center justify-center">
            <span className="text-4xl">✒️</span>
          </div>
          <h2 className="text-2xl font-serif text-stone-800 mb-2">Atheria</h2>
          <p className="max-w-md text-center text-stone-500">Select a journal from the sidebar or create a new one to start reflecting.</p>
        </div>
      )}
    </div>
  );
};

export default App;