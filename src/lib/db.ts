import { DocumentItem } from '../types';

const DB_NAME = 'OfflineAudioReaderDB';
const DB_VERSION = 1;
const STORE_DOCS = 'documents';
const STORE_SETTINGS = 'settings';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_DOCS)) {
        const docStore = db.createObjectStore(STORE_DOCS, { keyPath: 'id' });
        docStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getAllDocuments(): Promise<DocumentItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DOCS, 'readonly');
      const store = tx.objectStore(STORE_DOCS);
      const req = store.getAll();

      req.onsuccess = () => {
        const docs = req.result as DocumentItem[];
        // Sort newest updated first
        docs.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(docs);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to get all documents from IndexedDB', err);
    return [];
  }
}

export async function getDocument(id: string): Promise<DocumentItem | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DOCS, 'readonly');
      const store = tx.objectStore(STORE_DOCS);
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error(`Failed to get document ${id}`, err);
    return null;
  }
}

export async function saveDocument(doc: DocumentItem): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCS, 'readwrite');
    const store = tx.objectStore(STORE_DOCS);
    const updatedDoc = {
      ...doc,
      updatedAt: Date.now(),
    };
    const req = store.put(updatedDoc);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCS, 'readwrite');
    const store = tx.objectStore(STORE_DOCS);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function updateReadingProgress(
  id: string,
  sectionIndex: number,
  wordOffset: number = 0,
  completedPercent?: number
): Promise<void> {
  const doc = await getDocument(id);
  if (!doc) return;

  const totalSections = doc.sections.length || 1;
  const computedPercent =
    completedPercent !== undefined
      ? completedPercent
      : Math.min(100, Math.round(((sectionIndex + 1) / totalSections) * 100));

  doc.currentSectionIndex = sectionIndex;
  doc.currentWordOffset = wordOffset;
  doc.completedPercent = computedPercent;
  doc.updatedAt = Date.now();

  await saveDocument(doc);
}

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SETTINGS, 'readonly');
      const store = tx.objectStore(STORE_SETTINGS);
      const req = store.get(key);

      req.onsuccess = () => {
        resolve(req.result !== undefined ? req.result : defaultValue);
      };
      req.onerror = () => resolve(defaultValue);
    });
  } catch {
    return defaultValue;
  }
}

export async function saveSetting<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SETTINGS, 'readwrite');
      const store = tx.objectStore(STORE_SETTINGS);
      const req = store.put(value, key);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error(`Failed to save setting ${key}`, err);
  }
}
