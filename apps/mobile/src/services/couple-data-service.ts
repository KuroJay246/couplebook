import {
  collection,
  doc,
  limit,
  onSnapshot,
  query,
  type DocumentData,
  type QuerySnapshot,
  type Unsubscribe,
} from 'firebase/firestore';

import { getCoupleBookTheme, DefaultCoupleBookThemeId } from '@/constants/couplebook-theme';
import { db, isFirebaseConfigured, missingFirebaseConfigMessage } from '@/lib/firebase';
import type {
  MobileFavoritesRecord,
  MobileMemoryRecord,
  MobilePlanRecord,
  MobileProfileRecord,
  MobileSettingsRecord,
} from '@/providers/couple-data-context';
import {
  favoritesCollectionPath,
  memoriesPath,
  plansPath,
  privateSettingsPath,
  profilesPath,
  sharedSettingsPath,
} from '@/services/firestore-paths';
import { requireSchemaVersion, safeString, safeStringArray } from '@/services/firestore-readers';
import { normalizeThemeId } from '../../../../packages/core/src/index.js';

const PLAN_STATUSES = new Set(['idea', 'planned', 'completed', 'archived']);
const PLAN_CATEGORIES = new Set([
  'Date Idea',
  'Place to Visit',
  'Restaurant',
  'Movie or Show',
  'Goal',
  'Gift or Surprise',
  'Bucket List',
  'Other',
]);

type ListenerKey =
  | 'memories'
  | 'plans'
  | 'profiles'
  | 'favorites'
  | 'sharedSettings'
  | 'privateSettings';

type CoupleDataSnapshot = {
  loading: boolean;
  error: string;
  warnings: string[];
  memories: MobileMemoryRecord[];
  plans: MobilePlanRecord[];
  profiles: MobileProfileRecord[];
  favorites: MobileFavoritesRecord[];
  sharedSettings: MobileSettingsRecord | null;
  privateSettings: MobileSettingsRecord | null;
  themeId: string;
};

function asPath(path: readonly string[]) {
  return path as unknown as [string, ...string[]];
}

function readRevision(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 0;
}

function readSchemaVersion(value: unknown): number {
  return value === 1 ? 1 : 0;
}

function readPrivacy(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      localOnlyMode: false,
      reducedMotion: false,
    };
  }

  const privacy = value as { localOnlyMode?: unknown; reducedMotion?: unknown };
  return {
    localOnlyMode: privacy.localOnlyMode === true,
    reducedMotion: privacy.reducedMotion === true,
  };
}

function normalizeTimestampLabel(value: unknown) {
  if (!value) return '';
  if (typeof value === 'string') return safeString(value, 40);
  if (typeof value === 'object' && value && 'toDate' in value && typeof value.toDate === 'function') {
    try {
      return value.toDate().toISOString();
    } catch {
      return '';
    }
  }
  return '';
}

const SAFE_STORAGE_PATH =
  /^couples\/[A-Za-z0-9_-]{1,120}\/media\/[A-Za-z0-9_-]{1,120}\/(original|thumbnail|poster)$/;
const SAFE_MEDIA_ID = /^[A-Za-z0-9_-]{1,120}$/;

function normalizeStorageMedia(data: Record<string, unknown>, warnings: string[]) {
  if (safeString(data.mediaState, 60) !== 'storage-verified') return '';

  const media =
    data.media && typeof data.media === 'object' && !Array.isArray(data.media)
      ? (data.media as Record<string, unknown>)
      : null;
  if (!media) {
    warnings.push('A verified media record was missing its media metadata.');
    return '';
  }

  const id = safeString(media.id, 120);
  const kind = safeString(media.kind, 20);
  const storagePath = safeString(media.storagePath, 260);
  const thumbnailPath = safeString(media.thumbnailPath, 260);
  const posterPath = safeString(media.posterPath, 260);
  if (!SAFE_MEDIA_ID.test(id) || !['image', 'video'].includes(kind) || !SAFE_STORAGE_PATH.test(storagePath)) {
    warnings.push('A verified media record had invalid storage metadata and was withheld.');
    return '';
  }

  return {
    status: 'storage-verified' as const,
    id,
    kind: kind as 'image' | 'video',
    storagePath,
    thumbnailPath: thumbnailPath && SAFE_STORAGE_PATH.test(thumbnailPath) ? thumbnailPath : '',
    posterPath: posterPath && SAFE_STORAGE_PATH.test(posterPath) ? posterPath : '',
    contentType: safeString(media.contentType, 80),
    sizeBytes: Number.isFinite(Number(media.sizeBytes)) && Number(media.sizeBytes) >= 0 ? Number(media.sizeBytes) : 0,
    checksum: safeString(media.checksum, 128),
  };
}

