import {
  COLLECTIONS,
  MEMBER_ROLES,
  MEMORY_KIND_LABELS,
  MEMORY_STATUSES,
  MEMORY_TYPES,
  PLAN_CATEGORIES,
  PLAN_STATUSES,
  SCHEMA_VERSIONS,
  SETTINGS_DOCUMENT_IDS,
  SPECIAL_SECTION_KINDS,
} from '../../../../packages/firebase-contracts/src/index.js';
import {
  DEFAULT_THEME_ID,
  isSupportedThemeInput,
  normalizeThemeId,
} from '../../../../packages/core/src/index.js';
import { isFirestoreWriteMode } from '../lib/write-mode.mjs';

const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{1,120}$/;
const UNSAFE_TEXT_PATTERN =
  /<\s*\/?\s*(script|style|iframe|object|embed|img|video|audio)\b|on[a-z]+\s*=|javascript:|<[^>]+>/i;
const SAFE_STORAGE_PATH =
  /^couples\/[A-Za-z0-9_-]{1,120}\/media\/[A-Za-z0-9_-]{1,120}\/(original|thumbnail|poster)$/;
const MEDIA_CONTENT_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
]);

function assertSafeId(value, label) {
  const id = String(value || '').trim();
  if (!SAFE_ID_PATTERN.test(id)) {
    throw new Error(`${label} must be a non-empty safe Firestore document id.`);
  }
  return id;
}

function couplePath(coupleId) {
  return [COLLECTIONS.couples, assertSafeId(coupleId, 'coupleId')];
}

function memberPath(coupleId, uid) {
  return [...couplePath(coupleId), COLLECTIONS.members, assertSafeId(uid, 'uid')];
}

function profilePath(coupleId, uid) {
  return [...couplePath(coupleId), COLLECTIONS.profiles, assertSafeId(uid, 'uid')];
}

function privateSettingsPath(coupleId, uid) {
  return [...couplePath(coupleId), COLLECTIONS.settings, assertSafeId(uid, 'uid')];
}

function sharedSettingsPath(coupleId) {
  return [...couplePath(coupleId), COLLECTIONS.settings, SETTINGS_DOCUMENT_IDS.shared];
}

function memoryPath(coupleId, memoryId) {
  return [...couplePath(coupleId), COLLECTIONS.memories, assertSafeId(memoryId, 'memoryId')];
}

function planPath(coupleId, planId) {
  return [...couplePath(coupleId), COLLECTIONS.plans, assertSafeId(planId, 'planId')];
}

function cleanText(value, maxLength, label, { required = false } = {}) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (required && !text) throw new Error(`${label} is required.`);
  if (!text) return '';
  if (text.length > maxLength) throw new Error(`${label} is too long.`);
  if (UNSAFE_TEXT_PATTERN.test(text)) throw new Error(`${label} contains unsafe markup.`);
  return text;
}

function cleanStringList(value, { label, maxItems = 20, maxLength = 80 } = {}) {
  if (!Array.isArray(value)) return [];
  const result = [];
  const seen = new Set();

  for (const item of value) {
    const text = cleanText(item, maxLength, label || 'Entry');
    if (text && !seen.has(text)) {
      seen.add(text);
      result.push(text);
    }
    if (result.length >= maxItems) break;
  }

  return result;
}

function cleanDate(value, label = 'Date') {
  const text = cleanText(value, 10, label, { required: true });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error(`${label} must use YYYY-MM-DD.`);

  const parsed = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== text) {
    throw new Error(`${label} must be a real calendar date.`);
  }

  return text;
}

function cleanOptionalDate(value, label = 'Date') {
  if (!value) return '';
  return cleanDate(value, label);
}

