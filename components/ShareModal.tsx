import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Note } from '../types';
import { User } from 'firebase/auth';
import { sharePiece, unsharePiece, getShareUrl } from '../services/shareService';
import { ShareIcon, CheckIcon, CopyIcon, BookOpenIcon, ExternalLinkIcon } from './Icons';

interface ShareModalProps {
  note: Note;
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onUpdateNote: (updates: Partial<Note>) => void;
  onOpenPreview: (noteId: string) => void;
}

const ShareModal: React.FC<ShareModalProps> = ({
  note,
  user,
  isOpen,
  onClose,
  onUpdateNote,
  onOpenPreview
}) => {
  const [isShared, setIsShared] = useState<boolean>(!!note.isShared);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  if (!isOpen) return null;

  const shareUrl = getShareUrl(note.id);
  const words = (note.content || '').trim().split(/\s+/).filter(Boolean).length;
  const readTimeMins = Math.max(1, Math.ceil(words / 200));

  const handleToggleShare = async () => {
    setIsProcessing(true);
    try {
      if (isShared) {
        await unsharePiece(note.id);
        setIsShared(false);
        onUpdateNote({ isShared: false });
      } else {
        await sharePiece(note, user);
        setIsShared(true);
        onUpdateNote({ isShared: true, sharedAt: Date.now() });
      }
    } catch (err) {
      console.error('Error toggling share:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      setCopyError(true);
      setTimeout(() => setCopyError(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: note.title || 'Literary Piece on Atheria',
          text: `Read "${note.title || 'Untitled'}" by ${user.displayName || 'Author'} on Atheria`,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      handleCopy();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm transition-opacity"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md bg-stone-50 dark:bg-stone-900 border border-stone-200/50 dark:border-stone-800/60 rounded-3xl p-6 sm:p-7 shadow-2xl clay-card text-stone-900 dark:text-stone-100 z-10 overflow-hidden"
        >
          {/* Top Header */}
          <div className="flex items-center justify-between pb-4 border-b border-stone-200/40 dark:border-stone-800/40 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-stone-200/70 dark:bg-stone-800/80 flex items-center justify-center text-stone-700 dark:text-stone-300 clay-flat">
                <ShareIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg leading-snug">Share Literary Piece</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">Read-Only E-Book Link</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 transition-colors"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Piece Overview Card */}
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-stone-950/40 border border-stone-200/40 dark:border-stone-800/40 mb-5 clay-inset">
            <div className="flex items-center justify-between text-xs text-stone-400 dark:text-stone-500 mb-1">
              <span className="uppercase tracking-wider font-mono font-semibold">
                {note.type === 'novel' ? (note.novelCategory || 'Chapter') : 'Journal Piece'}
              </span>
              <span>{words} words • ~{readTimeMins} min read</span>
            </div>
            <h4 className="font-serif font-bold text-base text-stone-800 dark:text-stone-200 line-clamp-1">
              {note.title || 'Untitled Piece'}
            </h4>
          </div>

          {/* Share Toggle Switch */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-stone-100/70 dark:bg-stone-800/40 mb-5 border border-stone-200/40 dark:border-stone-800/40">
            <div>
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">Public Reading Link</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {isShared ? 'Anyone with the link can read this piece' : 'Only you can view this piece'}
              </p>
            </div>

            <button
              onClick={handleToggleShare}
              disabled={isProcessing}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${
                isShared ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-stone-300 dark:bg-stone-700'
              }`}
            >
              <motion.span
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md ${
                  isShared ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Link Controls (when enabled) */}
          {isShared ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              {/* URL Display Bar */}
              <div className="flex items-center gap-2 p-1.5 pl-3.5 bg-white dark:bg-stone-950 rounded-2xl border border-stone-200/60 dark:border-stone-800 shadow-inner">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-transparent border-none outline-none text-xs text-stone-600 dark:text-stone-300 font-mono truncate select-all"
                />

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCopy}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-800 hover:bg-stone-900 text-white dark:bg-stone-200 dark:hover:bg-white dark:text-stone-900'
                  }`}
                >
                  {copied ? (
                    <>
                      <CheckIcon className="w-3.5 h-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </motion.button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Native mobile share or web share */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNativeShare}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 bg-stone-200/60 dark:bg-stone-800/80 text-stone-800 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors clay-button-secondary"
                >
                  <ShareIcon className="w-4 h-4" />
                  <span>Send Link</span>
                </motion.button>

                {/* Open E-Book Preview */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onClose();
                    onOpenPreview(note.id);
                  }}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-md clay-button"
                >
                  <BookOpenIcon className="w-4 h-4" />
                  <span>Open E-Book</span>
                </motion.button>
              </div>

              <div className="text-[11px] text-center text-stone-400 dark:text-stone-500 pt-1">
                ✨ Recipients see a distraction-free, mobile-optimized e-book reader without needing to sign up.
              </div>
            </motion.div>
          ) : (
            <div className="text-center py-4 text-xs text-stone-400 dark:text-stone-500">
              Turn on the switch above to generate an e-book reading link for your readers.
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ShareModal;