function normalizeMemory(id: string, data: Record<string, unknown>, warnings: string[]) {
  if (!requireSchemaVersion(data, warnings)) return null;

  const status = safeString(data.status, 20) === 'archived' ? 'archived' : 'active';
  const mediaState = safeString(data.mediaState, 60) || 'none';
  const media = normalizeStorageMedia(data, warnings);
  return {
    id,
    title: safeString(data.title, 180),
    description: safeString(data.description, 2000),
    date: safeString(data.date, 40),
    caption: safeString(data.caption, 300),
    tags: safeStringArray(data.tags, 30, 60),
    mediaState,
    mediaType:
      safeString(data.mediaType, 20) ||
      (data.isVideo === true ? 'video' : mediaState === 'none' ? 'text' : 'photo'),
    mediaNote: safeString(data.mediaNote, 300),
    linkedPlanId: safeString(data.linkedPlanId, 120),
    specialMomentType: safeString(data.specialMomentType, 40),
    revision: readRevision(data.revision),
    schemaVersion: readSchemaVersion(data.schemaVersion),
    status,
    isVideo: data.isVideo === true || safeString(data.mediaType, 20) === 'video',
    media: media || (mediaState === 'private-legacy-reference' ? 'private-legacy-reference' : ''),
  } satisfies MobileMemoryRecord;
}

function normalizePlan(id: string, data: Record<string, unknown>, warnings: string[]) {
  if (!requireSchemaVersion(data, warnings)) return null;

  const status = safeString(data.status, 20);
  const category = safeString(data.category, 40);
  if (!PLAN_STATUSES.has(status) || !PLAN_CATEGORIES.has(category)) {
    warnings.push('A plan used an unsupported status or category and was withheld.');
    return null;
  }

  return {
    id,
    title: safeString(data.title, 160),
    category,
    status: status as MobilePlanRecord['status'],
    targetDate: safeString(data.targetDate, 20),
    notes: safeString(data.notes, 1200),
    convertedMemoryId: safeString(data.convertedMemoryId, 120),
    createdAt: normalizeTimestampLabel(data.createdAt),
    updatedAt: normalizeTimestampLabel(data.updatedAt),
    revision: readRevision(data.revision),
    schemaVersion: readSchemaVersion(data.schemaVersion),
  } satisfies MobilePlanRecord;
}

function normalizeProfile(uid: string, data: Record<string, unknown>, warnings: string[]) {
  if (!requireSchemaVersion(data, warnings)) return null;

  return {
    uid,
    name: safeString(data.name, 80),
    bio: safeString(data.bio, 500),
    anniversaryView: safeString(data.anniversaryView, 40),
    joinedDate: safeString(data.joinedDate, 40),
    birthday: safeString(data.birthday, 40),
    revision: readRevision(data.revision),
  } satisfies MobileProfileRecord;
}

function normalizeFavorites(uid: string, data: Record<string, unknown>, warnings: string[]) {
  if (!requireSchemaVersion(data, warnings)) return null;

  return {
    uid,
    favorites: {
      food: safeStringArray(data.food, 50, 120),
      songs: safeStringArray(data.songs, 50, 120),
      movies: safeStringArray(data.movies, 50, 120),
      places: safeStringArray(data.places, 50, 120),
      memories: safeStringArray(data.memories, 50, 120),
      notes: safeStringArray(data.notes, 50, 120),
    },
    revision: readRevision(data.revision),
    schemaVersion: readSchemaVersion(data.schemaVersion),
  } satisfies MobileFavoritesRecord;
}

