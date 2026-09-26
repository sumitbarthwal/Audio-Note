import React, { useRef, useEffect, useState } from 'react';
import { DocumentSearchMatch } from '../types';
import {
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Volume2,
  List,
  CaseSensitive,
  WholeWord,
  Sparkles,
} from 'lucide-react';

interface DocumentSearchBarProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  caseSensitive: boolean;
  onToggleCaseSensitive: () => void;
  wholeWord: boolean;
  onToggleWholeWord: () => void;
  matches: DocumentSearchMatch[];
  activeMatchIndex: number;
  onNextMatch: () => void;
  onPrevMatch: () => void;
  onSelectMatch: (index: number) => void;
  onPlayFromMatch: (match: DocumentSearchMatch) => void;
}

export const DocumentSearchBar: React.FC<DocumentSearchBarProps> = ({
  isOpen,
  onClose,
  searchQuery,
  onSearchQueryChange,
  caseSensitive,
  onToggleCaseSensitive,
  wholeWord,
  onToggleWholeWord,
  matches,
  activeMatchIndex,
  onNextMatch,
  onPrevMatch,
  onSelectMatch,
  onPlayFromMatch,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showResultsList, setShowResultsList] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        onPrevMatch();
      } else {
        onNextMatch();
      }
    }
  };

  const hasMatches = matches.length > 0;
  const activeMatch = hasMatches ? matches[activeMatchIndex] : null;

  return (
    <div
      id="document-search-container"
      className="sticky top-[57px] z-25 bg-[#0D0F16]/95 backdrop-blur-xl border-b border-indigo-500/20 shadow-2xl transition-all duration-200 animate-in slide-in-from-top-2"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Search Input Box */}
          <div className="flex items-center flex-1 min-w-[240px] bg-white/[0.04] border border-white/10 focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/20 rounded-2xl px-3 py-1.5 transition-all">
            <Search className="w-4 h-4 text-indigo-400 shrink-0 mr-2" />
            <input
              ref={inputRef}
              id="document-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search content within document... (Press Enter for next)"
              className="bg-transparent w-full text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchQueryChange('')}
                className="p-1 text-slate-500 hover:text-slate-300 rounded-lg transition"
                title="Clear query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Controls & Nav */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Match Counter Badge */}
            <div
              className={`text-xs px-2.5 py-1 rounded-xl font-mono font-medium transition ${
                !searchQuery.trim()
                  ? 'text-slate-500 bg-white/[0.02]'
                  : hasMatches
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
              }`}
            >
              {!searchQuery.trim()
                ? 'Ready'
                : hasMatches
                ? `${activeMatchIndex + 1} of ${matches.length}`
                : '0 matches'}
            </div>

            {/* Prev / Next buttons */}
            <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-xl p-0.5">
              <button
                type="button"
                id="search-prev-btn"
                onClick={onPrevMatch}
                disabled={!hasMatches}
                className="p-1.5 text-slate-300 hover:text-white disabled:text-slate-600 hover:bg-white/5 rounded-lg transition disabled:cursor-not-allowed"
                title="Previous match (Shift + Enter)"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <div className="w-px h-3.5 bg-white/10 my-auto" />
              <button
                type="button"
                id="search-next-btn"
                onClick={onNextMatch}
                disabled={!hasMatches}
                className="p-1.5 text-slate-300 hover:text-white disabled:text-slate-600 hover:bg-white/5 rounded-lg transition disabled:cursor-not-allowed"
                title="Next match (Enter)"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Modifiers: Case Sensitive & Whole Word */}
            <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-xl p-0.5">
              <button
                type="button"
                onClick={onToggleCaseSensitive}
                className={`p-1.5 rounded-lg transition text-xs flex items-center justify-center ${
                  caseSensitive
                    ? 'bg-indigo-500 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title={caseSensitive ? 'Match case: ON' : 'Match case: OFF'}
              >
                <CaseSensitive className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onToggleWholeWord}
                className={`p-1.5 rounded-lg transition text-xs flex items-center justify-center ${
                  wholeWord
                    ? 'bg-indigo-500 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title={wholeWord ? 'Match whole word: ON' : 'Match whole word: OFF'}
              >
                <WholeWord className="w-4 h-4" />
              </button>
            </div>

            {/* Listen from active match button */}
            {activeMatch && (
              <button
                type="button"
                id="search-listen-btn"
                onClick={() => onPlayFromMatch(activeMatch)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition active:scale-95"
                title="Start reading offline speech from current match"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Listen Here</span>
              </button>
            )}

            {/* Toggle Results List Button */}
            {hasMatches && (
              <button
                type="button"
                onClick={() => setShowResultsList(!showResultsList)}
                className={`p-1.5 rounded-xl border transition text-xs flex items-center gap-1.5 ${
                  showResultsList
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : 'text-slate-400 hover:text-white bg-white/[0.03] border-white/10 hover:bg-white/5'
                }`}
                title="View all search results with context snippets"
              >
                <List className="w-4 h-4" />
                <span className="hidden md:inline">Results ({matches.length})</span>
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              id="search-close-btn"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition"
              title="Close search (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expandable Results Drawer with context snippets */}
        {showResultsList && hasMatches && (
          <div className="mt-3 pt-3 border-t border-white/10 max-h-60 overflow-y-auto space-y-1.5 pr-1 animate-in fade-in">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-2 px-1">
              <span>{matches.length} matching passages found</span>
              <span>Click a snippet to jump directly</span>
            </div>
            {matches.map((m, idx) => {
              const isCur = idx === activeMatchIndex;
              return (
                <div
                  key={m.id}
                  onClick={() => onSelectMatch(idx)}
                  className={`p-2.5 rounded-xl text-xs transition cursor-pointer flex items-start justify-between gap-3 border ${
                    isCur
                      ? 'bg-indigo-950/60 border-indigo-500/60 text-white shadow-md'
                      : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/5 text-slate-300'
                  }`}
                >
                  <div className="flex-1 truncate">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                        {m.sectionTitle}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Match #{idx + 1}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 line-clamp-2 italic font-sans leading-relaxed">
                      "{m.textSnippet}"
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 self-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectMatch(idx);
                        onPlayFromMatch(m);
                      }}
                      className="p-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white transition"
                      title="Listen from this match"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
