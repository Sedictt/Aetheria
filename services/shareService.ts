import { db } from './firebase';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Note, SharedPiece } from '../types';
import { User } from 'firebase/auth';

const SHARED_COLLECTION = 'shared_pieces';
const CACHE_PREFIX = 'atheria-cached-shared-';

/**
 * Publish or update a literary piece for public read-only sharing
 */
export async function sharePiece(note: Note, user: User): Promise<SharedPiece> {
  const authorName = user.displayName || (user.email ? user.email.split('@')[0] : 'Author');
  
  const sharedData: SharedPiece = {
    id: note.id,
    originalNoteId: note.id,
    authorId: user.uid,
    authorName: authorName,
    authorPhoto: user.photoURL || undefined,
    title: note.title?.trim() || 'Untitled Piece',
    content: note.content || '',
    type: note.type || 'novel',
    novelCategory: note.novelCategory,
    tags: note.tags || [],
    createdAt: note.createdAt || Date.now(),
    updatedAt: Date.now(),
    sharedAt: Date.now(),
  };

  // Strip undefined fields for Firestore
  const cleanData = Object.entries(sharedData).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, any>);

  await setDoc(doc(db, SHARED_COLLECTION, note.id), cleanData, { merge: true });

  // Cache locally
  try {
    localStorage.setItem(`${CACHE_PREFIX}${note.id}`, JSON.stringify(sharedData));
  } catch (e) {
    // Ignore storage quota errors
  }

  return sharedData;
}

/**
 * Revoke public link for a literary piece
 */
export async function unsharePiece(noteId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, SHARED_COLLECTION, noteId));
    localStorage.removeItem(`${CACHE_PREFIX}${noteId}`);
  } catch (err) {
    console.error('Failed to unshare piece:', err);
    throw err;
  }
}

/**
 * Fetch a shared piece by its ID (unauthenticated read supported)
 */
export async function getSharedPiece(pieceId: string): Promise<SharedPiece | null> {
  // Check local cache first for instant load
  const cached = localStorage.getItem(`${CACHE_PREFIX}${pieceId}`);
  let cachedData: SharedPiece | null = null;
  if (cached) {
    try {
      cachedData = JSON.parse(cached);
    } catch {
      // Ignore parse error
    }
  }

  try {
    const docRef = doc(db, SHARED_COLLECTION, pieceId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const liveData = snap.data() as SharedPiece;
      try {
        localStorage.setItem(`${CACHE_PREFIX}${pieceId}`, JSON.stringify(liveData));
      } catch {}
      return liveData;
    }

    // Fallback: check 'notes' collection if note was marked shared
    try {
      const noteRef = doc(db, 'notes', pieceId);
      const noteSnap = await getDoc(noteRef);
      if (noteSnap.exists()) {
        const data = noteSnap.data() as Note;
        if (data.isShared) {
          const fallbackData: SharedPiece = {
            id: data.id,
            originalNoteId: data.id,
            authorId: (data as any).userId || '',
            authorName: data.authorName || 'Author',
            title: data.title || 'Untitled Piece',
            content: data.content || '',
            type: data.type || 'novel',
            novelCategory: data.novelCategory,
            tags: data.tags || [],
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            sharedAt: data.sharedAt || data.updatedAt,
          };
          return fallbackData;
        }
      }
    } catch {
      // Ignore fallback note errors
    }

    return cachedData;
  } catch (err) {
    console.warn('Network fetch failed for shared piece, falling back to cache:', err);
    return cachedData;
  }
}

/**
 * Fetch all shared pieces authored by a specific user (for Table of Contents / Novel Anthology)
 */
export async function getAuthorSharedPieces(authorId: string): Promise<SharedPiece[]> {
  if (!authorId) return [];
  try {
    const q = query(
      collection(db, SHARED_COLLECTION),
      where('authorId', '==', authorId)
    );
    const snap = await getDocs(q);
    const pieces: SharedPiece[] = snap.docs.map(d => d.data() as SharedPiece);
    // Sort chronologically like chapters of a novel / collection
    return pieces.sort((a, b) => a.createdAt - b.createdAt);
  } catch (err) {
    console.error('Failed to get author pieces:', err);
    return [];
  }
}

/**
 * Generate a clean, mobile-friendly shareable reader URL
 */
export function getShareUrl(pieceId: string): string {
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}?read=${encodeURIComponent(pieceId)}`;
}
