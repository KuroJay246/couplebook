import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';

import { storage } from '@/lib/firebase';
import {
  MOBILE_QUEUE_STATUS,
  buildVerifiedMediaRecord,
  createMobileQueueItem,
  validateMobileMediaAsset,
} from '@/services/mobile-media-core.mjs';

export type MobileUploadQueueStatus =
  | 'selected'
  | 'validating'
  | 'hashing'
  | 'uploading'
  | 'finalizing'
  | 'complete'
  | 'failed'
  | 'cancelled'
  | 'duplicate'
  | 'paused-offline';

export type MobileUploadQueueItem = {
  id: string;
  assetId: string;
  localUri: string;
  previewUri: string;
  originalDisplayName: string;
  safeFileName: string;
  mediaType: 'image' | 'video';
  contentType: string;
  extension: string;
  sizeBytes: number;
  width: number;
  height: number;
  durationMs: number;
  title: string;
  kindLabel: string;
  caption: string;
  date: string;
  progress: number;
  retryCount: number;
  checksum: string;
  fingerprint: string;
  linkedMemoryId: string;
  driveState: string;
  firestoreState: string;
  errorCode: string;
  errorMessage: string;
  status: MobileUploadQueueStatus;
  createdAt: string;
  updatedAt: string;
};

const SAFE_STORAGE_PATH =
  /^couples\/[A-Za-z0-9_-]{1,120}\/media\/[A-Za-z0-9_-]{1,120}\/(original|thumbnail|poster)$/;

function getQueueDirectoryUri() {
  if (!FileSystem.documentDirectory) {
    throw new Error('Local device storage is unavailable in this build.');
  }
  return `${FileSystem.documentDirectory}couplebook-mobile`;
}

function getQueueFileUri() {
  return `${getQueueDirectoryUri()}/upload-queue.json`;
}

function fileNameFromUri(uri: string) {
  const cleanUri = String(uri || '').split('?')[0].split('#')[0];
  const segments = cleanUri.split('/').filter(Boolean);
  return segments[segments.length - 1] || 'memory';
}

function contentTypeFromName(name: string) {
  const extension = fileNameFromUri(name).split('.').pop()?.toLowerCase() || '';
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    default:
      return '';
  }
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

function normalizeQueueStatus(value: unknown): MobileUploadQueueStatus {
  switch (value) {
    case MOBILE_QUEUE_STATUS.validating:
    case MOBILE_QUEUE_STATUS.hashing:
    case MOBILE_QUEUE_STATUS.uploading:
    case MOBILE_QUEUE_STATUS.finalizing:
    case MOBILE_QUEUE_STATUS.complete:
    case MOBILE_QUEUE_STATUS.failed:
    case MOBILE_QUEUE_STATUS.cancelled:
    case MOBILE_QUEUE_STATUS.duplicate:
    case MOBILE_QUEUE_STATUS.pausedOffline:
      return value;
    default:
      return MOBILE_QUEUE_STATUS.selected;
  }
}

function normalizeQueueItem(item: Record<string, unknown>) {
  return {
    ...item,
    assetId: typeof item.assetId === 'string' ? item.assetId : '',
    caption: typeof item.caption === 'string' ? item.caption : '',
    checksum: typeof item.checksum === 'string' ? item.checksum : '',
    contentType: typeof item.contentType === 'string' ? item.contentType : '',
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
    date: typeof item.date === 'string' ? item.date : new Date().toISOString().slice(0, 10),
    driveState: typeof item.driveState === 'string' ? item.driveState : 'not-started',
    errorCode: typeof item.errorCode === 'string' ? item.errorCode : '',
    errorMessage: typeof item.errorMessage === 'string' ? item.errorMessage : '',
    extension: typeof item.extension === 'string' ? item.extension : '',
    fingerprint: typeof item.fingerprint === 'string' ? item.fingerprint : '',
    firestoreState:
      typeof item.firestoreState === 'string' ? item.firestoreState : 'not-started',
    height: Number.isFinite(Number(item.height)) ? Number(item.height) : 0,
    id: typeof item.id === 'string' ? item.id : '',
    kindLabel: typeof item.kindLabel === 'string' ? item.kindLabel : 'Photo Memory',
    linkedMemoryId: typeof item.linkedMemoryId === 'string' ? item.linkedMemoryId : '',
    localUri: typeof item.localUri === 'string' ? item.localUri : '',
    mediaType:
      item.mediaType === 'video' || item.mediaType === 'image' ? item.mediaType : 'image',
    originalDisplayName:
      typeof item.originalDisplayName === 'string' ? item.originalDisplayName : '',
    previewUri: typeof item.previewUri === 'string' ? item.previewUri : '',
    progress: Number.isFinite(Number(item.progress)) ? Number(item.progress) : 0,
    retryCount: Number.isFinite(Number(item.retryCount)) ? Number(item.retryCount) : 0,
    safeFileName: typeof item.safeFileName === 'string' ? item.safeFileName : '',
    sizeBytes: Number.isFinite(Number(item.sizeBytes)) ? Number(item.sizeBytes) : 0,
    status: normalizeQueueStatus(item.status),
    title: typeof item.title === 'string' ? item.title : 'New media memory',
    updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
    width: Number.isFinite(Number(item.width)) ? Number(item.width) : 0,
    durationMs: Number.isFinite(Number(item.durationMs)) ? Number(item.durationMs) : 0,
  } satisfies MobileUploadQueueItem;
}

async function ensureQueueDirectory() {
  await FileSystem.makeDirectoryAsync(getQueueDirectoryUri(), { intermediates: true });
}

