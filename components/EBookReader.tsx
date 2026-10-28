import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SharedPiece } from '../types';
import { getSharedPiece, getAuthorSharedPieces, getShareUrl } from '../services/shareService';
import {
  BookOpenIcon,
  ListIcon,
  SettingsSlidersIcon,
  ShareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  CopyIcon,
  SunIcon,
  MoonIcon
} from './Icons';

interface EBookReaderProps {
  pieceId: string;
  onExit?: () => void;
  isAuthorLoggedIn?: boolean;
}

type ReaderTheme = 'paper' | 'sepia' | 'night' | 'atheria';
type ReaderFont = 'serif' | 'sans' | 'mono';

const THEME_STYLES: Record<ReaderTheme, {
  bg: string;
  text: string;
  subtext: string;
  border: string;
  card: string;
  accent: string;
  uiBg: string;
}> = {
  paper: {
    bg: '#FAF8F5',
    text: '#292524',
    subtext: '#78716C',
    border: 'rgba(120, 113, 108, 0.15)',
    card: '#F4EFEB',
    accent: '#44403C',
    uiBg: 'rgba(250, 248, 245, 0.92)'
  },
  sepia: {
    bg: '#F5EEDD',
    text: '#433422',
    subtext: '#7D6A53',
    border: 'rgba(125, 106, 83, 0.18)',
    card: '#ECE2CC',
    accent: '#5E4830',
    uiBg: 'rgba(245, 238, 221, 0.92)'
  },
  night: {
    bg: '#141210',
    text: '#E7E2DB',
    subtext: '#8C857B',
    border: 'rgba(231, 226, 219, 0.1)',
    card: '#1F1C18',
    accent: '#D1C7B7',
    uiBg: 'rgba(20, 18, 16, 0.92)'
  },
  atheria: {
    bg: '#1C1917',
    text: '#F5F5F4',
    subtext: '#A8A29E',
    border: 'rgba(255, 255, 255, 0.1)',
    card: '#292524',
    accent: '#E7E5E4',
    uiBg: 'rgba(28, 25, 23, 0.92)'
  }
};

