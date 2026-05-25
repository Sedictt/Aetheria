import React, { useEffect, useRef, useState } from 'react';
import { Note } from '../types';
import { SparklesIcon, PenIcon, CloudIcon, EyeIcon } from './Icons';
import { motion, AnimatePresence } from 'framer-motion';

interface EditorProps {
  note: Note;
  onChange: (updates: Partial<Note>) => void;
  savingStatus: 'idle' | 'saving' | 'saved' | 'error';
  isReadingMode: boolean;
  onToggleReadingMode: () => void;
  onBack: () => void;
  onToggleSidebar: () => void;
}

const Editor: React.FC<EditorProps> = ({
  note,
  onChange,
  savingStatus,
  isReadingMode,
  onToggleReadingMode,
  onBack,
  onToggleSidebar,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isEditingDate, setIsEditingDate] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [note.content]);

  const formatDateForInput = (timestamp: number) => {
    const d = new Date(timestamp);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const parts = e.target.value.split('-');
    const newDate = new Date(note.createdAt);
    newDate.setFullYear(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    onChange({ createdAt: newDate.getTime() });
  };

  const getPlaceholders = () => {
    if (note.type === 'novel') {
      switch (note.novelCategory) {
        case 'character':
          return { title: "Character Name...", content: "Describe their appearance, personality, and backstory..." };
        case 'location':
          return { title: "Location Name...", content: "Describe the atmosphere, geography, and history..." };
        case 'lore':
          return { title: "Concept / Myth...", content: "Explain the magic system, history, or law..." };
        case 'idea':
          return { title: "Idea...", content: "Jot down your brainstorming..." };
        default:
          return { title: "Chapter Title...", content: "Start writing your chapter..." };
      }
    }
    return { title: "Title your thoughts...", content: "Start writing..." };
  };

  const placeholders = getPlaceholders();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'i')) {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = note.content.substring(start, end);
      const wrapper = e.key === 'b' ? '**' : '*';

      const before = note.content.substring(0, start);
      const after = note.content.substring(end);
      const newContent = `${before}${wrapper}${selectedText}${wrapper}${after}`;

      onChange({ content: newContent });

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + wrapper.length, end + wrapper.length);
      }, 0);
    }
  };

  const hasAnalysis = !!(note.mood || note.aiSummary || note.aiReflection);

  return (
    <div className="flex-1 h-full overflow-y-auto bg-white dark:bg-stone-900 relative flex flex-col transition-colors duration-300">
      {/* Floating Burger Menu button in top-left corner */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggleSidebar}
        className="md:hidden fixed top-4 left-4 z-30 p-2 bg-white/80 dark:bg-stone-900/80 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400 rounded-full border border-stone-200/10 dark:border-stone-800/20 shadow-md backdrop-blur-md flex items-center justify-center w-10 h-10 clay-card"
        title="Open Notes List"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </motion.button>

      <div className="max-w-3xl mx-auto w-full px-6 py-16 md:px-8 md:py-12 flex-1 flex flex-col relative">
        
        {/* Claymorphic Date Header */}
        <div className="text-stone-400 dark:text-stone-500 text-sm font-mono mb-4 h-6 flex items-center">
          {isEditingDate ? (
            <input
              type="date"
              autoFocus
              value={formatDateForInput(note.createdAt)}
              onChange={handleDateChange}
              onBlur={() => setIsEditingDate(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingDate(false)}
              className="bg-transparent border-none outline-none font-mono text-stone-600 dark:text-stone-300 p-0"
            />
          ) : (
            <motion.span
              whileHover={{ scale: 1.01, x: 2 }}
              onClick={() => !isReadingMode && setIsEditingDate(true)}
              className={`transition-colors font-semibold ${isReadingMode ? 'pointer-events-none' : 'cursor-pointer hover:text-stone-600 dark:hover:text-stone-300'}`}
              title={isReadingMode ? undefined : "Click to edit date"}
            >
              {new Date(note.createdAt).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </motion.span>
          )}
        </div>

        {/* Title Input */}
        {isReadingMode ? (
          <h1 className="text-4xl font-serif font-extrabold text-stone-800 dark:text-stone-550 w-full mb-8 leading-tight tracking-tight">
            {note.title || (placeholders.title.replace('...', ''))}
          </h1>
        ) : (
          <input
            type="text"
            value={note.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder={placeholders.title}
            className="text-4xl font-serif font-extrabold text-stone-800 dark:text-stone-50 placeholder-stone-300 dark:placeholder-stone-800 border-none outline-none bg-transparent w-full mb-8 leading-tight tracking-tight focus:ring-0 p-0"
          />
        )}

        {/* Floating Glassmorphic / Claymorphic Toolbar */}
        <div className="hidden md:flex items-center gap-3 mb-8 sticky top-0 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md py-3 px-4 z-10 rounded-2xl border border-stone-200/20 dark:border-stone-800/20 shadow-sm transition-all duration-300 clay-flat">
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleReadingMode}
            className={`hidden md:flex p-2.5 rounded-xl transition-all border items-center justify-center ${isReadingMode
              ? 'bg-stone-800 border-stone-800 text-white dark:bg-stone-100 dark:border-white dark:text-stone-950 shadow-sm'
              : 'bg-white dark:bg-stone-800 border-stone-200/60 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 shadow-sm'
              }`}
            title={isReadingMode ? "Exit Reading Mode" : "Enter Reading Mode"}
          >
            {isReadingMode ? <PenIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
          </motion.button>

          <div className="flex-1" />

          {/* Glowing Physical LED saving status */}
          <div className="flex items-center gap-2.5 text-xs font-mono font-bold text-stone-400 dark:text-stone-500 transition-colors duration-200 bg-stone-100/50 dark:bg-stone-950/30 px-3 py-1.5 rounded-xl border border-stone-200/20 dark:border-stone-800/10 shadow-inner">
            {savingStatus === 'saving' && (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                <span className="text-amber-500 dark:text-amber-400">Saving</span>
              </>
            )}
            {savingStatus === 'saved' && (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] transition-all" />
                <span className="text-emerald-600 dark:text-emerald-500">Saved</span>
              </>
            )}
            {savingStatus === 'error' && (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                <span className="text-rose-550">Error</span>
              </>
            )}
            {savingStatus === 'idle' && (
              <>
                <div className="w-2 h-2 rounded-full bg-stone-300 dark:bg-stone-700" />
                <span>Synced</span>
              </>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        {isReadingMode ? (
          <div className="w-full text-lg leading-loose text-stone-800 dark:text-stone-200 font-serif whitespace-pre-wrap pb-[40vh] leading-loose selection:bg-indigo-100 dark:selection:bg-stone-800 select-text">
            {note.content || <span className="text-stone-350 dark:text-stone-650 italic">Write some notes to read them here...</span>}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={note.content}
            onChange={(e) => {
              onChange({ content: e.target.value });
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholders.content}
            className="w-full resize-none outline-none border-none text-lg leading-loose text-stone-700 dark:text-stone-300 font-serif bg-transparent flex-1 min-h-[50vh] pb-[40vh] placeholder-stone-300 dark:placeholder-stone-800 focus:ring-0 p-0 selection:bg-indigo-100 dark:selection:bg-stone-800"
            spellCheck={false}
          />
        )}
        
        <div className="h-20" />
      </div>
    </div>
  );
};

export default Editor;
