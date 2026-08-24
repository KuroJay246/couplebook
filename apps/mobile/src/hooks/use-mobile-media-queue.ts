import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useOwnerWrite } from '@/hooks/use-owner-write';
import type { MobileUploadQueueItem } from '@/services/mobile-media';
import {
  clearPersistedQueueSnapshot,
  computeSha256ForLocalFile,
  createPrivateMediaUploadTask,
  createQueueItemFromAsset,
  deleteUploadedMediaSet,
  launchMobileMediaPicker,
  persistQueueSnapshot,
  readQueueSnapshot,
  requestMediaLibraryPermission,
  resolveVerifiedMediaPreviewUri,
  validateLocalMediaItem,
  waitForMobileUploadTask,
} from '@/services/mobile-media';
import {
  MOBILE_QUEUE_STATUS,
  createMediaEntityId,
  formatBytes,
  summarizeMobileQueueItems,
} from '@/services/mobile-media-core.mjs';

type QueueNotice = {
  kind: 'info' | 'success' | 'error';
  message: string;
};

function isAbortError(error: unknown) {
  const code = String((error as { code?: string })?.code || '').toLowerCase();
  return code === 'storage/canceled' || code === 'aborterror';
}

function normalizeErrorMessage(error: unknown, fallback: string) {
  const message = String((error as { message?: string })?.message || '').trim();
  return message || fallback;
}