function normalizeSettings(id: string, data: Record<string, unknown>, warnings: string[]) {
  if (!requireSchemaVersion(data, warnings)) return null;

  return {
    id,
    appearanceTheme: normalizeThemeId(data.appearanceTheme),
    theme: normalizeThemeId(data.theme),
    anniversaryView: safeString(data.anniversaryView, 40),
    preferredAlbumView: safeString(data.preferredAlbumView, 40),
    liveAlbumCover: safeString(data.liveAlbumCover, 260),
    previewOrder: safeStringArray(data.previewOrder, 12, 120),
    privacy: readPrivacy(data.privacy),
    revision: readRevision(data.revision),
    schemaVersion: readSchemaVersion(data.schemaVersion),
  } satisfies MobileSettingsRecord;
}

function normalizeCollectionSnapshot<T>(
  snapshot: QuerySnapshot<DocumentData>,
  normalizeEntry: (id: string, data: Record<string, unknown>, warnings: string[]) => T | null,
) {
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

  return { entries, warnings };
}

function normalizeDocumentSnapshot<T>(
  id: string,
  data: Record<string, unknown> | null,
  normalizeEntry: (id: string, data: Record<string, unknown>, warnings: string[]) => T | null,
) {
  if (!data) {
    return { data: null, warnings: [] };
  }

  const warnings: string[] = [];
  const normalized = normalizeEntry(id, data, warnings);
  return {
    data: normalized,
    warnings,
  };
}

function sortMemories(entries: MobileMemoryRecord[]) {
  return [...entries].sort((left, right) => {
    if (left.status !== right.status) return left.status === 'active' ? -1 : 1;
    return right.date.localeCompare(left.date);
  });
}

function sortPlans(entries: MobilePlanRecord[]) {
  return [...entries].sort((left, right) => {
    if (left.status === 'completed' && right.status !== 'completed') return 1;
    if (left.status !== 'completed' && right.status === 'completed') return -1;
    return left.targetDate.localeCompare(right.targetDate);
  });
}

function sortProfiles(entries: MobileProfileRecord[]) {
  return [...entries].sort((left, right) => left.name.localeCompare(right.name));
}

function deriveThemeId(snapshot: CoupleDataSnapshot, fallbackThemeId: string) {
  return normalizeThemeId(
    snapshot.privateSettings?.appearanceTheme ||
      snapshot.privateSettings?.theme ||
      snapshot.sharedSettings?.theme ||
      fallbackThemeId ||
      DefaultCoupleBookThemeId,
  );
}

export function buildCoupleTheme(themeId: string) {
  return getCoupleBookTheme(normalizeThemeId(themeId));
}

