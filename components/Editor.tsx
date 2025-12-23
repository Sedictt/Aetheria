import React, { useEffect, useRef } from 'react';
import { Note } from '../types';
import { SparklesIcon, PenIcon } from './Icons';

interface EditorProps {
  note: Note;
  onChange: (updates: Partial<Note>) => void;
  onContinue: () => void;
  isContinuing: boolean;
}

const Editor: React.FC<EditorProps> = ({
  note,
  onChange,
  onContinue,
  isContinuing,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [note.content]);

  return (
    <div className="flex-1 h-full overflow-y-auto bg-white dark:bg-stone-900 relative flex flex-col transition-colors duration-300">
      <div className="max-w-3xl mx-auto w-full px-8 py-12 flex-1 flex flex-col">
        {/* Date Header */}
        <div className="text-stone-400 dark:text-stone-500 text-sm font-mono mb-4">
          {new Date(note.createdAt).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>

        {/* Title Input */}
        <input
          type="text"
          value={note.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Title your thoughts..."
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
        </div>

        {/* Main Content Area */}
        <textarea
          ref={textareaRef}
          value={note.content}
          onChange={(e) => {
            onChange({ content: e.target.value });
            onChange({ content: e.target.value });
          }}
          // onKeyDown removed as it was only for focus mode
          placeholder="Start writing..."
          className="w-full resize-none outline-none border-none text-lg leading-loose text-stone-700 dark:text-stone-300 font-serif bg-transparent flex-1 min-h-[50vh] pb-[50vh] placeholder-stone-300 dark:placeholder-stone-700 transition-colors duration-300"
          spellCheck={false}
        />

        <div className="h-20" /> {/* Bottom spacer */}
      </div>
    </div>
  );
};

export default Editor;
