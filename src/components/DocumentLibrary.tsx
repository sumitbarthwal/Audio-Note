import React, { useState, useRef } from 'react';
import { DocumentItem } from '../types';
import { parsePdfFile } from '../lib/pdfParser';
import { parseWordFile } from '../lib/wordParser';
import { parseTextOrDocumentFile, parseRawText, estimateAudioDuration, formatDuration } from '../lib/fileParsers';
import { isImageFile, performImageOcr } from '../lib/ocrEngine';
import { saveDocument, deleteDocument } from '../lib/db';
import { SAMPLE_DOCUMENTS } from '../lib/sampleDocs';
import {
  Upload,
  FileText,
  File,
  Play,
  Trash2,
  Clock,
  BookOpen,
  Search,
  Sparkles,
  Plus,
  Loader2,
  AlertCircle,
  FileCode,
  ScanText,
  Camera,
} from 'lucide-react';

interface DocumentLibraryProps {
  documents: DocumentItem[];
  currentDocumentId: string | null;
  onSelectDocument: (doc: DocumentItem) => void;
  onRefreshDocuments: () => void;
}

export const DocumentLibrary: React.FC<DocumentLibraryProps> = ({
  documents,
  currentDocumentId,
  onSelectDocument,
  onRefreshDocuments,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteText, setPasteText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setIsUploading(true);
    setErrorMsg(null);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      if (isImageFile(file)) {
        setUploadProgressText('Initializing offline OCR engine...');
        const result = await performImageOcr(file, (pct, status) => {
          setUploadProgressText(status || `Extracting text with OCR (${pct}%)...`);
        });

        const newDoc: DocumentItem = {
          id: `doc_${Date.now()}`,
          title: file.name.replace(/\.[^/.]+$/, '').replace(/[_+-]+/g, ' ') || 'Scanned Document',
          fileType: 'image',
          fileSize: file.size,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          totalWords: result.totalWords,
          estimatedDurationSeconds: estimateAudioDuration(result.totalWords, 1.0),
          sections: result.sections,
          currentSectionIndex: 0,
          currentWordOffset: 0,
          completedPercent: 0,
          bookmarks: [],
        };

        await saveDocument(newDoc);
        onRefreshDocuments();
        onSelectDocument(newDoc);
      } else if (ext === 'pdf') {
        setUploadProgressText('Parsing PDF pages locally...');
        const result = await parsePdfFile(file, (curr, total, status) => {
          setUploadProgressText(status || `Extracting text from page ${curr} of ${total}...`);
        });

        const newDoc: DocumentItem = {
          id: `doc_${Date.now()}`,
          title: result.title || file.name,
          fileType: 'pdf',
          fileSize: file.size,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          totalWords: result.totalWords,
          estimatedDurationSeconds: estimateAudioDuration(result.totalWords, 1.0),
          sections: result.sections,
          currentSectionIndex: 0,
          currentWordOffset: 0,
          completedPercent: 0,
          bookmarks: [],
        };

        await saveDocument(newDoc);
        onRefreshDocuments();
        onSelectDocument(newDoc);
      } else if (ext === 'docx' || ext === 'doc') {
        setUploadProgressText(`Parsing Word document (.${ext}) offline...`);
        const result = await parseWordFile(file, (status) => {
          setUploadProgressText(status);
        });

        const newDoc: DocumentItem = {
          id: `doc_${Date.now()}`,
          title: result.title || file.name,
          fileType: result.fileType,
          fileSize: file.size,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          totalWords: result.totalWords,
          estimatedDurationSeconds: estimateAudioDuration(result.totalWords, 1.0),
          sections: result.sections,
          currentSectionIndex: 0,
          currentWordOffset: 0,
          completedPercent: 0,
          bookmarks: [],
        };

        await saveDocument(newDoc);
        onRefreshDocuments();
        onSelectDocument(newDoc);
      } else {
        setUploadProgressText('Reading file text...');
        const result = await parseTextOrDocumentFile(file);

        const newDoc: DocumentItem = {
          id: `doc_${Date.now()}`,
          title: result.title || file.name,
          fileType: result.fileType,
          fileSize: file.size,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          totalWords: result.totalWords,
          estimatedDurationSeconds: estimateAudioDuration(result.totalWords, 1.0),
          sections: result.sections,
          currentSectionIndex: 0,
          currentWordOffset: 0,
          completedPercent: 0,
          bookmarks: [],
        };

        await saveDocument(newDoc);
        onRefreshDocuments();
        onSelectDocument(newDoc);
      }
    } catch (err: unknown) {
      console.error('File parsing error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setErrorMsg(`Failed to process file: ${message}. Make sure the file is not corrupted or password protected.`);
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleSavePastedText = async () => {
    if (!pasteText.trim()) return;
    const title = pasteTitle.trim() || `Pasted Note ${new Date().toLocaleDateString()}`;
    const result = parseRawText(pasteText, title, 'txt');

    const newDoc: DocumentItem = {
      id: `doc_${Date.now()}`,
      title: result.title,
      fileType: 'txt',
      fileSize: pasteText.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      totalWords: result.totalWords,
      estimatedDurationSeconds: estimateAudioDuration(result.totalWords, 1.0),
      sections: result.sections,
      currentSectionIndex: 0,
      currentWordOffset: 0,
      completedPercent: 0,
      bookmarks: [],
    };

    await saveDocument(newDoc);
    onRefreshDocuments();
    onSelectDocument(newDoc);
    setShowPasteModal(false);
    setPasteTitle('');
    setPasteText('');
  };

  const handleLoadSamples = async () => {
    setIsUploading(true);
    for (const sample of SAMPLE_DOCUMENTS) {
      await saveDocument(sample);
    }
    onRefreshDocuments();
    setIsUploading(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this document from offline library?')) {
      await deleteDocument(id);
      onRefreshDocuments();
    }
  };

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Top Banner / Hero */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#0D0F16]/80 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] uppercase tracking-widest font-bold text-indigo-400">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            100% Offline Audio Library
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Your Documents & Audiobooks
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Import PDF, Word (.docx, .doc), text, or markdown files to listen offline anytime. All files, document parsers, and voices work completely without Wi-Fi or cellular data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            id="paste-text-btn"
            onClick={() => setShowPasteModal(true)}
            className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-200 hover:text-white transition active:scale-95 flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            <span>Paste Text</span>
          </button>

          <button
            id="scan-image-btn"
            onClick={() => cameraInputRef.current?.click()}
            className="px-4 py-2 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium transition active:scale-95 flex items-center gap-2"
            title="Scan an image, photo, or document page using offline OCR"
          >
            <ScanText className="w-3.5 h-3.5 text-amber-400" />
            <span>Scan Photo (OCR)</span>
          </button>

          <button
            id="upload-file-btn"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold transition active:scale-95 shadow-lg shadow-indigo-500/20 flex items-center gap-2"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import File</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt,.md,.markdown,.html,.htm,.epub,.csv,.json,.log,.png,.jpg,.jpeg,.webp,.bmp"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />
        </div>
      </div>

      {/* Offline Storage Status strip */}
      <div className="px-5 py-3.5 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs text-slate-400 font-medium">Device Engine: 100% Offline (PDF, Word, TXT, EPUB & Local OCR)</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-500 text-[10px] uppercase tracking-widest">Library Storage</span>
          <div className="w-28 sm:w-36 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full w-[45%] bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>
          <span className="font-mono text-slate-300 text-[11px]">{documents.length} offline docs</span>
        </div>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFileUpload(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-white/10 hover:border-indigo-500/40 bg-white/[0.01] hover:bg-white/[0.03] rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition group"
      >
        <div className="max-w-md mx-auto flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-white/5 group-hover:bg-indigo-500/10 border border-white/5 group-hover:border-indigo-500/30 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition">
            {isUploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            ) : (
              <Upload className="w-6 h-6" />
            )}
          </div>
          {isUploading ? (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-indigo-300 animate-pulse">
                {uploadProgressText || 'Processing file...'}
              </p>
              <p className="text-xs text-slate-500">Extracting text & formatting audio sections</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-200">
                Drop your PDF, Word (DOCX / DOC), Scanned Image (PNG / JPG), or EPUB here
              </p>
              <p className="text-xs text-slate-500">
                Supports .pdf (digital & scanned), .docx, .doc, .png, .jpg, .epub, .txt (All processed 100% offline via local OCR)
              </p>
            </>
          )}
        </div>
      </div>

      {/* Error alert if any */}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800/60 text-xs text-rose-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Import Error: </span>
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200">
            ×
          </button>
        </div>
      )}

      {/* Search and Library Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Saved Offline ({documents.length})
          </h3>
        </div>

        <div className="flex items-center gap-3">
          {documents.length === 0 && (
            <button
              onClick={handleLoadSamples}
              className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
            >
              Load Sample Classics
            </button>
          )}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        </div>
      </div>

      {/* Document Grid */}
      {filteredDocs.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white/[0.01] border border-white/5 space-y-3">
          <FileText className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-400">
            {searchQuery ? 'No documents match your search' : 'No documents in your offline library yet'}
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Upload a PDF, text file, or click below to load pre-packaged classic literature for immediate testing.
          </p>
          <button
            onClick={handleLoadSamples}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Load Sample Audiobooks
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-24">
          {filteredDocs.map((doc) => {
            const isCurrent = doc.id === currentDocumentId;
            const progress = doc.completedPercent || 0;

            return (
              <div
                key={doc.id}
                id={`doc-card-${doc.id}`}
                onClick={() => onSelectDocument(doc)}
                className={`group rounded-3xl p-6 border transition-all cursor-pointer flex flex-col justify-between relative ${
                  isCurrent
                    ? 'bg-gradient-to-b from-[#0D0F16] to-indigo-950/25 border-indigo-500/50 shadow-2xl ring-1 ring-indigo-500/30'
                    : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/5 hover:border-white/10 shadow-lg'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-[0.2em] px-2.5 py-0.5 rounded-full border ${
                        doc.fileType === 'pdf'
                          ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                          : doc.fileType === 'image'
                          ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                          : doc.fileType === 'docx' || doc.fileType === 'doc'
                          ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                          : doc.fileType === 'md'
                          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                          : doc.fileType === 'epub'
                          ? 'text-purple-400 bg-purple-500/10 border-purple-500/20'
                          : 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
                      }`}
                    >
                      {doc.fileType === 'image' ? 'OCR Scan' : doc.fileType}
                    </span>

                    <button
                      onClick={(e) => handleDelete(e, doc.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded-md hover:bg-white/5 transition"
                      title="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition line-clamp-2 mb-2">
                    {doc.title}
                  </h4>

                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      {doc.totalWords.toLocaleString()} words
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      ~{formatDuration(doc.estimatedDurationSeconds)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-white/5">
                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                      <span>{progress > 0 ? `${progress}% read` : 'Unread'}</span>
                      <span>
                        {doc.sections.length} {doc.sections.length === 1 ? 'part' : 'parts'}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Listen button */}
                  <button
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      isCurrent
                        ? 'bg-indigo-500 text-white hover:bg-indigo-400 shadow-lg shadow-indigo-500/20'
                        : 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/5'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{progress > 0 ? 'Resume Audio' : 'Start Reading'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paste Text Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-xl rounded-3xl bg-[#0D0F16] border border-white/10 p-6 sm:p-8 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Paste Text for Offline Audio</h3>
            <input
              type="text"
              placeholder="Title (e.g. Work Report, Article, Study Notes)"
              value={pasteTitle}
              onChange={(e) => setPasteTitle(e.target.value)}
              className="w-full bg-[#0A0B10] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <textarea
              rows={8}
              placeholder="Paste article, text, or markdown here to read as offline audio..."
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              className="w-full bg-[#0A0B10] border border-white/10 rounded-xl p-3.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 rounded-full text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePastedText}
                disabled={!pasteText.trim()}
                className="px-5 py-2.5 rounded-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white font-semibold text-xs transition shadow-lg shadow-indigo-500/20"
              >
                Save to Library
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