export function subscribeCoupleData({
  coupleId,
  uid,
  fallbackThemeId,
  onUpdate,
  onError,
}: {
  coupleId: string;
  uid: string;
  fallbackThemeId: string;
  onUpdate: (snapshot: CoupleDataSnapshot) => void;
  onError?: (message: string) => void;
}) {
  if (!db || !isFirebaseConfigured) {
    throw new Error(missingFirebaseConfigMessage || 'Firestore is not configured for Couple Book mobile.');
  }

  const pending = new Set<ListenerKey>([
    'memories',
    'plans',
    'profiles',
    'favorites',
    'sharedSettings',
    'privateSettings',
  ]);

  const state: CoupleDataSnapshot = {
    loading: true,
    error: '',
    warnings: [],
    memories: [],
    plans: [],
    profiles: [],
    favorites: [],
    sharedSettings: null,
    privateSettings: null,
    themeId: normalizeThemeId(fallbackThemeId),
  };

  const warningBuckets: Record<ListenerKey, string[]> = {
    memories: [],
    plans: [],
    profiles: [],
    favorites: [],
    sharedSettings: [],
    privateSettings: [],
  };

  function emit() {
    state.loading = pending.size > 0;
    state.warnings = Object.values(warningBuckets).flat().filter(Boolean);
    state.themeId = deriveThemeId(state, fallbackThemeId);
    onUpdate({
      ...state,
      memories: [...state.memories],
      plans: [...state.plans],
      profiles: [...state.profiles],
      favorites: [...state.favorites],
      warnings: [...state.warnings],
    });
  }

  function resolveListener(key: ListenerKey) {
    pending.delete(key);
    emit();
  }

  function failListener(key: ListenerKey, error: unknown) {
    warningBuckets[key] = [
      error instanceof Error ? error.message : `Couple Book ${key} sync failed.`,
    ];
    state.error = warningBuckets[key][0];
    pending.delete(key);
    emit();
    if (onError) onError(state.error);
  }

  const unsubscribers: Unsubscribe[] = [];

  unsubscribers.push(
    onSnapshot(
      query(collection(db, ...asPath(memoriesPath(coupleId))), limit(60)),
      (snapshot) => {
        const normalized = normalizeCollectionSnapshot(snapshot, normalizeMemory);
        warningBuckets.memories = normalized.warnings;
        state.memories = sortMemories(normalized.entries);
        resolveListener('memories');
      },
      (error) => failListener('memories', error),
    ),
  );

  unsubscribers.push(
    onSnapshot(
      query(collection(db, ...asPath(plansPath(coupleId))), limit(30)),
      (snapshot) => {
        const normalized = normalizeCollectionSnapshot(snapshot, normalizePlan);
        warningBuckets.plans = normalized.warnings;
        state.plans = sortPlans(normalized.entries);
        resolveListener('plans');
      },
      (error) => failListener('plans', error),
    ),
  );

  unsubscribers.push(
    onSnapshot(
      collection(db, ...asPath(profilesPath(coupleId))),
      (snapshot) => {
        const normalized = normalizeCollectionSnapshot(snapshot, normalizeProfile);
        warningBuckets.profiles = normalized.warnings;
        state.profiles = sortProfiles(normalized.entries);
        resolveListener('profiles');
      },
      (error) => failListener('profiles', error),
    ),
  );

  unsubscribers.push(
    onSnapshot(
      collection(db, ...asPath(favoritesCollectionPath(coupleId))),
      (snapshot) => {
        const normalized = normalizeCollectionSnapshot(snapshot, normalizeFavorites);
        warningBuckets.favorites = normalized.warnings;
        state.favorites = normalized.entries;
        resolveListener('favorites');
      },
      (error) => failListener('favorites', error),
    ),
  );

  unsubscribers.push(
    onSnapshot(
      doc(db, ...asPath(sharedSettingsPath(coupleId))),
      (snapshot) => {
        const normalized = normalizeDocumentSnapshot(
          snapshot.id,
          snapshot.exists() ? (snapshot.data() as Record<string, unknown>) : null,
          normalizeSettings,
        );
        warningBuckets.sharedSettings = normalized.warnings;
        state.sharedSettings = normalized.data;
        resolveListener('sharedSettings');
      },
      (error) => failListener('sharedSettings', error),
    ),
  );

  unsubscribers.push(
    onSnapshot(
      doc(db, ...asPath(privateSettingsPath(coupleId, uid))),
      (snapshot) => {
        const normalized = normalizeDocumentSnapshot(
          snapshot.id,
          snapshot.exists() ? (snapshot.data() as Record<string, unknown>) : null,
          normalizeSettings,
        );
        warningBuckets.privateSettings = normalized.warnings;
        state.privateSettings = normalized.data;
        resolveListener('privateSettings');
      },
      (error) => failListener('privateSettings', error),
    ),
  );

  emit();

  return () => {
    for (const unsubscribe of unsubscribers) unsubscribe();
  };
}
