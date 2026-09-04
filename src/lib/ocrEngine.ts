import { createWorker, Worker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.min.mjs';
import { SectionItem } from '../types';

let cachedWorker: Worker | null = null;
let isInitializingWorker = false;

/**
 * Gets or initializes a reusable Tesseract OCR worker configured for local offline execution.
 */
export async function getOcrWorker(
  onProgress?: (percent: number, statusText: string) => void
): Promise<Worker> {
  if (cachedWorker) {
    return cachedWorker;
  }

  // Wait if another call is currently creating the worker
  while (isInitializingWorker) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (cachedWorker) return cachedWorker;
  }

  isInitializingWorker = true;

  try {
    if (onProgress) onProgress(5, 'Loading offline OCR engine...');

    // Attempt local offline worker loading with local traineddata
    let worker: Worker;
    try {
      worker = await createWorker('eng', 1, {
        workerPath: '/tesseract/worker.min.js',
        corePath: '/tesseract/tesseract-core-simd-lstm.wasm.js',
        langPath: '/tesseract',
        gzip: true,
        logger: (m: { status?: string; progress?: number }) => {
          if (onProgress && typeof m.progress === 'number') {
            const pct = Math.round(m.progress * 100);
            const status = m.status ? m.status.replace(/_/g, ' ') : 'Processing';
            onProgress(pct, `${status} (${pct}%)`);
          }
        },
      });
    } catch (localErr) {
      console.warn('Local OCR bundle init fallback, initializing standard worker:', localErr);
      worker = await createWorker('eng', 1, {
        logger: (m: { status?: string; progress?: number }) => {
          if (onProgress && typeof m.progress === 'number') {
            const pct = Math.round(m.progress * 100);
            const status = m.status ? m.status.replace(/_/g, ' ') : 'Processing';
            onProgress(pct, `${status} (${pct}%)`);
          }
        },
      });
    }

    cachedWorker = worker;
    return worker;
  } finally {
    isInitializingWorker = false;
  }
}

/**
 * Checks if a file is an image format suitable for direct OCR
 */
export function isImageFile(file: File): boolean {
  if (file.type && file.type.startsWith('image/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff', 'tif'].includes(ext);
}

/**
 * Cleans and formats raw OCR output text to eliminate scanner hyphenations and noise
 */
export function cleanOcrText(rawText: string): string {
  if (!rawText) return '';

  return (
    rawText
      // Reconnect words broken with hyphen at line break: e.g. "com- \nputer" -> "computer"
      .replace(/(\b\w+)-\s*\n\s*(\w+\b)/g, '$1$2')
      // Remove solitary weird scanner noise symbols while preserving standard punctuation
      .replace(/[^\x20-\x7E\n\r\t\u2010-\u2015\u2018-\u201D\u2026\u00A0-\u00FF]/g, ' ')
      // Normalize multiple carriage returns
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      // Collapse repeated spaces
      .replace(/[ \t]{2,}/g, ' ')
      .trim()
  );
}

/**
 * Turns clean text into structured listening sections
 */
export function convertTextToSections(text: string, titlePrefix: string): SectionItem[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) {
    return [
      {
        id: `ocr_sec_0_${Date.now()}`,
        pageNumber: 1,
        title: titlePrefix,
        text: text.trim() || 'No recognizable text found in the image.',
        wordCount: Math.max(1, text.trim().split(/\s+/).filter(Boolean).length),
      },
    ];
  }

  const sections: SectionItem[] = [];
  let currentGroup: string[] = [];
  let currentWordCount = 0;

  paragraphs.forEach((para, idx) => {
    const words = para.split(/\s+/).filter(Boolean);
    currentGroup.push(para);
    currentWordCount += words.length;

    // Group paragraphs into natural listening sections of around 250 words
    if (currentWordCount >= 250 || idx === paragraphs.length - 1) {
      const sectionText = currentGroup.join('\n\n');
      sections.push({
        id: `ocr_sec_${sections.length}_${Date.now()}`,
        pageNumber: sections.length + 1,
        title: `${titlePrefix} (Part ${sections.length + 1})`,
        text: sectionText,
        wordCount: currentWordCount,
      });
      currentGroup = [];
      currentWordCount = 0;
    }
  });

  return sections;
}

/**
 * Performs OCR on a single Image file or Blob directly in the browser
 */
export async function performImageOcr(
  file: File | Blob,
  onProgress?: (percent: number, statusText: string) => void
): Promise<{ text: string; totalWords: number; sections: SectionItem[] }> {
  const worker = await getOcrWorker(onProgress);

  if (onProgress) onProgress(20, 'Recognizing text from image...');
  const ret = await worker.recognize(file);
  const cleaned = cleanOcrText(ret.data.text);
  const words = cleaned.split(/\s+/).filter(Boolean);

  const cleanTitle = file instanceof File ? file.name.replace(/\.[^/.]+$/, '').replace(/[_+-]+/g, ' ') : 'Scanned Image';
  const sections = convertTextToSections(cleaned, cleanTitle);

  return {
    text: cleaned,
    totalWords: words.length,
    sections,
  };
}

/**
 * Renders a PDF.js page onto an HTML5 canvas with enhanced scale for crisp OCR recognition
 */
export async function renderPdfPageToCanvas(
  page: pdfjsLib.PDFPageProxy,
  scale = 2.0
): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Could not obtain 2D canvas context for PDF rendering');
  }

  // Draw white background first to avoid transparent backgrounds confusing OCR
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const renderContext = {
    canvasContext: ctx,
    viewport,
  };

  await page.render(renderContext).promise;
  return canvas;
}

/**
 * Performs offline OCR on all pages of a scanned PDF
 */
export async function performPdfOcr(
  pdf: pdfjsLib.PDFDocumentProxy,
  onProgress?: (currentPage: number, totalPages: number, pagePercent: number, status: string) => void
): Promise<{ sections: SectionItem[]; totalWords: number }> {
  const worker = await getOcrWorker();
  const numPages = pdf.numPages;
  const sections: SectionItem[] = [];
  let totalWordCount = 0;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    if (onProgress) {
      onProgress(pageNum, numPages, 10, `Rendering scanned page ${pageNum} of ${numPages}...`);
    }

    const page = await pdf.getPage(pageNum);
    const canvas = await renderPdfPageToCanvas(page, 2.0);

    if (onProgress) {
      onProgress(pageNum, numPages, 40, `OCR recognizing page ${pageNum} of ${numPages}...`);
    }

    const ret = await worker.recognize(canvas);
    const cleaned = cleanOcrText(ret.data.text);
    const words = cleaned.split(/\s+/).filter(Boolean);

    // Free canvas memory
    canvas.width = 0;
    canvas.height = 0;

    const pageText = cleaned.length > 0 ? cleaned : `[Page ${pageNum}: No recognizable text found in scan]`;
    const pageWords = words.length > 0 ? words.length : 10;

    totalWordCount += pageWords;
    sections.push({
      id: `ocr_pdf_p${pageNum}_${Date.now()}`,
      pageNumber: pageNum,
      title: `Page ${pageNum} (OCR Scanned)`,
      text: pageText,
      wordCount: pageWords,
    });

    if (onProgress) {
      onProgress(pageNum, numPages, 100, `Completed page ${pageNum} of ${numPages}`);
    }
  }

  return { sections, totalWords: totalWordCount };
}
