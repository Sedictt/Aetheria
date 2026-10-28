export interface MoodEntry {
  mood: string;
  score: number;
  color: string;
  timestamp: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  mood?: string;
  moodHistory?: MoodEntry[];
  tags: string[];
  aiSummary?: string;
  aiReflection?: string;
  isFavorite?: boolean;
  type?: 'journal' | 'novel';
  novelCategory?: 'chapter' | 'character' | 'location' | 'lore' | 'idea';
  isShared?: boolean;
  sharedAt?: number;
  authorName?: string;
}

export interface SharedPiece {
  id: string;
  originalNoteId: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  title: string;
  content: string;
  type?: 'journal' | 'novel';
  novelCategory?: 'chapter' | 'character' | 'location' | 'lore' | 'idea';
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  sharedAt: number;
  theme?: string;
}

export type AIAnalysisResult = {
  mood: string;
  moodScore: number;
  moodColor: string;
  tags: string[];
  summary: string;
  reflectionQuestion: string;
};

export enum ViewMode {
  EDIT = 'EDIT',
  PREVIEW = 'PREVIEW'
}
