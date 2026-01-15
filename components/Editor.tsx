import React, { useEffect, useRef, useState } from 'react';
import { Note } from '../types';
import { SparklesIcon, PenIcon, CloudIcon } from './Icons';

interface EditorProps {
  note: Note;
  onChange: (updates: Partial<Note>) => void;
  onContinue: () => void;
  isContinuing: boolean;
  savingStatus: 'idle' | 'saving' | 'saved' | 'error';
}

const Editor: React.FC<EditorProps> = ({
  note,
  onChange,
  onContinue,
  isContinuing,
  savingStatus,
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
    // Preserve time, only change date
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
    // Only handle if note type is novel or user wants it everywhere (defaulting to everywhere for utility)
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

      // Update content
      onChange({ content: newContent });

      // Restore cursor selection (including wrappers)
      // We need to wait for the render cycle potentially, but usually explicit selection setting works if done right after state update, 
      // though React state updates are async. However, since we control the value prop, we can just set selection on next tick.
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + wrapper.length, end + wrapper.length);
      }, 0);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-white dark:bg-stone-900 relative flex flex-col transition-colors duration-300">
      <div className="max-w-3xl mx-auto w-full px-8 py-12 flex-1 flex flex-col">
        {/* Date Header */}
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
            <span
              onClick={() => setIsEditingDate(true)}
              className="cursor-pointer hover:text-stone-600 dark:hover:text-stone-300 transition-colors border-b border-transparent hover:border-stone-300 dark:hover:border-stone-600"
              title="Click to edit date"
            >
              {new Date(note.createdAt).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          )}
        </div>

        {/* Title Input */}
        <input
          type="text"
          value={note.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder={placeholders.title}
          className="text-4xl font-serif font-bold text-stone-800 dark:text-stone-100 placeholder-stone-300 dark:placeholder-stone-700 border-none outline-none bg-transparent w-full mb-8 leading-tight transition-colors duration-300"
        />

        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-6 sticky top-0 bg-white/95 dark:bg-stone-900/95 backdrop-blur py-2 z-10 transition-all duration-300">


          <button
            onClick={onContinue}
            disabled={isContinuing || note.content.length < 5}
            className="flex items-center gap-2 px-4 py-2 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 rounded-full text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-stone-200 dark:border-stone-700"
          >
            <PenIcon className={`w-4 h-4 ${isContinuing ? 'animate-pulse' : 'text-indigo-500'}`} />
            {isContinuing ? 'Writing...' : 'Continue Writing'}
          </button>

          <div className="flex-1" />

          {/* Saving Status Indicator */}
          <div className="flex items-center gap-2 text-xs font-mono text-stone-400 dark:text-stone-500 transition-colors duration-200">
            {savingStatus === 'saving' && (
              <>
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                <span>Saving...</span>
              </>
            )}
            {savingStatus === 'saved' && (
              <>
                <CloudIcon className="w-4 h-4 text-green-500" />
                <span>Saved</span>
              </>
            )}
            {savingStatus === 'error' && (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-red-500">Error Saving</span>
              </>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <textarea
          ref={textareaRef}
          value={note.content}
          onChange={(e) => {
            onChange({ content: e.target.value });
          }}
          // onKeyDown added for shortcuts
          onKeyDown={handleKeyDown}
          placeholder={placeholders.content}
          className="w-full resize-none outline-none border-none text-lg leading-loose text-stone-700 dark:text-stone-300 font-serif bg-transparent flex-1 min-h-[50vh] pb-[50vh] placeholder-stone-300 dark:placeholder-stone-700 transition-colors duration-300"
          spellCheck={false}
        />

        <div className="h-20" /> {/* Bottom spacer */}
      </div>
    </div>
  );
};

export default Editor;
