import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SharedPiece } from '../types';
import { getSharedPiece, getAuthorSharedPieces } from '../services/shareService';

interface EBookReaderProps {
  pieceId: string;
  onExit?: () => void;
  isAuthorLoggedIn?: boolean;
}

const EBookReader: React.FC<EBookReaderProps> = ({
  pieceId,
  onExit,
}) => {
  const [currentId, setCurrentId] = useState<string>(pieceId);
  const [piece, setPiece] = useState<SharedPiece | null>(null);
  const [authorPieces, setAuthorPieces] = useState<SharedPiece[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load piece data
  useEffect(() => {
    let isMounted = true;
    const fetchPiece = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getSharedPiece(currentId);
        if (!isMounted) return;
        if (!data) {
          setError('This piece is not available.');
          setPiece(null);
        } else {
          setPiece(data);
          if (data.authorId) {
            getAuthorSharedPieces(data.authorId).then(pieces => {
              if (isMounted && pieces.length > 0) {
                setAuthorPieces(pieces);
              }
            });
          }
        }
      } catch {
        if (!isMounted) return;
        setError('Unable to load this piece.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPiece();
    return () => {
      isMounted = false;
    };
  }, [currentId]);

  // Chapter indices for previous / next navigation
  const currentIndex = useMemo(() => {
    if (!authorPieces.length || !piece) return -1;
    return authorPieces.findIndex(p => p.id === piece.id);
  }, [authorPieces, piece]);

  const prevPiece = currentIndex > 0 ? authorPieces[currentIndex - 1] : null;
  const nextPiece = currentIndex >= 0 && currentIndex < authorPieces.length - 1
    ? authorPieces[currentIndex + 1]
    : null;

  const navigateToPiece = (newId: string) => {
    setCurrentId(newId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const newUrl = `${window.location.origin}${window.location.pathname}?read=${encodeURIComponent(newId)}`;
    window.history.pushState(null, '', newUrl);
  };

  return (
    <div className="min-h-screen w-full bg-[#FAF7F2] dark:bg-[#151413] text-[#292524] dark:text-[#E2DDD5] selection:bg-[#EAE2D5] dark:selection:bg-[#2E2B27] font-serif transition-colors duration-300">
      {/* Discreet, whisper-quiet back button in top corner (only if return path exists) */}
      {onExit && (
        <button
          onClick={onExit}
          className="fixed top-4 left-4 z-20 text-xs font-serif text-stone-400 hover:text-stone-800 dark:text-stone-600 dark:hover:text-stone-200 opacity-40 hover:opacity-100 transition-opacity flex items-center gap-1.5 p-2 select-none"
          title="Back to Atheria"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Back</span>
        </button>
      )}

      {/* Main Book Page */}
      <main className="max-w-2xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
        {loading ? (
          <div className="py-24 text-center">
            <p className="text-stone-400 dark:text-stone-600 italic text-sm">Opening book...</p>
          </div>
        ) : error ? (
          <div className="py-24 text-center">
            <p className="text-stone-500 dark:text-stone-400 italic mb-6 text-sm">{error}</p>
            {onExit && (
              <button
                onClick={onExit}
                className="text-xs uppercase tracking-wider text-stone-600 dark:text-stone-400 underline underline-offset-4"
              >
                Return to Atheria
              </button>
            )}
          </div>
        ) : piece ? (
          <article className="reading-page">
            {/* Book Chapter Header */}
            <header className="text-center mb-10">
              <h1 className="font-serif text-3xl sm:text-4xl text-stone-900 dark:text-stone-100 font-normal tracking-wide leading-snug mb-3">
                {piece.title || 'Untitled'}
              </h1>
              {piece.authorName && (
                <p className="font-serif italic text-sm text-stone-500 dark:text-stone-400">
                  by {piece.authorName}
                </p>
              )}
              {/* Subtle classic book flourish */}
              <div className="mt-6 text-stone-400 dark:text-stone-600 text-xs select-none">
                ❖
              </div>
            </header>

            {/* Book Body Typography */}
            <div className="prose-book font-serif text-[1.125rem] sm:text-[1.18rem] leading-[2.1] text-stone-800 dark:text-stone-200">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ node, ...props }) => <h2 className="text-2xl font-serif font-normal text-center mt-12 mb-6" {...props} />,
                  h2: ({ node, ...props }) => <h3 className="text-xl font-serif font-normal text-center mt-10 mb-5" {...props} />,
                  h3: ({ node, ...props }) => <h4 className="text-lg font-serif font-semibold mt-8 mb-4" {...props} />,
                  p: ({ node, ...props }) => <p className="mb-6 leading-[2.1] text-justify hyphens-auto" {...props} />,
                  blockquote: ({ node, ...props }) => (
                    <blockquote
                      className="border-l-2 border-stone-300 dark:border-stone-700 pl-5 my-8 italic text-stone-700 dark:text-stone-300"
                      {...props}
                    />
                  ),
                  ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-6 space-y-2" {...props} />,
                  ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-6 space-y-2" {...props} />,
                  hr: () => (
                    <div className="my-10 text-center text-stone-400 dark:text-stone-600 text-xs select-none">
                      * * *
                    </div>
                  )
                }}
              >
                {piece.content || ''}
              </ReactMarkdown>
            </div>

            {/* End of Chapter Flourish */}
            <div className="my-14 text-center text-stone-400 dark:text-stone-600 text-sm select-none font-serif italic">
              ❧
            </div>

            {/* Clean, quiet chapter navigation if part of a collection */}
            {(prevPiece || nextPiece) && (
              <nav className="flex items-center justify-between pt-8 border-t border-stone-200/60 dark:border-stone-800/60 font-serif text-sm">
                {prevPiece ? (
                  <button
                    onClick={() => navigateToPiece(prevPiece.id)}
                    className="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors flex items-center gap-2 py-2 text-left"
                  >
                    <span>←</span>
                    <span className="italic">{prevPiece.title || 'Previous Chapter'}</span>
                  </button>
                ) : <div />}

                {nextPiece ? (
                  <button
                    onClick={() => navigateToPiece(nextPiece.id)}
                    className="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors flex items-center gap-2 py-2 text-right ml-auto"
                  >
                    <span className="italic">{nextPiece.title || 'Next Chapter'}</span>
                    <span>→</span>
                  </button>
                ) : <div />}
              </nav>
            )}
          </article>
        ) : null}
      </main>
    </div>
  );
};

export default EBookReader;
