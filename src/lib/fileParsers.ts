import { SectionItem } from '../types';

export interface FileParseResult {
  title: string;
  totalWords: number;
  sections: SectionItem[];
  fileType: 'pdf' | 'docx' | 'doc' | 'image' | 'txt' | 'md' | 'epub' | 'html' | 'other';
}

export async function parseTextOrDocumentFile(file: File): Promise<FileParseResult> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_+-]+/g, ' ');

  let rawContent = '';
  try {
    rawContent = await file.text();
  } catch (err) {
    console.error('Failed reading file text, using FileReader fallback', err);
    rawContent = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  let fileType: FileParseResult['fileType'] = 'other';
  if (extension === 'txt' || extension === 'log') fileType = 'txt';
  else if (extension === 'md' || extension === 'markdown') fileType = 'md';
  else if (extension === 'html' || extension === 'htm') fileType = 'html';
  else if (extension === 'epub') fileType = 'epub';

  return parseRawText(rawContent, cleanTitle, fileType);
}

export function parseRawText(
  rawText: string,
  title: string = 'Untitled Document',
  fileType: FileParseResult['fileType'] = 'txt'
): FileParseResult {
  let cleaned = rawText;

  // If HTML or EPUB raw text, strip basic tags and decode HTML entities
  if (fileType === 'html' || fileType === 'epub') {
    const doc = new DOMParser().parseFromString(cleaned, 'text/html');
    cleaned = doc.body.textContent || doc.body.innerText || cleaned;
  }

  // Normalize line endings
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split into paragraphs (by double line breaks or major headings)
  const rawParagraphs = cleaned
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const sections: SectionItem[] = [];
  let totalWordCount = 0;

  if (rawParagraphs.length === 0 && cleaned.trim().length > 0) {
    rawParagraphs.push(cleaned.trim());
  }

  let currentHeading = 'Opening Section';

  rawParagraphs.forEach((para, idx) => {
    // Check if paragraph looks like a chapter or markdown heading
    const headingMatch = para.match(/^(#{1,6}\s+|Chapter\s+\d+|Section\s+\d+|ACT\s+[IVXLCDM]+|SCENE\s+[IVXLCDM]+)(.*)/i);
    let sectionTitle = `Section ${idx + 1}`;
    let paragraphText = para;

    if (headingMatch) {
      currentHeading = para.replace(/^#{1,6}\s+/, '').trim();
      sectionTitle = currentHeading;
      // If it was just a heading line and had more text
      const lines = para.split('\n');
      if (lines.length > 1) {
        currentHeading = lines[0].replace(/^#{1,6}\s+/, '').trim();
        paragraphText = lines.slice(1).join(' ').trim();
        sectionTitle = currentHeading;
      }
    } else {
      // Look at first few words for a title if it begins with capital letters
      sectionTitle = `${currentHeading} (Part ${idx + 1})`;
    }

    // Clean markdown bold, italic, links for smooth audio narration
    const narrativeText = paragraphText
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](link) -> text
      .replace(/[*_~`]{1,3}/g, '') // remove markdown symbols
      .replace(/```[\s\S]*?```/g, ' [Code Block Omitted] ') // code blocks
      .replace(/\n/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (narrativeText.length > 0) {
      const words = narrativeText.split(/\s+/).filter(Boolean);
      totalWordCount += words.length;

      sections.push({
        id: `sec_${idx}_${Date.now()}`,
        pageNumber: Math.floor(idx / 4) + 1,
        title: sectionTitle,
        text: narrativeText,
        wordCount: words.length,
      });
    }
  });

  if (sections.length === 0) {
    sections.push({
      id: `sec_empty`,
      title: 'Empty Document',
      text: 'No readable text was found in this file.',
      wordCount: 7,
    });
    totalWordCount = 7;
  }

  return {
    title,
    totalWords: totalWordCount,
    sections,
    fileType,
  };
}

export function estimateAudioDuration(wordCount: number, rate: number = 1.0): number {
  // Average reading speed is ~150 words per minute (2.5 words per second)
  const baseSeconds = (wordCount / 150) * 60;
  return Math.max(1, Math.round(baseSeconds / rate));
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
