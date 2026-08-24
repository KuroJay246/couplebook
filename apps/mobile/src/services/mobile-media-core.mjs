const IMAGE_CONTENT_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const VIDEO_CONTENT_TYPES = Object.freeze(['video/mp4', 'video/webm']);
const IMAGE_EXTENSIONS = Object.freeze(['jpg', 'jpeg', 'png', 'webp', 'gif']);
const VIDEO_EXTENSIONS = Object.freeze(['mp4', 'webm']);

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 250 * 1024 * 1024;

export const MOBILE_QUEUE_STATUS = Object.freeze({
  selected: 'selected',
  validating: 'validating',
  hashing: 'hashing',
  uploading: 'uploading',
  finalizing: 'finalizing',
  complete: 'complete',
  failed: 'failed',
  cancelled: 'cancelled',
  duplicate: 'duplicate',
  pausedOffline: 'paused-offline',
});

export const ACCEPTED_MOBILE_MEDIA_TYPES = [...IMAGE_CONTENT_TYPES, ...VIDEO_CONTENT_TYPES];

function randomId(prefix) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().replaceAll('-', '_')}`;
  }

  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function toTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function extensionFromName(name) {
  const match = /\.([A-Za-z0-9]+)$/.exec(String(name || ''));
  return match ? match[1].toLowerCase() : '';
}

function titleFromFilename(name) {
  const base = String(name || '')
    .replace(/\.[A-Za-z0-9]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!base) return 'New media memory';
  return base.replace(/\b\w/g, (value) => value.toUpperCase());
}

function cleanFileNameBase(name) {
  const base = String(name || '')
    .replace(/\.[A-Za-z0-9]+$/, '')
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .toLowerCase();

  return base.slice(0, 32) || 'memory';
}

function normalizeNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeDateLabel(value) {
  const text = toTrimmedString(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  return new Date().toISOString().slice(0, 10);
}

function detectKind(asset, mimeType, extension) {
  const pickerType = toTrimmedString(asset?.type).toLowerCase();
  if (pickerType === 'image' || pickerType === 'video') return pickerType;
  if (IMAGE_CONTENT_TYPES.includes(mimeType) || IMAGE_EXTENSIONS.includes(extension)) return 'image';
  if (VIDEO_CONTENT_TYPES.includes(mimeType) || VIDEO_EXTENSIONS.includes(extension)) return 'video';
  return '';
}

export function formatBytes(sizeBytes) {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) return '0 B';
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  if (sizeBytes < 1024 * 1024 * 1024) return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function createMediaEntityId(prefix = 'media') {
  return randomId(prefix);
}

export function createAssetFingerprint(asset) {
  return [
    toTrimmedString(asset?.assetId || asset?.uri).toLowerCase(),
    toTrimmedString(asset?.fileName).toLowerCase(),
    toTrimmedString(asset?.mimeType).toLowerCase(),
    normalizeNumber(asset?.fileSize),
    normalizeNumber(asset?.duration),
  ].join('::');
}

export function buildVerifiedMediaRecord({
  checksum,
  contentType,
  coupleId,
  kind,
  mediaId,
  sizeBytes,
}) {
  return {
    id: mediaId,
    kind,
    storagePath: `couples/${coupleId}/media/${mediaId}/original`,
    thumbnailPath: '',
    posterPath: '',
    contentType,
    sizeBytes,
    checksum,
  };
}

export function createSafeMediaFilename({
  date,
  entityId,
  extension,
  originalDisplayName,
  checksum = '',
}) {
  const safeDate = normalizeDateLabel(date).replaceAll('-', '');
  const checksumFragment = toTrimmedString(checksum).toLowerCase().slice(0, 8);
  const base = cleanFileNameBase(originalDisplayName);
  const safeExtension =
    toTrimmedString(extension).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin';
  const parts = [safeDate, entityId, base];
  if (checksumFragment) parts.push(checksumFragment);
  return `${parts.filter(Boolean).join('_')}.${safeExtension}`;
}

export function validateMobileMediaAsset(asset, fileInfo = {}) {
  const uri = toTrimmedString(asset?.uri);
  if (!uri) {
    throw new Error('The selected file is unavailable on this device.');
  }

  const fileName = toTrimmedString(asset?.fileName) || toTrimmedString(fileInfo?.name) || 'memory';
  const extension = extensionFromName(fileName);
  if (!extension) {
    throw new Error('The selected file is missing a supported extension.');
  }

  const mimeType = toTrimmedString(asset?.mimeType || fileInfo?.type).toLowerCase();
  const kind = detectKind(asset, mimeType, extension);
  if (!kind) {
    throw new Error('Only JPG, PNG, WEBP, GIF, MP4, and WEBM files are supported.');
  }

  const allowedExtensions = kind === 'image' ? IMAGE_EXTENSIONS : VIDEO_EXTENSIONS;
  if (!allowedExtensions.includes(extension)) {
    throw new Error('Only JPG, PNG, WEBP, GIF, MP4, and WEBM files are supported.');
  }

  const allowedTypes = kind === 'image' ? IMAGE_CONTENT_TYPES : VIDEO_CONTENT_TYPES;
  if (mimeType && !allowedTypes.includes(mimeType)) {
    throw new Error('Only JPG, PNG, WEBP, GIF, MP4, and WEBM files are supported.');
  }

  const sizeBytes = normalizeNumber(asset?.fileSize || fileInfo?.size);
  if (sizeBytes <= 0) {
    throw new Error('The selected file is empty.');
  }

  const maxBytes = kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (sizeBytes > maxBytes) {
    throw new Error(`${kind === 'image' ? 'Images' : 'Videos'} must stay under ${formatBytes(maxBytes)}.`);
  }

  return {
    uri,
    fileName,
    extension,
    kind,
    contentType: mimeType || (kind === 'image' ? 'image/jpeg' : 'video/mp4'),
    sizeBytes,
    width: normalizeNumber(asset?.width),
    height: normalizeNumber(asset?.height),
    durationMs: kind === 'video' ? normalizeNumber(asset?.duration) : 0,
    title: titleFromFilename(fileName),
    kindLabel: kind === 'video' ? 'Video Memory' : 'Photo Memory',
  };
}

export function createMobileQueueItem(asset, fileInfo = {}, options = {}) {
  const details = validateMobileMediaAsset(asset, fileInfo);
  const queueId = options.queueId || randomId('upload');
  const checksum = toTrimmedString(options.checksum).toLowerCase();
  return {
    id: queueId,
    assetId: toTrimmedString(asset?.assetId),
    localUri: details.uri,
    previewUri: details.uri,
    originalDisplayName: details.fileName,
    safeFileName: createSafeMediaFilename({
      checksum,
      date: options.date || new Date().toISOString().slice(0, 10),
      entityId: queueId,
      extension: details.extension,
      originalDisplayName: details.fileName,
    }),
    mediaType: details.kind,
    contentType: details.contentType,
    extension: details.extension,
    sizeBytes: details.sizeBytes,
    width: details.width,
    height: details.height,
    durationMs: details.durationMs,
    title: details.title,
    kindLabel: details.kindLabel,
    caption: '',
    date: options.date || new Date().toISOString().slice(0, 10),
    progress: 0,
    retryCount: 0,
    checksum,
    fingerprint: createAssetFingerprint(asset),
    linkedMemoryId: '',
    driveState: 'not-started',
    firestoreState: 'not-started',
    errorCode: '',
    errorMessage: '',
    status: MOBILE_QUEUE_STATUS.selected,
    createdAt: options.createdAt || new Date().toISOString(),
    updatedAt: options.updatedAt || new Date().toISOString(),
  };
}

export function summarizeMobileQueueItems(items = []) {
  return items.reduce(
    (summary, item) => {
      summary.total += 1;
      summary.bytes += normalizeNumber(item?.sizeBytes);
      if (item?.status === MOBILE_QUEUE_STATUS.complete) summary.complete += 1;
      if (item?.status === MOBILE_QUEUE_STATUS.failed) summary.failed += 1;
      if (item?.status === MOBILE_QUEUE_STATUS.cancelled) summary.cancelled += 1;
      if (item?.status === MOBILE_QUEUE_STATUS.selected) summary.ready += 1;
      if (
        item?.status === MOBILE_QUEUE_STATUS.validating ||
        item?.status === MOBILE_QUEUE_STATUS.hashing ||
        item?.status === MOBILE_QUEUE_STATUS.uploading ||
        item?.status === MOBILE_QUEUE_STATUS.finalizing
      ) {
        summary.active += 1;
      }
      return summary;
    },
    { active: 0, bytes: 0, cancelled: 0, complete: 0, failed: 0, ready: 0, total: 0 },
  );
}