export function useMobileMediaQueue() {
  const writer = useOwnerWrite();
  const { approvedUser, user } = useAuth();
  const [items, setItems] = useState<MobileUploadQueueItem[]>([]);
  const [notice, setNotice] = useState<QueueNotice>({ kind: 'info', message: '' });
  const [restored, setRestored] = useState(false);
  const [viewerItemId, setViewerItemId] = useState('');
  const [viewerSourceUri, setViewerSourceUri] = useState('');
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState('');
  const operationsRef = useRef(new Map<string, { cancel: () => void }>());
  const completedChecksumsRef = useRef(new Set<string>());
  const completedFingerprintsRef = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    const operationRegistry = operationsRef.current;
    readQueueSnapshot()
      .then((snapshot) => {
        if (cancelled) return;
        setItems(snapshot);
      })
      .finally(() => {
        if (!cancelled) setRestored(true);
      });

    return () => {
      cancelled = true;
      for (const operation of operationRegistry.values()) {
        operation.cancel();
      }
      operationRegistry.clear();
    };
  }, []);

  useEffect(() => {
    if (!restored) return;
    const persistedItems = items.filter((item) => item.status !== MOBILE_QUEUE_STATUS.complete);
    if (persistedItems.length === 0) {
      clearPersistedQueueSnapshot().catch(() => {});
      return;
    }
    persistQueueSnapshot(persistedItems).catch(() => {});
  }, [items, restored]);

  const updateItem = useCallback((itemId: string, patch: Partial<MobileUploadQueueItem>) => {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems((current) => current.filter((item) => item.id !== itemId));
  }, []);

  const updateDraft = useCallback((itemId: string, patch: Partial<MobileUploadQueueItem>) => {
    updateItem(itemId, patch);
  }, [updateItem]);

  const pickAssets = useCallback(async () => {
    const permission = await requestMediaLibraryPermission();
    if (!permission.granted) {
      setNotice({
        kind: 'error',
        message:
          permission.canAskAgain === false
            ? 'Photo access is blocked for this app. Re-enable it in device settings to add media.'
            : 'Photo access is required only when you choose Add Photos.',
      });
      return;
    }

    const result = await launchMobileMediaPicker();
    if (result.canceled || !result.assets?.length) {
      return;
    }

    const knownFingerprints = new Set(items.map((item) => item.fingerprint));
    const nextItems: MobileUploadQueueItem[] = [];
    const errors: string[] = [];

    for (const asset of result.assets) {
      try {
        const queueItem = await createQueueItemFromAsset(asset);
        if (
          knownFingerprints.has(queueItem.fingerprint) ||
          completedFingerprintsRef.current.has(queueItem.fingerprint)
        ) {
          throw new Error('This file is already in the current private Album queue.');
        }
        knownFingerprints.add(queueItem.fingerprint);
        nextItems.push(queueItem);
      } catch (error) {
        errors.push(normalizeErrorMessage(error, 'A file could not be added to the mobile queue.'));
      }
    }

    if (nextItems.length > 0) {
      setItems((current) => [...current, ...nextItems]);
      setNotice({
        kind: errors.length > 0 ? 'info' : 'success',
        message: `${nextItems.length} ${nextItems.length === 1 ? 'item is' : 'items are'} ready for upload.`,
      });
      return;
    }

    if (errors[0]) {
      setNotice({ kind: 'error', message: errors[0] });
    }
  }, [items]);

  const processItem = useCallback(
    async (itemId: string) => {
      const item = items.find((entry) => entry.id === itemId);
      if (!item || !approvedUser?.coupleId || !user?.uid) return;

      let cancelled = false;
      operationsRef.current.set(itemId, {
        cancel: () => {
          cancelled = true;
        },
      });

      try {
        updateItem(itemId, { errorCode: '', errorMessage: '', progress: 0, status: MOBILE_QUEUE_STATUS.validating });
        const details = await validateLocalMediaItem(item);

        if (cancelled) {
          updateItem(itemId, { status: MOBILE_QUEUE_STATUS.cancelled });
          return;
        }

        updateItem(itemId, { progress: 8, status: MOBILE_QUEUE_STATUS.hashing });
        const checksum = await computeSha256ForLocalFile(item.localUri);
        if (
          completedChecksumsRef.current.has(checksum) ||
          completedFingerprintsRef.current.has(item.fingerprint)
        ) {
          updateItem(itemId, {
            checksum,
            errorCode: 'duplicate',
            errorMessage: 'This file is already saved in the current private Album session.',
            progress: 0,
            status: MOBILE_QUEUE_STATUS.duplicate,
          });
          return;
        }

        const mediaId = createMediaEntityId('media');
        const { task, verifiedMedia } = await createPrivateMediaUploadTask({
          checksum,
          contentType: details.contentType,
          coupleId: approvedUser.coupleId,
          kind: details.kind === 'video' ? 'video' : 'image',
          localUri: item.localUri,
          mediaId,
          ownerUid: user.uid,
          sizeBytes: details.sizeBytes,
        });

        operationsRef.current.set(itemId, {
          cancel: () => {
            cancelled = true;
            task.cancel();
          },
        });

        updateItem(itemId, {
          checksum,
          driveState: 'uploading',
          progress: 20,
          status: MOBILE_QUEUE_STATUS.uploading,
        });

        await waitForMobileUploadTask(task, {
          onProgress: (progress) => {
            updateItem(itemId, { progress });
          },
        });

        if (cancelled) {
          updateItem(itemId, { status: MOBILE_QUEUE_STATUS.cancelled });
          return;
        }

        updateItem(itemId, {
          driveState: 'uploaded',
          firestoreState: 'finalizing',
          progress: 96,
          status: MOBILE_QUEUE_STATUS.finalizing,
        });

        const result = await writer.createMemoryWithMedia(
          {
            caption: item.caption,
            date: item.date,
            description: item.caption,
            kindLabel: item.kindLabel,
            mediaNote: item.caption,
            mediaType: item.mediaType === 'video' ? 'video' : 'photo',
            revision: 0,
            title: item.title,
          },
          verifiedMedia,
        );

        completedChecksumsRef.current.add(checksum);
        completedFingerprintsRef.current.add(item.fingerprint);
        updateItem(itemId, {
          firestoreState: result?.refreshError ? 'refresh-warning' : 'saved',
          linkedMemoryId: result.memoryId,
          progress: 100,
          status: MOBILE_QUEUE_STATUS.complete,
        });
        setNotice({
          kind: result?.refreshError ? 'info' : 'success',
          message: `Uploaded ${formatBytes(item.sizeBytes)} and saved to Album.`,
        });
      } catch (error) {
        if (isAbortError(error)) {
          updateItem(itemId, { progress: 0, status: MOBILE_QUEUE_STATUS.cancelled });
          return;
        }

        updateItem(itemId, {
          errorCode: 'upload-failed',
          errorMessage: normalizeErrorMessage(error, 'This upload could not be completed.'),
          firestoreState: 'failed',
          progress: 0,
          status: MOBILE_QUEUE_STATUS.failed,
        });
        setNotice({
          kind: 'error',
          message: normalizeErrorMessage(error, 'This upload could not be completed.'),
        });
      } finally {
        operationsRef.current.delete(itemId);
      }
    },
    [approvedUser, items, updateItem, user, writer],
  );

  const startUploads = useCallback(async () => {
    if (!writer.canWrite || !approvedUser?.coupleId || !user?.uid) {
      setNotice({
        kind: 'error',
        message: 'An approved signed-in member is required before uploading media.',
      });
      return;
    }

    const pending = items.filter((item) =>
      item.status === MOBILE_QUEUE_STATUS.selected ||
      item.status === MOBILE_QUEUE_STATUS.failed ||
      item.status === MOBILE_QUEUE_STATUS.duplicate,
    );
    if (pending.length === 0) {
      setNotice({ kind: 'info', message: 'Add files to the queue before starting uploads.' });
      return;
    }

    for (const item of pending) {
      if (item.status === MOBILE_QUEUE_STATUS.duplicate) continue;
      await processItem(item.id);
    }
  }, [approvedUser, items, processItem, user, writer]);

  const retryItem = useCallback(async (itemId: string) => {
    updateItem(itemId, {
      errorCode: '',
      errorMessage: '',
      progress: 0,
      retryCount: (items.find((item) => item.id === itemId)?.retryCount || 0) + 1,
      status: MOBILE_QUEUE_STATUS.selected,
    });
    await processItem(itemId);
  }, [items, processItem, updateItem]);

  const cancelItem = useCallback((itemId: string) => {
    operationsRef.current.get(itemId)?.cancel();
    updateItem(itemId, { progress: 0, status: MOBILE_QUEUE_STATUS.cancelled });
  }, [updateItem]);

  const clearFinished = useCallback(() => {
    setItems((current) =>
      current.filter(
        (item) =>
          item.status !== MOBILE_QUEUE_STATUS.complete &&
          item.status !== MOBILE_QUEUE_STATUS.cancelled &&
          item.status !== MOBILE_QUEUE_STATUS.duplicate,
      ),
    );
  }, []);

  const removeSavedItem = useCallback(
    async (item: {
      id: string;
      revision?: number;
      media?: {
        status: 'storage-verified';
        storagePath: string;
        thumbnailPath: string;
        posterPath: string;
      };
      title?: string;
    }) => {
      if (!item.media || item.media.status !== 'storage-verified') {
        throw new Error('Only verified private media items can be removed from Album.');
      }
      await deleteUploadedMediaSet([
        item.media.storagePath,
        item.media.thumbnailPath,
        item.media.posterPath,
      ]);
      await writer.removeMemoryMedia(item.id, item.revision || 0);
      setNotice({
        kind: 'success',
        message: `${item.title || 'Media item'} was removed from Album.`,
      });
    },
    [writer],
  );

  const openViewer = useCallback(
    async (item: {
      id: string;
      localUri?: string;
      media?: {
        status: 'storage-verified';
        storagePath: string;
      } | string;
    }) => {
      setViewerItemId(item.id);
      setViewerError('');
      setViewerLoading(true);
      try {
        if (item.localUri) {
          setViewerSourceUri(item.localUri);
          return;
        }
        if (item.media && typeof item.media === 'object' && item.media.status === 'storage-verified') {
          const uri = await resolveVerifiedMediaPreviewUri(item.media.storagePath);
          setViewerSourceUri(uri);
          return;
        }
        throw new Error('This media preview is not available yet.');
      } catch (error) {
        setViewerError(normalizeErrorMessage(error, 'This media preview could not be loaded.'));
      } finally {
        setViewerLoading(false);
      }
    },
    [],
  );

  const closeViewer = useCallback(() => {
    setViewerError('');
    setViewerItemId('');
    setViewerLoading(false);
    setViewerSourceUri('');
  }, []);

  const summary = useMemo(() => summarizeMobileQueueItems(items), [items]);

  return {
    canUpload: writer.canWrite,
    cancelItem,
    clearFinished,
    closeViewer,
    items,
    notice,
    openViewer,
    pickAssets,
    removeItem,
    removeSavedItem,
    retryItem,
    startUploads,
    summary,
    updateDraft,
    viewerError,
    viewerItemId,
    viewerLoading,
    viewerSourceUri,
  };
}
