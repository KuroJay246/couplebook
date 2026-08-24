import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';

import { db, isFirebaseConfigured, missingFirebaseConfigMessage } from '@/lib/firebase';
import { specialMomentPath } from '@/services/firestore-paths';
import { requireSchemaVersion, safeString, safeStringArray } from '@/services/firestore-readers';
import { isSpecialMomentKey } from '../../../../packages/special-moments/src/index.js';

const ALLOWED_SECTION_KINDS = new Set(['paragraph', 'quote', 'list', 'note', 'timeline']);

export type MobileSpecialMomentSection = {
  id: string;
  kind: string;
  heading: string;
  content: string;
  items: string[];
};

export type MobileSpecialMomentRecord = {
  key: string;
  title: string;
  subtitle: string;
  date: string;
  revision: number;
  mediaStatus: string;
  mediaType: string;
  mediaNote: string;
  mediaSlotCount: number;
  sections: MobileSpecialMomentSection[];
};

function asPath(path: readonly string[]) {
  return path as unknown as [string, ...string[]];
}

function readRevision(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 0;
}

function normalizeSection(rawSection: unknown, index: number, warnings: string[]) {
  if (!rawSection || typeof rawSection !== 'object' || Array.isArray(rawSection)) {
    warnings.push('A special-moment section was malformed and was omitted.');
    return null;
  }

  const section = rawSection as Record<string, unknown>;
  const kind = safeString(section.kind, 20).toLowerCase();
  if (!ALLOWED_SECTION_KINDS.has(kind)) {
    warnings.push('A special-moment section used an unsupported kind and was omitted.');
    return null;
  }

  const heading = safeString(section.heading, 160);
  const content = safeString(section.content, 4000);
  const items = safeStringArray(section.items, 12, 240);
  if (!heading && !content && items.length === 0) {
    return null;
  }

  return {
    id: safeString(section.id, 80) || `section-${index + 1}`,
    kind,
    heading,
    content,
    items,
  } satisfies MobileSpecialMomentSection;
}

function normalizeSpecialMoment(
  key: string,
  data: Record<string, unknown>,
  warnings: string[],
): MobileSpecialMomentRecord | null {
  if (!requireSchemaVersion(data, warnings)) return null;

  const sections = Array.isArray(data.sections)
    ? data.sections.flatMap((section, index) => {
        const normalized = normalizeSection(section, index, warnings);
        return normalized ? [normalized] : [];
      })
    : [];

  const media =
    data.media && typeof data.media === 'object' && !Array.isArray(data.media)
      ? (data.media as Record<string, unknown>)
      : null;
  const mediaSlots = Array.isArray(data.mediaSlots) ? data.mediaSlots : [];

  return {
    key,
    title: safeString(data.title, 180),
    subtitle: safeString(data.subtitle, 240),
    date: safeString(data.date, 40),
    revision: readRevision(data.revision),
    mediaStatus: safeString(media?.status, 40) || 'unavailable',
    mediaType: safeString(media?.type, 20),
    mediaNote: safeString(media?.note, 280),
    mediaSlotCount: mediaSlots.length,
    sections,
  };
}

export function subscribeSpecialMoment({
  coupleId,
  momentKey,
  onUpdate,
  onError,
}: {
  coupleId: string;
  momentKey: string;
  onUpdate: (payload: {
    loading: boolean;
    error: string;
    warnings: string[];
    moment: MobileSpecialMomentRecord | null;
  }) => void;
  onError?: (message: string) => void;
}) {
  if (!db || !isFirebaseConfigured) {
    throw new Error(missingFirebaseConfigMessage || 'Firestore is not configured for Couple Book mobile.');
  }

  const normalizedKey = String(momentKey || '').trim().toLowerCase();
  if (!isSpecialMomentKey(normalizedKey)) {
    const message = 'This special moment is not approved.';
    onUpdate({ loading: false, error: message, warnings: [message], moment: null });
    return () => {};
  }

  onUpdate({ loading: true, error: '', warnings: [], moment: null });

  return onSnapshot(
    doc(db, ...asPath(specialMomentPath(coupleId, normalizedKey))),
    (snapshot) => {
      if (!snapshot.exists()) {
        onUpdate({
          loading: false,
          error: '',
          warnings: ['This special moment has not been saved for the approved couple yet.'],
          moment: null,
        });
        return;
      }

      const raw = snapshot.data();
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        onUpdate({
          loading: false,
          error: 'Special moment data was malformed.',
          warnings: ['Special moment data was malformed.'],
          moment: null,
        });
        return;
      }

      const warnings: string[] = [];
      const moment = normalizeSpecialMoment(normalizedKey, raw as Record<string, unknown>, warnings);
      onUpdate({
        loading: false,
        error: moment ? '' : 'Special moment data could not be normalized safely.',
        warnings,
        moment,
      });
    },
    (error) => {
      const message = error instanceof Error ? error.message : 'Special moment sync failed.';
      onUpdate({
        loading: false,
        error: message,
        warnings: [message],
        moment: null,
      });
      if (onError) onError(message);
    },
  ) as Unsubscribe;
}
