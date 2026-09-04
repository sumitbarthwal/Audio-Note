import React, { useState, useEffect, useRef } from 'react';
import { audioEngine } from '../lib/audioEngine';
import { DocumentItem, PlaybackState, ReaderTheme, ReaderFont, BookmarkItem } from '../types';
import { updateReadingProgress } from '../lib/db';
import {
  BookOpen,
  List,
  Bookmark,
  BookmarkCheck,
  Type,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Compass,
  X,
  Play,
  Pause,
} from 'lucide-react';

interface ReaderViewProps {
  document: DocumentItem;
  onOpenOnTheGo: () => void;
  onBackToLibrary: () => void;
}

export const ReaderView: React.FC<ReaderViewProps> = ({
  document,
  onOpenOnTheGo,
  onBackToLibrary,
}) => {
  const [playbackState, setPlaybackState] = useState<PlaybackState>(audioEngine.getState());
  const [theme, setTheme] = useState<ReaderTheme>('oled');
  const [font, setFont] = useState<ReaderFont>('sans');
  const [fontSize, setFontSize] = useState<number>(18);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [showTOC, setShowTOC] = useState<boolean>(false);
  const [showTypographyMenu, setShowTypographyMenu] = useState<boolean>(false);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(document.bookmarks || []);

  const activeSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = audioEngine.subscribe((state) => {
      setPlaybackState(state);
      // Persist progress to IndexedDB periodically
      if (document && state.currentSectionIndex !== undefined) {
        updateReadingProgress(document.id, state.currentSectionIndex, state.currentWordIndex);
      }
    });
    return unsub;
  }, [document]);

  // Auto-scroll to active section
  useEffect(() => {
    if (autoScroll && activeSectionRef.current) {
      activeSectionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [playbackState.currentSectionIndex, autoScroll]);

  const handleParagraphClick = (sectionIndex: number) => {
    audioEngine.jumpToSection(sectionIndex, 0);
    if (!playbackState.isPlaying) {
      audioEngine.play();
    }
  };

  const handleAddBookmark = (sectionIndex: number) => {
    const sec = document.sections[sectionIndex];
    if (!sec) return;
    const newBookmark: BookmarkItem = {
      id: `bm_${Date.now()}`,
      sectionIndex,
      charOffset: 0,
      label: sec.title || `Section ${sectionIndex + 1}`,
      createdAt: Date.now(),
      snippet: sec.text.slice(0, 80) + '...',
    };
    const updated = [...bookmarks, newBookmark];
    setBookmarks(updated);
    document.bookmarks = updated;
    updateReadingProgress(document.id, document.currentSectionIndex);
  };

  const isCurrentSectionBookmarked = bookmarks.some(
    (b) => b.sectionIndex === playbackState.currentSectionIndex
  );

  // Theme styling classes
  const themeClasses = {
    oled: 'bg-black text-slate-200 border-white/5',
    dark: 'bg-[#0A0B10] text-slate-200 border-white/5',
    sepia: 'bg-[#131110] text-[#edd9c7] border-white/5',
    light: 'bg-slate-900 text-slate-100 border-white/10',
  }[theme];

  const fontClasses = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono tracking-tight',
    dyslexic: 'font-sans tracking-wide leading-loose',
  }[font];

  return (
    <div className={`min-h-screen ${themeClasses} pb-32 transition-colors duration-200`}>
      {/* Reader Top Controls Toolbar */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[#0D0F16]/80 border-b border-white/5 px-4 sm:px-8 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToLibrary}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white px-3 py-1.5 rounded-full hover:bg-white/5 border border-white/5 transition"
              title="Return to library"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Library</span>
            </button>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-medium text-slate-300 truncate max-w-[140px] sm:max-w-xs" title={document.title}>
              {document.title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Table of Contents Button */}
            <button
              onClick={() => setShowTOC(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-white/5 transition text-xs flex items-center gap-1.5"
              title="Sections & Bookmarks Table of Contents"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Sections</span>
            </button>

            {/* Bookmark Current Section */}
            <button
              onClick={() => handleAddBookmark(playbackState.currentSectionIndex)}
              className={`p-2 rounded-xl border transition ${
                isCurrentSectionBookmarked
                  ? 'text-indigo-400 bg-indigo-500/20 border-indigo-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border-white/5'
              }`}
              title={isCurrentSectionBookmarked ? 'Bookmarked' : 'Bookmark Section'}
            >
              {isCurrentSectionBookmarked ? (
                <BookmarkCheck className="w-4 h-4" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>

            {/* Typography & Appearance dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowTypographyMenu(!showTypographyMenu)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-white/5 transition"
                title="Font, Size & Theme settings"
              >
                <Type className="w-4 h-4" />
              </button>

              {showTypographyMenu && (
                <div className="absolute right-0 mt-2 w-64 rounded-3xl bg-[#0D0F16] border border-white/10 p-5 shadow-2xl z-40 space-y-4 text-xs">
                  {/* Font Size */}
                  <div className="space-y-1.5">
                    <span className="font-semibold text-slate-400">Font Size: {fontSize}px</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                        className="flex-1 py-1.5 bg-white/5 border border-white/5 rounded-xl text-center hover:bg-white/10 font-bold text-white"
                      >
                        A-
                      </button>
                      <button
                        onClick={() => setFontSize(Math.min(28, fontSize + 2))}
                        className="flex-1 py-1.5 bg-white/5 border border-white/5 rounded-xl text-center hover:bg-white/10 font-bold text-white"
                      >
                        A+
                      </button>
                    </div>
                  </div>

                  {/* Font Family */}
                  <div className="space-y-1.5">
                    <span className="font-semibold text-slate-400">Typeface</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['sans', 'serif', 'mono', 'dyslexic'] as ReaderFont[]).map((f) => (
                        <button
                          key={f}
                          onClick={() => setFont(f)}
                          className={`py-1.5 px-2 rounded-xl text-center capitalize transition ${
                            font === f
                              ? 'bg-indigo-500 text-white font-bold shadow-md shadow-indigo-500/20'
                              : 'bg-white/5 border border-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Themes */}
                  <div className="space-y-1.5">
                    <span className="font-semibold text-slate-400">Theme</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => setTheme('oled')}
                        className={`py-1.5 rounded-xl border text-center font-medium ${
                          theme === 'oled'
                            ? 'border-indigo-500 bg-black text-white'
                            : 'border-white/5 bg-black/60 text-slate-400'
                        }`}
                      >
                        OLED
                      </button>
                      <button
                        onClick={() => setTheme('dark')}
                        className={`py-1.5 rounded-xl border text-center font-medium ${
                          theme === 'dark'
                            ? 'border-indigo-500 bg-[#0A0B10] text-white'
                            : 'border-white/5 bg-[#0A0B10]/60 text-slate-400'
                        }`}
                      >
                        Dark
                      </button>
                      <button
                        onClick={() => setTheme('sepia')}
                        className={`py-1.5 rounded-xl border text-center font-medium ${
                          theme === 'sepia'
                            ? 'border-amber-400 bg-[#25201b] text-[#edd9c7]'
                            : 'border-white/5 bg-[#25201b]/60 text-slate-400'
                        }`}
                      >
                        Sepia
                      </button>
                    </div>
                  </div>

                  {/* Auto-scroll */}
                  <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-white/5">
                    <span className="text-slate-300">Auto-scroll with voice</span>
                    <input
                      type="checkbox"
                      checked={autoScroll}
                      onChange={(e) => setAutoScroll(e.target.checked)}
                      className="accent-indigo-500 rounded"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Expand into On-The-Go Commute Mode */}
            <button
              onClick={onOpenOnTheGo}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-indigo-300 hover:text-white text-xs font-medium transition shadow-sm active:scale-95"
              title="Switch to oversized On-The-Go mode"
            >
              <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>On The Go</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Document Reading Canvas */}
      <main className="max-w-3xl mx-auto px-5 py-8 space-y-8">
        {/* Document Title Header */}
        <div className="space-y-3 border-b border-white/5 pb-6">
          <div className="flex items-center gap-2 text-[10px] text-indigo-400 font-bold tracking-widest uppercase">
            <span>{document.fileType} Document</span>
            <span>•</span>
            <span>{document.sections.length} Sections</span>
            <span>•</span>
            <span>{document.totalWords.toLocaleString()} Words</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {document.title}
          </h1>
          <p className="text-xs text-slate-500">
            Tip: Tap any paragraph below to immediately start offline speech narration from that point.
          </p>
        </div>

        {/* Sections / Paragraphs */}
        <div className={`space-y-6 ${fontClasses}`} style={{ fontSize: `${fontSize}px` }}>
          {document.sections.map((section, idx) => {
            const isCurrent = idx === playbackState.currentSectionIndex;
            const isSpeakingNow = isCurrent && playbackState.isPlaying;

            // Highlight words within current paragraph
            let contentDisplay: React.ReactNode = section.text;
            if (isCurrent) {
              const charOffset = playbackState.currentWordIndex;
              const before = section.text.slice(0, charOffset);
              const activeWord = playbackState.currentWord;
              const after = section.text.slice(charOffset + (activeWord?.length || 0));

              contentDisplay = (
                <span>
                  <span>{before}</span>
                  {activeWord ? (
                    <span className="bg-indigo-500 text-white font-semibold px-1.5 py-0.5 rounded shadow-sm">
                      {activeWord}
                    </span>
                  ) : null}
                  <span>{after}</span>
                </span>
              );
            }

            return (
              <div
                key={section.id}
                ref={isCurrent ? activeSectionRef : null}
                onClick={() => handleParagraphClick(idx)}
                className={`p-6 sm:p-7 rounded-[28px] cursor-pointer transition-all duration-300 relative group border ${
                  isCurrent
                    ? 'bg-white/[0.03] border-indigo-500/50 border-l-4 border-l-indigo-500 shadow-2xl ring-1 ring-indigo-500/20'
                    : 'bg-white/[0.01] hover:bg-white/[0.025] border-white/5 hover:border-white/10'
                }`}
              >
                {/* Section header info */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-mono text-slate-500 group-hover:text-indigo-400 transition uppercase tracking-wider">
                    {section.title || `Section ${idx + 1}`}
                  </span>
                  <div className="flex items-center gap-2">
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-400">
                        {isSpeakingNow ? (
                          <>
                            <div className="flex items-end gap-0.5 h-3">
                              <span className="w-0.5 h-2 bg-indigo-400 rounded-full animate-pulse" />
                              <span className="w-0.5 h-3 bg-indigo-400 rounded-full animate-pulse delay-75" />
                              <span className="w-0.5 h-1.5 bg-indigo-400 rounded-full animate-pulse delay-150" />
                            </div>
                            <span>Speaking</span>
                          </>
                        ) : (
                          'Active'
                        )}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddBookmark(idx);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-500 hover:text-indigo-400 transition"
                      title="Bookmark this section"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Paragraph text */}
                <p className="leading-relaxed whitespace-pre-wrap">{contentDisplay}</p>
              </div>
            );
          })}
        </div>
      </main>

      {/* Table of Contents & Bookmarks Drawer */}
      {showTOC && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm h-full bg-[#0D0F16] border-l border-white/10 p-6 shadow-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">Table of Contents</h3>
              </div>
              <button
                onClick={() => setShowTOC(false)}
                className="p-1 text-slate-400 hover:text-white rounded-xl hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {/* Bookmarks list */}
              {bookmarks.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                    Saved Bookmarks ({bookmarks.length})
                  </span>
                  <div className="space-y-1.5">
                    {bookmarks.map((bm) => (
                      <button
                        key={bm.id}
                        onClick={() => {
                          audioEngine.jumpToSection(bm.sectionIndex, bm.charOffset);
                          setShowTOC(false);
                        }}
                        className="w-full text-left p-3 rounded-2xl bg-white/[0.02] hover:bg-indigo-950/30 border border-white/5 hover:border-indigo-500/30 text-xs transition"
                      >
                        <div className="font-semibold text-slate-200">{bm.label}</div>
                        <div className="text-[11px] text-slate-500 truncate">{bm.snippet}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sections list */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Sections ({document.sections.length})
                </span>
                <div className="space-y-1.5">
                  {document.sections.map((sec, idx) => {
                    const isCur = idx === playbackState.currentSectionIndex;
                    return (
                      <button
                        key={sec.id}
                        onClick={() => {
                          audioEngine.jumpToSection(idx, 0);
                          setShowTOC(false);
                        }}
                        className={`w-full text-left p-3 rounded-2xl text-xs transition flex items-center justify-between border ${
                          isCur
                            ? 'bg-indigo-950/50 border-indigo-500/60 text-indigo-200 font-bold'
                            : 'bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div>{sec.title || `Section ${idx + 1}`}</div>
                          <div className="text-[10px] font-mono text-slate-500 font-normal">
                            {sec.wordCount} words
                          </div>
                        </div>
                        {isCur && <span className="text-[10px] font-semibold text-indigo-400">Listening</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 text-center">
              <button
                onClick={() => setShowTOC(false)}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-semibold text-slate-200"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