async function readLocalFileInfo(uri: string) {
  const info = await FileSystem.getInfoAsync(uri);
  return {
    exists: !!info.exists,
    name: fileNameFromUri(uri),
    size: info.exists && typeof info.size === 'number' ? info.size : 0,
    type: contentTypeFromName(uri),
  };
}

async function createUploadBlob(localUri: string, contentType: string) {
  const response = await fetch(localUri);
  if (!response.ok) {
    throw new Error('The selected file could not be opened from local storage.');
  }

  const sourceBlob = await response.blob();
  if (!contentType || sourceBlob.type === contentType) {
    return sourceBlob;
  }

  return sourceBlob.slice(0, sourceBlob.size, contentType);
}

export async function requestMediaLibraryPermission() {
  return ImagePicker.requestMediaLibraryPermissionsAsync();
}

export async function launchMobileMediaPicker() {
  return ImagePicker.launchImageLibraryAsync({
    allowsEditing: false,
    allowsMultipleSelection: true,
    mediaTypes: ['images', 'videos'],
    orderedSelection: true,
    quality: 1,
    selectionLimit: 10,
  });
}

export async function createQueueItemFromAsset(asset: ImagePicker.ImagePickerAsset) {
  const file = await readLocalFileInfo(asset.uri);
  const fileInfo = {
    name: file.name,
    size: file.size,
    type: file.type,
  };
  return createMobileQueueItem(asset, fileInfo) as MobileUploadQueueItem;
}

export async function readQueueSnapshot() {
  const fileUri = getQueueFileUri();
  const info = await FileSystem.getInfoAsync(fileUri);
  if (!info.exists) return [];

  try {
    const raw = await FileSystem.readAsStringAsync(fileUri);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) =>
        entry && typeof entry === 'object' ? normalizeQueueItem(entry as Record<string, unknown>) : null,
      )
      .filter(Boolean) as MobileUploadQueueItem[];
  } catch {
    return [];
  }
}

export async function persistQueueSnapshot(items: MobileUploadQueueItem[]) {
  await ensureQueueDirectory();
  await FileSystem.writeAsStringAsync(getQueueFileUri(), JSON.stringify(items, null, 2));
}

export async function clearPersistedQueueSnapshot() {
  await FileSystem.deleteAsync(getQueueFileUri(), { idempotent: true });
}

export async function computeSha256ForLocalFile(localUri: string) {
  const response = await fetch(localUri);
  if (!response.ok) {
    throw new Error('The selected file could not be opened from local storage.');
  }
  const buffer = await response.arrayBuffer();
  if (!globalThis.crypto?.subtle) {
    throw new Error('Secure hashing is unavailable in this device build.');
  }
  const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer);
  return bytesToHex(new Uint8Array(digest));
}

export async function validateLocalMediaItem(item: MobileUploadQueueItem) {
  const fileInfo = await readLocalFileInfo(item.localUri);
  return validateMobileMediaAsset(
    {
      uri: item.localUri,
      fileName: item.originalDisplayName,
      fileSize: item.sizeBytes || fileInfo.size || 0,
      height: item.height,
      mimeType: item.contentType || fileInfo.type,
      type: item.mediaType,
      width: item.width,
      duration: item.durationMs,
    },
    fileInfo,
  );
}

export async function createPrivateMediaUploadTask({
  checksum,
  contentType,
  coupleId,
  localUri,
  mediaId,
  kind,
  ownerUid,
  sizeBytes,
}: {
  checksum: string;
  contentType: string;
  coupleId: string;
  localUri: string;
  mediaId: string;
  kind: 'image' | 'video';
  ownerUid: string;
  sizeBytes: number;
}) {
  if (!storage) {
    throw new Error('Firebase Storage is not configured for this build.');
  }
  const file = await createUploadBlob(localUri, contentType);
  const verifiedMedia = buildVerifiedMediaRecord({
    checksum,
    contentType,
    coupleId,
    kind,
    mediaId,
    sizeBytes,
  });
  const storageReference = ref(storage, verifiedMedia.storagePath);
  const task = uploadBytesResumable(storageReference, file, {
    contentType,
    customMetadata: {
      coupleId,
      mediaId,
      ownerUid,
      schemaVersion: '1',
      kind,
    },
  });
  return { task, verifiedMedia };
}

export async function waitForMobileUploadTask(
  task: ReturnType<typeof uploadBytesResumable>,
  {
    onProgress,
  }: {
    onProgress?: (progress: number, bytesTransferred: number, totalBytes: number) => void;
  } = {},
) {
  return new Promise<void>((resolve, reject) => {
    const unsubscribe = task.on(
      'state_changed',
      (snapshot) => {
        if (!snapshot.totalBytes) return;
        const progress = Math.min(
          95,
          20 + Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 70),
        );
        onProgress?.(progress, snapshot.bytesTransferred, snapshot.totalBytes);
      },
      (error) => {
        unsubscribe();
        reject(error);
      },
      () => {
        unsubscribe();
        resolve();
      },
    );
  });
}

export async function resolveVerifiedMediaPreviewUri(storagePath: string) {
  if (!storage || !SAFE_STORAGE_PATH.test(String(storagePath || ''))) {
    throw new Error('The selected media could not be opened.');
  }
  return getDownloadURL(ref(storage, storagePath));
}

export async function deleteUploadedMediaSet(paths: string[]) {
  if (!storage) return 0;
  const uniquePaths = [...new Set(paths.filter((path) => SAFE_STORAGE_PATH.test(String(path || ''))))];
  for (const path of uniquePaths) {
    await deleteObject(ref(storage, path));
  }
  return uniquePaths.length;
}
