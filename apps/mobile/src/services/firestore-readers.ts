import { collection, doc, getDoc, getDocs } from 'firebase/firestore';

import { db } from '@/lib/firebase';

export type FirestoreReadResult<T> = {
  status: 'ready' | 'partial' | 'invalid' | 'unavailable';
  data: T | null;
  warnings: string[];
};

export function requireSchemaVersion(data: Record<string, unknown>, warnings: string[], version = 1) {
  if (data.schemaVersion !== version) {
    warnings.push('Firestore document schemaVersion is unsupported.');
    return false;
  }
  return true;
}

export function safeString(value: unknown, maxLength = 500) {
  const text = String(value || '').trim();
  if (!text || text.length > maxLength) return '';
  if (/<\s*\/?\s*(script|style|iframe|object|embed|img|video|audio)\b|on[a-z]+\s*=|javascript:/i.test(text)) {
    return '';
  }
  return text;
}

export function safeStringArray(value: unknown, maxItems = 20, maxLength = 80) {
  if (!Array.isArray(value)) return [];

  return value
    .flatMap((entry) => {
      const normalized = safeString(entry, maxLength);
      return normalized ? [normalized] : [];
    })
    .slice(0, maxItems);
}

export async function readCollection<T>({
  path,
  normalizeEntry,
}: {
  path: readonly string[];
  normalizeEntry: (id: string, data: Record<string, unknown>, warnings: string[]) => T | null;
}): Promise<FirestoreReadResult<T[]>> {
  if (!db) {
    throw new Error('Firestore is not configured for Couple Book mobile.');
  }

  const snapshot = await getDocs(collection(db, ...(path as [string, ...string[]])));
  const warnings: string[] = [];
  const entries: T[] = [];

  snapshot.forEach((documentSnapshot) => {
    const raw = documentSnapshot.data();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      warnings.push(`Firestore document ${documentSnapshot.id} was malformed.`);
      return;
    }

    const normalized = normalizeEntry(documentSnapshot.id, raw as Record<string, unknown>, warnings);
    if (normalized) entries.push(normalized);
  });

  return {
    status: entries.length ? (warnings.length ? 'partial' : 'ready') : 'unavailable',
    data: entries,
    warnings,
  };
}

export async function readDocument<T>({
  path,
  normalize,
}: {
  path: readonly string[];
  normalize: (id: string, data: Record<string, unknown>, warnings: string[]) => T | null;
}): Promise<FirestoreReadResult<T>> {
  if (!db) {
    throw new Error('Firestore is not configured for Couple Book mobile.');
  }

  const snapshot = await getDoc(doc(db, ...(path as [string, ...string[]])));
  if (!snapshot.exists()) {
    return {
      status: 'unavailable',
      data: null,
      warnings: [`Firestore document ${path.join('/')} is missing.`],
    };
  }

  const raw = snapshot.data();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      status: 'invalid',
      data: null,
      warnings: ['Firestore document was malformed.'],
    };
  }

  const warnings: string[] = [];
  const normalized = normalize(snapshot.id, raw as Record<string, unknown>, warnings);
  if (!normalized) {
    return {
      status: 'invalid',
      data: null,
      warnings: warnings.length ? warnings : ['Firestore document failed validation.'],
    };
  }

  return {
    status: warnings.length ? 'partial' : 'ready',
    data: normalized,
    warnings,
  };
}