function normalizeRevision(value) {
  if (value === '' || value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= 0 ? numeric : null;
}

function cleanMediaMetadata(media) {
  if (!media || typeof media !== 'object') {
    throw new Error('Verified media metadata is required.');
  }

  const id = cleanText(media.id, 120, 'Media id', { required: true });
  const kind = cleanText(media.kind, 20, 'Media kind', { required: true });
  if (!['image', 'video'].includes(kind)) throw new Error('Media kind is not supported.');

  const storagePath = cleanText(media.storagePath, 260, 'Storage path', { required: true });
  if (!SAFE_STORAGE_PATH.test(storagePath)) throw new Error('Storage path is invalid.');

  const thumbnailPath = cleanText(media.thumbnailPath, 260, 'Thumbnail path');
  if (thumbnailPath && !SAFE_STORAGE_PATH.test(thumbnailPath)) {
    throw new Error('Thumbnail path is invalid.');
  }

  const posterPath = cleanText(media.posterPath, 260, 'Poster path');
  if (posterPath && !SAFE_STORAGE_PATH.test(posterPath)) {
    throw new Error('Poster path is invalid.');
  }

  const contentType = cleanText(media.contentType, 80, 'Media content type', { required: true });
  if (!MEDIA_CONTENT_TYPES.includes(contentType)) {
    throw new Error('Media content type is not supported.');
  }

  const sizeBytes = Number(media.sizeBytes);
  if (!Number.isInteger(sizeBytes) || sizeBytes < 0 || sizeBytes > 250 * 1024 * 1024) {
    throw new Error('Media size is invalid.');
  }

  const checksum = cleanText(media.checksum, 64, 'Media checksum', { required: true });
  if (!/^[A-Fa-f0-9]{64}$/.test(checksum)) throw new Error('Media checksum is invalid.');

  return {
    id,
    kind,
    storagePath,
    thumbnailPath,
    posterPath,
    contentType,
    sizeBytes,
    checksum: checksum.toLowerCase(),
  };
}

function currentRevisionFromSnapshot(snapshot) {
  if (!snapshot?.exists()) return 0;
  const data = snapshot.data();
  return Number.isInteger(data?.revision) && data.revision > 0 ? data.revision : 0;
}

function resolveCoupleId(approvedUser) {
  return approvedUser?.coupleId || approvedUser?.raw?.coupleId || '';
}

function timestampValue(context) {
  return typeof context.timestamp === 'function' ? context.timestamp() : new Date().toISOString();
}

async function assertWriteContext(context) {
  const {
    approvedUser,
    createDoc,
    env = {},
    firestore,
    getDocument,
    user,
  } = context;

  if (!firestore) throw new Error('Firestore is not configured.');
  if (!isFirestoreWriteMode(env)) {
    throw new Error('Firestore writes are disabled outside approved mobile Firestore write mode.');
  }
  if (!user?.uid || !approvedUser?.uid || user.uid !== approvedUser.uid) {
    throw new Error('An authenticated approved user is required before writing.');
  }

  const coupleId = resolveCoupleId(approvedUser);
  if (!coupleId) throw new Error('Approved user document must provide the coupleId.');

  const membership = await getDocument(
    createDoc(firestore, ...memberPath(coupleId, user.uid)),
  );
  const membershipData = membership.exists() ? membership.data() : null;
  if (membershipData?.active !== true || membershipData?.role !== MEMBER_ROLES.member) {
    throw new Error('Active couple membership is required before writing.');
  }

  return { coupleId, uid: user.uid };
}

async function resolveNextRevision(reference, expectedRevision, getDocument, conflictLabel) {
  const snapshot = await getDocument(reference);
  const currentRevision = currentRevisionFromSnapshot(snapshot);
  const normalizedExpectedRevision = normalizeRevision(expectedRevision);

  if (
    normalizedExpectedRevision !== null &&
    normalizedExpectedRevision !== currentRevision
  ) {
    throw new Error(`${conflictLabel} changed in another session. Refresh and try again.`);
  }

  return {
    currentRevision,
    nextRevision: currentRevision + 1,
    snapshot,
  };
}

function buildMetadataFields(existingData, uid, context) {
  const createdAt = existingData?.createdAt || timestampValue(context);
  return {
    createdAt,
    createdBy: existingData?.createdBy || uid,
    updatedAt: timestampValue(context),
    updatedBy: uid,
  };
}

function buildMemoryDocument(payload, existingData, nextRevision, uid, context) {
  const type = cleanText(payload.specialMomentType, 40, 'Memory type') || MEMORY_TYPES.ordinary;
  if (!Object.values(MEMORY_TYPES).includes(type)) {
    throw new Error('Memory type is not supported.');
  }

  const kindLabel = cleanText(payload.kindLabel, 40, 'Kind label') || 'Everyday Moment';
  if (!MEMORY_KIND_LABELS.includes(kindLabel)) {
    throw new Error('Memory kind is not supported.');
  }

  const mediaState = cleanText(payload.mediaState, 40, 'Media state') || 'none';
  if (!['none', 'private-legacy-reference', 'storage-verified'].includes(mediaState)) {
    throw new Error('Media state is not supported.');
  }

  const mediaType = cleanText(payload.mediaType, 20, 'Media type') || 'text';
  if (!['text', 'photo', 'video', 'milestone'].includes(mediaType)) {
    throw new Error('Media type is not supported.');
  }

  const next = {
    schemaVersion: SCHEMA_VERSIONS.records,
    revision: nextRevision,
    title: cleanText(payload.title, 180, 'Title', { required: true }),
    description: cleanText(payload.description || payload.body, 2000, 'Description'),
    date: cleanDate(payload.date),
    caption: cleanText(payload.caption, 300, 'Caption'),
    tags: cleanStringList(payload.tags, { label: 'Tag', maxItems: 30, maxLength: 60 }),
    kindLabel,
    mediaNote: cleanText(payload.mediaNote, 300, 'Media note'),
    mediaState,
    mediaType,
    linkedPlanId: cleanText(payload.linkedPlanId || payload.sourcePlanId, 120, 'Linked plan id'),
    createdBy: existingData?.createdBy || uid,
    updatedBy: uid,
    status:
      payload.status === MEMORY_STATUSES.archived
        ? MEMORY_STATUSES.archived
        : MEMORY_STATUSES.active,
  };

  if (mediaState === 'storage-verified') {
    next.media = cleanMediaMetadata(payload.media || existingData?.media);
  }
  if (type !== MEMORY_TYPES.ordinary) {
    next.specialMomentType = type;
  }

  return {
    ...next,
    ...buildMetadataFields(existingData, uid, context),
  };
}

export async function saveOwnProfile(payload, context) {
  const { coupleId, uid } = await assertWriteContext(context);
  const reference = context.createDoc(context.firestore, ...profilePath(coupleId, uid));
  const { nextRevision, snapshot } = await resolveNextRevision(
    reference,
    payload.revision,
    context.getDocument,
    'Profile',
  );
  const existingData = snapshot.exists() ? snapshot.data() : null;
  const next = {
    schemaVersion: SCHEMA_VERSIONS.records,
    revision: nextRevision,
    name: cleanText(payload.name, 80, 'Name', { required: true }),
    bio: cleanText(payload.bio, 500, 'Bio'),
    anniversaryView: cleanText(payload.anniversaryView, 40, 'Anniversary view'),
    joinedDate: cleanOptionalDate(payload.joinedDate, 'Joined date'),
    birthday: cleanOptionalDate(payload.birthday, 'Birthday'),
    ...buildMetadataFields(existingData, uid, context),
  };
  await context.setDocument(reference, next);
  return next;
}

export async function saveOwnSettings(payload, context) {
  const { coupleId, uid } = await assertWriteContext(context);
  const reference = context.createDoc(
    context.firestore,
    ...privateSettingsPath(coupleId, uid),
  );
  const { nextRevision, snapshot } = await resolveNextRevision(
    reference,
    payload.revision,
    context.getDocument,
    'Settings',
  );
  const existingData = snapshot.exists() ? snapshot.data() : null;
  const rawTheme =
    cleanText(payload.appearanceTheme ?? payload.theme, 40, 'Appearance theme') ||
    DEFAULT_THEME_ID;
  if (!isSupportedThemeInput(rawTheme)) {
    throw new Error('Theme is not supported.');
  }

  const next = {
    schemaVersion: SCHEMA_VERSIONS.records,
    revision: nextRevision,
    appearanceTheme: normalizeThemeId(rawTheme),
    anniversaryView: cleanText(payload.anniversaryView, 40, 'Anniversary view'),
    preferredAlbumView: cleanText(payload.preferredAlbumView, 40, 'Preferred album view'),
    privacy: {
      localOnlyMode: payload.localOnlyMode === true,
      reducedMotion: payload.reducedMotion === true,
    },
    ...buildMetadataFields(existingData, uid, context),
  };
  await context.setDocument(reference, next);
  return next;
}

export async function saveSharedSettings(payload, context) {
  const { coupleId, uid } = await assertWriteContext(context);
  const reference = context.createDoc(
    context.firestore,
    ...sharedSettingsPath(coupleId),
  );
  const { nextRevision, snapshot } = await resolveNextRevision(
    reference,
    payload.revision,
    context.getDocument,
    'Shared settings',
  );
  const existingData = snapshot.exists() ? snapshot.data() : null;
  const next = {
    schemaVersion: SCHEMA_VERSIONS.records,
    revision: nextRevision,
    liveAlbumCover: cleanText(payload.liveAlbumCover, 260, 'Live Album cover'),
    previewOrder: cleanStringList(payload.previewOrder, {
      label: 'Preview item',
      maxItems: 12,
      maxLength: 120,
    }),
    preferredAlbumView: cleanText(payload.preferredAlbumView, 40, 'Preferred album view'),
    appearanceTheme: cleanText(existingData?.appearanceTheme || payload.appearanceTheme, 40, 'Shared theme'),
    theme: cleanText(existingData?.theme || payload.theme, 40, 'Legacy shared theme'),
    anniversaryView: cleanText(
      existingData?.anniversaryView || payload.anniversaryView,
      40,
      'Anniversary view',
    ),
    ...buildMetadataFields(existingData, uid, context),
  };
  await context.setDocument(reference, next);
  return next;
}

export async function saveMemory(memoryId, payload, context) {
  const { coupleId, uid } = await assertWriteContext(context);
  const reference = context.createDoc(context.firestore, ...memoryPath(coupleId, memoryId));
  const { nextRevision, snapshot } = await resolveNextRevision(
    reference,
    payload.revision,
    context.getDocument,
    'Memory',
  );
  const existingData = snapshot.exists() ? snapshot.data() : null;
  const next = buildMemoryDocument(payload, existingData, nextRevision, uid, context);
  await context.setDocument(reference, next);
  return next;
}

export async function saveMemoryWithVerifiedMedia(memoryId, payload, verifiedMedia, context) {
  const { coupleId, uid } = await assertWriteContext(context);
  const reference = context.createDoc(context.firestore, ...memoryPath(coupleId, memoryId));
  const { nextRevision, snapshot } = await resolveNextRevision(
    reference,
    payload.revision,
    context.getDocument,
    'Memory',
  );
  const existingData = snapshot.exists() ? snapshot.data() : null;
  const next = buildMemoryDocument(
    {
      ...payload,
      media: verifiedMedia,
      mediaState: 'storage-verified',
    },
    existingData,
    nextRevision,
    uid,
    context,
  );
  await context.setDocument(reference, next);
  return next;
}

export async function removeVerifiedMediaFromMemory(memoryId, revision, context) {
  const { coupleId, uid } = await assertWriteContext(context);
  const reference = context.createDoc(context.firestore, ...memoryPath(coupleId, memoryId));
  const snapshot = await context.getDocument(reference);
  if (!snapshot.exists()) throw new Error('Memory could not be found.');

  const current = snapshot.data() || {};
  if (current.status === MEMORY_STATUSES.archived) {
    throw new Error('This memory is already archived.');
  }
  if (current.mediaState !== 'storage-verified') {
    throw new Error('Only verified private media memories can be removed from Album.');
  }

  const { nextRevision } = await resolveNextRevision(
    reference,
    revision,
    context.getDocument,
    'Memory',
  );
  const next = buildMemoryDocument(
    {
      ...current,
      description: current.description || '',
      kindLabel: current.kindLabel || '',
      mediaNote: current.mediaNote || '',
      specialMomentType: current.specialMomentType || MEMORY_TYPES.ordinary,
      status: MEMORY_STATUSES.archived,
      tags: Array.isArray(current.tags) ? current.tags : [],
      title: current.title,
    },
    current,
    nextRevision,
    current.createdBy || uid,
    context,
  );
  next.updatedBy = uid;
  next.status = MEMORY_STATUSES.archived;
  next.mediaState = 'none';
  delete next.media;

  await context.setDocument(reference, next);
  return next;
}

export async function archiveMemory(memoryId, revision, context) {
  const { coupleId, uid } = await assertWriteContext(context);
  const reference = context.createDoc(context.firestore, ...memoryPath(coupleId, memoryId));
  const { nextRevision } = await resolveNextRevision(
    reference,
    revision,
    context.getDocument,
    'Memory',
  );
  const next = {
    status: MEMORY_STATUSES.archived,
    revision: nextRevision,
    updatedAt: timestampValue(context),
    updatedBy: uid,
    schemaVersion: SCHEMA_VERSIONS.records,
  };
  await context.updateDocument(reference, next);
  return next;
}

export async function restoreMemory(memoryId, revision, context) {
  const { coupleId, uid } = await assertWriteContext(context);
  const reference = context.createDoc(context.firestore, ...memoryPath(coupleId, memoryId));
  const snapshot = await context.getDocument(reference);
  if (!snapshot.exists()) throw new Error('Memory could not be found.');
  if (snapshot.data()?.status !== MEMORY_STATUSES.archived) {
    throw new Error('Only archived memories can be restored.');
  }
  const { nextRevision } = await resolveNextRevision(
    reference,
    revision,
    context.getDocument,
    'Memory',
  );
  const next = {
    status: MEMORY_STATUSES.active,
    revision: nextRevision,
    updatedAt: timestampValue(context),
    updatedBy: uid,
    schemaVersion: SCHEMA_VERSIONS.records,
  };
  await context.updateDocument(reference, next);
  return next;
}

export async function savePlan(planId, payload, context) {
  const { coupleId, uid } = await assertWriteContext(context);
  const reference = context.createDoc(context.firestore, ...planPath(coupleId, planId));
  const { nextRevision, snapshot } = await resolveNextRevision(
    reference,
    payload.revision,
    context.getDocument,
    'Plan',
  );
  const existingData = snapshot.exists() ? snapshot.data() : null;
  const status = cleanText(payload.status, 20, 'Plan status') || PLAN_STATUSES.idea;
  if (!Object.values(PLAN_STATUSES).includes(status)) {
    throw new Error('Plan status is not supported.');
  }

  const category = cleanText(payload.category, 40, 'Plan category') || 'Other';
  if (!PLAN_CATEGORIES.includes(category)) {
    throw new Error('Plan category is not supported.');
  }

  const next = {
    schemaVersion: SCHEMA_VERSIONS.records,
    revision: nextRevision,
    title: cleanText(payload.title, 160, 'Plan title', { required: true }),
    category,
    status,
    targetDate: cleanOptionalDate(payload.targetDate, 'Target date'),
    notes: cleanText(payload.notes, 1200, 'Plan notes'),
    convertedMemoryId: cleanText(
      existingData?.convertedMemoryId || payload.convertedMemoryId,
      120,
      'Converted memory id',
    ),
    ...buildMetadataFields(existingData, uid, context),
  };
  await context.setDocument(reference, next);
  return next;
}

export async function convertPlanToMemory(planId, plan, context) {
  const memoryId = `memory_from_plan_${planId}`;
  const existingMemoryId = cleanText(
    plan.convertedMemoryId,
    120,
    'Converted memory id',
  );
  if (existingMemoryId) throw new Error('This plan already has a memory.');

  const { coupleId } = await assertWriteContext(context);
  const memoryReference = context.createDoc(
    context.firestore,
    ...memoryPath(coupleId, memoryId),
  );
  const memorySnapshot = await context.getDocument(memoryReference);
  const existingMemory = memorySnapshot.exists() ? memorySnapshot.data() : null;
  const memoryAlreadyCreated =
    existingMemory?.linkedPlanId === planId
    || existingMemory?.createdBy === context.user?.uid;

  if (!memoryAlreadyCreated) {
    await saveMemory(
      memoryId,
      {
        title: plan.title,
        description: plan.notes || '',
        date: plan.completedDate || plan.targetDate || new Date().toISOString().slice(0, 10),
        kindLabel: 'Date',
        tags: [plan.category, 'Plan'],
        linkedPlanId: planId,
        mediaType: 'text',
        revision: 0,
      },
      context,
    );
  }

  await savePlan(
    planId,
    {
      ...plan,
      status: PLAN_STATUSES.completed,
      convertedMemoryId: memoryId,
    },
    context,
  );

  return memoryId;
}

export async function saveSpecialMomentText(momentType, payload, context) {
  const { coupleId, uid } = await assertWriteContext(context);
  const reference = context.createDoc(
    context.firestore,
    ...couplePath(coupleId),
    COLLECTIONS.specialMoments,
    assertSafeId(momentType, 'momentType'),
  );
  const { nextRevision, snapshot } = await resolveNextRevision(
    reference,
    payload.revision,
    context.getDocument,
    'Special page',
  );
  const existingData = snapshot.exists() ? snapshot.data() : null;
  const sections = Array.isArray(payload.sections) ? payload.sections : [];
  const next = {
    schemaVersion: SCHEMA_VERSIONS.specialMoments,
    revision: nextRevision,
    title: cleanText(payload.title, 120, 'Title', { required: true }),
    subtitle: cleanText(payload.subtitle, 180, 'Subtitle'),
    date: payload.date ? cleanDate(payload.date) : '',
    sections: sections.slice(0, 8).map((section) => {
      const kind = cleanText(section.kind, 20, 'Section type') || 'paragraph';
      if (!SPECIAL_SECTION_KINDS.includes(kind)) {
        throw new Error('Section type is not supported.');
      }
      return {
        kind,
        content: cleanText(section.content, 1200, 'Section content', { required: true }),
      };
    }),
    ...buildMetadataFields(existingData, uid, context),
  };
  await context.setDocument(reference, next);
  return next;
}
