import React, { useState, useEffect, useRef, useMemo } from 'react';
import { audioEngine } from '../lib/audioEngine';
import { DocumentItem, PlaybackState, ReaderTheme, ReaderFont, BookmarkItem, DocumentSearchMatch } from '../types';
import { updateReadingProgress } from '../lib/db';
import { DocumentSearchBar } from './DocumentSearchBar';
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
  Search,
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

  // In-document Search State
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [caseSensitive, setCaseSensitive] = useState<boolean>(false);
  const [wholeWord, setWholeWord] = useState<boolean>(false);
  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(0);

  const activeSectionRef = useRef<HTMLDivElement>(null);

  // Global keyboard shortcut to open / close search (Cmd+F / Ctrl+F / Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  // Compute all matches across document sections
  const searchMatches = useMemo<DocumentSearchMatch[]>(() => {
    if (!isSearchOpen || !searchQuery.trim()) return [];
    const trimmed = searchQuery.trim();
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = wholeWord ? `\\b${escaped}\\b` : escaped;
    const flags = caseSensitive ? 'g' : 'gi';
    let regex: RegExp;
    try {
      regex = new RegExp(pattern, flags);
    } catch {
      return [];
    }

    const results: DocumentSearchMatch[] = [];
    let overallIndex = 0;

    document.sections.forEach((sec, sIdx) => {
      let match: RegExpExecArray | null;
      regex.lastIndex = 0;
      while ((match = regex.exec(sec.text)) !== null) {
        const charOffset = match.index;
        const matchLength = match[0].length;
        const startSnippet = Math.max(0, charOffset - 40);
        const endSnippet = Math.min(sec.text.length, charOffset + matchLength + 40);
        const snippetPrefix = startSnippet > 0 ? '...' : '';
        const snippetSuffix = endSnippet < sec.text.length ? '...' : '';
        const textSnippet = snippetPrefix + sec.text.slice(startSnippet, endSnippet) + snippetSuffix;

        results.push({
          id: `match_${sIdx}_${charOffset}_${overallIndex}`,
          sectionIndex: sIdx,
          sectionTitle: sec.title || `Section ${sIdx + 1}`,
          charOffset,
          matchLength,
          textSnippet,
          matchIndex: overallIndex,
        });

        overallIndex++;
        if (matchLength === 0) {
          regex.lastIndex++;
        }
      }
    });

    return results;
  }, [document.sections, searchQuery, isSearchOpen, caseSensitive, wholeWord]);

  // Adjust activeMatchIndex when matches list changes
  useEffect(() => {
    if (activeMatchIndex >= searchMatches.length) {
      setActiveMatchIndex(0);
    }
  }, [searchMatches.length, activeMatchIndex]);

  // Scroll active search match into view
  useEffect(() => {
    if (isSearchOpen && searchMatches.length > 0 && activeMatchIndex >= 0) {
      const match = searchMatches[activeMatchIndex];
      if (match) {
        const el = document.getElementById(`search-match-${activeMatchIndex}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [activeMatchIndex, searchMatches, isSearchOpen]);

  // Index matches by section for fast per-section rendering
  const matchesBySection = useMemo(() => {
    const map = new Map<number, DocumentSearchMatch[]>();
    for (const m of searchMatches) {
      const list = map.get(m.sectionIndex) || [];
      list.push(m);
      map.set(m.sectionIndex, list);
    }
    return map;
  }, [searchMatches]);

  const handleNextMatch = () => {
    if (searchMatches.length === 0) return;
    setActiveMatchIndex((prev) => (prev + 1) % searchMatches.length);
  };

  const handlePrevMatch = () => {
    if (searchMatches.length === 0) return;
    setActiveMatchIndex((prev) => (prev - 1 + searchMatches.length) % searchMatches.length);
  };

  const handleSelectMatch = (index: number) => {
    if (index >= 0 && index < searchMatches.length) {
      setActiveMatchIndex(index);
    }
  };

  const handlePlayFromMatch = (match: DocumentSearchMatch) => {
    audioEngine.jumpToSection(match.sectionIndex, match.charOffset);
    if (!playbackState.isPlaying) {
      audioEngine.play();
    }
  };

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

  // Render section text with search highlighting and current word speech indicator
  const renderSectionText = (section: (typeof document.sections)[0], sIdx: number) => {
    const isCurrent = sIdx === playbackState.currentSectionIndex;
    const secMatches = matchesBySection.get(sIdx) || [];

    // If no search matches in this section
    if (secMatches.length === 0) {
      if (!isCurrent) return section.text;

      const charOffset = playbackState.currentWordIndex;
      const before = section.text.slice(0, charOffset);
      const activeWord = playbackState.currentWord;
      const after = section.text.slice(charOffset + (activeWord?.length || 0));

      return (
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

    // Segment text by boundaries of all matches & spoken word
    const boundaries = new Set<number>([0, section.text.length]);
    for (const m of secMatches) {
      boundaries.add(Math.max(0, m.charOffset));
      boundaries.add(Math.min(section.text.length, m.charOffset + m.matchLength));
    }

    const wordStart = isCurrent ? playbackState.currentWordIndex : -1;
    const wordEnd = isCurrent ? wordStart + (playbackState.currentWord?.length || 0) : -1;
    if (wordStart >= 0 && wordEnd > wordStart && wordEnd <= section.text.length) {
      boundaries.add(wordStart);
      boundaries.add(wordEnd);
    }

    const sorted = Array.from(boundaries).sort((a, b) => a - b);
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < sorted.length - 1; i++) {
      const start = sorted[i];
      const end = sorted[i + 1];
      const segmentText = section.text.slice(start, end);
      if (!segmentText) continue;

      const match = secMatches.find((m) => start >= m.charOffset && end <= m.charOffset + m.matchLength);
      const isCurMatch = match ? match.matchIndex === activeMatchIndex : false;
      const isWord = wordStart >= 0 && start >= wordStart && end <= wordEnd;

      if (isCurMatch) {
        elements.push(
          <mark
            key={`seg-${i}-${start}`}
            id={`search-match-${match?.matchIndex}`}
            onClick={(e) => {
              if (match) {
                e.stopPropagation();
                setActiveMatchIndex(match.matchIndex);
              }
            }}
            className={`font-bold px-1 py-0.5 rounded shadow-lg transition-all cursor-pointer ${
              isWord
                ? 'bg-amber-400 text-black ring-2 ring-indigo-400 ring-offset-2 ring-offset-[#0D0F16]'
                : 'bg-amber-400 text-black ring-2 ring-amber-300 ring-offset-1 ring-offset-[#0D0F16]'
            }`}
            title={`Match #${(match?.matchIndex ?? 0) + 1} (Click to focus)`}
          >
            {segmentText}
          </mark>
        );
      } else if (match) {
        elements.push(
          <mark
            key={`seg-${i}-${start}`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveMatchIndex(match.matchIndex);
            }}
            className={`px-0.5 rounded transition-colors cursor-pointer ${
              isWord
                ? 'bg-indigo-600 text-amber-200 font-bold border-b-2 border-amber-300'
                : 'bg-amber-400/25 text-amber-200 border-b-2 border-amber-400/70 hover:bg-amber-400/40'
            }`}
            title={`Match #${match.matchIndex + 1} (Click to focus)`}
          >
            {segmentText}
          </mark>
        );
      } else if (isWord) {
        elements.push(
          <span
            key={`seg-${i}-${start}`}
            className="bg-indigo-500 text-white font-semibold px-1.5 py-0.5 rounded shadow-sm"
          >
            {segmentText}
          </span>
        );
      } else {
        elements.push(<span key={`seg-${i}-${start}`}>{segmentText}</span>);
      }
    }

    return <span>{elements}</span>;
  };

  return (
    <div className={`h-full flex flex-col min-h-0 ${themeClasses} transition-colors duration-200 overflow-hidden`}>
      {/* Reader Top Controls Toolbar - Persistent Header */}
      <header className="shrink-0 z-30 backdrop-blur-md bg-[#0D0F16]/95 border-b border-white/5 px-4 sm:px-8 py-2.5 sm:py-3 shadow-sm relative">
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
            {/* Search within document button */}
            <button
              id="reader-search-btn"
              onClick={() => {
                setShowTypographyMenu(false);
                setIsSearchOpen(!isSearchOpen);
              }}
              className={`p-2 rounded-xl border transition text-xs flex items-center gap-1.5 ${
                isSearchOpen
                  ? 'text-indigo-300 bg-indigo-500/20 border-indigo-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border-white/5'
              }`}
              title="Search within document (Ctrl+F / ⌘F)"
            >
              <Search className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Find</span>
              {searchMatches.length > 0 && (
                <span className="bg-indigo-500 text-white text-[10px] font-mono px-1.5 py-0.2 rounded-full">
                  {searchMatches.length}
                </span>
              )}
            </button>

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

      {/* Sticky In-Document Search Bar */}
      <DocumentSearchBar
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        caseSensitive={caseSensitive}
        onToggleCaseSensitive={() => setCaseSensitive(!caseSensitive)}
        wholeWord={wholeWord}
        onToggleWholeWord={() => setWholeWord(!wholeWord)}
        matches={searchMatches}
        activeMatchIndex={activeMatchIndex}
        onNextMatch={handleNextMatch}
        onPrevMatch={handlePrevMatch}
        onSelectMatch={handleSelectMatch}
        onPlayFromMatch={handlePlayFromMatch}
      />

      {/* Main Document Reading Canvas - Dedicated Scrollable Viewport */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-8 py-6 sm:py-10">
        <div className="max-w-3xl mx-auto space-y-8 pb-16">
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

              // Highlight words within current paragraph and search matches
              const contentDisplay = renderSectionText(section, idx);

              return (
                <div
                  key={`${section.id}-${idx}`}
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
        </div>
      </div>

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
              {/* Quick Search in Document trigger */}
              <button
                type="button"
                onClick={() => {
                  setShowTOC(false);
                  setIsSearchOpen(true);
                }}
                className="w-full text-left p-3 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 text-xs font-medium flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span>Search Text in Document</span>
                </div>
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded font-mono text-slate-300">
                  Ctrl+F
                </span>
              </button>

              {/* Bookmarks list */}
              {bookmarks.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                    Saved Bookmarks ({bookmarks.length})
                  </span>
                  <div className="space-y-1.5">
                    {bookmarks.map((bm, bIdx) => (
                      <button
                        key={`${bm.id}-${bm.sectionIndex}-${bIdx}`}
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
                        key={`${sec.id}-${idx}`}
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
