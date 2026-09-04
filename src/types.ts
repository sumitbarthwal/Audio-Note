export interface DocumentItem {
  id: string;
  title: string;
  fileType: 'pdf' | 'docx' | 'doc' | 'image' | 'txt' | 'md' | 'epub' | 'html' | 'other';
  fileSize: number; // in bytes
  createdAt: number;
  updatedAt: number;
  totalWords: number;
  estimatedDurationSeconds: number;
  sections: SectionItem[];
  currentSectionIndex: number;
  currentWordOffset: number;
  completedPercent: number;
  bookmarks: BookmarkItem[];
}

export interface SectionItem {
  id: string;
  pageNumber?: number;
  title?: string;
  text: string;
  wordCount: number;
}

export interface BookmarkItem {
  id: string;
  sectionIndex: number;
  charOffset: number;
  label: string;
  createdAt: number;
  snippet: string;
}

export interface VoiceSettings {
  voiceURI: string | null;
  lang: string;
  rate: number; // 0.5 to 3.0
  pitch: number; // 0.5 to 1.5
  volume: number; // 0.0 to 1.0
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentSectionIndex: number;
  currentWordIndex: number;
  currentWord: string;
  elapsedSeconds: number;
  autoScroll: boolean;
}

export interface SleepTimerState {
  active: boolean;
  minutesRemaining: number;
  targetTimestamp: number | null;
  stopAtEndOfSection: boolean;
}

export type ReaderTheme = 'oled' | 'dark' | 'sepia' | 'light';
export type ReaderFont = 'sans' | 'serif' | 'mono' | 'dyslexic';