const EBookReader: React.FC<EBookReaderProps> = ({
  pieceId,
  onExit,
  isAuthorLoggedIn = false
}) => {
  const [currentId, setCurrentId] = useState<string>(pieceId);
  const [piece, setPiece] = useState<SharedPiece | null>(null);
  const [authorPieces, setAuthorPieces] = useState<SharedPiece[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reader HUD / Controls visibility (tap to toggle like Kindle)
  const [showControls, setShowControls] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Reader Customization Preferences (persisted in localStorage)
  const [theme, setTheme] = useState<ReaderTheme>(() => {
    return (localStorage.getItem('atheria-reader-theme') as ReaderTheme) || 'paper';
  });
  const [font, setFont] = useState<ReaderFont>(() => {
    return (localStorage.getItem('atheria-reader-font') as ReaderFont) || 'serif';
  });
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('atheria-reader-font-size');
    return saved ? parseInt(saved, 10) : 18;
  });
  const [lineHeight, setLineHeight] = useState<'normal' | 'relaxed' | 'spacious'>(() => {
    return (localStorage.getItem('atheria-reader-line-height') as any) || 'relaxed';
  });

  // Drawers
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync preference changes to localStorage
  useEffect(() => {
    localStorage.setItem('atheria-reader-theme', theme);
  }, [theme]);
  useEffect(() => {
    localStorage.setItem('atheria-reader-font', font);
  }, [font]);
  useEffect(() => {
    localStorage.setItem('atheria-reader-font-size', fontSize.toString());
  }, [fontSize]);
  useEffect(() => {
    localStorage.setItem('atheria-reader-line-height', lineHeight);
  }, [lineHeight]);

  // Load the shared piece
  useEffect(() => {
    let isMounted = true;
    const fetchPiece = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getSharedPiece(currentId);
        if (!isMounted) return;
        if (!data) {
          setError('This literary piece is private, or the link has expired.');
          setPiece(null);
        } else {
          setPiece(data);
          // If this author has other pieces, load them for the Table of Contents
          if (data.authorId) {
            getAuthorSharedPieces(data.authorId).then(pieces => {
              if (isMounted && pieces.length > 0) {
                setAuthorPieces(pieces);
              }
            });
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError('Unable to load this literary piece. Please check your connection.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPiece();
    return () => {
      isMounted = false;
    };
  }, [currentId]);

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const container = containerRef.current;
      if (!container) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      const maxScroll = scrollHeight - clientHeight;
      if (maxScroll <= 0) {
        setScrollProgress(100);
      } else {
        const progress = Math.min(100, Math.max(0, Math.round((scrollTop / maxScroll) * 100)));
        setScrollProgress(progress);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [piece]);

  // Words and read time calculation
  const stats = useMemo(() => {
    if (!piece?.content) return { words: 0, mins: 1 };
    const words = piece.content.trim().split(/\s+/).filter(Boolean).length;
    const mins = Math.max(1, Math.ceil(words / 200));
    return { words, mins };
  }, [piece?.content]);

  // Chapter navigation indices
  const currentChapterIndex = useMemo(() => {
    if (!authorPieces.length || !piece) return -1;
    return authorPieces.findIndex(p => p.id === piece.id);
  }, [authorPieces, piece]);

  const prevPiece = currentChapterIndex > 0 ? authorPieces[currentChapterIndex - 1] : null;
  const nextPiece = currentChapterIndex >= 0 && currentChapterIndex < authorPieces.length - 1
    ? authorPieces[currentChapterIndex + 1]
    : null;

  const navigateToPiece = (newId: string) => {
    setCurrentId(newId);
    setIsTocOpen(false);
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // Update browser URL without reloading page
    const newUrl = `${window.location.origin}${window.location.pathname}?read=${encodeURIComponent(newId)}`;
    window.history.pushState(null, '', newUrl);
  };

  const handleShare = async () => {
    const url = getShareUrl(currentId);
    if (navigator.share) {
      try {
        await navigator.share({
          title: piece?.title || 'Literary Piece on Atheria',
          text: `Read "${piece?.title || 'Untitled'}" by ${piece?.authorName || 'Author'} on Atheria`,
          url: url,
        });
        return;
      } catch (e) {}
    }

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  };

  // Toggle HUD on tap (ignoring clicks on buttons or interactive elements)
  const handleContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input') ||
      isTocOpen ||
      isAppearanceOpen
    ) {
      return;
    }
    setShowControls(prev => !prev);
  };

  const themeStyle = THEME_STYLES[theme];

  const fontClass = font === 'serif'
    ? 'font-serif'
    : font === 'sans'
    ? 'font-sans'
    : 'font-mono';

  const lineHeightClass = lineHeight === 'normal'
    ? 'leading-normal'
    : lineHeight === 'relaxed'
    ? 'leading-relaxed'
    : 'leading-loose';

  return (
    <div
      ref={containerRef}
      onClick={handleContentClick}
      style={{
        backgroundColor: themeStyle.bg,
        color: themeStyle.text,
      }}
      className={`fixed inset-0 h-screen w-screen overflow-y-auto select-text transition-colors duration-300 z-50 ${fontClass}`}
    >
      {/* Top Reading Progress Line (always visible at top edge) */}
      <div
        className="fixed top-0 left-0 right-0 h-1 z-50 transition-all duration-150 pointer-events-none"
        style={{
          backgroundColor: themeStyle.border,
        }}
      >
        <div
          className="h-full transition-all duration-200"
          style={{
            width: `${scrollProgress}%`,
            backgroundColor: themeStyle.accent,
          }}
        />
      </div>

      {/* Floating Top Navigation HUD (Mobile & Desktop) */}
      <AnimatePresence>
        {showControls && (
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            style={{
              backgroundColor: themeStyle.uiBg,
              borderColor: themeStyle.border,
            }}
            className="fixed top-2 sm:top-4 left-3 right-3 sm:left-6 sm:right-6 max-w-4xl mx-auto z-40 rounded-2xl border backdrop-blur-md px-3 sm:px-4 py-2.5 flex items-center justify-between shadow-lg clay-flat"
          >
            {/* Left: Back / Exit */}
            <div className="flex items-center gap-2">
              {onExit ? (
                <button
                  onClick={onExit}
                  style={{ color: themeStyle.text }}
                  className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                  title="Return to Atheria"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Atheria</span>
                </button>
              ) : (
                <a
                  href={window.location.origin}
                  style={{ color: themeStyle.text }}
                  className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                >
                  <BookOpenIcon className="w-4 h-4" />
                  <span className="font-serif font-bold text-sm tracking-wide">Atheria</span>
                </a>
              )}
            </div>

            {/* Center: Title & Author (truncated) */}
            <div className="flex-1 mx-2 sm:mx-4 text-center overflow-hidden">
              <h2 className="text-xs sm:text-sm font-bold truncate">
                {piece?.title || 'E-Book Reader'}
              </h2>
              {piece?.authorName && (
                <p style={{ color: themeStyle.subtext }} className="text-[10px] sm:text-xs truncate">
                  by {piece.authorName}
                </p>
              )}
            </div>

            {/* Right: Appearance, Table of Contents, Share */}
            <div className="flex items-center gap-1">
              {/* Appearance Button (Aa) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAppearanceOpen(prev => !prev);
                  setIsTocOpen(false);
                }}
                style={{ color: themeStyle.text }}
                className={`p-2 sm:px-2.5 rounded-xl transition-colors flex items-center gap-1 text-xs font-serif font-bold ${
                  isAppearanceOpen ? 'bg-black/10 dark:bg-white/15' : 'hover:bg-black/5 dark:hover:bg-white/10'
                }`}
                title="Font and Appearance"
              >
                <span className="text-sm">Aa</span>
              </button>

              {/* Table of Contents Button */}
              {authorPieces.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsTocOpen(prev => !prev);
                    setIsAppearanceOpen(false);
                  }}
                  style={{ color: themeStyle.text }}
                  className={`p-2 rounded-xl transition-colors relative ${
                    isTocOpen ? 'bg-black/10 dark:bg-white/15' : 'hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
                  title="Table of Contents"
                >
                  <ListIcon className="w-4 h-4" />
                  {authorPieces.length > 1 && (
                    <span
                      style={{
                        backgroundColor: themeStyle.accent,
                        color: themeStyle.bg,
                      }}
                      className="absolute -top-1 -right-1 w-4 h-4 text-[9px] font-bold rounded-full flex items-center justify-center font-mono"
                    >
                      {authorPieces.length}
                    </span>
                  )}
                </button>
              )}

              {/* Share / Copy Link Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare();
                }}
                style={{ color: themeStyle.text }}
                className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors relative"
                title="Share this Piece"
              >
                {copied ? <CheckIcon className="w-4 h-4 text-emerald-600" /> : <ShareIcon className="w-4 h-4" />}
              </button>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Main E-Book Content Container */}
      <main className="max-w-2xl mx-auto px-5 sm:px-8 pt-24 pb-36 min-h-screen flex flex-col">
        {loading ? (
          /* Shimmering E-Book Loading Skeleton */
          <div className="animate-pulse space-y-6 pt-12">
            <div className="h-4 w-28 bg-stone-300/40 dark:bg-stone-700/40 rounded-full" />
            <div className="h-10 w-3/4 bg-stone-300/40 dark:bg-stone-700/40 rounded-xl" />
            <div className="h-4 w-40 bg-stone-300/40 dark:bg-stone-700/40 rounded-full mb-12" />
            <div className="space-y-4 pt-6">
              <div className="h-4 w-full bg-stone-300/30 dark:bg-stone-700/30 rounded" />
              <div className="h-4 w-full bg-stone-300/30 dark:bg-stone-700/30 rounded" />
              <div className="h-4 w-5/6 bg-stone-300/30 dark:bg-stone-700/30 rounded" />
              <div className="h-4 w-full bg-stone-300/30 dark:bg-stone-700/30 rounded" />
              <div className="h-4 w-4/6 bg-stone-300/30 dark:bg-stone-700/30 rounded" />
            </div>
          </div>
        ) : error ? (
          /* Error State */
          <div className="flex-1 flex flex-col items-center justify-center text-center py-20 px-4">
            <div
              style={{ backgroundColor: themeStyle.card }}
              className="w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-inner"
            >
              <BookOpenIcon className="w-8 h-8 opacity-40" />
            </div>
            <h3 className="font-serif font-bold text-2xl mb-3">Literary Piece Unavailable</h3>
            <p style={{ color: themeStyle.subtext }} className="max-w-md text-sm mb-8 leading-relaxed">
              {error}
            </p>
            {onExit ? (
              <button
                onClick={onExit}
                style={{
                  backgroundColor: themeStyle.accent,
                  color: themeStyle.bg,
                }}
                className="px-6 py-2.5 rounded-xl font-bold text-sm shadow-md"
              >
                Return to Atheria
              </button>
            ) : (
              <a
                href={window.location.origin}
                style={{
                  backgroundColor: themeStyle.accent,
                  color: themeStyle.bg,
                }}
                className="px-6 py-2.5 rounded-xl font-bold text-sm shadow-md"
              >
                Go to Atheria Home
              </a>
            )}
          </div>
        ) : piece ? (
          /* Live E-Book Article */
          <article className="flex-1 flex flex-col">
            {/* E-Book Chapter Header */}
            <header className="mb-10 text-center sm:text-left pt-4">
              {/* Category / Genre Pill */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider mb-4 border shadow-sm"
                style={{
                  backgroundColor: themeStyle.card,
                  borderColor: themeStyle.border,
                  color: themeStyle.subtext
                }}
              >
                <span>❖</span>
                <span>{piece.type === 'novel' ? (piece.novelCategory || 'Chapter') : 'Literary Work'}</span>
              </div>

              {/* Chapter Title */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-extrabold tracking-tight mb-4 leading-tight">
                {piece.title || 'Untitled Piece'}
              </h1>

              {/* Byline with Author & Reading Time */}
              <div
                style={{ color: themeStyle.subtext }}
                className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs font-sans"
              >
                <span className="font-semibold" style={{ color: themeStyle.text }}>
                  {piece.authorName}
                </span>
                <span>•</span>
                <span>{new Date(piece.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span>•</span>
                <span>{stats.mins} min read ({stats.words} words)</span>
              </div>

              {/* Ornamental Book Flourish Divider */}
              <div
                style={{ borderColor: themeStyle.border }}
                className="my-8 border-b flex items-center justify-center"
              >
                <span
                  style={{
                    backgroundColor: themeStyle.bg,
                    color: themeStyle.subtext,
                  }}
                  className="px-4 text-xs font-serif italic -mb-2.5"
                >
                  ❧ ❖ ❧
                </span>
              </div>
            </header>

            {/* Markdown Reader Body */}
            <div
              style={{
                fontSize: `${fontSize}px`,
              }}
              className={`flex-1 ${lineHeightClass} prose-reading select-text transition-all duration-200`}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ node, ...props }) => <h2 className="text-2xl font-serif font-bold mt-8 mb-4 border-b pb-2" style={{ borderColor: themeStyle.border }} {...props} />,
                  h2: ({ node, ...props }) => <h3 className="text-xl font-serif font-bold mt-6 mb-3" {...props} />,
                  h3: ({ node, ...props }) => <h4 className="text-lg font-serif font-semibold mt-5 mb-2" {...props} />,
                  p: ({ node, ...props }) => <p className="mb-6 leading-loose text-justify sm:text-left" {...props} />,
                  blockquote: ({ node, ...props }) => (
                    <blockquote
                      style={{
                        borderColor: themeStyle.accent,
                        backgroundColor: themeStyle.card,
                      }}
                      className="border-l-4 pl-4 py-2 my-6 italic rounded-r-xl"
                      {...props}
                    />
                  ),
                  ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-6 space-y-2" {...props} />,
                  ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-6 space-y-2" {...props} />,
                  hr: () => (
                    <div className="my-8 flex items-center justify-center">
                      <span style={{ color: themeStyle.subtext }} className="text-xs">✦ ✦ ✦</span>
                    </div>
                  )
                }}
              >
                {piece.content || '*This literary piece is empty.*'}
              </ReactMarkdown>
            </div>

            {/* End of Chapter Ornament */}
            <div className="my-14 text-center">
              <span style={{ color: themeStyle.subtext }} className="text-sm font-serif italic">
                — Fin —
              </span>
            </div>

            {/* Next / Previous Chapter Navigation Cards (Mobile-First) */}
            {(prevPiece || nextPiece) && (
              <div
                style={{ borderColor: themeStyle.border }}
                className="pt-8 border-t grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10"
              >
                {prevPiece ? (
                  <button
                    onClick={() => navigateToPiece(prevPiece.id)}
                    style={{
                      backgroundColor: themeStyle.card,
                      borderColor: themeStyle.border,
                      color: themeStyle.text,
                    }}
                    className="p-4 rounded-2xl border text-left hover:scale-[1.01] active:scale-[0.99] transition-all flex flex-col justify-between group shadow-sm"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-mono font-semibold mb-1" style={{ color: themeStyle.subtext }}>
                      <ChevronLeftIcon className="w-3.5 h-3.5" />
                      <span>Previous Chapter</span>
                    </div>
                    <span className="font-serif font-bold text-sm line-clamp-1 group-hover:underline">
                      {prevPiece.title || 'Untitled'}
                    </span>
                  </button>
                ) : <div />}

                {nextPiece ? (
                  <button
                    onClick={() => navigateToPiece(nextPiece.id)}
                    style={{
                      backgroundColor: themeStyle.card,
                      borderColor: themeStyle.border,
                      color: themeStyle.text,
                    }}
                    className="p-4 rounded-2xl border text-right hover:scale-[1.01] active:scale-[0.99] transition-all flex flex-col justify-between items-end group shadow-sm"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-mono font-semibold mb-1" style={{ color: themeStyle.subtext }}>
                      <span>Next Chapter</span>
                      <ChevronRightIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-serif font-bold text-sm line-clamp-1 group-hover:underline">
                      {nextPiece.title || 'Untitled'}
                    </span>
                  </button>
                ) : <div />}
              </div>
            )}

            {/* Reader Footer Branding */}
            <footer
              style={{
                backgroundColor: themeStyle.card,
                borderColor: themeStyle.border,
              }}
              className="mt-6 p-6 rounded-3xl border text-center shadow-sm"
            >
              <div className="w-10 h-10 mx-auto rounded-full bg-stone-300/30 dark:bg-stone-700/30 flex items-center justify-center text-lg mb-3">
                ✒️
              </div>
              <h3 className="font-serif font-bold text-sm mb-1">Atheria</h3>
              <p style={{ color: themeStyle.subtext }} className="text-xs max-w-sm mx-auto mb-4 leading-relaxed">
                A digital sanctuary designed for mindful reflection and novel writing.
              </p>
              {isAuthorLoggedIn && onExit ? (
                <button
                  onClick={onExit}
                  style={{
                    backgroundColor: themeStyle.accent,
                    color: themeStyle.bg,
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-bold shadow"
                >
                  Edit Piece in Atheria
                </button>
              ) : (
                <a
                  href={window.location.origin}
                  style={{
                    backgroundColor: themeStyle.accent,
                    color: themeStyle.bg,
                  }}
                  className="inline-block px-5 py-2 rounded-xl text-xs font-bold shadow"
                >
                  Write Your Own Stories
                </a>
              )}
            </footer>
          </article>
        ) : null}
      </main>

      {/* Floating Bottom HUD / Navigation Pill (Mobile & Desktop) */}
      <AnimatePresence>
        {showControls && piece && (
          <motion.nav
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.2 }}
            style={{
              backgroundColor: themeStyle.uiBg,
              borderColor: themeStyle.border,
            }}
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-1/2 sm:translate-x-1/2 max-w-md w-full z-40 rounded-full border backdrop-blur-md px-4 py-2.5 flex items-center justify-between shadow-xl clay-flat"
          >
            {/* Prev Chapter */}
            <button
              disabled={!prevPiece}
              onClick={(e) => {
                e.stopPropagation();
                if (prevPiece) navigateToPiece(prevPiece.id);
              }}
              style={{ color: themeStyle.text }}
              className={`p-2 rounded-full transition-opacity ${!prevPiece ? 'opacity-20 cursor-not-allowed' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
              title="Previous Chapter"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>

            {/* Reading Progress Indicator */}
            <div className="flex-1 text-center px-2">
              <span className="text-xs font-mono font-bold tracking-wider">
                {scrollProgress}% READ
              </span>
              <span style={{ color: themeStyle.subtext }} className="text-[11px] block truncate">
                {piece.title || 'Untitled'}
              </span>
            </div>

            {/* Quick Appearance Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsAppearanceOpen(prev => !prev);
              }}
              style={{ color: themeStyle.text }}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="Font & Theme"
            >
              <SettingsSlidersIcon className="w-4 h-4" />
            </button>

            {/* Next Chapter */}
            <button
              disabled={!nextPiece}
              onClick={(e) => {
                e.stopPropagation();
                if (nextPiece) navigateToPiece(nextPiece.id);
              }}
              style={{ color: themeStyle.text }}
              className={`p-2 rounded-full transition-opacity ${!nextPiece ? 'opacity-20 cursor-not-allowed' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
              title="Next Chapter"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Appearance Customizer Bottom Sheet */}
      <AnimatePresence>
        {isAppearanceOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAppearanceOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            />

            {/* Sheet Box */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                backgroundColor: themeStyle.card,
                borderColor: themeStyle.border,
                color: themeStyle.text,
              }}
              className="relative w-full max-w-sm rounded-t-3xl sm:rounded-3xl border p-6 shadow-2xl z-10 clay-card"
            >
              <div className="flex items-center justify-between mb-5">
                <h4 className="font-serif font-bold text-base">Reading Appearance</h4>
                <button
                  onClick={() => setIsAppearanceOpen(false)}
                  className="p-1 text-xs opacity-60 hover:opacity-100"
                >
                  ✕
                </button>
              </div>

              {/* Theme Selector */}
              <div className="mb-5">
                <label style={{ color: themeStyle.subtext }} className="text-xs uppercase font-mono font-bold tracking-wider block mb-2">
                  Paper Theme
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['paper', 'sepia', 'night', 'atheria'] as ReaderTheme[]).map((t) => {
                    const st = THEME_STYLES[t];
                    const isSelected = theme === t;
                    return (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        style={{
                          backgroundColor: st.bg,
                          color: st.text,
                          borderColor: isSelected ? st.accent : st.border,
                        }}
                        className={`py-2 px-2 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all shadow-sm ${
                          isSelected ? 'ring-2 ring-stone-400' : ''
                        }`}
                      >
                        <span className="capitalize">{t}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Font Family Selector */}
              <div className="mb-5">
                <label style={{ color: themeStyle.subtext }} className="text-xs uppercase font-mono font-bold tracking-wider block mb-2">
                  Typography
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setFont('serif')}
                    style={{
                      backgroundColor: font === 'serif' ? themeStyle.bg : 'transparent',
                      borderColor: themeStyle.border,
                    }}
                    className={`py-2 rounded-xl border text-xs font-serif font-bold ${font === 'serif' ? 'shadow-inner' : ''}`}
                  >
                    Merriweather
                  </button>
                  <button
                    onClick={() => setFont('sans')}
                    style={{
                      backgroundColor: font === 'sans' ? themeStyle.bg : 'transparent',
                      borderColor: themeStyle.border,
                    }}
                    className={`py-2 rounded-xl border text-xs font-sans font-bold ${font === 'sans' ? 'shadow-inner' : ''}`}
                  >
                    Inter Sans
                  </button>
                  <button
                    onClick={() => setFont('mono')}
                    style={{
                      backgroundColor: font === 'mono' ? themeStyle.bg : 'transparent',
                      borderColor: themeStyle.border,
                    }}
                    className={`py-2 rounded-xl border text-xs font-mono font-bold ${font === 'mono' ? 'shadow-inner' : ''}`}
                  >
                    Typewriter
                  </button>
                </div>
              </div>

              {/* Font Size Adjuster */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label style={{ color: themeStyle.subtext }} className="text-xs uppercase font-mono font-bold tracking-wider">
                    Text Size
                  </label>
                  <span className="text-xs font-mono">{fontSize}px</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setFontSize(prev => Math.max(14, prev - 2))}
                    style={{ borderColor: themeStyle.border }}
                    className="p-2 w-10 h-10 rounded-xl border font-bold text-sm flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    A-
                  </button>
                  <input
                    type="range"
                    min="14"
                    max="24"
                    step="1"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                    className="flex-1 accent-stone-700 dark:accent-stone-300"
                  />
                  <button
                    onClick={() => setFontSize(prev => Math.min(24, prev + 2))}
                    style={{ borderColor: themeStyle.border }}
                    className="p-2 w-10 h-10 rounded-xl border font-bold text-base flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    A+
                  </button>
                </div>
              </div>

              {/* Line Spacing */}
              <div>
                <label style={{ color: themeStyle.subtext }} className="text-xs uppercase font-mono font-bold tracking-wider block mb-2">
                  Line Spacing
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['normal', 'relaxed', 'spacious'] as const).map(lh => (
                    <button
                      key={lh}
                      onClick={() => setLineHeight(lh)}
                      style={{
                        backgroundColor: lineHeight === lh ? themeStyle.bg : 'transparent',
                        borderColor: themeStyle.border,
                      }}
                      className={`py-1.5 rounded-xl border text-xs capitalize ${lineHeight === lh ? 'shadow-inner font-bold' : ''}`}
                    >
                      {lh}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Table of Contents Drawer / Sheet */}
      <AnimatePresence>
        {isTocOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTocOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            />

            {/* Sheet Box */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                backgroundColor: themeStyle.bg,
                borderColor: themeStyle.border,
                color: themeStyle.text,
              }}
              className="relative w-full max-w-md max-h-[80vh] flex flex-col rounded-t-3xl sm:rounded-3xl border shadow-2xl z-10 overflow-hidden clay-card"
            >
              {/* TOC Header */}
              <div
                style={{ borderColor: themeStyle.border }}
                className="p-5 border-b flex items-center justify-between"
              >
                <div>
                  <h3 className="font-serif font-bold text-lg">Table of Contents</h3>
                  <p style={{ color: themeStyle.subtext }} className="text-xs">
                    {authorPieces.length} pieces by {piece?.authorName || 'Author'}
                  </p>
                </div>
                <button
                  onClick={() => setIsTocOpen(false)}
                  className="p-2 rounded-xl text-sm opacity-60 hover:opacity-100"
                >
                  ✕
                </button>
              </div>

              {/* Chapter List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {authorPieces.map((p, idx) => {
                  const isCurrent = p.id === currentId;
                  const wordCount = (p.content || '').trim().split(/\s+/).filter(Boolean).length;
                  const mins = Math.max(1, Math.ceil(wordCount / 200));

                  return (
                    <button
                      key={p.id}
                      onClick={() => navigateToPiece(p.id)}
                      style={{
                        backgroundColor: isCurrent ? themeStyle.card : 'transparent',
                        borderColor: isCurrent ? themeStyle.border : 'transparent',
                      }}
                      className={`w-full p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all hover:bg-black/5 dark:hover:bg-white/5 ${
                        isCurrent ? 'shadow-sm ring-1 ring-stone-400/30' : ''
                      }`}
                    >
                      <span
                        style={{ color: isCurrent ? themeStyle.text : themeStyle.subtext }}
                        className="font-mono text-xs font-bold pt-0.5"
                      >
                        {String(idx + 1).padStart(2, '0')}
                      </span>

                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="font-serif font-bold text-sm truncate">
                            {p.title || 'Untitled'}
                          </h4>
                          {isCurrent && (
                            <span
                              style={{
                                backgroundColor: themeStyle.accent,
                                color: themeStyle.bg,
                              }}
                              className="text-[9px] px-1.5 py-0.5 rounded-md font-mono font-bold uppercase"
                            >
                              Reading
                            </span>
                          )}
                        </div>
                        <div style={{ color: themeStyle.subtext }} className="text-[11px] flex items-center gap-2">
                          <span className="capitalize">{p.novelCategory || p.type || 'Piece'}</span>
                          <span>•</span>
                          <span>{mins} min read</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EBookReader;
