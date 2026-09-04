import * as pdfjsLib from 'pdfjs-dist/build/pdf.min.mjs';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { SectionItem } from '../types';
import { performPdfOcr } from './ocrEngine';

// Set up worker
try {
  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  }
} catch (err) {
  console.warn('Failed to configure pdfjs worker with url import, trying fallback', err);
}

export interface PDFParseResult {
  title: string;
  totalWords: number;
  sections: SectionItem[];
  pageCount: number;
}

export async function parsePdfFile(
  file: File,
  onProgress?: (progress: number, totalPages: number, status?: string) => void
): Promise<PDFParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const sections: SectionItem[] = [];
  let totalWordCount = 0;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    if (onProgress) {
      onProgress(pageNum, numPages, `Reading digital text (Page ${pageNum} of ${numPages})...`);
    }

    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Group text items into lines and paragraphs
    const items = textContent.items as Array<{ str?: string; hasEOL?: boolean }>;
    const textPieces: string[] = [];

    for (const item of items) {
      if (item && typeof item.str === 'string') {
        textPieces.push(item.str);
        if (item.hasEOL) {
          textPieces.push('\n');
        } else {
          textPieces.push(' ');
        }
      }
    }

    const pageRawText = textPieces.join('').trim();
    // Normalize excessive spaces
    const cleanText = pageRawText
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .trim();

    if (cleanText.length > 0) {
      // Split into paragraphs if the page is long, or keep as a page section
      const paragraphs = cleanText
        .split(/\n{2,}/)
        .map((p) => p.replace(/\n/g, ' ').trim())
        .filter((p) => p.length > 0);

      if (paragraphs.length > 0) {
        paragraphs.forEach((pText, pIdx) => {
          const words = pText.split(/\s+/).filter(Boolean);
          if (words.length > 0) {
            totalWordCount += words.length;
            sections.push({
              id: `p${pageNum}_s${pIdx}`,
              pageNumber: pageNum,
              title: `Page ${pageNum}${paragraphs.length > 1 ? ` (Part ${pIdx + 1})` : ''}`,
              text: pText,
              wordCount: words.length,
            });
          }
        });
      } else {
        const words = cleanText.split(/\s+/).filter(Boolean);
        totalWordCount += words.length;
        sections.push({
          id: `p${pageNum}`,
          pageNumber: pageNum,
          title: `Page ${pageNum}`,
          text: cleanText,
          wordCount: words.length,
        });
      }
    }
  }

  // If no digital text was extractable (scanned / image-only PDF), run offline OCR!
  if (sections.length === 0 || totalWordCount < Math.min(10, numPages * 3)) {
    try {
      if (onProgress) {
        onProgress(0, numPages, 'Scanned image PDF detected. Running offline OCR...');
      }
      const ocrResult = await performPdfOcr(pdf, (curPage, total, _, status) => {
        if (onProgress) {
          onProgress(curPage, total, status);
        }
      });

      if (ocrResult.sections.length > 0 && ocrResult.totalWords > 0) {
        sections.length = 0;
        sections.push(...ocrResult.sections);
        totalWordCount = ocrResult.totalWords;
      }
    } catch (ocrErr) {
      console.warn('Scanned PDF OCR fallback encountered an error:', ocrErr);
    }
  }

  if (sections.length === 0) {
    // If even OCR found no text or failed
    sections.push({
      id: 'empty_pdf',
      pageNumber: 1,
      title: 'Page 1',
      text: 'No readable text could be extracted from this PDF. The document might contain blank pages or be password protected.',
      wordCount: 19,
    });
    totalWordCount = 19;
  }

  const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_+-]+/g, ' ');

  return {
    title: cleanTitle,
    totalWords: totalWordCount,
    sections,
    pageCount: numPages,
  };
}
